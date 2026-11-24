using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("MatrixEdu - AI Ra Đề & Chấm Thi OMR Tự Động")]
[assembly: AssemblyDescription("Ứng dụng Desktop AI Ra Đề Kiểm Tra & Chấm Phiếu TLTN OMR Chuẩn Bộ GD&ĐT")]
[assembly: AssemblyCompany("MatrixEdu THPT")]
[assembly: AssemblyProduct("MatrixEdu Desktop")]
[assembly: AssemblyVersion("2.5.0.0")]
[assembly: AssemblyFileVersion("2.5.0.0")]

namespace MatrixEduDesktop
{
    public class MainForm : Form
    {
        private readonly string appDir;
        private readonly int port = 3000;
        private readonly string baseUrl;
        private Process serverProcess = null;
        private bool serverOwnedByUs = false;
        private System.Windows.Forms.Timer healthTimer;

        private Label lblStatusBadge;
        private Label lblUrlInfo;
        private TextBox txtLogs;
        private Button btnOpenApp;
        private Button btnOpenBrowser;
        private Button btnOpenData;
        private Button btnCreateShortcut;
        private Button btnStopExit;
        private NotifyIcon trayIcon;
        private ContextMenu trayMenu;

        public MainForm(string[] args)
        {
            this.appDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
            this.baseUrl = "http://localhost:" + this.port;

            InitializeUI();
            StartOrAttachServer();
        }

        private void InitializeUI()
        {
            this.Text = "MatrixEdu Desktop — AI Ra Đề & Chấm Thi OMR (THPT)";
            this.Size = new Size(640, 440);
            this.MinimumSize = new Size(600, 400);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(248, 250, 252);
            this.Font = new Font("Segoe UI", 9.5F, FontStyle.Regular);

            string icoPath = Path.Combine(this.appDir, "favicon.ico");
            if (File.Exists(icoPath))
            {
                try { this.Icon = new Icon(icoPath); } catch { }
            }

            // Header Banner
            Panel headerPanel = new Panel
            {
                Dock = DockStyle.Top,
                Height = 76,
                BackColor = Color.FromArgb(15, 23, 42),
                Padding = new Padding(18, 12, 18, 12)
            };

            Label lblTitle = new Label
            {
                Text = "🎓 MatrixEdu — AI Ra Đề & Chấm Phiếu OMR Tự Động",
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 13F, FontStyle.Bold),
                AutoSize = true,
                Location = new Point(18, 12)
            };

            Label lblSub = new Label
            {
                Text = "Bản chạy trực tiếp trên Windows (Offline / Localhost) — Không phụ thuộc Vercel",
                ForeColor = Color.FromArgb(148, 163, 184),
                Font = new Font("Segoe UI", 9F, FontStyle.Regular),
                AutoSize = true,
                Location = new Point(20, 42)
            };

            headerPanel.Controls.Add(lblTitle);
            headerPanel.Controls.Add(lblSub);

            // Status Card
            Panel statusCard = new Panel
            {
                Location = new Point(18, 90),
                Size = new Size(588, 66),
                Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
                BackColor = Color.White,
                BorderStyle = BorderStyle.FixedSingle
            };

            lblStatusBadge = new Label
            {
                Text = "⏳ Đang khởi động máy chủ MatrixEdu...",
                ForeColor = Color.FromArgb(3, 105, 161),
                Font = new Font("Segoe UI", 10.5F, FontStyle.Bold),
                AutoSize = true,
                Location = new Point(14, 10)
            };

            lblUrlInfo = new Label
            {
                Text = "Địa chỉ truy cập: " + this.baseUrl + "  |  Thư mục: " + this.appDir,
                ForeColor = Color.FromArgb(71, 85, 105),
                Font = new Font("Segoe UI", 8.75F, FontStyle.Regular),
                AutoSize = true,
                Location = new Point(14, 36)
            };

            statusCard.Controls.Add(lblStatusBadge);
            statusCard.Controls.Add(lblUrlInfo);

