using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace AutoPrint.Launcher
{
    static class Program
    {
        private const string MUTEX_NAME = "Global\\AutoPrint_Production_SingleInstance_Mutex_2026";

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            bool isSilentStartup = false;
            foreach (var arg in args)
            {
                if (arg.Equals("--startup", StringComparison.OrdinalIgnoreCase) ||
                    arg.Equals("--silent", StringComparison.OrdinalIgnoreCase) ||
                    arg.Equals("/startup", StringComparison.OrdinalIgnoreCase))
                {
                    isSilentStartup = true;
                }
            }

            // 1. Single Instance Protection via Global Mutex
            bool createdNew;
            using (Mutex mutex = new Mutex(true, MUTEX_NAME, out createdNew))
            {
                if (!createdNew)
                {
                    // An existing instance is already running. Focus dashboard and exit.
                    try
                    {
                        Process.Start("http://localhost:8000");
                    }
                    catch { }
                    return;
                }

                // 2. Run Native Background Tray Context (Zero Console Window)
                Application.Run(new AutoPrintTrayContext(isSilentStartup));
            }
        }
    }

    public class AutoPrintTrayContext : ApplicationContext
    {
        private readonly NotifyIcon trayIcon;
        private readonly ContextMenuStrip contextMenu;
        private readonly System.Windows.Forms.Timer healthTimer;

        private Process backendProcess;
        private Process customerProcess;
        private Process merchantProcess;
        private Process pagekiteProcess;

        private readonly string projectRoot;
        private string runtimeLogsDir;
        private string dataDir;
        private readonly string iconPath;

        private int backendPort = 5000;
        private int merchantPort = 8000;
        private int customerPort = 7000;
        private bool isPagekiteEnabled = true;
        private string pagekiteName = "autoprint";
        private string pagekiteSecret = "xakd4af2azx229x94effe9az79262cxz";

        private readonly bool isSilentStartup;
        private bool isStopping = false;

        public AutoPrintTrayContext(bool silent)
        {
            isSilentStartup = silent;

            // Resolve base paths
            projectRoot = ResolveProjectRoot();
            iconPath = Path.Combine(projectRoot, "assets", "icon", "autoprint.ico");
            if (!File.Exists(iconPath))
            {
                iconPath = Path.Combine(projectRoot, "assets", "icon", "favicon.ico");
            }

            LoadConfiguration();

            // Setup Context Menu
            contextMenu = new ContextMenuStrip();
            contextMenu.Font = new Font("Segoe UI", 9F, FontStyle.Regular);

            var itemOpen = new ToolStripMenuItem("Open AutoPrint (Merchant Desk)", null, (s, e) => OpenMerchantDashboard())
            {
                Font = new Font("Segoe UI", 9F, FontStyle.Bold)
            };
            var itemCustomer = new ToolStripMenuItem("Open Customer Kiosk", null, (s, e) => OpenCustomerKiosk());
            var itemStatus = new ToolStripMenuItem("Service Status...", null, (s, e) => ShowServiceStatusDialog());
            var itemPrinters = new ToolStripMenuItem("Printer Configuration", null, (s, e) => OpenPrinterConfig());
            var itemPayment = new ToolStripMenuItem("Payment Settings", null, (s, e) => OpenPaymentSettings());
            var itemLogs = new ToolStripMenuItem("View Logs Directory", null, (s, e) => OpenLogsDirectory());
            var itemAutoStart = new ToolStripMenuItem("Start AutoPrint with Windows", null, (s, e) => ToggleAutoStart());
            itemAutoStart.Checked = IsAutoStartEnabled();

            var itemRestart = new ToolStripMenuItem("Restart Services", null, (s, e) => RestartServices());
            var itemStop = new ToolStripMenuItem("Stop Services", null, (s, e) => StopServices());
            var itemExit = new ToolStripMenuItem("Exit AutoPrint", null, (s, e) => ExitApplication());

            contextMenu.Items.Add(itemOpen);
            contextMenu.Items.Add(itemCustomer);
            contextMenu.Items.Add(new ToolStripMenuItem("Customer Online Access (PageKite)...", null, (s, e) => OpenCustomerTunnelTerminal()));
            contextMenu.Items.Add(new ToolStripSeparator());
            contextMenu.Items.Add(itemStatus);
            contextMenu.Items.Add(itemPrinters);
            contextMenu.Items.Add(itemPayment);
            contextMenu.Items.Add(new ToolStripSeparator());
            contextMenu.Items.Add(itemLogs);
            contextMenu.Items.Add(itemAutoStart);
            contextMenu.Items.Add(new ToolStripSeparator());
            contextMenu.Items.Add(itemRestart);
            contextMenu.Items.Add(itemStop);
            contextMenu.Items.Add(itemExit);

            // Setup System Tray NotifyIcon
            trayIcon = new NotifyIcon
            {
                Text = "AutoPrint Express — Online",
                ContextMenuStrip = contextMenu,
                Visible = true
            };

            // Load Custom Application Icon
            try
            {
                if (File.Exists(iconPath))
                {
                    trayIcon.Icon = new Icon(iconPath);
                }
                else
                {
                    trayIcon.Icon = SystemIcons.Application;
                }
            }
            catch
            {
                trayIcon.Icon = SystemIcons.Application;
            }

            trayIcon.DoubleClick += (s, e) => OpenMerchantDashboard();

            // Start Services
            StartServices();

            // Periodic Health Check Timer (Every 10 seconds)
            healthTimer = new System.Windows.Forms.Timer
            {
                Interval = 10000
            };
            healthTimer.Tick += (s, e) => PerformHealthCheck();
            healthTimer.Start();

            // Show Startup Balloon Notification
            trayIcon.ShowBalloonTip(
                4000,
                "AutoPrint is Running",
                "AutoPrint services are active in the background. Double-click to open dashboard.",
                ToolTipIcon.Info
            );

            // Open Dashboard in default browser if not silent startup
            if (!isSilentStartup)
            {
                new Thread(() =>
                {
                    Thread.Sleep(2000);
                    OpenMerchantDashboard();
                }).Start();
            }
        }

        private string ResolveProjectRoot()
        {
            string current = AppDomain.CurrentDomain.BaseDirectory;
            while (!string.IsNullOrEmpty(current))
            {
                if (Directory.Exists(Path.Combine(current, "app", "backend")) ||
                    File.Exists(Path.Combine(current, "package.json")))
                {
                    return current;
                }
                var parent = Directory.GetParent(current);
                if (parent == null) break;
                current = parent.FullName;
            }
            return AppDomain.CurrentDomain.BaseDirectory;
        }

        private void LoadConfiguration()
        {
            // Default locations
            string programData = Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData);
            if (string.IsNullOrEmpty(programData)) programData = "C:\\ProgramData";

            dataDir = Path.Combine(programData, "AutoPrint", "datastore");
            runtimeLogsDir = Path.Combine(programData, "AutoPrint", "logs");

            if (!Directory.Exists(dataDir))
            {
                // Fallback to local project datastore if ProgramData is not yet initialized
                string localData = Path.Combine(projectRoot, "datastore");
                if (Directory.Exists(localData))
                {
                    dataDir = localData;
                    runtimeLogsDir = Path.Combine(projectRoot, "runtime", "logs");
                }
            }

            if (!Directory.Exists(runtimeLogsDir))
            {
                Directory.CreateDirectory(runtimeLogsDir);
            }

            // 1. Try reading C:\ProgramData\AutoPrint\config\appsettings.json
            string appsettingsPath = Path.Combine(programData, "AutoPrint", "config", "appsettings.json");
            if (!File.Exists(appsettingsPath))
            {
                appsettingsPath = Path.Combine(projectRoot, "config", "appsettings.json");
            }

            if (File.Exists(appsettingsPath))
            {
                try
                {
                    string json = File.ReadAllText(appsettingsPath);

                    int p1 = ExtractJsonInt(json, "backend");
                    if (p1 > 0) backendPort = p1;

                    int p2 = ExtractJsonInt(json, "merchant");
                    if (p2 > 0) merchantPort = p2;

                    int p3 = ExtractJsonInt(json, "customer");
                    if (p3 > 0) customerPort = p3;

                    string customData = ExtractJsonString(json, "dataDirectory");
                    if (!string.IsNullOrEmpty(customData)) dataDir = customData;

                    string customLogs = ExtractJsonString(json, "logsDirectory");
                    if (!string.IsNullOrEmpty(customLogs)) runtimeLogsDir = customLogs;

                    string pkEnabled = ExtractJsonString(json, "enabled");
                    if (!string.IsNullOrEmpty(pkEnabled)) isPagekiteEnabled = pkEnabled.Equals("true", StringComparison.OrdinalIgnoreCase);

                    string pkSubdomain = ExtractJsonString(json, "subdomain");
                    if (!string.IsNullOrEmpty(pkSubdomain)) pagekiteName = pkSubdomain;

                    string pkSecret = ExtractJsonString(json, "secret");
                    if (!string.IsNullOrEmpty(pkSecret)) pagekiteSecret = pkSecret;
                }
                catch { }
            }

            // 2. Override from local .env if present
            try
            {
                string envFile = Path.Combine(projectRoot, ".env");
                if (File.Exists(envFile))
                {
                    foreach (var line in File.ReadAllLines(envFile))
                    {
                        var trimmed = line.Trim();
                        if (trimmed.StartsWith("#") || !trimmed.Contains("=")) continue;
                        var parts = trimmed.Split(new char[] { '=' }, 2);
                        var key = parts[0].Trim();
                        var val = parts[1].Trim();

                        int p;
                        if (key == "PORT" && int.TryParse(val, out p)) backendPort = p;
                        if (key == "MERCHANT_PORT" && int.TryParse(val, out p)) merchantPort = p;
                        if (key == "CUSTOMER_PORT" && int.TryParse(val, out p)) customerPort = p;
                        if (key == "PAGEKITE_ENABLED") isPagekiteEnabled = !val.Equals("false", StringComparison.OrdinalIgnoreCase);
                        if (key == "PAGEKITE_NAME") pagekiteName = val;
                        if (key == "PAGEKITE_SECRET") pagekiteSecret = val;
                    }
                }
            }
            catch { }
        }

        private int ExtractJsonInt(string json, string key)
        {
            var match = Regex.Match(json, string.Format("\"{0}\"\\s*:\\s*(\\d+)", key), RegexOptions.IgnoreCase);
            if (match.Success)
            {
                int val;
                if (int.TryParse(match.Groups[1].Value, out val)) return val;
            }
            return 0;
        }

        private string ExtractJsonString(string json, string key)
        {
            var match = Regex.Match(json, string.Format("\"{0}\"\\s*:\\s*\"([^\"]*)\"", key), RegexOptions.IgnoreCase);
            if (match.Success)
            {
                return match.Groups[1].Value;
            }
            var boolMatch = Regex.Match(json, string.Format("\"{0}\"\\s*:\\s*(true|false)", key), RegexOptions.IgnoreCase);
            if (boolMatch.Success)
            {
                return boolMatch.Groups[1].Value;
            }
            return null;
        }

        private string FindNodeExecutable()
        {
            // 1. Check standard 64-bit global Node.js installation
            try
            {
                string progFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
                string stdNode = Path.Combine(progFiles, "nodejs", "node.exe");
                if (File.Exists(stdNode)) return stdNode;

                string progFiles86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
                string stdNode86 = Path.Combine(progFiles86, "nodejs", "node.exe");
                if (File.Exists(stdNode86)) return stdNode86;

                string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string userNode = Path.Combine(localApp, "Programs", "nodejs", "node.exe");
                if (File.Exists(userNode)) return userNode;
            }
            catch { }

            // 2. Check Windows Registry
            try
            {
                using (var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Node.js"))
                {
                    if (key != null)
                    {
                        var installPath = key.GetValue("InstallPath") as string;
                        if (!string.IsNullOrEmpty(installPath))
                        {
                            string regNode = Path.Combine(installPath, "node.exe");
                            if (File.Exists(regNode)) return regNode;
                        }
                    }
                }
            }
            catch { }

            // 3. Fallback to system PATH node
            return "node";
        }

        private string FindPythonExecutable()
        {
            // 1. Check bundled runtime python.exe
            string bundledPython = Path.Combine(projectRoot, "runtime", "python", "python.exe");
            if (File.Exists(bundledPython)) return bundledPython;

            // 2. Check .venv
            string venvPython = Path.Combine(projectRoot, ".venv", "Scripts", "python.exe");
            if (File.Exists(venvPython)) return venvPython;

            // 3. Fallback to system PATH
            return "python";
        }

        private void StartServices()
        {
            isStopping = false;
            string nodeExe = FindNodeExecutable();
            string pythonExe = FindPythonExecutable();

            // 1. Backend REST API
            if (!IsPortInUse(backendPort))
            {
                string backendScript = Path.Combine(projectRoot, "app", "backend", "dist", "server.js");
                if (!File.Exists(backendScript))
                {
                    backendScript = Path.Combine(projectRoot, "app", "backend", "src", "server.ts");
                }
                backendProcess = StartBackgroundProcess(nodeExe, string.Format("\"{0}\"", backendScript), "backend.log");
            }

            // 2. Customer Web Kiosk
            if (!IsPortInUse(customerPort))
            {
                string customerServer = Path.Combine(projectRoot, "app", "customer-web", "server.js");
                customerProcess = StartBackgroundProcess(nodeExe, string.Format("\"{0}\"", customerServer), "customer.log");
            }

            // 3. Merchant Desktop Desk
            if (!IsPortInUse(merchantPort))
            {
                string merchantServer = Path.Combine(projectRoot, "app", "merchant-desktop", "server.js");
                merchantProcess = StartBackgroundProcess(nodeExe, string.Format("\"{0}\"", merchantServer), "merchant.log");
            }

            // Note: PageKite customer tunnel is manual only (never auto-started in background).

            trayIcon.Text = "AutoPrint Express — Online";
        }

        private void OpenCustomerTunnelTerminal()
        {
            try
            {
                string tunnelScript = Path.Combine(projectRoot, "Start-Customer-Tunnel.cmd");
                if (!File.Exists(tunnelScript))
                {
                    tunnelScript = Path.Combine(projectRoot, "tools", "pagekite", "Start-Customer-Tunnel.cmd");
                }

                if (File.Exists(tunnelScript))
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = "cmd.exe",
                        Arguments = string.Format("/c \"\"{0}\"\"", tunnelScript),
                        WorkingDirectory = projectRoot,
                        UseShellExecute = true
                    });
                }
                else
                {
                    MessageBox.Show("Start-Customer-Tunnel.cmd was not found in: " + projectRoot, "AutoPrint", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Failed to launch PageKite customer tunnel terminal: " + ex.Message, "AutoPrint Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private Process StartBackgroundProcess(string fileName, string arguments, string logFileName)
        {
            try
            {
                string logFilePath = Path.Combine(runtimeLogsDir, logFileName);

                var psi = new ProcessStartInfo
                {
                    FileName = fileName,
                    Arguments = arguments,
                    WorkingDirectory = projectRoot,
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };

                // Add environment variables
                psi.EnvironmentVariables["PORT"] = backendPort.ToString();
                psi.EnvironmentVariables["MERCHANT_PORT"] = merchantPort.ToString();
                psi.EnvironmentVariables["CUSTOMER_PORT"] = customerPort.ToString();
                psi.EnvironmentVariables["AUTOPRINT_DATA_DIR"] = dataDir;
                psi.EnvironmentVariables["NODE_ENV"] = "production";

                var proc = new Process { StartInfo = psi };

                proc.OutputDataReceived += (s, e) =>
                {
                    if (e.Data != null)
                    {
                        try { File.AppendAllText(logFilePath, string.Format("[{0:HH:mm:ss}] {1}\n", DateTime.Now, e.Data)); } catch { }
                    }
                };
                proc.ErrorDataReceived += (s, e) =>
                {
                    if (e.Data != null)
                    {
                        try { File.AppendAllText(logFilePath, string.Format("[{0:HH:mm:ss}] [ERROR] {1}\n", DateTime.Now, e.Data)); } catch { }
                    }
                };

                proc.Start();
                proc.BeginOutputReadLine();
                proc.BeginErrorReadLine();

                return proc;
            }
            catch (Exception ex)
            {
                try
                {
                    File.AppendAllText(Path.Combine(runtimeLogsDir, "launcher.log"), string.Format("[{0}] Failed to start {1} {2}: {3}\n", DateTime.Now, fileName, arguments, ex.Message));
                }
                catch { }
                return null;
            }
        }

        private void StopServices()
        {
            isStopping = true;

            KillProcessGracefully(backendProcess);
            KillProcessGracefully(customerProcess);
            KillProcessGracefully(merchantProcess);
            KillProcessGracefully(pagekiteProcess);

            // Clean up any remaining processes holding our ports
            KillPortListener(backendPort);
            KillPortListener(customerPort);
            KillPortListener(merchantPort);

            backendProcess = null;
            customerProcess = null;
            merchantProcess = null;
            pagekiteProcess = null;

            trayIcon.Text = "AutoPrint Express — Services Stopped";
        }

        private void RestartServices()
        {
            trayIcon.ShowBalloonTip(2000, "AutoPrint", "Restarting AutoPrint services...", ToolTipIcon.Info);
            StopServices();
            Thread.Sleep(1500);
            StartServices();
            trayIcon.ShowBalloonTip(3000, "AutoPrint", "AutoPrint services restarted successfully.", ToolTipIcon.Info);
        }

        private void PerformHealthCheck()
        {
            if (isStopping) return;

            bool backendOk = IsPortInUse(backendPort);
            bool merchantOk = IsPortInUse(merchantPort);
            bool customerOk = IsPortInUse(customerPort);

            if (!backendOk || !merchantOk || !customerOk)
            {
                StartServices();
            }
        }

        private void ShowServiceStatusDialog()
        {
            bool backendOk = IsPortInUse(backendPort);
            bool merchantOk = IsPortInUse(merchantPort);
            bool customerOk = IsPortInUse(customerPort);

            var sb = new StringBuilder();
            sb.AppendLine("=== AUTOPRINT SERVICE STATUS ===");
            sb.AppendLine();
            sb.AppendLine(string.Format("Backend API (Port {0}):\t{1}", backendPort, backendOk ? "RUNNING (Healthy)" : "STOPPED"));
            sb.AppendLine(string.Format("Merchant Desk (Port {0}):\t{1}", merchantPort, merchantOk ? "RUNNING (Healthy)" : "STOPPED"));
            sb.AppendLine(string.Format("Customer Kiosk (Port {0}):\t{1}", customerPort, customerOk ? "RUNNING (Healthy)" : "STOPPED"));
            sb.AppendLine(string.Format("PageKite Ingress:\t\thttps://{0}.pagekite.me", pagekiteName));
            sb.AppendLine();
            sb.AppendLine(string.Format("Persistent Datastore:\t{0}", dataDir));
            sb.AppendLine(string.Format("Logs Directory:\t\t{0}", runtimeLogsDir));

            MessageBox.Show(sb.ToString(), "AutoPrint System Status", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private void OpenMerchantDashboard()
        {
            try { Process.Start(string.Format("http://localhost:{0}", merchantPort)); } catch { }
        }

        private void OpenCustomerKiosk()
        {
            try { Process.Start(string.Format("http://localhost:{0}", customerPort)); } catch { }
        }

        private void OpenPrinterConfig()
        {
            try { Process.Start(string.Format("http://localhost:{0}", merchantPort)); } catch { }
        }

        private void OpenPaymentSettings()
        {
            try { Process.Start(string.Format("http://localhost:{0}", merchantPort)); } catch { }
        }

        private void OpenLogsDirectory()
        {
            try
            {
                if (Directory.Exists(runtimeLogsDir))
                {
                    Process.Start("explorer.exe", runtimeLogsDir);
                }
            }
            catch { }
        }

        private bool IsAutoStartEnabled()
        {
            try
            {
                using (var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", false))
                {
                    return key != null && key.GetValue("AutoPrint") != null;
                }
            }
            catch { return false; }
        }

        private void ToggleAutoStart()
        {
            try
            {
                using (var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true))
                {
                    if (key == null) return;
                    if (key.GetValue("AutoPrint") != null)
                    {
                        key.DeleteValue("AutoPrint", false);
                        trayIcon.ShowBalloonTip(2000, "AutoPrint", "Removed from Windows startup.", ToolTipIcon.Info);
                    }
                    else
                    {
                        string exePath = Application.ExecutablePath;
                        key.SetValue("AutoPrint", string.Format("\"{0}\" --startup", exePath));
                        trayIcon.ShowBalloonTip(2000, "AutoPrint", "Configured to start automatically with Windows.", ToolTipIcon.Info);
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(string.Format("Failed to update Windows startup registry: {0}", ex.Message), "AutoPrint", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void ExitApplication()
        {
            isStopping = true;
            if (healthTimer != null)
            {
                healthTimer.Stop();
                healthTimer.Dispose();
            }

            StopServices();

            trayIcon.Visible = false;
            trayIcon.Dispose();

            Application.Exit();
        }

        private static bool IsPortInUse(int port)
        {
            try
            {
                using (var client = new TcpClient())
                {
                    var result = client.BeginConnect("127.0.0.1", port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(350);
                    if (!success) return false;
                    client.EndConnect(result);
                    return true;
                }
            }
            catch
            {
                return false;
            }
        }

        private static bool IsProcessRunning(string name)
        {
            try
            {
                foreach (var p in Process.GetProcesses())
                {
                    if (p.ProcessName.IndexOf(name, StringComparison.OrdinalIgnoreCase) >= 0)
                        return true;
                }
            }
            catch { }
            return false;
        }

        private static void KillProcessGracefully(Process proc)
        {
            if (proc == null) return;
            try
            {
                if (!proc.HasExited)
                {
                    proc.Kill();
                    proc.WaitForExit(1000);
                }
            }
            catch { }
            finally
            {
                try { proc.Dispose(); } catch { }
            }
        }

        private static void KillPortListener(int port)
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = string.Format("-NoProfile -Command \"Get-NetTCPConnection -LocalPort {0} -State Listen -ErrorAction SilentlyContinue | ForEach-Object {{ Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }}\"", port),
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                using (var p = Process.Start(psi))
                {
                    if (p != null) p.WaitForExit(2000);
                }
            }
            catch { }
        }
    }
}
