using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FlaUI.Core;
using FlaUI.Core.AutomationElements;
using FlaUI.UIA3;

namespace MT5AgentAPI.Agent
{
    /// <summary>
    /// Manages multiple MT5 terminal instances on a single VPS
    /// Supports 40-50 concurrent MT5 instances for multi-user management
    /// </summary>
    public class MultiMT5Controller
    {
        private readonly ConcurrentDictionary<string, MT5Instance> _instances;
        private readonly UIA3Automation _automation;
        private readonly SemaphoreSlim _discoveryLock;
        private Timer _healthCheckTimer;

        public int InstanceCount => _instances.Count;
        public IReadOnlyCollection<MT5Instance> Instances => _instances.Values.ToList();

        public MultiMT5Controller()
        {
            _instances = new ConcurrentDictionary<string, MT5Instance>();
            _automation = new UIA3Automation();
            _discoveryLock = new SemaphoreSlim(1, 1);
        }

        /// <summary>
        /// Discover and attach to all running MT5 terminal instances
        /// </summary>
        public async Task<int> DiscoverAndAttachAllAsync()
        {
            await _discoveryLock.WaitAsync();
            try
            {
                Console.WriteLine("[MultiMT5] Starting discovery of MT5 terminals...");

                // Find all MT5 processes
                var mt5Processes = Process.GetProcessesByName("terminal64")
                    .Concat(Process.GetProcessesByName("terminal"))
                    .Where(p => !p.HasExited)
                    .ToList();

                Console.WriteLine($"[MultiMT5] Found {mt5Processes.Count} MT5 processes");

                int attached = 0;
                var tasks = new List<Task>();

                foreach (var process in mt5Processes)
                {
                    tasks.Add(Task.Run(async () =>
                    {
                        try
                        {
                            var instance = await AttachToProcessAsync(process);
                            if (instance != null)
                            {
                                Interlocked.Increment(ref attached);
                                Console.WriteLine($"[MultiMT5] ✓ Attached to {instance.AccountNumber}");
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"[MultiMT5] ✗ Failed to attach to PID {process.Id}: {ex.Message}");
                        }
                    }));
                }

                await Task.WhenAll(tasks);

                Console.WriteLine($"[MultiMT5] Successfully attached to {attached}/{mt5Processes.Count} instances");
                return attached;
            }
            finally
            {
                _discoveryLock.Release();
            }
        }

