using System.Diagnostics;
using Microsoft.Extensions.Logging;
using MT5Agent.Core.Interfaces;
using MT5Agent.Core.Models;

namespace MT5Agent.Core.Services;

/// <summary>
/// Manages MT5 terminal instances - provisioning, starting, stopping, monitoring
/// </summary>
public class MT5InstanceManager : IMT5InstanceManager, IDisposable
{
    private readonly ILogger<MT5InstanceManager> _logger;
    private readonly AgentConfiguration _config;
    private readonly IEABridgeClient _eaBridge;
    private readonly List<MT5Instance> _instances = new();
    private readonly object _lock = new();
    private Timer? _monitorTimer;
    private bool _isDisposed;

    public IReadOnlyList<MT5Instance> Instances
    {
        get
        {
            lock (_lock) return _instances.ToList();
        }
    }

    public event EventHandler<InstanceStatusChangedEventArgs>? InstanceStatusChanged;
    public event EventHandler<TradeEventArgs>? TradeOpened;
    public event EventHandler<TradeEventArgs>? TradeClosed;
    public event EventHandler<IndicatorSignalEventArgs>? IndicatorSignalChanged;

    public MT5InstanceManager(
        ILogger<MT5InstanceManager> logger,
        AgentConfiguration config,
        IEABridgeClient eaBridge)
    {
        _logger = logger;
        _config = config;
        _eaBridge = eaBridge;

        // Start monitoring timer
        _monitorTimer = new Timer(
            MonitorInstancesCallback,
            null,
            TimeSpan.FromSeconds(10),
            TimeSpan.FromSeconds(5));
    }

    public async Task<ProvisionResult> ProvisionAccountAsync(MT5AccountCredentials account)
    {
        _logger.LogInformation("Provisioning MT5 for account: {AccountNumber} on {Broker}",
            account.AccountNumber, account.Broker);

        try
        {
            // Check capacity
            if (_instances.Count >= _config.MaxCapacity)
            {
                return new ProvisionResult
                {
                    Success = false,
                    Error = $"Maximum capacity reached ({_config.MaxCapacity} instances)"
                };
            }

            // Check if already exists
            if (_instances.Any(i => i.AccountNumber == account.AccountNumber))
            {
                return new ProvisionResult
                {
                    Success = false,
                    Error = "Account already provisioned"
                };
            }

            // Generate magic number (date-based + sequence)
            var magicNumber = int.Parse(DateTime.UtcNow.ToString("yyyyMMdd")) + _instances.Count;

            // Create portable MT5 folder structure
            var dataFolder = await CreatePortableFolderAsync(account.AccountNumber);

            // Create MT5 configuration files
            await CreateMT5ConfigAsync(dataFolder, account);

            // Copy indicator and EA files
            await CopyMQL5FilesAsync(dataFolder);

            // Create instance
            var instance = new MT5Instance
            {
                AccountNumber = account.AccountNumber,
                Broker = account.Broker,
                ServerName = account.ServerName,
                DataFolder = dataFolder,
                MagicNumber = magicNumber,
                Status = MT5InstanceStatus.Starting,
                StartedAt = DateTime.UtcNow
            };

            lock (_lock)
            {
                _instances.Add(instance);
            }

            // Start MT5 terminal
            var started = await StartMT5ProcessAsync(instance);
            if (!started)
            {
                instance.Status = MT5InstanceStatus.Error;
                instance.LastError = "Failed to start MT5 terminal";
                return new ProvisionResult
                {
                    Success = false,
                    Error = "Failed to start MT5 terminal",
                    Instance = instance
                };
            }

            // Wait for EA bridge to become available (file-based)
            var bridgeReady = await WaitForEABridgeAsync(dataFolder, magicNumber, TimeSpan.FromSeconds(60));
            if (!bridgeReady)
            {
                _logger.LogWarning("EA bridge not ready after 60 seconds for account {AccountNumber}",
                    account.AccountNumber);
                instance.Status = MT5InstanceStatus.Online; // Still online, just bridge not ready
            }
            else
            {
                instance.Status = MT5InstanceStatus.Online;
            }

            _logger.LogInformation("Successfully provisioned MT5 for account: {AccountNumber}",
                account.AccountNumber);

            return new ProvisionResult
            {
                Success = true,
                Instance = instance
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to provision MT5 for account: {AccountNumber}",
                account.AccountNumber);
            return new ProvisionResult
            {
                Success = false,
                Error = ex.Message
            };
        }
    }