            // Action Buttons Row 1
            btnOpenApp = new Button
            {
                Text = "🚀 Mở Phần Mềm MatrixEdu (Cửa sổ App)",
                Location = new Point(18, 168),
                Size = new Size(288, 42),
                BackColor = Color.FromArgb(37, 99, 235),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 9.75F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btnOpenApp.FlatAppearance.BorderSize = 0;
            btnOpenApp.Click += (s, e) => OpenAppWindow();

            btnOpenBrowser = new Button
            {
                Text = "🌐 Mở trên Trình duyệt Web mặc định",
                Location = new Point(318, 168),
                Size = new Size(288, 42),
                Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
                BackColor = Color.FromArgb(16, 185, 129),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 9.5F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btnOpenBrowser.FlatAppearance.BorderSize = 0;
            btnOpenBrowser.Click += (s, e) => OpenDefaultBrowser();

            // Action Buttons Row 2
            btnOpenData = new Button
            {
                Text = "📂 Mở Thư mục Đề & Dữ liệu",
                Location = new Point(18, 218),
                Size = new Size(190, 34),
                BackColor = Color.White,
                ForeColor = Color.FromArgb(30, 41, 59),
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 8.75F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btnOpenData.Click += (s, e) =>
            {
                string dataPath = Path.Combine(this.appDir, "data");
                if (!Directory.Exists(dataPath)) dataPath = this.appDir;
                Process.Start("explorer.exe", "\"" + dataPath + "\"");
            };

            btnCreateShortcut = new Button
            {
                Text = "📌 Tạo icon ra Màn hình Desktop",
                Location = new Point(216, 218),
                Size = new Size(202, 34),
                BackColor = Color.White,
                ForeColor = Color.FromArgb(30, 64, 175),
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 8.75F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btnCreateShortcut.Click += (s, e) => CreateDesktopShortcut();

            btnStopExit = new Button
            {
                Text = "⏹ Dừng & Thoát",
                Location = new Point(426, 218),
                Size = new Size(180, 34),
                Anchor = AnchorStyles.Top | AnchorStyles.Right,
                BackColor = Color.FromArgb(220, 38, 38),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 8.75F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btnStopExit.FlatAppearance.BorderSize = 0;
            btnStopExit.Click += (s, e) => StopServerAndExit();

            // Log Box
            Label lblLogs = new Label
            {
                Text = "📋 Nhật ký hoạt động máy chủ:",
                ForeColor = Color.FromArgb(51, 65, 85),
                Font = new Font("Segoe UI", 8.75F, FontStyle.Bold),
                AutoSize = true,
                Location = new Point(18, 260)
            };

            txtLogs = new TextBox
            {
                Location = new Point(18, 282),
                Size = new Size(588, 102),
                Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right,
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.Vertical,
                BackColor = Color.FromArgb(15, 23, 42),
                ForeColor = Color.FromArgb(226, 232, 240),
                Font = new Font("Consolas", 9F, FontStyle.Regular),
                BorderStyle = BorderStyle.FixedSingle
            };

            this.Controls.Add(headerPanel);
            this.Controls.Add(statusCard);
            this.Controls.Add(btnOpenApp);
            this.Controls.Add(btnOpenBrowser);
            this.Controls.Add(btnOpenData);
            this.Controls.Add(btnCreateShortcut);
            this.Controls.Add(btnStopExit);
            this.Controls.Add(lblLogs);
            this.Controls.Add(txtLogs);

            // System Tray Icon
            trayMenu = new ContextMenu();
            trayMenu.MenuItems.Add("🚀 Mở giao diện MatrixEdu", (s, e) => OpenAppWindow());
            trayMenu.MenuItems.Add("🎛 Hiện bảng điều khiển", (s, e) => { this.Show(); this.WindowState = FormWindowState.Normal; this.Activate(); });
            trayMenu.MenuItems.Add("-");
            trayMenu.MenuItems.Add("⏹ Dừng máy chủ & Thoát", (s, e) => StopServerAndExit());

            trayIcon = new NotifyIcon
            {
                Text = "MatrixEdu Desktop (http://localhost:3000)",
                Icon = this.Icon ?? SystemIcons.Application,
                ContextMenu = trayMenu,
                Visible = true
            };
            trayIcon.DoubleClick += (s, e) => OpenAppWindow();

            this.FormClosing += OnMainFormClosing;

            healthTimer = new System.Windows.Forms.Timer { Interval = 4000 };
            healthTimer.Tick += (s, e) => UpdateHealthBadgeAsync();
            healthTimer.Start();
        }

        private void AppendLog(string message)
        {
            if (this.InvokeRequired)
            {
                this.BeginInvoke(new Action<string>(AppendLog), message);
                return;
            }
            string line = "[" + DateTime.Now.ToString("HH:mm:ss") + "] " + message + Environment.NewLine;
            txtLogs.AppendText(line);
        }

        private bool CheckServerHealthy()
        {
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(this.baseUrl + "/api/health");
                req.Timeout = 1200;
                req.Method = "GET";
                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                {
                    return resp.StatusCode == HttpStatusCode.OK;
                }
            }
            catch
            {
                return false;
            }
        }

        private string ResolveNodeExecutable()
        {
            string bundledNode = Path.Combine(this.appDir, "runtime", "node.exe");
            if (File.Exists(bundledNode)) return bundledNode;

            string localNode = Path.Combine(this.appDir, "node.exe");
            if (File.Exists(localNode)) return localNode;

            string progFilesNode = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe");
            if (File.Exists(progFilesNode)) return progFilesNode;

            string progFilesX86Node = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "nodejs", "node.exe");
            if (File.Exists(progFilesX86Node)) return progFilesX86Node;

            return "node.exe";
        }

        private void StartOrAttachServer()
        {
            ThreadPool.QueueUserWorkItem(_ =>
            {
                AppendLog("Đang kiểm tra cổng " + this.port + "...");
                if (CheckServerHealthy())
                {
                    AppendLog("Phát hiện máy chủ MatrixEdu đang chạy sẵn tại " + this.baseUrl);
                    UpdateStatusUI(true, "🟢 Máy chủ MatrixEdu đang hoạt động sẵn sàng (" + this.baseUrl + ")");
                    this.BeginInvoke(new Action(OpenAppWindow));
                    return;
                }

                string serverJs = Path.Combine(this.appDir, "server.js");
                if (!File.Exists(serverJs))
                {
                    AppendLog("❌ Không tìm thấy tệp server.js tại: " + serverJs);
                    UpdateStatusUI(false, "❌ Lỗi: Không tìm thấy tệp server.js trong thư mục ứng dụng!");
                    return;
                }

                string nodeExe = ResolveNodeExecutable();
                AppendLog("Khởi chạy động cơ Node.js: " + nodeExe);

                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo
                    {
                        FileName = nodeExe,
                        Arguments = "\"" + serverJs + "\"",
                        WorkingDirectory = this.appDir,
                        CreateNoWindow = true,
                        UseShellExecute = false,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        StandardOutputEncoding = Encoding.UTF8,
                        StandardErrorEncoding = Encoding.UTF8
                    };

                    serverProcess = new Process { StartInfo = psi, EnableRaisingEvents = true };
                    serverProcess.OutputDataReceived += (s, e) => { if (!string.IsNullOrEmpty(e.Data)) AppendLog(e.Data); };
                    serverProcess.ErrorDataReceived += (s, e) => { if (!string.IsNullOrEmpty(e.Data)) AppendLog("[WARN] " + e.Data); };
                    serverProcess.Start();
                    serverProcess.BeginOutputReadLine();
                    serverProcess.BeginErrorReadLine();
                    serverOwnedByUs = true;

                    for (int i = 0; i < 40; i++)
                    {
                        Thread.Sleep(150);
                        if (CheckServerHealthy())
                        {
                            AppendLog("✅ Máy chủ đã sẵn sàng! Đang mở giao diện phần mềm MatrixEdu...");
                            UpdateStatusUI(true, "🟢 Máy chủ MatrixEdu đang hoạt động (" + this.baseUrl + ")");
                            this.BeginInvoke(new Action(OpenAppWindow));
                            return;
                        }
                    }

                    UpdateStatusUI(false, "⚠️ Máy chủ đang khởi tạo chậm — hãy bấm nút Mở Phần Mềm bên dưới.");
                }
                catch (Exception ex)
                {
                    AppendLog("❌ Lỗi khởi chạy Node.js: " + ex.Message);
                    UpdateStatusUI(false, "❌ Không thể khởi chạy Node.js: " + ex.Message);
                }
            });
        }

        private void UpdateStatusUI(bool ok, string text)
        {
            if (this.InvokeRequired)
            {
                this.BeginInvoke(new Action<bool, string>(UpdateStatusUI), ok, text);
                return;
            }
            lblStatusBadge.Text = text;
            lblStatusBadge.ForeColor = ok ? Color.FromArgb(21, 128, 61) : Color.FromArgb(185, 28, 28);
        }

        private void UpdateHealthBadgeAsync()
        {
            ThreadPool.QueueUserWorkItem(_ =>
            {
                bool ok = CheckServerHealthy();
                UpdateStatusUI(ok, ok
                    ? "🟢 Máy chủ MatrixEdu đang hoạt động (" + this.baseUrl + ")"
                    : "🔴 Máy chủ đang dừng — bấm Mở Phần Mềm để khởi động lại");
            });
        }

        private string FindChromiumBrowser()
        {
            string[] candidates = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Google", "Chrome", "Application", "chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Google", "Chrome", "Application", "chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Google", "Chrome", "Application", "chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft", "Edge", "Application", "msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft", "Edge", "Application", "msedge.exe")
            };
            foreach (string path in candidates)
            {
                if (File.Exists(path)) return path;
            }
            return null;
        }

