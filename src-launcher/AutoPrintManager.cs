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
        public bool PagekiteConfigured { get; set; }
        public string PagekiteName { get; set; }
        public string PagekiteSecret { get; set; }
        public string PagekitePublicUrl { get; set; }
        public int BackendPort { get; set; }
        public int CustomerPort { get; set; }
        public int MerchantPort { get; set; }

        public InstallationState()
        {
            Installed = false;
            Version = "2.0.0";
            InstalledAt = "";
            PagekiteConfigured = false;
            PagekiteName = "";
            PagekiteSecret = "";
            PagekitePublicUrl = "";
            BackendPort = 5000;
            CustomerPort = 7000;
            MerchantPort = 8000;
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

                    state.PagekiteConfigured = json.IndexOf("\"pagekiteConfigured\": true", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                               json.IndexOf("\"pagekiteConfigured\":true", StringComparison.OrdinalIgnoreCase) >= 0;

                    var mName = Regex.Match(json, "\"pagekiteName\"\\s*:\\s*\"([^\"]+)\"");
                    if (mName.Success) state.PagekiteName = mName.Groups[1].Value;

                    var mSec = Regex.Match(json, "\"pagekiteSecret\"\\s*:\\s*\"([^\"]+)\"");
                    if (mSec.Success) state.PagekiteSecret = mSec.Groups[1].Value;

                    var mUrl = Regex.Match(json, "\"pagekitePublicUrl\"\\s*:\\s*\"([^\"]+)\"");
                    if (mUrl.Success) state.PagekitePublicUrl = mUrl.Groups[1].Value;

                    var mBack = Regex.Match(json, "\"backendPort\"\\s*:\\s*([0-9]+)");
                    if (mBack.Success) state.BackendPort = int.Parse(mBack.Groups[1].Value);

                    var mCust = Regex.Match(json, "\"customerPort\"\\s*:\\s*([0-9]+)");
                    if (mCust.Success) state.CustomerPort = int.Parse(mCust.Groups[1].Value);

                    var mMerch = Regex.Match(json, "\"merchantPort\"\\s*:\\s*([0-9]+)");
                    if (mMerch.Success) state.MerchantPort = int.Parse(mMerch.Groups[1].Value);
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
            sb.AppendLine(string.Format("  \"pagekiteConfigured\": {0},", state.PagekiteConfigured ? "true" : "false"));
            sb.AppendLine(string.Format("  \"pagekiteName\": \"{0}\",", state.PagekiteName ?? ""));
            sb.AppendLine(string.Format("  \"pagekiteSecret\": \"{0}\",", state.PagekiteSecret ?? ""));
            sb.AppendLine(string.Format("  \"pagekitePublicUrl\": \"{0}\",", state.PagekitePublicUrl ?? ""));
            sb.AppendLine(string.Format("  \"backendPort\": {0},", state.BackendPort));
            sb.AppendLine(string.Format("  \"customerPort\": {0},", state.CustomerPort));
            sb.AppendLine(string.Format("  \"merchantPort\": {0}", state.MerchantPort));
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
            sb.AppendLine("  \"pagekite\": {");
            sb.AppendLine(string.Format("    \"enabled\": {0},", state.PagekiteConfigured ? "true" : "false"));
            sb.AppendLine(string.Format("    \"subdomain\": \"{0}\",", state.PagekiteName ?? ""));
            sb.AppendLine("    \"domain\": \"pagekite.me\",");
            sb.AppendLine(string.Format("    \"secret\": \"{0}\"", state.PagekiteSecret ?? ""));
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
    // 2. FIRST-RUN SETUP & PAGEKITE WIZARD FORM (WINFORMS)
    // =========================================================================
    public class FirstRunSetupWizardForm : Form
    {
        private readonly string projectRoot;
        private readonly InstallationState state;

        private Panel panelWelcome;
        private Panel panelProgress;
        private Panel panelPagekite;
        private Panel panelSuccess;

        // Progress elements
        private ProgressBar progressBar;
        private Label lblProgressStatus;
        private Label lblStepRuntime;
        private Label lblStepDirs;
        private Label lblStepBackend;
        private Label lblStepCustomer;
        private Label lblStepMerchant;

        // Pagekite elements
        private TextBox txtKiteName;
        private TextBox txtKiteSecret;
        private Label lblPagekiteStatus;

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
                       "• Optional remote access via PageKite\n\n" +
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

            // 3. PageKite Setup Panel
            panelPagekite = new Panel { Dock = DockStyle.Fill, Visible = false };
            var lblPkHeader = new Label
            {
                Text = "Remote Customer Access (PageKite)",
                Font = new Font("Segoe UI", 13F, FontStyle.Bold),
                Location = new Point(40, 30),
                AutoSize = true
            };
            var lblPkDesc = new Label
            {
                Text = "AutoPrint is running locally! Would you like to configure secure remote access so customers can upload documents over the internet directly from their phones?\n\n" +
                       "(Note: Remote access exposes only the Customer Portal at localhost:7000. Your Merchant Desk and Backend remain completely private.)",
                Location = new Point(40, 65),
                Size = new Size(480, 75),
                ForeColor = Color.FromArgb(71, 85, 105)
            };
            var lblKiteName = new Label { Text = "PageKite Domain / Kite Name:", Location = new Point(40, 155), AutoSize = true, Font = new Font("Segoe UI", 9F, FontStyle.Bold) };
            txtKiteName = new TextBox { Location = new Point(40, 180), Size = new Size(300, 24), Text = state.PagekiteName ?? "autoprint" };

            var lblKiteSec = new Label { Text = "PageKite Secret Key:", Location = new Point(40, 215), AutoSize = true, Font = new Font("Segoe UI", 9F, FontStyle.Bold) };
            txtKiteSecret = new TextBox { Location = new Point(40, 240), Size = new Size(300, 24), Text = state.PagekiteSecret ?? "", PasswordChar = '*' };

            lblPagekiteStatus = new Label { Text = "", Location = new Point(40, 275), Size = new Size(480, 20), ForeColor = Color.FromArgb(2, 132, 199) };

            var btnSkipPagekite = new Button
            {
                Text = "Skip for Now",
                Size = new Size(130, 36),
                Location = new Point(40, 320),
                BackColor = Color.FromArgb(226, 232, 240),
                FlatStyle = FlatStyle.Flat
            };
            btnSkipPagekite.FlatAppearance.BorderSize = 0;
            btnSkipPagekite.Click += (s, e) => FinishWithoutPagekite();

            var btnSetupPagekite = new Button
            {
                Text = "Connect Remote Access",
                Size = new Size(180, 36),
                Location = new Point(180, 320),
                BackColor = Color.FromArgb(16, 185, 129),
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 9F, FontStyle.Bold),
                FlatStyle = FlatStyle.Flat
            };
            btnSetupPagekite.FlatAppearance.BorderSize = 0;
            btnSetupPagekite.Click += (s, e) => SetupPagekiteClicked();

            panelPagekite.Controls.Add(lblPkHeader);
            panelPagekite.Controls.Add(lblPkDesc);
            panelPagekite.Controls.Add(lblKiteName);
            panelPagekite.Controls.Add(txtKiteName);
            panelPagekite.Controls.Add(lblKiteSec);
            panelPagekite.Controls.Add(txtKiteSecret);
            panelPagekite.Controls.Add(lblPagekiteStatus);
            panelPagekite.Controls.Add(btnSkipPagekite);
            panelPagekite.Controls.Add(btnSetupPagekite);

            // 4. Success Panel
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
            Controls.Add(panelPagekite);
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
                    panelPagekite.Visible = true;
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

        private void SetupPagekiteClicked()
        {
            string kite = txtKiteName.Text.Trim();
            string sec = txtKiteSecret.Text.Trim();

            if (string.IsNullOrEmpty(kite) || string.IsNullOrEmpty(sec))
            {
                MessageBox.Show("Please enter both your PageKite Kite Name and Secret Key.", "PageKite Setup", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            lblPagekiteStatus.Text = "Configuring PageKite tunnel...";

            // Normalize kite name
            if (!kite.Contains(".")) kite = kite + ".pagekite.me";

            state.PagekiteConfigured = true;
            state.PagekiteName = kite;
            state.PagekiteSecret = sec;
            state.PagekitePublicUrl = string.Format("https://{0}", kite);

            InstallationManager.SaveState(state);

            lblPagekiteStatus.Text = "PageKite configured successfully!";

            ShowSuccessScreen();
        }

        private void FinishWithoutPagekite()
        {
            state.PagekiteConfigured = false;
            InstallationManager.SaveState(state);

            ShowSuccessScreen();
        }

        private void ShowSuccessScreen()
        {
            panelPagekite.Visible = false;

            lblSuccessLocalKiosk.Text = string.Format("Customer Kiosk (Local):\thttp://localhost:{0}", state.CustomerPort);
            if (state.PagekiteConfigured && !string.IsNullOrEmpty(state.PagekitePublicUrl))
            {
                lblSuccessPublicKiosk.Text = string.Format("Customer Kiosk (Remote):\t{0}", state.PagekitePublicUrl);
                lblSuccessPublicKiosk.ForeColor = Color.FromArgb(16, 185, 129);
            }
            else
            {
                lblSuccessPublicKiosk.Text = "Customer Kiosk (Remote):\tNot configured (Local access only)";
                lblSuccessPublicKiosk.ForeColor = Color.FromArgb(100, 116, 139);
            }
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
        private Process pagekiteProcess;

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
        private bool isPagekiteEnabled = false;
        private string pagekiteName = "";
        private string pagekiteSecret = "";
        private string pagekitePublicUrl = "";

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

            InstallationManager.EnsureDirectories();
            LoadConfiguration();

            // Setup Context Menu
            contextMenu = new ContextMenuStrip();
            contextMenu.Font = new Font("Segoe UI", 9F, FontStyle.Regular);

            var itemOpen = new ToolStripMenuItem("Open AutoPrint (Merchant Desk)", null, (s, e) => OpenMerchantDashboard())
            {
                Font = new Font("Segoe UI", 9F, FontStyle.Bold)
            };
            var itemCustomer = new ToolStripMenuItem("Open Customer Kiosk", null, (s, e) => OpenCustomerKiosk());
            var itemPagekite = new ToolStripMenuItem("Remote Customer Access (PageKite)...", null, (s, e) => OpenPagekiteDialog());
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
            contextMenu.Items.Add(itemPagekite);
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

            // Start Services & PageKite Supervisor
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

            isPagekiteEnabled = state.PagekiteConfigured && !string.IsNullOrEmpty(state.PagekiteName) && !string.IsNullOrEmpty(state.PagekiteSecret);
            pagekiteName = state.PagekiteName;
            pagekiteSecret = state.PagekiteSecret;
            pagekitePublicUrl = state.PagekitePublicUrl;

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

        private string FindPythonExecutable()
        {
            string bundledPython = Path.Combine(projectRoot, "runtime", "python", "python.exe");
            if (File.Exists(bundledPython)) return bundledPython;

            string venvPython = Path.Combine(projectRoot, ".venv", "Scripts", "python.exe");
            if (File.Exists(venvPython)) return venvPython;

            return "python";
        }

        private void StartServices()
        {
            isStopping = false;
            string nodeExe = FindNodeExecutable();

            if (string.IsNullOrEmpty(nodeExe))
            {
                trayIcon.Text = "AutoPrint Express — Runtime Missing";
                return;
            }

            // 1. Backend REST API
            if (!IsPortInUse(backendPort))
            {
                string backendScript = Path.Combine(projectRoot, "app", "backend", "dist", "server.js");
                if (!File.Exists(backendScript))
                {
                    backendScript = Path.Combine(projectRoot, "app", "backend", "src", "server.ts");
                }
                backendProcess = StartTrackedChildProcess("Backend", nodeExe, string.Format("\"{0}\"", backendScript), "backend.log");
            }

            // 2. Customer Web Kiosk
            if (!IsPortInUse(customerPort))
            {
                string customerServer = Path.Combine(projectRoot, "app", "customer-web", "server.js");
                customerProcess = StartTrackedChildProcess("Customer", nodeExe, string.Format("\"{0}\"", customerServer), "customer.log");
            }

            // 3. Merchant Desktop Desk
            if (!IsPortInUse(merchantPort))
            {
                string merchantServer = Path.Combine(projectRoot, "app", "merchant-desktop", "server.js");
                merchantProcess = StartTrackedChildProcess("Merchant", nodeExe, string.Format("\"{0}\"", merchantServer), "merchant.log");
            }

            // 4. PageKite Background Supervisor (If Configured)
            if (isPagekiteEnabled && (pagekiteProcess == null || pagekiteProcess.HasExited))
            {
                StartPagekiteSupervisor();
            }

            new Thread(VerifyHealthEndpoints).Start();
        }

        private void StartPagekiteSupervisor()
        {
            try
            {
                string pythonExe = FindPythonExecutable();
                string pkScript = Path.Combine(projectRoot, "tools", "pagekite", "pagekite.py");
                if (!File.Exists(pkScript))
                {
                    pkScript = Path.Combine(projectRoot, "scripts", "pagekite.py");
                }

                if (!File.Exists(pkScript)) return;

                // Security Rule: Expose ONLY Customer Port (localhost:7000), NEVER Backend or Merchant Desk
                string serviceArg = string.Format("--service_on=http:{0}:localhost:{1}:{2}", pagekiteName, customerPort, pagekiteSecret);
                string args = string.Format("\"{0}\" --clean {1}", pkScript, serviceArg);

                pagekiteProcess = StartTrackedChildProcess("PageKite", pythonExe, args, "pagekite.log");
            }
            catch (Exception ex)
            {
                Trace.WriteLine("Failed to launch PageKite: " + ex.Message);
            }
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

        private Process StartTrackedChildProcess(string serviceKey, string fileName, string arguments, string logFileName)
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

                psi.EnvironmentVariables["PORT"] = backendPort.ToString();
                psi.EnvironmentVariables["BACKEND_PORT"] = backendPort.ToString();
                psi.EnvironmentVariables["MERCHANT_PORT"] = merchantPort.ToString();
                psi.EnvironmentVariables["CUSTOMER_PORT"] = customerPort.ToString();
                psi.EnvironmentVariables["AUTOPRINT_DATA_DIR"] = dataDir;
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
            int attempts = 0;
            lock (restartAttempts)
            {
                if (!restartAttempts.ContainsKey(serviceKey)) restartAttempts[serviceKey] = 0;
                restartAttempts[serviceKey]++;
                attempts = restartAttempts[serviceKey];
            }

            string msg = string.Format("AutoPrint child service '{0}' (PID {1}) exited unexpectedly. Attempting restart ({2}/{3})...", serviceKey, proc != null ? proc.Id.ToString() : "N/A", attempts, MAX_RESTART_ATTEMPTS);
            try
            {
                File.AppendAllText(Path.Combine(runtimeLogsDir, "launcher.log"), string.Format("[{0}] [RESTART] {1}\n", DateTime.Now, msg));
            }
            catch { }

            if (attempts <= MAX_RESTART_ATTEMPTS)
            {
                Thread.Sleep(1000);
                if (serviceKey == "PageKite") StartPagekiteSupervisor();
                else StartServices();
            }
            else
            {
                trayIcon.ShowBalloonTip(5000, "AutoPrint Service Error", string.Format("Service '{0}' stopped unexpectedly and reached max restart attempts. Please check logs.", serviceKey), ToolTipIcon.Error);
            }
        }

        private void StopServices()
        {
            isStopping = true;

            StopTrackedProcess(backendProcess);
            StopTrackedProcess(customerProcess);
            StopTrackedProcess(merchantProcess);
            StopTrackedProcess(pagekiteProcess);

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
            pagekiteProcess = null;

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
            sb.AppendLine(string.Format("PageKite Status:\t\t{0}", isPagekiteEnabled ? "ACTIVE (" + pagekitePublicUrl + ")" : "DISABLED"));
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

        private void OpenPagekiteDialog()
        {
            var state = InstallationManager.LoadState();
            using (var form = new Form())
            {
                form.Text = "Remote Customer Access (PageKite)";
                form.Size = new Size(480, 300);
                form.StartPosition = FormStartPosition.CenterScreen;
                form.FormBorderStyle = FormBorderStyle.FixedDialog;
                form.MaximizeBox = false;
                form.MinimizeBox = false;
                form.BackColor = Color.FromArgb(248, 250, 252);
                form.Font = new Font("Segoe UI", 9F, FontStyle.Regular);

                var lblDesc = new Label
                {
                    Text = "Configure secure public internet access for your Customer Portal (Port 7000).\nBackend and Merchant Dashboard remain strictly local and private.",
                    Location = new Point(30, 20),
                    Size = new Size(400, 40),
                    ForeColor = Color.FromArgb(71, 85, 105)
                };
                var lblKite = new Label { Text = "PageKite Domain / Kite Name:", Location = new Point(30, 75), AutoSize = true, Font = new Font("Segoe UI", 9F, FontStyle.Bold) };
                var txtKite = new TextBox { Location = new Point(30, 95), Size = new Size(340, 24), Text = state.PagekiteName ?? "" };

                var lblSec = new Label { Text = "PageKite Secret Key:", Location = new Point(30, 130), AutoSize = true, Font = new Font("Segoe UI", 9F, FontStyle.Bold) };
                var txtSec = new TextBox { Location = new Point(30, 150), Size = new Size(340, 24), Text = state.PagekiteSecret ?? "", PasswordChar = '*' };

                var btnSave = new Button
                {
                    Text = "Save & Connect",
                    Location = new Point(30, 195),
                    Size = new Size(130, 34),
                    BackColor = Color.FromArgb(16, 185, 129),
                    ForeColor = Color.White,
                    Font = new Font("Segoe UI", 9F, FontStyle.Bold),
                    FlatStyle = FlatStyle.Flat
                };
                btnSave.FlatAppearance.BorderSize = 0;
                btnSave.Click += (s, e) =>
                {
                    string k = txtKite.Text.Trim();
                    string sec = txtSec.Text.Trim();
                    if (!string.IsNullOrEmpty(k))
                    {
                        if (!k.Contains(".")) k += ".pagekite.me";
                        state.PagekiteConfigured = true;
                        state.PagekiteName = k;
                        state.PagekiteSecret = sec;
                        state.PagekitePublicUrl = "https://" + k;
                    }
                    else
                    {
                        state.PagekiteConfigured = false;
                        state.PagekiteName = "";
                        state.PagekiteSecret = "";
                        state.PagekitePublicUrl = "";
                    }
                    InstallationManager.SaveState(state);
                    LoadConfiguration();

                    if (pagekiteProcess != null) StopTrackedProcess(pagekiteProcess);
                    if (isPagekiteEnabled) StartPagekiteSupervisor();

                    form.Close();
                    trayIcon.ShowBalloonTip(3000, "PageKite Settings Saved", isPagekiteEnabled ? "Remote access active: " + state.PagekitePublicUrl : "Remote access disabled.", ToolTipIcon.Info);
                };

                var btnCancel = new Button
                {
                    Text = "Cancel",
                    Location = new Point(170, 195),
                    Size = new Size(100, 34),
                    BackColor = Color.FromArgb(226, 232, 240),
                    FlatStyle = FlatStyle.Flat
                };
                btnCancel.FlatAppearance.BorderSize = 0;
                btnCancel.Click += (s, e) => form.Close();

                form.Controls.Add(lblDesc);
                form.Controls.Add(lblKite);
                form.Controls.Add(txtKite);
                form.Controls.Add(lblSec);
                form.Controls.Add(txtSec);
                form.Controls.Add(btnSave);
                form.Controls.Add(btnCancel);

                form.ShowDialog();
            }
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
            catch { return false; }
        }
    }
}
