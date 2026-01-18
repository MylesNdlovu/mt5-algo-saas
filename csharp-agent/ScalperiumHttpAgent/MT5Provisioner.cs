using System.Diagnostics;
using System.IO.Compression;

namespace ScalperiumHttpAgent;

/// <summary>
/// Handles MT5 terminal download, installation, and configuration
/// Supports portable mode for isolated instances per account
/// </summary>
public class MT5Provisioner
{
    private readonly string _baseInstallPath;
    private readonly HttpClient _httpClient;

    // Broker MT5 download URLs
    private static readonly Dictionary<string, string> BrokerDownloadUrls = new()
    {
        ["PrimeXBT"] = "https://download.mql5.com/cdn/web/primexbt.trading.services/mt5/primexbt5setup.exe",
        ["Exness"] = "https://download.mql5.com/cdn/web/exness.technologies.ltd/mt5/exness5setup.exe",
        // Add more brokers as needed
    };

    public MT5Provisioner(string baseInstallPath)
    {
        _baseInstallPath = baseInstallPath;
        _httpClient = new HttpClient();
        _httpClient.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    }

    /// <summary>
    /// Provision a new MT5 instance for an account
    /// </summary>
    public async Task<MT5Instance> ProvisionAsync(MT5Credentials credentials)
    {
        Console.WriteLine($"[Provisioner] Starting provisioning for account {credentials.AccountNumber}");

        var instancePath = Path.Combine(_baseInstallPath, $"MT5_{credentials.AccountNumber}");
        var instance = new MT5Instance
        {
            AccountNumber = credentials.AccountNumber,
            Broker = credentials.Broker,
            ServerName = credentials.ServerName,
            InstallPath = instancePath,
            Status = "provisioning"
        };

        try
        {
            // Step 1: Download MT5 installer
            Console.WriteLine($"[Provisioner] Downloading {credentials.Broker} MT5...");
            var installerPath = await DownloadInstallerAsync(credentials.Broker);

            // Step 2: Install in portable mode
            Console.WriteLine($"[Provisioner] Installing to {instancePath}...");
            await InstallPortableAsync(installerPath, instancePath);

            // Step 3: Configure login
            Console.WriteLine($"[Provisioner] Configuring login...");
            await ConfigureLoginAsync(instance, credentials);

            // Step 4: Start MT5
            Console.WriteLine($"[Provisioner] Starting MT5 terminal...");
            await StartTerminalAsync(instance);

            instance.Status = "running";
            Console.WriteLine($"[Provisioner] Successfully provisioned account {credentials.AccountNumber}");

            return instance;
        }
        catch (Exception ex)
        {
            instance.Status = "error";
            instance.Error = ex.Message;
            Console.WriteLine($"[Provisioner] ERROR: {ex.Message}");
            throw;
        }
    }

    private async Task<string> DownloadInstallerAsync(string broker)
    {
        if (!BrokerDownloadUrls.TryGetValue(broker, out var url))
        {
            throw new Exception($"Unknown broker: {broker}. Supported: {string.Join(", ", BrokerDownloadUrls.Keys)}");
        }

        var downloadDir = Path.Combine(_baseInstallPath, "downloads");
        Directory.CreateDirectory(downloadDir);

        var installerPath = Path.Combine(downloadDir, $"{broker.ToLower()}_mt5setup.exe");

        // Check if already downloaded
        if (File.Exists(installerPath))
        {
            var fileInfo = new FileInfo(installerPath);
            // Re-download if older than 7 days or too small
            if (fileInfo.LastWriteTime > DateTime.Now.AddDays(-7) && fileInfo.Length > 1_000_000)
            {
                Console.WriteLine($"[Provisioner] Using cached installer: {installerPath}");
                return installerPath;
            }
        }

        Console.WriteLine($"[Provisioner] Downloading from {url}...");

        var response = await _httpClient.GetAsync(url, HttpCompletionOption.ResponseHeadersRead);
        response.EnsureSuccessStatusCode();

        var totalBytes = response.Content.Headers.ContentLength ?? 0;

        await using var contentStream = await response.Content.ReadAsStreamAsync();
        await using var fileStream = new FileStream(installerPath, FileMode.Create, FileAccess.Write, FileShare.None);

        var buffer = new byte[81920];
        var totalRead = 0L;
        int bytesRead;

        while ((bytesRead = await contentStream.ReadAsync(buffer)) > 0)
        {
            await fileStream.WriteAsync(buffer.AsMemory(0, bytesRead));
            totalRead += bytesRead;

            if (totalBytes > 0)
            {
                var progress = (int)((totalRead * 100) / totalBytes);
                Console.Write($"\r[Provisioner] Download progress: {progress}% ({totalRead / 1024 / 1024}MB)");
            }
        }

        Console.WriteLine();
        Console.WriteLine($"[Provisioner] Download complete: {installerPath}");

        return installerPath;
    }