        public void OpenAppWindow()
        {
            try
            {
                string browser = FindChromiumBrowser();
                if (!string.IsNullOrEmpty(browser))
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = browser,
                        Arguments = "--app=" + this.baseUrl + " --start-maximized",
                        UseShellExecute = true
                    });
                    AppendLog("Đã mở cửa sổ ứng dụng MatrixEdu (" + Path.GetFileName(browser) + ").");
                }
                else
                {
                    OpenDefaultBrowser();
                }
            }
            catch
            {
                OpenDefaultBrowser();
            }
        }

        public void OpenDefaultBrowser()
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = this.baseUrl,
                    UseShellExecute = true
                });
                AppendLog("Đã mở " + this.baseUrl + " trên trình duyệt mặc định.");
            }
            catch (Exception ex)
            {
                MessageBox.Show("Không thể mở trình duyệt: " + ex.Message, "MatrixEdu", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void CreateDesktopShortcut()
        {
            try
            {
                string desktopDir = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string shortcutPath = Path.Combine(desktopDir, "MatrixEdu - AI Ra De & Cham OMR.lnk");
                string exePath = Application.ExecutablePath;
                string icoPath = Path.Combine(this.appDir, "favicon.ico");

                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                object shell = Activator.CreateInstance(shellType);
                object shortcut = shellType.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, shell, new object[] { shortcutPath });
                Type scType = shortcut.GetType();
                scType.InvokeMember("TargetPath", BindingFlags.SetProperty, null, shortcut, new object[] { exePath });
                scType.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, shortcut, new object[] { this.appDir });
                scType.InvokeMember("Description", BindingFlags.SetProperty, null, shortcut, new object[] { "MatrixEdu - AI Ra Đề Kiểm Tra & Chấm Phiếu OMR Tự Động" });
                if (File.Exists(icoPath))
                {
                    scType.InvokeMember("IconLocation", BindingFlags.SetProperty, null, shortcut, new object[] { icoPath });
                }
                scType.InvokeMember("Save", BindingFlags.InvokeMethod, null, shortcut, null);

                AppendLog("✅ Đã tạo biểu tượng ngoài Màn hình Desktop: " + shortcutPath);
                MessageBox.Show("Đã tạo biểu tượng 'MatrixEdu - AI Ra De & Cham OMR' ngoài Màn hình Desktop thành công!", "MatrixEdu Desktop", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Không thể tạo biểu tượng Desktop: " + ex.Message, "MatrixEdu Desktop", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void OnMainFormClosing(object sender, FormClosingEventArgs e)
        {
            CleanupServer();
        }

        private void StopServerAndExit()
        {
            CleanupServer();
            Application.Exit();
        }

        private void CleanupServer()
        {
            try
            {
                if (healthTimer != null) healthTimer.Stop();
                if (trayIcon != null) trayIcon.Visible = false;
                if (serverOwnedByUs && serverProcess != null && !serverProcess.HasExited)
                {
                    serverProcess.Kill();
                    serverProcess.Dispose();
                    serverProcess = null;
                }
            }
            catch { }
        }

        [STAThread]
        public static void Main(string[] args)
        {
            if (args != null && args.Length > 0 && args[0] == "--self-test")
            {
                string appDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
                string serverJs = Path.Combine(appDir, "server.js");
                if (!File.Exists(serverJs))
                {
                    Console.Error.WriteLine("Missing server.js");
                    Environment.Exit(1);
                }
                Console.WriteLine("MatrixEdu.exe self-test OK: " + appDir);
                Environment.Exit(0);
            }
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm(args));
        }
    }
}