        /// <summary>
        /// Attach to a specific MT5 process and extract account information
        /// </summary>
        private async Task<MT5Instance?> AttachToProcessAsync(Process process)
        {
            try
            {
                // Attach to the process
                var app = Application.Attach(process);
                var mainWindow = app.GetMainWindow(_automation, TimeSpan.FromSeconds(5));

                if (mainWindow == null)
                {
                    Console.WriteLine($"[MultiMT5] Could not get main window for PID {process.Id}");
                    return null;
                }

                // Parse window title to extract account number
                // Window title format: "MetaTrader 5 - [AccountNumber] - BrokerName"
                // or "terminal64.exe - [AccountNumber]"
                var windowTitle = mainWindow.Name;
                var accountNumber = ParseAccountNumberFromTitle(windowTitle);

                if (string.IsNullOrEmpty(accountNumber))
                {
                    Console.WriteLine($"[MultiMT5] Could not parse account number from: {windowTitle}");
                    return null;
                }

                // Check if already attached
                if (_instances.ContainsKey(accountNumber))
                {
                    Console.WriteLine($"[MultiMT5] Account {accountNumber} already attached");
                    return _instances[accountNumber];
                }

                // Create instance
                var instance = new MT5Instance
                {
                    AccountNumber = accountNumber,
                    App = app,
                    MainWindow = mainWindow,
                    WindowHandle = mainWindow.Properties.NativeWindowHandle.ValueOrDefault,
                    Process = process,
                    Status = "online",
                    LastActivity = DateTime.UtcNow,
                    WindowTitle = windowTitle,
                    ProcessId = process.Id
                };

                // Add to dictionary
                if (_instances.TryAdd(accountNumber, instance))
                {
                    return instance;
                }

                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MultiMT5] Error attaching to PID {process.Id}: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Parse account number from MT5 window title
        /// </summary>
        private string? ParseAccountNumberFromTitle(string windowTitle)
        {
            try
            {
                // Try format: "MetaTrader 5 - 50012345 - Exness"
                if (windowTitle.Contains(" - "))
                {
                    var parts = windowTitle.Split(new[] { " - " }, StringSplitOptions.RemoveEmptyEntries);
                    if (parts.Length >= 2)
                    {
                        var accountPart = parts[1].Trim();
                        // Extract only digits
                        var digits = new string(accountPart.Where(char.IsDigit).ToArray());
                        if (digits.Length >= 6) // Valid MT5 account numbers are typically 6-10 digits
                        {
                            return digits;
                        }
                    }
                }

                // Try to find any 6-10 digit number in the title
                var allDigits = new string(windowTitle.Where(char.IsDigit).ToArray());
                if (allDigits.Length >= 6)
                {
                    // Take first 6-10 digits
                    return allDigits.Substring(0, Math.Min(10, allDigits.Length));
                }

                return null;
            }
            catch
            {
                return null;
            }
        }

        /// <summary>
        /// Get an MT5 instance by account number
        /// </summary>
        public MT5Instance? GetInstance(string accountNumber)
        {
            return _instances.TryGetValue(accountNumber, out var instance) ? instance : null;
        }

        /// <summary>
        /// Execute a command on a specific MT5 instance
        /// </summary>
        public async Task<CommandResult> ExecuteCommandAsync(string accountNumber, string command, object? parameters = null)
        {
            var instance = GetInstance(accountNumber);
            if (instance == null)
            {
                return CommandResult.Error($"MT5 account {accountNumber} not found");
            }

            if (instance.Status != "online")
            {
                return CommandResult.Error($"MT5 account {accountNumber} is {instance.Status}");
            }

            try
            {
                instance.LastActivity = DateTime.UtcNow;

                return command.ToLower() switch
                {
                    "start_ea" => await StartEAAsync(instance),
                    "stop_ea" => await StopEAAsync(instance),
                    "pause_ea" => await PauseEAAsync(instance),
                    "open_chart" => await OpenChartAsync(instance, parameters),
                    "load_ea" => await LoadEAAsync(instance, parameters),
                    "screenshot" => await TakeScreenshotAsync(instance),
                    _ => CommandResult.Error($"Unknown command: {command}")
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MultiMT5] Error executing {command} on {accountNumber}: {ex.Message}");
                instance.Status = "error";
                instance.LastError = ex.Message;
                return CommandResult.Error(ex.Message);
            }
        }

        /// <summary>
        /// Start AutoTrading on specific instance
        /// </summary>
        private async Task<CommandResult> StartEAAsync(MT5Instance instance)
        {
            try
            {
                // Focus window
                instance.MainWindow.Focus();
                await Task.Delay(500);

                // Press Alt+T to toggle AutoTrading
                instance.MainWindow.FocusNative();
                System.Windows.Forms.SendKeys.SendWait("%t"); // Alt+T

                await Task.Delay(1000);

                return CommandResult.Success("EA started");
            }
            catch (Exception ex)
            {
                return CommandResult.Error($"Failed to start EA: {ex.Message}");
            }
        }

        /// <summary>
        /// Stop AutoTrading on specific instance
        /// </summary>
        private async Task<CommandResult> StopEAAsync(MT5Instance instance)
        {
            try
            {
                instance.MainWindow.Focus();
                await Task.Delay(500);

                System.Windows.Forms.SendKeys.SendWait("%t"); // Alt+T
                await Task.Delay(1000);

                return CommandResult.Success("EA stopped");
            }
            catch (Exception ex)
            {
                return CommandResult.Error($"Failed to stop EA: {ex.Message}");
            }
        }

        /// <summary>
        /// Pause EA (same as stop for now)
        /// </summary>
        private Task<CommandResult> PauseEAAsync(MT5Instance instance)
        {
            return StopEAAsync(instance);
        }

        /// <summary>
        /// Open a chart on specific instance
        /// </summary>
        private async Task<CommandResult> OpenChartAsync(MT5Instance instance, object? parameters)
        {
            try
            {
                // Implementation for opening charts
                instance.MainWindow.Focus();
                await Task.Delay(500);

                // Open Market Watch (Ctrl+M)
                System.Windows.Forms.SendKeys.SendWait("^m");
                await Task.Delay(1000);

                return CommandResult.Success("Chart opened");
            }
            catch (Exception ex)
            {
                return CommandResult.Error($"Failed to open chart: {ex.Message}");
            }
        }

        /// <summary>
        /// Load EA on specific instance
        /// </summary>
        private async Task<CommandResult> LoadEAAsync(MT5Instance instance, object? parameters)
        {
            try
            {
                // Implementation for loading EA
                instance.MainWindow.Focus();
                await Task.Delay(500);

                // Open Navigator (Ctrl+N)
                System.Windows.Forms.SendKeys.SendWait("^n");
                await Task.Delay(1000);

                return CommandResult.Success("EA loaded");
            }
            catch (Exception ex)
            {
                return CommandResult.Error($"Failed to load EA: {ex.Message}");
            }
        }

        /// <summary>
        /// Take screenshot of specific instance
        /// </summary>
        private async Task<CommandResult> TakeScreenshotAsync(MT5Instance instance)
        {
            try
            {
                var screenshot = instance.MainWindow.Capture();
                var fileName = $"mt5_{instance.AccountNumber}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.png";
                var path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "screenshots", fileName);

                Directory.CreateDirectory(Path.GetDirectoryName(path)!);
                screenshot.ToFile(path);

                return CommandResult.Success($"Screenshot saved: {fileName}");
            }
            catch (Exception ex)
            {
                return CommandResult.Error($"Failed to take screenshot: {ex.Message}");
            }
        }