    private async Task<string> CreatePortableFolderAsync(string accountNumber)
    {
        var basePath = _config.MT5PortableBasePath;
        var dataFolder = Path.Combine(basePath, accountNumber);

        // Create folder structure
        Directory.CreateDirectory(dataFolder);
        Directory.CreateDirectory(Path.Combine(dataFolder, "MQL5", "Experts"));
        Directory.CreateDirectory(Path.Combine(dataFolder, "MQL5", "Indicators"));
        Directory.CreateDirectory(Path.Combine(dataFolder, "MQL5", "Include"));
        Directory.CreateDirectory(Path.Combine(dataFolder, "MQL5", "Libraries"));
        Directory.CreateDirectory(Path.Combine(dataFolder, "MQL5", "Presets"));
        Directory.CreateDirectory(Path.Combine(dataFolder, "MQL5", "Scripts"));
        Directory.CreateDirectory(Path.Combine(dataFolder, "config"));
        Directory.CreateDirectory(Path.Combine(dataFolder, "logs"));

        _logger.LogDebug("Created portable folder: {DataFolder}", dataFolder);

        return await Task.FromResult(dataFolder);
    }

    private async Task CreateMT5ConfigAsync(string dataFolder, MT5AccountCredentials account)
    {
        // Create common.ini for auto-login
        var commonIni = $@"[Common]
Login={account.Login}
Server={account.ServerName}
ProxyEnable=0

[Experts]
AllowLiveTrading=1
AllowDllImport=1
Enabled=1
Account=0
Profile=0
";
        await File.WriteAllTextAsync(Path.Combine(dataFolder, "config", "common.ini"), commonIni);

        // Create startup script to load EA on XAUUSD chart
        var startupScript = $@"// Auto-generated startup script
#property script_show_inputs
void OnStart()
{{
    // Open XAUUSD chart if not open
    long chart = ChartOpen(""XAUUSD"", PERIOD_M1);
    if(chart > 0)
    {{
        // Attach EA to chart
        ChartSetInteger(chart, CHART_AUTOSCROLL, true);
        ChartSetInteger(chart, CHART_SHIFT, true);
    }}
}}
";
        await File.WriteAllTextAsync(
            Path.Combine(dataFolder, "MQL5", "Scripts", "Startup.mq5"),
            startupScript);

        _logger.LogDebug("Created MT5 config for account: {AccountNumber}", account.AccountNumber);
    }

    private async Task CopyMQL5FilesAsync(string dataFolder)
    {
        var sourcePath = _config.MQL5FilesPath;

        if (!Directory.Exists(sourcePath))
        {
            _logger.LogWarning("MQL5 source files not found at: {Path}", sourcePath);
            return;
        }

        // Copy indicators
        var indicatorsSource = Path.Combine(sourcePath, "Indicators");
        var indicatorsDest = Path.Combine(dataFolder, "MQL5", "Indicators");
        if (Directory.Exists(indicatorsSource))
        {
            foreach (var file in Directory.GetFiles(indicatorsSource, "*.ex5"))
            {
                var destFile = Path.Combine(indicatorsDest, Path.GetFileName(file));
                File.Copy(file, destFile, overwrite: true);
            }
            foreach (var file in Directory.GetFiles(indicatorsSource, "*.mq5"))
            {
                var destFile = Path.Combine(indicatorsDest, Path.GetFileName(file));
                File.Copy(file, destFile, overwrite: true);
            }
        }

        // Copy EAs
        var expertsSource = Path.Combine(sourcePath, "Experts");
        var expertsDest = Path.Combine(dataFolder, "MQL5", "Experts");
        if (Directory.Exists(expertsSource))
        {
            foreach (var file in Directory.GetFiles(expertsSource, "*.ex5"))
            {
                var destFile = Path.Combine(expertsDest, Path.GetFileName(file));
                File.Copy(file, destFile, overwrite: true);
            }
            foreach (var file in Directory.GetFiles(expertsSource, "*.mq5"))
            {
                var destFile = Path.Combine(expertsDest, Path.GetFileName(file));
                File.Copy(file, destFile, overwrite: true);
            }
        }

        // Copy include files
        var includeSource = Path.Combine(sourcePath, "Include");
        var includeDest = Path.Combine(dataFolder, "MQL5", "Include");
        if (Directory.Exists(includeSource))
        {
            foreach (var file in Directory.GetFiles(includeSource, "*.mqh"))
            {
                var destFile = Path.Combine(includeDest, Path.GetFileName(file));
                File.Copy(file, destFile, overwrite: true);
            }
        }

        // Copy library files (DLLs)
        var librariesSource = Path.Combine(sourcePath, "Libraries");
        var librariesDest = Path.Combine(dataFolder, "MQL5", "Libraries");
        Directory.CreateDirectory(librariesDest);
        if (Directory.Exists(librariesSource))
        {
            foreach (var file in Directory.GetFiles(librariesSource, "*.dll"))
            {
                var destFile = Path.Combine(librariesDest, Path.GetFileName(file));
                File.Copy(file, destFile, overwrite: true);
            }
        }

        // Copy preset files
        var presetsSource = Path.Combine(sourcePath, "Presets");
        var presetsDest = Path.Combine(dataFolder, "MQL5", "Presets");
        Directory.CreateDirectory(presetsDest);
        if (Directory.Exists(presetsSource))
        {
            foreach (var file in Directory.GetFiles(presetsSource, "*.set"))
            {
                var destFile = Path.Combine(presetsDest, Path.GetFileName(file));
                File.Copy(file, destFile, overwrite: true);
            }
        }

        _logger.LogDebug("Copied MQL5 files to: {DataFolder}", dataFolder);
        await Task.CompletedTask;
    }

