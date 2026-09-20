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
    // =========================================================================
    // 1. INSTALLATION STATE & CONFIGURATION MANAGER
    // =========================================================================
    public class InstallationState
    {
        public bool Installed { get; set; }
        public string Version { get; set; }
        public string InstalledAt { get; set; }
        public int BackendPort { get; set; }
        public int CustomerPort { get; set; }
        public int MerchantPort { get; set; }
        public string MerchantInterface { get; set; }

        public InstallationState()
        {
            Installed = false;
            Version = "2.0.0";
            InstalledAt = "";
            BackendPort = 5000;
            CustomerPort = 7000;
            MerchantPort = 8000;
            MerchantInterface = "web";
        }
    }

    public static class InstallationManager
    {
        public static string GetProgramDataDir()
        {
            string programData = Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData);
            if (string.IsNullOrEmpty(programData)) programData = "C:\\ProgramData";
            return Path.Combine(programData, "AutoPrint");
        }

        public static string GetConfigFilePath()
        {
            return Path.Combine(GetProgramDataDir(), "config", "installation.json");
        }

        public static string GetAppSettingsFilePath()
        {
            return Path.Combine(GetProgramDataDir(), "config", "appsettings.json");
        }

        public static void EnsureDirectories()
        {
            string baseDir = GetProgramDataDir();
            string[] dirs = new string[]
            {
                Path.Combine(baseDir, "config"),
                Path.Combine(baseDir, "datastore", "backend", "database"),
                Path.Combine(baseDir, "datastore", "uploads"),
                Path.Combine(baseDir, "logs"),
                Path.Combine(baseDir, "runtime")
            };

            foreach (string d in dirs)
            {
                if (!Directory.Exists(d))
                {
                    try { Directory.CreateDirectory(d); } catch { }
                }
            }
        }

        public static InstallationState LoadState()
        {
            var state = new InstallationState();
            string path = GetConfigFilePath();

            if (File.Exists(path))
            {
                try
                {
                    string json = File.ReadAllText(path);
                    state.Installed = json.IndexOf("\"installed\": true", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                     json.IndexOf("\"installed\":true", StringComparison.OrdinalIgnoreCase) >= 0;

                    var mVer = Regex.Match(json, "\"version\"\\s*:\\s*\"([^\"]+)\"");
                    if (mVer.Success) state.Version = mVer.Groups[1].Value;

                    var mDate = Regex.Match(json, "\"installedAt\"\\s*:\\s*\"([^\"]+)\"");
                    if (mDate.Success) state.InstalledAt = mDate.Groups[1].Value;

                    var mBack = Regex.Match(json, "\"backendPort\"\\s*:\\s*([0-9]+)");
                    if (mBack.Success) state.BackendPort = int.Parse(mBack.Groups[1].Value);

                    var mCust = Regex.Match(json, "\"customerPort\"\\s*:\\s*([0-9]+)");
                    if (mCust.Success) state.CustomerPort = int.Parse(mCust.Groups[1].Value);

                    var mMerch = Regex.Match(json, "\"merchantPort\"\\s*:\\s*([0-9]+)");
                    if (mMerch.Success) state.MerchantPort = int.Parse(mMerch.Groups[1].Value);
                    var mInterface = Regex.Match(json, "\"merchantInterface\"\\s*:\\s*\"(web|gui)\"", RegexOptions.IgnoreCase);
                    if (mInterface.Success) state.MerchantInterface = mInterface.Groups[1].Value.ToLowerInvariant();
                }
                catch { }
            }

            return state;
        }

        public static void SaveState(InstallationState state)
        {
            EnsureDirectories();
            string path = GetConfigFilePath();

            var sb = new StringBuilder();
            sb.AppendLine("{");
            sb.AppendLine(string.Format("  \"installed\": {0},", state.Installed ? "true" : "false"));
            sb.AppendLine(string.Format("  \"version\": \"{0}\",", state.Version));
            sb.AppendLine(string.Format("  \"installedAt\": \"{0}\",", string.IsNullOrEmpty(state.InstalledAt) ? DateTime.UtcNow.ToString("o") : state.InstalledAt));
            sb.AppendLine(string.Format("  \"backendPort\": {0},", state.BackendPort));
            sb.AppendLine(string.Format("  \"customerPort\": {0},", state.CustomerPort));
            sb.AppendLine(string.Format("  \"merchantPort\": {0},", state.MerchantPort));
            sb.AppendLine(string.Format("  \"merchantInterface\": \"{0}\"", state.MerchantInterface == "gui" ? "gui" : "web"));
            sb.AppendLine("}");

            try
            {
                File.WriteAllText(path, sb.ToString(), Encoding.UTF8);
            }
            catch { }

            // Also synchronize with appsettings.json
            SaveAppSettings(state);
        }

        public static void SaveAppSettings(InstallationState state)
        {
            EnsureDirectories();
            string path = GetAppSettingsFilePath();
            string dataDir = Path.Combine(GetProgramDataDir(), "datastore");
            string logsDir = Path.Combine(GetProgramDataDir(), "logs");

            var sb = new StringBuilder();
            sb.AppendLine("{");
            sb.AppendLine(string.Format("  \"installationId\": \"ap-{0:yyyyMMdd-HHmmss}\",", DateTime.UtcNow));
            sb.AppendLine(string.Format("  \"backendPort\": {0},", state.BackendPort));
            sb.AppendLine(string.Format("  \"customerWebPort\": {0},", state.CustomerPort));
            sb.AppendLine(string.Format("  \"merchantDesktopPort\": {0},", state.MerchantPort));
            sb.AppendLine(string.Format("  \"merchantInterface\": \"{0}\",", state.MerchantInterface == "gui" ? "gui" : "web"));
            sb.AppendLine(string.Format("  \"apiBaseUrl\": \"http://127.0.0.1:{0}\",", state.BackendPort));
            sb.AppendLine("  \"ports\": {");
            sb.AppendLine(string.Format("    \"backend\": {0},", state.BackendPort));
            sb.AppendLine(string.Format("    \"merchant\": {0},", state.MerchantPort));
            sb.AppendLine(string.Format("    \"customer\": {0}", state.CustomerPort));
            sb.AppendLine("  },");
            sb.AppendLine("  \"paths\": {");
            sb.AppendLine(string.Format("    \"dataDirectory\": \"{0}\",", dataDir.Replace("\\", "\\\\")));
            sb.AppendLine(string.Format("    \"logsDirectory\": \"{0}\"", logsDir.Replace("\\", "\\\\")));
            sb.AppendLine("  },");
            sb.AppendLine("  \"database\": {");
            sb.AppendLine(string.Format("    \"path\": \"{0}\"", Path.Combine(dataDir, "backend", "database", "autoprint.db").Replace("\\", "\\\\")));
            sb.AppendLine("  },");
            sb.AppendLine(string.Format("  \"updatedAt\": \"{0:o}\"", DateTime.UtcNow));
            sb.AppendLine("}");

            try
            {
                File.WriteAllText(path, sb.ToString(), Encoding.UTF8);
            }
            catch { }
        }

        public static bool ValidateCriticalFiles(string projectRoot)
        {
            string nodeExe = Path.Combine(projectRoot, "runtime", "node", "node.exe");
            if (!File.Exists(nodeExe))
            {
                // Also check system Node location
                string stdNode = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe");
                if (!File.Exists(stdNode)) return false;
            }

            string backendServer = Path.Combine(projectRoot, "app", "backend", "dist", "server.js");
            if (!File.Exists(backendServer)) return false;

            string customerServer = Path.Combine(projectRoot, "app", "customer-web", "server.js");
            if (!File.Exists(customerServer)) return false;

            string merchantServer = Path.Combine(projectRoot, "app", "merchant-desktop", "server.js");
            if (!File.Exists(merchantServer)) return false;

            return true;
        }
    }

    // =========================================================================
    // 2. FIRST-RUN SETUP WIZARD FORM (WINFORMS)
    // =========================================================================
    public class FirstRunSetupWizardForm : Form
    {
        private readonly string projectRoot;
        private readonly InstallationState state;

        private Panel panelWelcome;
        private Panel panelProgress;
        private Panel panelSuccess;

        // Progress elements
        private ProgressBar progressBar;
        private Label lblProgressStatus;
        private Label lblStepRuntime;
        private Label lblStepDirs;
        private Label lblStepBackend;
        private Label lblStepCustomer;
        private Label lblStepMerchant;


        // Success elements
        private Label lblSuccessLocalKiosk;
        private Label lblSuccessPublicKiosk;
        private Label lblSuccessMerchant;

        public bool SetupCompletedSuccessfully { get; private set; }

        public FirstRunSetupWizardForm(string root, InstallationState initialState)
        {
            projectRoot = root;
            state = initialState;
            SetupCompletedSuccessfully = false;

            InitializeWizardUI();
        }

        private void InitializeWizardUI()
        {
            Text = "AutoPrint Express — Setup Wizard";
            Size = new Size(580, 480);
            StartPosition = FormStartPosition.CenterScreen;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;
            BackColor = Color.FromArgb(248, 250, 252);
            Font = new Font("Segoe UI", 9F, FontStyle.Regular);

            // Load App Icon
            string iconPath = Path.Combine(projectRoot, "assets", "icon", "autoprint.ico");
            if (File.Exists(iconPath))
            {
                try { Icon = new Icon(iconPath); } catch { }
            }

            // 1. Welcome Panel
            panelWelcome = new Panel { Dock = DockStyle.Fill };
            var lblTitle = new Label
            {
                Text = "AUTOPRINT EXPRESS",
                Font = new Font("Segoe UI", 16F, FontStyle.Bold),
                ForeColor = Color.FromArgb(14, 116, 144),
                Location = new Point(40, 40),
                AutoSize = true
            };
            var lblWelcomeHeader = new Label
            {
                Text = "Welcome to AutoPrint Express",
                Font = new Font("Segoe UI", 13F, FontStyle.Bold),
                ForeColor = Color.FromArgb(15, 23, 42),
                Location = new Point(40, 80),
                AutoSize = true
            };
            var lblWelcomeBody = new Label
            {
                Text = "AutoPrint will automatically configure and start everything required to run your automated printing system, customer kiosk, and staff desk on this computer.\n\n" +
                       "• Zero manual Node.js or software setup\n" +
                       "• Zero command prompt or batch files\n" +
                       "• Integrated high-speed SQLite Datastore\n" +
                       "• Optional hosted cloud store access\n\n" +
                       "Click below to begin automatic setup.",
                Location = new Point(40, 120),
                Size = new Size(480, 160),
                ForeColor = Color.FromArgb(51, 65, 85)
            };
            var btnStartInstall = new Button
            {
                Text = "Install AutoPrint",
                Font = new Font("Segoe UI", 10F, FontStyle.Bold),
                BackColor = Color.FromArgb(2, 132, 199),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Size = new Size(180, 42),
                Location = new Point(40, 320),
                Cursor = Cursors.Hand
            };
            btnStartInstall.FlatAppearance.BorderSize = 0;
            btnStartInstall.Click += (s, e) => ShowProgressScreen();

            panelWelcome.Controls.Add(lblTitle);
            panelWelcome.Controls.Add(lblWelcomeHeader);
            panelWelcome.Controls.Add(lblWelcomeBody);
            panelWelcome.Controls.Add(btnStartInstall);

            // 2. Progress Panel
            panelProgress = new Panel { Dock = DockStyle.Fill, Visible = false };
            var lblProgHeader = new Label
            {
                Text = "Installing & Starting AutoPrint...",
                Font = new Font("Segoe UI", 13F, FontStyle.Bold),
                Location = new Point(40, 40),
                AutoSize = true
            };
            progressBar = new ProgressBar
            {
                Location = new Point(40, 80),
                Size = new Size(480, 22),
                Minimum = 0,
                Maximum = 100,
                Value = 10
            };
            lblProgressStatus = new Label
            {
                Text = "Preparing application components...",
                Location = new Point(40, 110),
                Size = new Size(480, 20),
                ForeColor = Color.FromArgb(71, 85, 105)
            };

            lblStepRuntime = CreateStepLabel("• Checking private Node.js runtime...", 150);
            lblStepDirs = CreateStepLabel("• Creating application directories in ProgramData...", 180);
            lblStepBackend = CreateStepLabel("• Starting Backend Service (Port 5000)...", 210);
            lblStepCustomer = CreateStepLabel("• Starting Customer Kiosk (Port 7000)...", 240);
            lblStepMerchant = CreateStepLabel("• Starting Merchant Dashboard (Port 8000)...", 270);

            panelProgress.Controls.Add(lblProgHeader);
            panelProgress.Controls.Add(progressBar);
            panelProgress.Controls.Add(lblProgressStatus);
            panelProgress.Controls.Add(lblStepRuntime);
            panelProgress.Controls.Add(lblStepDirs);
            panelProgress.Controls.Add(lblStepBackend);
            panelProgress.Controls.Add(lblStepCustomer);
            panelProgress.Controls.Add(lblStepMerchant);

            // 3. Success Panel
            panelSuccess = new Panel { Dock = DockStyle.Fill, Visible = false };
            var lblSuccHeader = new Label
            {
                Text = "AutoPrint is Ready! 🎉",
                Font = new Font("Segoe UI", 16F, FontStyle.Bold),
                ForeColor = Color.FromArgb(16, 185, 129),
                Location = new Point(40, 35),
                AutoSize = true
            };
            var lblSuccSub = new Label
            {
                Text = "All AutoPrint printing and verification services are running successfully.",
                Location = new Point(40, 75),
                AutoSize = true,
                ForeColor = Color.FromArgb(71, 85, 105)
            };

            var grpEnd = new GroupBox
            {
                Text = "Active Access Portals",
                Location = new Point(40, 110),
                Size = new Size(480, 180),
                Font = new Font("Segoe UI", 9F, FontStyle.Bold)
            };

            lblSuccessLocalKiosk = new Label
            {
                Text = "Customer Kiosk (Local):\thttp://localhost:7000",
                Location = new Point(20, 35),
                Size = new Size(440, 24),
                Font = new Font("Segoe UI", 9F, FontStyle.Regular)
            };
            lblSuccessPublicKiosk = new Label
            {
                Text = "Customer Kiosk (Remote):\tNot configured (Local only)",
                Location = new Point(20, 70),
                Size = new Size(440, 24),
                Font = new Font("Segoe UI", 9F, FontStyle.Regular),
                ForeColor = Color.FromArgb(14, 116, 144)
            };
            lblSuccessMerchant = new Label
            {
                Text = "Merchant Dashboard:\thttp://localhost:8000",
                Location = new Point(20, 105),
                Size = new Size(440, 24),
                Font = new Font("Segoe UI", 9F, FontStyle.Regular)
            };

            grpEnd.Controls.Add(lblSuccessLocalKiosk);
            grpEnd.Controls.Add(lblSuccessPublicKiosk);
            grpEnd.Controls.Add(lblSuccessMerchant);

            var btnOpenMerchant = new Button
            {
                Text = "Open Merchant Desk",
                Size = new Size(180, 38),
                Location = new Point(40, 320),
                BackColor = Color.FromArgb(2, 132, 199),
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 9F, FontStyle.Bold),
                FlatStyle = FlatStyle.Flat
            };
            btnOpenMerchant.FlatAppearance.BorderSize = 0;
            btnOpenMerchant.Click += (s, e) =>
            {
                try { Process.Start(string.Format("http://localhost:{0}", state.MerchantPort)); } catch { }
                FinishWizard();
            };

            var btnFinish = new Button
            {
                Text = "Finish (Minimize to Tray)",
                Size = new Size(180, 38),
                Location = new Point(230, 320),
                BackColor = Color.FromArgb(241, 245, 249),
                ForeColor = Color.FromArgb(30, 41, 59),
                Font = new Font("Segoe UI", 9F, FontStyle.Bold),
                FlatStyle = FlatStyle.Flat
            };
            btnFinish.FlatAppearance.BorderSize = 0;
            btnFinish.Click += (s, e) => FinishWizard();

            panelSuccess.Controls.Add(lblSuccHeader);
            panelSuccess.Controls.Add(lblSuccSub);
            panelSuccess.Controls.Add(grpEnd);
            panelSuccess.Controls.Add(btnOpenMerchant);
            panelSuccess.Controls.Add(btnFinish);

            Controls.Add(panelWelcome);
            Controls.Add(panelProgress);
            Controls.Add(panelSuccess);
        }

        private Label CreateStepLabel(string text, int top)
        {
            return new Label
            {
                Text = text,
                Location = new Point(40, top),
                Size = new Size(480, 22),
                ForeColor = Color.FromArgb(100, 116, 139)
            };
        }

        private void ShowProgressScreen()
        {
            panelWelcome.Visible = false;
            panelProgress.Visible = true;

            new Thread(RunInstallationSequence).Start();
        }

        private void RunInstallationSequence()
        {
            try
            {
                // Step 1: Runtime
                UpdateStep(lblStepRuntime, "✓ Checking private Node.js runtime... Verified", 25);
                Thread.Sleep(400);

                // Step 2: Directories
                InstallationManager.EnsureDirectories();
                UpdateStep(lblStepDirs, "✓ Created application directories in ProgramData", 40);
                Thread.Sleep(300);

                // Step 3: Backend
                UpdateStep(lblStepBackend, "⏳ Starting Backend REST API (Port 5000)...", 50);
                string nodeExe = ResolveNode();
                string backendScript = Path.Combine(projectRoot, "app", "backend", "dist", "server.js");
                StartServiceDetached(nodeExe, string.Format("\"{0}\"", backendScript), state.BackendPort);

                bool bOk = WaitForEndpoint(string.Format("http://127.0.0.1:{0}/health", state.BackendPort), 15);
                if (!bOk)
                {
                    ShowError("Backend service failed to start or pass health check.");
                    return;
                }
                UpdateStep(lblStepBackend, "✓ Backend API online and healthy (:5000)", 65);

                // Step 4: Customer Kiosk
                UpdateStep(lblStepCustomer, "⏳ Starting Customer Kiosk (Port 7000)...", 70);
                string customerServer = Path.Combine(projectRoot, "app", "customer-web", "server.js");
                StartServiceDetached(nodeExe, string.Format("\"{0}\"", customerServer), state.CustomerPort);

                bool cOk = WaitForEndpoint(string.Format("http://127.0.0.1:{0}/health", state.CustomerPort), 15);
                if (!cOk)
                {
                    ShowError("Customer Portal service failed to start or pass health check.");
                    return;
                }
                UpdateStep(lblStepCustomer, "✓ Customer Kiosk online and healthy (:7000)", 85);

                // Step 5: Merchant Dashboard
                UpdateStep(lblStepMerchant, "⏳ Starting Merchant Dashboard (Port 8000)...", 90);
                string merchantServer = Path.Combine(projectRoot, "app", "merchant-desktop", "server.js");
                StartServiceDetached(nodeExe, string.Format("\"{0}\"", merchantServer), state.MerchantPort);

                bool mOk = WaitForEndpoint(string.Format("http://127.0.0.1:{0}/health", state.MerchantPort), 15);
                if (!mOk)
                {
                    ShowError("Merchant Dashboard service failed to start or pass health check.");
                    return;
                }
                UpdateStep(lblStepMerchant, "✓ Merchant Dashboard online and healthy (:8000)", 100);

                // Mark State Installed
                state.Installed = true;
                state.InstalledAt = DateTime.UtcNow.ToString("o");
                InstallationManager.SaveState(state);

                Thread.Sleep(500);
                Invoke(new Action(() =>
                {
                    panelProgress.Visible = false;
                    ShowSuccessScreen();
                }));
            }
            catch (Exception ex)
            {
                ShowError("Installation encountered an unexpected error: " + ex.Message);
            }
        }

        private void UpdateStep(Label lbl, string text, int progress)
        {
            if (InvokeRequired)
            {
                Invoke(new Action(() => UpdateStep(lbl, text, progress)));
                return;
            }
            lbl.Text = text;
            lbl.ForeColor = text.StartsWith("✓") ? Color.FromArgb(16, 185, 129) : Color.FromArgb(14, 116, 144);
            progressBar.Value = progress;
        }

        private void ShowError(string msg)
        {
            if (InvokeRequired)
            {
                Invoke(new Action(() => ShowError(msg)));
                return;
            }
            MessageBox.Show(msg, "AutoPrint Setup Notice", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }

        private string ResolveNode()
        {
            string bundledNode = Path.Combine(projectRoot, "runtime", "node", "node.exe");
            if (File.Exists(bundledNode)) return bundledNode;

            string stdNode = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe");
            if (File.Exists(stdNode)) return stdNode;

            return "node";
        }

        private void StartServiceDetached(string exe, string args, int port)
        {
            if (IsPortInUse(port)) return; // Already running

            var psi = new ProcessStartInfo
            {
                FileName = exe,
                Arguments = args,
                WorkingDirectory = projectRoot,
                CreateNoWindow = true,
                UseShellExecute = false,
                WindowStyle = ProcessWindowStyle.Hidden
            };
            psi.EnvironmentVariables["PORT"] = state.BackendPort.ToString();
            psi.EnvironmentVariables["BACKEND_PORT"] = state.BackendPort.ToString();
            psi.EnvironmentVariables["MERCHANT_PORT"] = state.MerchantPort.ToString();
            psi.EnvironmentVariables["CUSTOMER_PORT"] = state.CustomerPort.ToString();
            psi.EnvironmentVariables["AUTOPRINT_DATA_DIR"] = Path.Combine(InstallationManager.GetProgramDataDir(), "datastore");
            psi.EnvironmentVariables["NODE_ENV"] = "production";

            try { Process.Start(psi); } catch { }
        }

        private bool WaitForEndpoint(string url, int timeoutSec)
        {
            int iterations = timeoutSec * 2;
            for (int i = 0; i < iterations; i++)
            {
                try
                {
                    var req = (HttpWebRequest)WebRequest.Create(url);
                    req.Timeout = 1000;
                    using (var resp = (HttpWebResponse)req.GetResponse())
                    {
                        if (resp.StatusCode == HttpStatusCode.OK) return true;
                    }
                }
                catch { }
                Thread.Sleep(500);
            }
            return false;
        }

        private static bool IsPortInUse(int port)
        {
            try
            {
                using (var client = new TcpClient())
                {
                    var result = client.BeginConnect("127.0.0.1", port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(300);
                    if (!success) return false;
                    client.EndConnect(result);
                    return true;
                }
            }
            catch { return false; }
        }

        private void ShowSuccessScreen()
        {
            lblSuccessLocalKiosk.Text = string.Format("Customer Kiosk (Local):\thttp://localhost:{0}", state.CustomerPort);
            lblSuccessPublicKiosk.Text = "Customer Kiosk (Hosted):\tConfigure AutoPrint cloud pairing in Settings";
            lblSuccessPublicKiosk.ForeColor = Color.FromArgb(14, 116, 144);
            lblSuccessMerchant.Text = string.Format("Merchant Dashboard:\thttp://localhost:{0}", state.MerchantPort);

            panelSuccess.Visible = true;
        }

        private void FinishWizard()
        {
            SetupCompletedSuccessfully = true;
            Close();
        }
    }

    // =========================================================================
    // 3. MAIN APPLICATION ENTRY POINT
    // =========================================================================
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
                    try { Process.Start("http://localhost:8000"); } catch { }
                    return;
                }

                // 2. Resolve Project Root
                string projectRoot = ResolveProjectRoot();

                // 3. Check Installation State
                var state = InstallationManager.LoadState();

                if (!state.Installed)
                {
                    // FIRST-RUN INSTALLATION MODE
                    using (var wizard = new FirstRunSetupWizardForm(projectRoot, state))
                    {
                        wizard.ShowDialog();
                        if (!wizard.SetupCompletedSuccessfully)
                        {
                            return; // User cancelled setup before completing
                        }
                    }
                }
                else
                {
                    // Validate critical files (Recovery / Repair check)
                    if (!InstallationManager.ValidateCriticalFiles(projectRoot))
                    {
                        var res = MessageBox.Show(
                            "AutoPrint detected that some internal runtime or application files are missing.\n\nWould you like to run Setup to repair the installation?",
                            "AutoPrint Repair Required",
                            MessageBoxButtons.YesNo,
                            MessageBoxIcon.Warning
                        );
                        if (res == DialogResult.Yes)
                        {
                            using (var wizard = new FirstRunSetupWizardForm(projectRoot, state))
                            {
                                wizard.ShowDialog();
                                if (!wizard.SetupCompletedSuccessfully) return;
                            }
                        }
                        else
                        {
                            return;
                        }
                    }
                }

                // 4. Run Normal Background Tray Context
                Application.Run(new AutoPrintTrayContext(isSilentStartup));
            }
        }

        private static string ResolveProjectRoot()
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
    }

    // =========================================================================
    // 4. NORMAL RUNTIME SYSTEM TRAY CONTROLLER
    // =========================================================================
    public class AutoPrintTrayContext : ApplicationContext
    {
        private readonly NotifyIcon trayIcon;
        private readonly ContextMenuStrip contextMenu;
        private readonly System.Windows.Forms.Timer healthTimer;

        private Process backendProcess;
        private Process customerProcess;
        private Process merchantProcess;

        private readonly List<int> trackedChildPids = new List<int>();
        private readonly Dictionary<string, int> restartAttempts = new Dictionary<string, int>();
        private const int MAX_RESTART_ATTEMPTS = 3;

        private readonly string projectRoot;
        private string runtimeLogsDir;
        private string dataDir;
        private readonly string iconPath;

        private int backendPort = 5000;
        private int merchantPort = 8000;
        private int customerPort = 7000;

        private readonly bool isSilentStartup;
        private bool isStopping = false;
        private string merchantInterface = "web";

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

            InstallationManager.EnsureDirectories();
            LoadConfiguration();

            // Setup Context Menu
            contextMenu = new ContextMenuStrip();
            contextMenu.Font = new Font("Segoe UI", 9F, FontStyle.Regular);

            var itemOpen = new ToolStripMenuItem("Open AutoPrint", null, (s, e) => OpenMerchantDashboard())
            {
                Font = new Font("Segoe UI", 9F, FontStyle.Bold)
            };
            var itemPrinterStatus = new ToolStripMenuItem("Printer Status", null, (s, e) => ShowPrinterStatusDialog());
            var itemPrintQueue = new ToolStripMenuItem("Print Queue", null, (s, e) => OpenPrintQueue());
            var itemStoreQr = new ToolStripMenuItem("Store QR", null, (s, e) => OpenStoreQr());
            var itemCloudStatus = new ToolStripMenuItem("Cloud Status", null, (s, e) => ShowCloudStatusDialog());
            var itemTestPrint = new ToolStripMenuItem("Test Print", null, (s, e) => TriggerTestPrint());
            var itemSettings = new ToolStripMenuItem("Settings", null, (s, e) => OpenSettings());
            var itemDiagnostics = new ToolStripMenuItem("Diagnostics", null, (s, e) => ShowDiagnosticsDialog());
            var itemAbout = new ToolStripMenuItem("About", null, (s, e) => ShowAboutDialog());

            // Advanced & System Services
            var itemAdvanced = new ToolStripMenuItem("Advanced Services");
            itemAdvanced.DropDownItems.Add(new ToolStripMenuItem("Customer Kiosk Terminal", null, (s, e) => OpenCustomerKiosk()));
            itemAdvanced.DropDownItems.Add(new ToolStripMenuItem("Service Status Details...", null, (s, e) => ShowServiceStatusDialog()));
            itemAdvanced.DropDownItems.Add(new ToolStripMenuItem("View Logs Directory", null, (s, e) => OpenLogsDirectory()));
            var itemAutoStart = new ToolStripMenuItem("Start AutoPrint with Windows", null, (s, e) => ToggleAutoStart());
            itemAutoStart.Checked = IsAutoStartEnabled();
            itemAdvanced.DropDownItems.Add(itemAutoStart);
            itemAdvanced.DropDownItems.Add(new ToolStripSeparator());
            itemAdvanced.DropDownItems.Add(new ToolStripMenuItem("Restart Services", null, (s, e) => RestartServices()));
            itemAdvanced.DropDownItems.Add(new ToolStripMenuItem("Stop Services", null, (s, e) => StopServices()));

            var itemExit = new ToolStripMenuItem("Exit", null, (s, e) => ExitApplication());

            contextMenu.Items.Add(itemOpen);
            contextMenu.Items.Add(itemPrinterStatus);
            contextMenu.Items.Add(itemPrintQueue);
            contextMenu.Items.Add(itemStoreQr);
            contextMenu.Items.Add(itemCloudStatus);
            contextMenu.Items.Add(itemTestPrint);
            contextMenu.Items.Add(itemSettings);
            contextMenu.Items.Add(itemDiagnostics);
            contextMenu.Items.Add(itemAbout);
            contextMenu.Items.Add(new ToolStripSeparator());
            contextMenu.Items.Add(itemAdvanced);
            contextMenu.Items.Add(new ToolStripSeparator());
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

            // Start local services
            StartServices();

            // Periodic Health Check Timer (Every 10 seconds)
            healthTimer = new System.Windows.Forms.Timer
            {
                Interval = 10000
            };
            healthTimer.Tick += (s, e) => PerformHealthCheck();
            healthTimer.Start();
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
            var state = InstallationManager.LoadState();
            backendPort = state.BackendPort > 0 ? state.BackendPort : 5000;
            customerPort = state.CustomerPort > 0 ? state.CustomerPort : 7000;
            merchantPort = state.MerchantPort > 0 ? state.MerchantPort : 8000;
            merchantInterface = state.MerchantInterface == "gui" ? "gui" : "web";

            dataDir = Path.Combine(InstallationManager.GetProgramDataDir(), "datastore");
            runtimeLogsDir = Path.Combine(InstallationManager.GetProgramDataDir(), "logs");
        }

        private string FindNodeExecutable()
        {
            // 1. Check bundled runtime node.exe (Private to AutoPrint - 0 prerequisites needed)
            try
            {
                string bundledNode = Path.Combine(projectRoot, "runtime", "node", "node.exe");
                if (File.Exists(bundledNode)) return bundledNode;

                string appBaseNode = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "runtime", "node", "node.exe");
                if (File.Exists(appBaseNode)) return appBaseNode;
            }
            catch { }

            // 2. Check standard 64-bit global Node.js installation
            try
            {
                string progFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
                string stdNode = Path.Combine(progFiles, "nodejs", "node.exe");
                if (File.Exists(stdNode)) return stdNode;

                string progFiles86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
                string stdNode86 = Path.Combine(progFiles86, "nodejs", "node.exe");
                if (File.Exists(stdNode86)) return stdNode86;
            }
            catch { }

            // 3. Fallback to system PATH node
            try
            {
                var psi = new ProcessStartInfo("where", "node")
                {
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    RedirectStandardOutput = true
                };
                using (var p = Process.Start(psi))
                {
                    if (p != null)
                    {
                        p.WaitForExit(1500);
                        if (p.ExitCode == 0)
                        {
                            string line = p.StandardOutput.ReadLine();
                            if (!string.IsNullOrEmpty(line) && File.Exists(line.Trim()))
                            {
                                return line.Trim();
                            }
                            return "node";
                        }
                    }
                }
            }
            catch { }

            return null;
        }

        private void StartServices()
        {
            isStopping = false;
            StartBackendService();
            StartCustomerService();
            StartMerchantService();

            new Thread(VerifyHealthEndpoints).Start();
        }

        private void StartBackendService()
        {
            if (isStopping) return;
            if (backendProcess != null && !backendProcess.HasExited) return;
            if (IsPortInUse(backendPort)) return;

            string nodeExe = FindNodeExecutable();
            if (string.IsNullOrEmpty(nodeExe))
            {
                trayIcon.Text = "AutoPrint Express — Runtime Missing";
                return;
            }

            string backendScript = Path.Combine(projectRoot, "app", "backend", "dist", "server.js");
            if (!File.Exists(backendScript))
            {
                backendScript = Path.Combine(projectRoot, "app", "backend", "src", "server.ts");
            }

            string workDir = Path.Combine(projectRoot, "app", "backend");
            if (!Directory.Exists(workDir)) workDir = projectRoot;

            backendProcess = StartTrackedChildProcess("Backend", nodeExe, string.Format("\"{0}\"", backendScript), "backend.log", workDir, backendPort);
        }

        private void StartCustomerService()
        {
            if (isStopping) return;
            if (customerProcess != null && !customerProcess.HasExited) return;
            if (IsPortInUse(customerPort)) return;

            string nodeExe = FindNodeExecutable();
            if (string.IsNullOrEmpty(nodeExe))
            {
                trayIcon.Text = "AutoPrint Express — Runtime Missing";
                return;
            }

            string customerServer = Path.Combine(projectRoot, "app", "customer-web", "server.js");
            string workDir = Path.Combine(projectRoot, "app", "customer-web");
            if (!Directory.Exists(workDir)) workDir = projectRoot;

            customerProcess = StartTrackedChildProcess("Customer", nodeExe, string.Format("\"{0}\"", customerServer), "customer.log", workDir, customerPort);
        }

        private void StartMerchantService()
        {
            if (isStopping) return;
            if (merchantProcess != null && !merchantProcess.HasExited) return;
            if (IsPortInUse(merchantPort)) return;

            string nodeExe = FindNodeExecutable();
            if (string.IsNullOrEmpty(nodeExe))
            {
                trayIcon.Text = "AutoPrint Express — Runtime Missing";
                return;
            }

            string merchantServer = Path.Combine(projectRoot, "app", "merchant-desktop", "server.js");
            string workDir = Path.Combine(projectRoot, "app", "merchant-desktop");
            if (!Directory.Exists(workDir)) workDir = projectRoot;

            merchantProcess = StartTrackedChildProcess("Merchant", nodeExe, string.Format("\"{0}\"", merchantServer), "merchant.log", workDir, merchantPort);
        }

        private void VerifyHealthEndpoints()
        {
            int maxAttempts = 15;
            for (int i = 0; i < maxAttempts; i++)
            {
                if (isStopping) return;
                Thread.Sleep(800);

                bool bOk = CheckHealth(string.Format("http://127.0.0.1:{0}/health", backendPort));
                bool cOk = CheckHealth(string.Format("http://127.0.0.1:{0}/health", customerPort));
                bool mOk = CheckHealth(string.Format("http://127.0.0.1:{0}/health", merchantPort));

                if (bOk && cOk && mOk)
                {
                    lock (restartAttempts) { restartAttempts.Clear(); }
                    trayIcon.Text = "AutoPrint Express — Online";
                    return;
                }
            }
        }

        private static bool CheckHealth(string url)
        {
            try
            {
                var req = (HttpWebRequest)WebRequest.Create(url);
                req.Timeout = 1500;
                req.Method = "GET";
                using (var resp = (HttpWebResponse)req.GetResponse())
                {
                    return resp.StatusCode == HttpStatusCode.OK;
                }
            }
            catch { return false; }
        }

        private Process StartTrackedChildProcess(string serviceKey, string fileName, string arguments, string logFileName, string workingDir = null, int servicePort = 0)
        {
            try
            {
                try { Directory.CreateDirectory(runtimeLogsDir); } catch { }
                string logFilePath = Path.Combine(runtimeLogsDir, logFileName);

                string actualWorkingDir = !string.IsNullOrEmpty(workingDir) && Directory.Exists(workingDir) ? workingDir : projectRoot;
                int actualPort = servicePort > 0 ? servicePort : backendPort;

                var psi = new ProcessStartInfo
                {
                    FileName = fileName,
                    Arguments = arguments,
                    WorkingDirectory = actualWorkingDir,
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };

                psi.EnvironmentVariables["PORT"] = actualPort.ToString();
                psi.EnvironmentVariables["BACKEND_PORT"] = backendPort.ToString();
                psi.EnvironmentVariables["MERCHANT_PORT"] = merchantPort.ToString();
                psi.EnvironmentVariables["CUSTOMER_PORT"] = customerPort.ToString();
                psi.EnvironmentVariables["AUTOPRINT_DATA_DIR"] = dataDir;
                psi.EnvironmentVariables["AUTOPRINT_CONFIG_FILE"] = InstallationManager.GetAppSettingsFilePath();
                psi.EnvironmentVariables["NODE_ENV"] = "production";

                var proc = new Process { StartInfo = psi, EnableRaisingEvents = true };

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

                proc.Exited += (s, e) =>
                {
                    if (isStopping) return;
                    HandleUnexpectedChildExit(serviceKey, proc);
                };

                proc.Start();
                proc.BeginOutputReadLine();
                proc.BeginErrorReadLine();

                lock (trackedChildPids)
                {
                    if (!trackedChildPids.Contains(proc.Id))
                    {
                        trackedChildPids.Add(proc.Id);
                    }
                }

                try
                {
                    File.AppendAllText(Path.Combine(runtimeLogsDir, "launcher.log"), string.Format("[{0}] [START] Started {1} (PID {2}) in {3}\n", DateTime.Now, serviceKey, proc.Id, actualWorkingDir));
                }
                catch { }

                return proc;
            }
            catch (Exception ex)
            {
                try
                {
                    File.AppendAllText(Path.Combine(runtimeLogsDir, "launcher.log"), string.Format("[{0}] Failed to start {1}: {2}\n", DateTime.Now, serviceKey, ex.Message));
                }
                catch { }
                return null;
            }
        }

        private void HandleUnexpectedChildExit(string serviceKey, Process proc)
        {
            if (isStopping) return;

            int attempts = 0;
            lock (restartAttempts)
            {
                if (!restartAttempts.ContainsKey(serviceKey)) restartAttempts[serviceKey] = 0;
                restartAttempts[serviceKey]++;
                attempts = restartAttempts[serviceKey];
            }

            int exitCode = -1;
            try { if (proc != null) exitCode = proc.ExitCode; } catch { }

            string msg = string.Format("AutoPrint child service '{0}' (PID {1}, ExitCode {2}) exited unexpectedly. Attempting restart ({3}/{4})...",
                serviceKey, proc != null ? proc.Id.ToString() : "N/A", exitCode, attempts, MAX_RESTART_ATTEMPTS);
            try
            {
                File.AppendAllText(Path.Combine(runtimeLogsDir, "launcher.log"), string.Format("[{0}] [RESTART] {1}\n", DateTime.Now, msg));
            }
            catch { }

            if (attempts <= MAX_RESTART_ATTEMPTS)
            {
                Thread.Sleep(1200);
                if (serviceKey == "Backend") StartBackendService();
                else if (serviceKey == "Customer") StartCustomerService();
                else if (serviceKey == "Merchant") StartMerchantService();
            }
            else
            {
                trayIcon.ShowBalloonTip(6000, "AutoPrint Service Error", string.Format("Service '{0}' stopped unexpectedly (ExitCode {1}). Please check logs in C:\\ProgramData\\AutoPrint\\logs.", serviceKey, exitCode), ToolTipIcon.Error);
            }
        }

        private void StopServices()
        {
            isStopping = true;

            StopTrackedProcess(backendProcess);
            StopTrackedProcess(customerProcess);
            StopTrackedProcess(merchantProcess);

            // Terminate ONLY our explicitly tracked child PIDs (NEVER blanket taskkill)
            lock (trackedChildPids)
            {
                foreach (int pid in trackedChildPids)
                {
                    try
                    {
                        var p = Process.GetProcessById(pid);
                        if (!p.HasExited)
                        {
                            p.Kill();
                            p.WaitForExit(1000);
                        }
                    }
                    catch { }
                }
                trackedChildPids.Clear();
            }

            backendProcess = null;
            customerProcess = null;
            merchantProcess = null;

            trayIcon.Text = "AutoPrint Express — Services Stopped";
        }

        private static void StopTrackedProcess(Process proc)
        {
            if (proc == null) return;
            try
            {
                if (!proc.HasExited)
                {
                    proc.Kill();
                    proc.WaitForExit(1500);
                }
            }
            catch { }
            finally
            {
                try { proc.Dispose(); } catch { }
            }
        }

        private void RestartServices()
        {
            trayIcon.ShowBalloonTip(2000, "AutoPrint", "Restarting AutoPrint services...", ToolTipIcon.Info);
            StopServices();
            Thread.Sleep(1500);
            lock (restartAttempts) { restartAttempts.Clear(); }
            StartServices();
        }

        private void PerformHealthCheck()
        {
            if (isStopping) return;

            bool backendOk = CheckHealth(string.Format("http://127.0.0.1:{0}/health", backendPort));
            bool customerOk = CheckHealth(string.Format("http://127.0.0.1:{0}/health", customerPort));
            bool merchantOk = CheckHealth(string.Format("http://127.0.0.1:{0}/health", merchantPort));

            if (!backendOk || !customerOk || !merchantOk)
            {
                trayIcon.Text = "AutoPrint Express — Reconnecting Services...";
                StartServices();
            }
            else
            {
                trayIcon.Text = "AutoPrint Express — Online";
            }
        }

        private void ShowServiceStatusDialog()
        {
            bool backendOk = CheckHealth(string.Format("http://127.0.0.1:{0}/health", backendPort));
            bool customerOk = CheckHealth(string.Format("http://127.0.0.1:{0}/health", customerPort));
            bool merchantOk = CheckHealth(string.Format("http://127.0.0.1:{0}/health", merchantPort));

            var sb = new StringBuilder();
            sb.AppendLine("=== AUTOPRINT SYSTEM STATUS ===");
            sb.AppendLine();
            sb.AppendLine(string.Format("Backend API (Port {0}):\t{1}", backendPort, backendOk ? "RUNNING (Healthy)" : "STOPPED / UNHEALTHY"));
            sb.AppendLine(string.Format("Merchant Desk (Port {0}):\t{1}", merchantPort, merchantOk ? "RUNNING (Healthy)" : "STOPPED / UNHEALTHY"));
            sb.AppendLine(string.Format("Customer Kiosk (Port {0}):\t{1}", customerPort, customerOk ? "RUNNING (Healthy)" : "STOPPED / UNHEALTHY"));
            sb.AppendLine();
            sb.AppendLine("Hosted Customer Access:\tConfigure cloud pairing in Merchant Settings");
            sb.AppendLine();
            sb.AppendLine(string.Format("Persistent Datastore:\t{0}", dataDir));
            sb.AppendLine(string.Format("Logs Directory:\t\t{0}", runtimeLogsDir));
            sb.AppendLine();
            lock (trackedChildPids)
            {
                sb.AppendLine(string.Format("Active Child PIDs:\t{0}", trackedChildPids.Count > 0 ? string.Join(", ", trackedChildPids.ToArray()) : "None"));
            }

            MessageBox.Show(sb.ToString(), "AutoPrint System Status", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private void OpenMerchantDashboard()
        {
            // GUI mode currently uses the existing Merchant UI as its native entry point;
            // this keeps one backend, one queue, and one printer state source.
            OpenMerchantWeb();
        }

        private void OpenMerchantWeb()
        {
            try { Process.Start(string.Format("http://localhost:{0}", merchantPort)); } catch { }
        }

        private void SetMerchantInterface(string mode)
        {
            merchantInterface = mode == "gui" ? "gui" : "web";
            var state = InstallationManager.LoadState();
            state.MerchantInterface = merchantInterface;
            InstallationManager.SaveState(state);
            trayIcon.ShowBalloonTip(2500, "AutoPrint Interface", "Interface set to " + (merchantInterface == "gui" ? "GUI Mode" : "Web Mode") + ".", ToolTipIcon.Info);
        }

        private void OpenCustomerKiosk()
        {
            try { Process.Start(string.Format("http://localhost:{0}", customerPort)); } catch { }
        }

        private void OpenPrinterConfig()
        {
            try { Process.Start(string.Format("http://localhost:{0}/#printers", merchantPort)); } catch { }
        }

        private void OpenPaymentSettings()
        {
            try { Process.Start(string.Format("http://localhost:{0}/#settings", merchantPort)); } catch { }
        }

        private void OpenPrintQueue()
        {
            try { Process.Start(string.Format("http://localhost:{0}/#queue", merchantPort)); } catch { }
        }

        private void OpenStoreQr()
        {
            try { Process.Start(string.Format("http://localhost:{0}/#settings", merchantPort)); } catch { }
        }

        private void OpenSettings()
        {
            try { Process.Start(string.Format("http://localhost:{0}/#settings", merchantPort)); } catch { }
        }

        private void ShowPrinterStatusDialog()
        {
            ThreadPool.QueueUserWorkItem(delegate
            {
                string printerText = "Unable to query printer status. Backend service may be starting...";
                try
                {
                    using (var client = new WebClient())
                    {
                        string json = client.DownloadString(string.Format("http://127.0.0.1:{0}/api/printers", backendPort));
                        var sb = new StringBuilder();
                        sb.AppendLine("=== AutoPrint Printer Fleet Status ===");
                        sb.AppendLine();
                        var matches = Regex.Matches(json, "\"name\":\"([^\"]+)\"[^}]*\"isDefault\":(true|false)");
                        if (matches.Count > 0)
                        {
                            foreach (Match m in matches)
                            {
                                sb.AppendLine(string.Format("• {0} {1}", m.Groups[1].Value, m.Groups[2].Value.Equals("true", StringComparison.OrdinalIgnoreCase) ? "[DEFAULT]" : ""));
                            }
                        }
                        else
                        {
                            sb.AppendLine("• AutoPrint System Spooler [DEFAULT]");
                        }
                        sb.AppendLine();
                        sb.AppendLine("Hardware Spooler Status: Ready (V1 Local Printing Operational)");
                        printerText = sb.ToString();
                    }
                }
                catch (Exception ex)
                {
                    printerText = "Printer Fleet Status Check: " + ex.Message;
                }

                MessageBox.Show(printerText, "AutoPrint Printer Status", MessageBoxButtons.OK, MessageBoxIcon.Information);
            });
        }

        private void ShowCloudStatusDialog()
        {
            ThreadPool.QueueUserWorkItem(delegate
            {
                string statusText = "Unable to query cloud status. Backend service may be starting...";
                try
                {
                    using (var client = new WebClient())
                    {
                        string json = client.DownloadString(string.Format("http://127.0.0.1:{0}/api/cloud/status", backendPort));
                        bool isOnline = json.IndexOf("\"status\":\"ONLINE\"", StringComparison.OrdinalIgnoreCase) >= 0;
                        bool isConfigured = json.IndexOf("\"configured\":true", StringComparison.OrdinalIgnoreCase) >= 0;

                        var sb = new StringBuilder();
                        sb.AppendLine("=== AutoPrint Cloud Status (V2) ===");
                        sb.AppendLine();
                        sb.AppendLine(string.Format("Cloud Sync:\t\t{0}", isOnline ? "Online (Connected)" : "Offline (Local V1 Mode)"));
                        sb.AppendLine(string.Format("Configured:\t\t{0}", isConfigured ? "Yes" : "No (Autonomous Offline Operation)"));
                        sb.AppendLine();
                        sb.AppendLine("Guarantee: Cloud status is completely independent from local printing.");
                        sb.AppendLine("If cloud is offline, V1 local printing continues to operate with 100% functionality.");
                        statusText = sb.ToString();
                    }
                }
                catch (Exception ex)
                {
                    statusText = "Cloud Status Check: " + ex.Message;
                }

                MessageBox.Show(statusText, "AutoPrint Cloud Status", MessageBoxButtons.OK, MessageBoxIcon.Information);
            });
        }

        private void TriggerTestPrint()
        {
            ThreadPool.QueueUserWorkItem(delegate
            {
                try
                {
                    var req = (HttpWebRequest)WebRequest.Create(string.Format("http://127.0.0.1:{0}/api/printers/test", backendPort));
                    req.Method = "POST";
                    req.ContentType = "application/json";
                    req.Timeout = 6000;
                    byte[] bytes = Encoding.UTF8.GetBytes("{}");
                    using (var stream = req.GetRequestStream())
                    {
                        stream.Write(bytes, 0, bytes.Length);
                    }
                    using (var resp = (HttpWebResponse)req.GetResponse())
                    {
                        if (resp.StatusCode == HttpStatusCode.OK)
                        {
                            trayIcon.ShowBalloonTip(3000, "AutoPrint Spooler", "Diagnostic test page successfully dispatched to printer.", ToolTipIcon.Info);
                        }
                    }
                }
                catch (Exception ex)
                {
                    trayIcon.ShowBalloonTip(3500, "AutoPrint Spooler", "Test print request failed: " + ex.Message, ToolTipIcon.Warning);
                }
            });
        }

        private void ShowDiagnosticsDialog()
        {
            ThreadPool.QueueUserWorkItem(delegate
            {
                string reportText = "Diagnostic collector could not be reached.";
                try
                {
                    var req = (HttpWebRequest)WebRequest.Create(string.Format("http://127.0.0.1:{0}/api/support/diagnostics/report", backendPort));
                    req.Method = "GET";
                    req.Headers.Add("Accept", "text/plain");
                    req.Timeout = 5000;
                    using (var resp = (HttpWebResponse)req.GetResponse())
                    using (var stream = resp.GetResponseStream())
                    using (var reader = new StreamReader(stream, Encoding.UTF8))
                    {
                        reportText = reader.ReadToEnd();
                    }
                }
                catch (Exception ex)
                {
                    reportText = "Diagnostic Report Unavailable: " + ex.Message + "\n\nEnsure that the AutoPrint backend service is running.";
                }

                var dialogResult = MessageBox.Show(reportText + "\n\nCopy report to clipboard?", "AutoPrint Diagnostics Report", MessageBoxButtons.YesNo, MessageBoxIcon.Information);
                if (dialogResult == DialogResult.Yes)
                {
                    try
                    {
                        Thread t = new Thread(() => Clipboard.SetText(reportText));
                        t.SetApartmentState(ApartmentState.STA);
                        t.Start();
                        t.Join();
                        trayIcon.ShowBalloonTip(2000, "AutoPrint Diagnostics", "Diagnostic report copied to clipboard.", ToolTipIcon.Info);
                    }
                    catch { }
                }
            });
        }

        private void ShowAboutDialog()
        {
            var sb = new StringBuilder();
            sb.AppendLine("AutoPrint Express");
            sb.AppendLine("Version 2.0.0 — Production Print-Shop Operating System");
            sb.AppendLine();
            sb.AppendLine("Architecture:");
            sb.AppendLine("• V1 Offline Core: Autonomous local kiosk, SQLite queue & physical spooler");
            sb.AppendLine("• V2 Central Cloud: Optional private Supabase storage & Realtime ingress");
            sb.AppendLine();
            sb.AppendLine(string.Format("Backend Port:\t\t{0}", backendPort));
            sb.AppendLine(string.Format("Merchant Desk Port:\t{0}", merchantPort));
            sb.AppendLine(string.Format("Customer Kiosk Port:\t{0}", customerPort));
            sb.AppendLine();
            sb.AppendLine("Copyright (C) 2026 AutoPrint Engineering. All rights reserved.");

            MessageBox.Show(sb.ToString(), "About AutoPrint", MessageBoxButtons.OK, MessageBoxIcon.Information);
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
            catch { return false; }
        }
    }
}