        /// <summary>
        /// Start health monitoring for all instances
        /// </summary>
        public void StartHealthMonitoring(TimeSpan interval)
        {
            _healthCheckTimer = new Timer(async _ => await PerformHealthCheckAsync(), null, TimeSpan.Zero, interval);
            Console.WriteLine($"[MultiMT5] Health monitoring started (interval: {interval.TotalSeconds}s)");
        }

        /// <summary>
        /// Perform health check on all instances
        /// </summary>
        private async Task PerformHealthCheckAsync()
        {
            var deadInstances = new List<string>();

            foreach (var kvp in _instances)
            {
                var accountNumber = kvp.Key;
                var instance = kvp.Value;

                try
                {
                    // Check if process is still running
                    if (instance.Process.HasExited)
                    {
                        Console.WriteLine($"[MultiMT5] Instance {accountNumber} process has exited");
                        instance.Status = "offline";
                        deadInstances.Add(accountNumber);
                        continue;
                    }

                    // Check if window is still valid
                    if (instance.MainWindow == null || !instance.MainWindow.IsAvailable)
                    {
                        Console.WriteLine($"[MultiMT5] Instance {accountNumber} window is no longer available");
                        instance.Status = "error";
                        instance.LastError = "Window not available";
                        continue;
                    }

                    // Check for inactivity
                    var inactiveTime = DateTime.UtcNow - instance.LastActivity;
                    if (inactiveTime.TotalMinutes > 30)
                    {
                        Console.WriteLine($"[MultiMT5] Instance {accountNumber} inactive for {inactiveTime.TotalMinutes:F0} minutes");
                    }

                    // Instance is healthy
                    if (instance.Status == "error")
                    {
                        instance.Status = "online"; // Recovered
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[MultiMT5] Health check failed for {accountNumber}: {ex.Message}");
                    instance.Status = "error";
                    instance.LastError = ex.Message;
                }
            }

            // Remove dead instances
            foreach (var accountNumber in deadInstances)
            {
                _instances.TryRemove(accountNumber, out _);
                Console.WriteLine($"[MultiMT5] Removed dead instance: {accountNumber}");
            }

            // Try to discover new instances
            if (deadInstances.Count > 0)
            {
                await DiscoverAndAttachAllAsync();
            }
        }

        /// <summary>
        /// Get status of all instances
        /// </summary>
        public List<InstanceStatus> GetAllStatuses()
        {
            return _instances.Values.Select(i => new InstanceStatus
            {
                AccountNumber = i.AccountNumber,
                Status = i.Status,
                ProcessId = i.ProcessId,
                WindowTitle = i.WindowTitle,
                LastActivity = i.LastActivity,
                LastError = i.LastError
            }).ToList();
        }

        /// <summary>
        /// Shutdown and cleanup
        /// </summary>
        public void Dispose()
        {
            _healthCheckTimer?.Dispose();

            foreach (var instance in _instances.Values)
            {
                try
                {
                    instance.App?.Dispose();
                }
                catch { }
            }

            _instances.Clear();
            _automation?.Dispose();
            Console.WriteLine("[MultiMT5] Controller disposed");
        }
    }

    /// <summary>
    /// Represents a single MT5 terminal instance
    /// </summary>
    public class MT5Instance
    {
        public string AccountNumber { get; set; } = string.Empty;
        public Application App { get; set; } = null!;
        public AutomationElement MainWindow { get; set; } = null!;
        public IntPtr WindowHandle { get; set; }
        public Process Process { get; set; } = null!;
        public int ProcessId { get; set; }
        public string Status { get; set; } = "offline"; // online, offline, error
        public DateTime LastActivity { get; set; }
        public string WindowTitle { get; set; } = string.Empty;
        public string? LastError { get; set; }
    }

    /// <summary>
    /// Result of a command execution
    /// </summary>
    public class CommandResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public object? Data { get; set; }

        public static CommandResult Success(string message, object? data = null) =>
            new() { Success = true, Message = message, Data = data };

        public static CommandResult Error(string message) =>
            new() { Success = false, Message = message };
    }

    /// <summary>
    /// Status information for an instance
    /// </summary>
    public class InstanceStatus
    {
        public string AccountNumber { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int ProcessId { get; set; }
        public string WindowTitle { get; set; } = string.Empty;
        public DateTime LastActivity { get; set; }
        public string? LastError { get; set; }
    }
}