    private async Task<bool> StartMT5ProcessAsync(MT5Instance instance)
    {
        try
        {
            var terminalPath = _config.MT5TerminalPath;

            if (!File.Exists(terminalPath))
            {
                _logger.LogError("MT5 terminal not found at: {Path}", terminalPath);
                return false;
            }

            // Start MT5 in portable mode with data folder
            var startInfo = new ProcessStartInfo
            {
                FileName = terminalPath,
                Arguments = $"/portable \"/datapath:{instance.DataFolder}\"",
                UseShellExecute = false,
                CreateNoWindow = false
            };

            var process = Process.Start(startInfo);
            if (process == null)
            {
                _logger.LogError("Failed to start MT5 process");
                return false;
            }

            instance.ProcessId = process.Id;
            _logger.LogInformation("Started MT5 process {ProcessId} for account {AccountNumber}",
                process.Id, instance.AccountNumber);

            // Wait a bit for MT5 to initialize
            await Task.Delay(5000);

            return !process.HasExited;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting MT5 process for account {AccountNumber}",
                instance.AccountNumber);
            return false;
        }
    }

    private async Task<bool> WaitForEABridgeAsync(string dataFolder, int magicNumber, TimeSpan timeout)
    {
        var deadline = DateTime.UtcNow + timeout;

        while (DateTime.UtcNow < deadline)
        {
            try
            {
                var healthy = await _eaBridge.IsHealthyAsync(dataFolder, magicNumber);
                if (healthy) return true;
            }
            catch
            {
                // Bridge not ready yet
            }

            await Task.Delay(2000);
        }

        return false;
    }

    public async Task<bool> StartInstanceAsync(string accountNumber)
    {
        var instance = GetInstance(accountNumber);
        if (instance == null) return false;

        if (instance.Status == MT5InstanceStatus.Online) return true;

        return await StartMT5ProcessAsync(instance);
    }

    public async Task<bool> StopInstanceAsync(string accountNumber)
    {
        var instance = GetInstance(accountNumber);
        if (instance == null) return false;

        try
        {
            if (instance.ProcessId > 0)
            {
                var process = Process.GetProcessById(instance.ProcessId);
                process.CloseMainWindow();

                // Wait for graceful shutdown
                var exited = process.WaitForExit(10000);
                if (!exited)
                {
                    process.Kill();
                }
            }

            var oldStatus = instance.Status;
            instance.Status = MT5InstanceStatus.Offline;
            instance.ProcessId = 0;

            OnInstanceStatusChanged(accountNumber, oldStatus, MT5InstanceStatus.Offline);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error stopping MT5 instance: {AccountNumber}", accountNumber);
            return false;
        }
    }

    public async Task<bool> RestartInstanceAsync(string accountNumber)
    {
        await StopInstanceAsync(accountNumber);
        await Task.Delay(2000);
        return await StartInstanceAsync(accountNumber);
    }

    public MT5Instance? GetInstance(string accountNumber)
    {
        lock (_lock)
        {
            return _instances.FirstOrDefault(i => i.AccountNumber == accountNumber);
        }
    }

    public async Task<bool> StartEAAsync(string accountNumber)
    {
        var instance = GetInstance(accountNumber);
        if (instance == null || string.IsNullOrEmpty(instance.DataFolder)) return false;

        return await _eaBridge.StartTradingAsync(instance.DataFolder, instance.MagicNumber);
    }

    public async Task<bool> StopEAAsync(string accountNumber)
    {
        var instance = GetInstance(accountNumber);
        if (instance == null || string.IsNullOrEmpty(instance.DataFolder)) return false;

        return await _eaBridge.StopTradingAsync(instance.DataFolder, instance.MagicNumber);
    }

    public async Task<SafetyIndicator> GetIndicatorSignalAsync(string accountNumber)
    {
        var instance = GetInstance(accountNumber);
        if (instance == null || string.IsNullOrEmpty(instance.DataFolder)) return SafetyIndicator.Red;

        return await _eaBridge.GetIndicatorSignalAsync(instance.DataFolder, instance.MagicNumber);
    }

    public async Task<AccountInfo?> GetAccountInfoAsync(string accountNumber)
    {
        var instance = GetInstance(accountNumber);
        if (instance == null || string.IsNullOrEmpty(instance.DataFolder)) return null;

        return await _eaBridge.GetAccountInfoAsync(instance.DataFolder, instance.MagicNumber);
    }

    public async Task<IEnumerable<Trade>> GetOpenTradesAsync(string accountNumber)
    {
        var instance = GetInstance(accountNumber);
        if (instance == null || string.IsNullOrEmpty(instance.DataFolder)) return Enumerable.Empty<Trade>();

        return await _eaBridge.GetOpenPositionsAsync(instance.DataFolder, instance.MagicNumber);
    }

    public async Task ShutdownAllAsync()
    {
        _logger.LogInformation("Shutting down all MT5 instances...");

        var tasks = _instances.Select(i => StopInstanceAsync(i.AccountNumber));
        await Task.WhenAll(tasks);

        lock (_lock)
        {
            _instances.Clear();
        }
    }

    private async void MonitorInstancesCallback(object? state)
    {
        try
        {
            List<MT5Instance> instances;
            lock (_lock)
            {
                instances = _instances.ToList();
            }

            foreach (var instance in instances)
            {
                await MonitorInstanceAsync(instance);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in instance monitor");
        }
    }

    private async Task MonitorInstanceAsync(MT5Instance instance)
    {
        try
        {
            // Check process status
            var processRunning = false;
            if (instance.ProcessId > 0)
            {
                try
                {
                    var process = Process.GetProcessById(instance.ProcessId);
                    processRunning = !process.HasExited;
                    instance.WindowTitle = process.MainWindowTitle;
                }
                catch
                {
                    processRunning = false;
                }
            }

            var oldStatus = instance.Status;

            if (!processRunning && instance.Status == MT5InstanceStatus.Online)
            {
                instance.Status = MT5InstanceStatus.Offline;
                instance.ProcessId = 0;
                OnInstanceStatusChanged(instance.AccountNumber, oldStatus, MT5InstanceStatus.Offline);
                return;
            }

            // Check EA bridge if process is running and we have a data folder
            if (processRunning && !string.IsNullOrEmpty(instance.DataFolder))
            {
                try
                {
                    var healthy = await _eaBridge.IsHealthyAsync(instance.DataFolder, instance.MagicNumber);
                    if (healthy)
                    {
                        // Get account info
                        var accountInfo = await _eaBridge.GetAccountInfoAsync(instance.DataFolder, instance.MagicNumber);
                        if (accountInfo != null)
                        {
                            instance.AccountInfo = accountInfo;
                        }

                        // Get EA status
                        var eaStatus = await _eaBridge.GetEAStatusAsync(instance.DataFolder, instance.MagicNumber);
                        if (eaStatus != null)
                        {
                            instance.EAStatus = eaStatus;
                        }

                        // Get indicator signal and score
                        var oldSignal = instance.IndicatorSignal;
                        var newSignal = await _eaBridge.GetIndicatorSignalAsync(instance.DataFolder, instance.MagicNumber);
                        var newScore = await _eaBridge.GetIndicatorScoreAsync(instance.DataFolder, instance.MagicNumber);
                        if (newSignal != oldSignal)
                        {
                            instance.IndicatorSignal = newSignal;
                            instance.IndicatorScore = newScore;
                            OnIndicatorSignalChanged(instance.AccountNumber, oldSignal, newSignal);
                        }

                        if (instance.Status != MT5InstanceStatus.Online)
                        {
                            instance.Status = MT5InstanceStatus.Online;
                            OnInstanceStatusChanged(instance.AccountNumber, oldStatus, MT5InstanceStatus.Online);
                        }
                    }
                }
                catch
                {
                    // EA bridge not responding, but process is running
                }
            }

            instance.LastActivity = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error monitoring instance: {AccountNumber}", instance.AccountNumber);
        }
    }

    private void OnInstanceStatusChanged(string accountNumber, MT5InstanceStatus oldStatus, MT5InstanceStatus newStatus)
    {
        _logger.LogInformation("Instance {AccountNumber} status changed: {OldStatus} -> {NewStatus}",
            accountNumber, oldStatus, newStatus);
        InstanceStatusChanged?.Invoke(this, new InstanceStatusChangedEventArgs(accountNumber, oldStatus, newStatus));
    }

    private void OnIndicatorSignalChanged(string accountNumber, SafetyIndicator oldSignal, SafetyIndicator newSignal)
    {
        _logger.LogInformation("Instance {AccountNumber} indicator changed: {OldSignal} -> {NewSignal}",
            accountNumber, oldSignal, newSignal);
        IndicatorSignalChanged?.Invoke(this, new IndicatorSignalEventArgs(accountNumber, oldSignal, newSignal));
    }

    public void Dispose()
    {
        if (_isDisposed) return;
        _isDisposed = true;

        _monitorTimer?.Dispose();
    }
}