    private async Task InstallPortableAsync(string installerPath, string targetPath)
    {
        // Create target directory
        Directory.CreateDirectory(targetPath);

        // MT5 installer supports /portable and /silent switches
        var args = $"/auto /portable /dir:\"{targetPath}\"";

        Console.WriteLine($"[Provisioner] Running: {installerPath} {args}");

        var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = installerPath,
                Arguments = args,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            }
        };

        process.Start();

        // Wait for installation (with timeout)
        var completed = await Task.Run(() => process.WaitForExit(300000)); // 5 min timeout

        if (!completed)
        {
            process.Kill();
            throw new Exception("MT5 installation timed out after 5 minutes");
        }

        // Wait for files to be written
        await Task.Delay(2000);

        // Verify installation
        var terminal64 = Path.Combine(targetPath, "terminal64.exe");
        var terminal32 = Path.Combine(targetPath, "terminal.exe");

        if (!File.Exists(terminal64) && !File.Exists(terminal32))
        {
            throw new Exception($"MT5 installation failed - terminal not found in {targetPath}");
        }

        Console.WriteLine($"[Provisioner] MT5 installed successfully to {targetPath}");
    }

    private async Task ConfigureLoginAsync(MT5Instance instance, MT5Credentials credentials)
    {
        // Create config directory
        var configDir = Path.Combine(instance.InstallPath, "config");
        Directory.CreateDirectory(configDir);

        // Create server.ini with login credentials
        // MT5 uses common.ini for auto-login
        var commonIniPath = Path.Combine(configDir, "common.ini");

        var iniContent = $@"[Common]
Login={credentials.Login}
Server={credentials.ServerName}
Password={credentials.Password}
AutoLogin=1
KeepLogin=1

[Charts]
ProfileLast=Default

[Experts]
AutoTrading=1
AllowDllImport=1
AllowLiveTrading=1
Enabled=1
";

        await File.WriteAllTextAsync(commonIniPath, iniContent);

        // Create a startup script that passes the config
        instance.TerminalPath = File.Exists(Path.Combine(instance.InstallPath, "terminal64.exe"))
            ? Path.Combine(instance.InstallPath, "terminal64.exe")
            : Path.Combine(instance.InstallPath, "terminal.exe");

        instance.ConfigPath = commonIniPath;

        Console.WriteLine($"[Provisioner] Login configured for server {credentials.ServerName}");
    }

    private async Task StartTerminalAsync(MT5Instance instance)
    {
        // Start MT5 with portable mode and config
        var args = $"/portable /config:\"{instance.ConfigPath}\"";

        Console.WriteLine($"[Provisioner] Starting: {instance.TerminalPath} {args}");

        var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = instance.TerminalPath,
                Arguments = args,
                UseShellExecute = false,
                WorkingDirectory = instance.InstallPath
            }
        };

        process.Start();
        instance.ProcessId = process.Id;

        // Wait for terminal to initialize
        await Task.Delay(5000);

        // Check if process is still running
        try
        {
            var runningProcess = Process.GetProcessById(process.Id);
            if (!runningProcess.HasExited)
            {
                Console.WriteLine($"[Provisioner] MT5 terminal started (PID: {process.Id})");
                instance.Status = "running";
            }
            else
            {
                throw new Exception("MT5 terminal exited unexpectedly");
            }
        }
        catch (ArgumentException)
        {
            throw new Exception("MT5 terminal failed to start");
        }
    }

    /// <summary>
    /// Stop an MT5 instance
    /// </summary>
    public async Task StopInstanceAsync(MT5Instance instance)
    {
        if (instance.ProcessId > 0)
        {
            try
            {
                var process = Process.GetProcessById(instance.ProcessId);
                process.CloseMainWindow();

                // Wait for graceful shutdown
                var closed = await Task.Run(() => process.WaitForExit(10000));

                if (!closed)
                {
                    process.Kill();
                }

                instance.Status = "stopped";
                instance.ProcessId = 0;

                Console.WriteLine($"[Provisioner] MT5 instance stopped for account {instance.AccountNumber}");
            }
            catch (ArgumentException)
            {
                // Process already exited
                instance.Status = "stopped";
                instance.ProcessId = 0;
            }
        }
    }

    /// <summary>
    /// Check if an MT5 instance is running
    /// </summary>
    public bool IsInstanceRunning(MT5Instance instance)
    {
        if (instance.ProcessId <= 0) return false;

        try
        {
            var process = Process.GetProcessById(instance.ProcessId);
            return !process.HasExited;
        }
        catch
        {
            return false;
        }
    }
}

public class MT5Credentials
{
    public string AccountNumber { get; set; } = "";
    public string Broker { get; set; } = "";
    public string ServerName { get; set; } = "";
    public string Login { get; set; } = "";
    public string Password { get; set; } = "";
}

public class MT5Instance
{
    public string AccountNumber { get; set; } = "";
    public string Broker { get; set; } = "";
    public string ServerName { get; set; } = "";
    public string InstallPath { get; set; } = "";
    public string TerminalPath { get; set; } = "";
    public string ConfigPath { get; set; } = "";
    public int ProcessId { get; set; }
    public string Status { get; set; } = "unknown";
    public string? Error { get; set; }
}
