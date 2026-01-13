using System;
using System.Diagnostics;
using System.Text.RegularExpressions;
using FlaUI.Core;
using FlaUI.Core.AutomationElements;
using FlaUI.UIA3;

namespace MT5Agent
{
    /// <summary>
    /// Represents a single MT5 terminal instance managed by the pool agent.
    /// Each instance corresponds to one MT5 process/window on the VPS.
    /// </summary>
    public class MT5Instance : IDisposable
    {
        // ============================================================================
        // Properties
        // ============================================================================

        /// <summary>MT5 account number (parsed from window title)</summary>
        public string AccountNumber { get; private set; }

        /// <summary>Broker name (parsed from window title)</summary>
        public string Broker { get; private set; }

        /// <summary>FlaUI application handle</summary>
        public Application App { get; private set; }

        /// <summary>Main window automation element</summary>
        public AutomationElement MainWindow { get; private set; }

        /// <summary>Native window handle</summary>
        public IntPtr WindowHandle { get; private set; }

        /// <summary>The MT5 process</summary>
        public Process Process { get; private set; }

        /// <summary>Current status: online, offline, error, starting</summary>
        public string Status { get; set; } = "offline";

        /// <summary>EA status: running, stopped, paused, error</summary>
        public string EAStatus { get; set; } = "stopped";

        /// <summary>Last activity timestamp</summary>
        public DateTime LastActivity { get; set; } = DateTime.UtcNow;

        /// <summary>Last heartbeat timestamp</summary>
        public DateTime LastHeartbeat { get; set; } = DateTime.UtcNow;

        /// <summary>Whether the instance is properly attached</summary>
        public bool IsAttached { get; private set; }

        /// <summary>Whether an EA is loaded</summary>
        public bool EALoaded { get; set; }

        /// <summary>Whether the EA is currently running (AutoTrading on)</summary>
        public bool EARunning { get; set; }

        /// <summary>Name of the loaded EA</summary>
        public string? EAName { get; set; }

        /// <summary>Current chart symbol</summary>
        public string? ChartSymbol { get; set; }

        /// <summary>Current chart timeframe</summary>
        public string? ChartTimeframe { get; set; }

        // Account Info (synced from MT5)
        public double Balance { get; set; }
        public double Equity { get; set; }
        public double Margin { get; set; }
        public double FreeMargin { get; set; }
        public double Profit { get; set; }

        // Error tracking
        public string? LastError { get; set; }
        public int ErrorCount { get; set; }

        // ============================================================================
        // Constructors
        // ============================================================================

        private MT5Instance() { }

        /// <summary>
        /// Create an MT5Instance from an existing process
        /// </summary>
        public static MT5Instance? FromProcess(Process process, UIA3Automation automation)
        {
            try
            {
                var instance = new MT5Instance
                {
                    Process = process,
                    WindowHandle = process.MainWindowHandle
                };

                // Attach FlaUI to the process
                instance.App = Application.Attach(process);
                instance.MainWindow = instance.App.GetMainWindow(automation);

                if (instance.MainWindow == null)
                {
                    Console.WriteLine($"[MT5Instance] Could not get main window for process {process.Id}");
                    return null;
                }

                // Parse account number and broker from window title
                // Typical format: "MetaTrader 5 - 12345678 - [Broker Name]" or similar
                string windowTitle = instance.MainWindow.Name ?? "";
                instance.ParseWindowTitle(windowTitle);

                if (string.IsNullOrEmpty(instance.AccountNumber))
                {
                    Console.WriteLine($"[MT5Instance] Could not parse account number from window: {windowTitle}");
                    return null;
                }

                instance.IsAttached = true;
                instance.Status = "online";
                instance.LastActivity = DateTime.UtcNow;

                Console.WriteLine($"[MT5Instance] Attached to MT5 account {instance.AccountNumber} ({instance.Broker})");
                return instance;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MT5Instance] Error attaching to process {process.Id}: {ex.Message}");
                return null;
            }
        }

        // ============================================================================
        // Window Title Parsing
        // ============================================================================

        /// <summary>
        /// Parse account number and broker from MT5 window title
        /// </summary>
        private void ParseWindowTitle(string title)
        {
            // Common MT5 window title formats:
            // "MetaTrader 5 - 12345678 - [Broker Name]"
            // "12345678 - Broker Name - MetaTrader 5"
            // "MetaTrader 5 - 12345678 (Broker Name)"
            // "Broker Name - 12345678"

            // Try to extract account number (typically 6-10 digit number)
            var accountMatch = Regex.Match(title, @"\b(\d{6,10})\b");
            if (accountMatch.Success)
            {
                AccountNumber = accountMatch.Groups[1].Value;
            }

            // Try to extract broker name
            // Look for text in brackets or after/before account number
            var brokerMatch = Regex.Match(title, @"\[(.*?)\]");
            if (brokerMatch.Success)
            {
                Broker = brokerMatch.Groups[1].Value.Trim();
            }
            else
            {
                // Try to get broker name from title (excluding "MetaTrader 5" and account number)
                var cleanTitle = Regex.Replace(title, @"MetaTrader\s*5?", "", RegexOptions.IgnoreCase);
                cleanTitle = Regex.Replace(cleanTitle, @"\b\d{6,10}\b", "");
                cleanTitle = Regex.Replace(cleanTitle, @"[\-\[\]()]", " ");
                cleanTitle = Regex.Replace(cleanTitle, @"\s+", " ").Trim();

                if (!string.IsNullOrEmpty(cleanTitle))
                {
                    Broker = cleanTitle;
                }
            }
        }

        // ============================================================================
        // Health Check
        // ============================================================================

        /// <summary>
        /// Check if the MT5 instance is still responsive
        /// </summary>
        public bool CheckHealth()
        {
            try
            {
                if (Process == null || Process.HasExited)
                {
                    Status = "offline";
                    IsAttached = false;
                    return false;
                }

                // Check if window is still accessible
                if (MainWindow == null)
                {
                    Status = "error";
                    LastError = "Main window lost";
                    return false;
                }

                // Try to access window properties (this will throw if window is gone)
                var _ = MainWindow.Name;

                LastHeartbeat = DateTime.UtcNow;
                Status = "online";
                return true;
            }
            catch (Exception ex)
            {
                Status = "error";
                LastError = ex.Message;
                ErrorCount++;
                return false;
            }
        }

        /// <summary>
        /// Try to reattach to the MT5 process if connection was lost
        /// </summary>
        public bool TryReattach(UIA3Automation automation)
        {
            try
            {
                if (Process == null || Process.HasExited)
                {
                    return false;
                }

                App = Application.Attach(Process);
                MainWindow = App.GetMainWindow(automation);

                if (MainWindow != null)
                {
                    IsAttached = true;
                    Status = "online";
                    LastError = null;
                    return true;
                }

                return false;
            }
            catch (Exception ex)
            {
                LastError = ex.Message;
                return false;
            }
        }

        // ============================================================================
        // Window Focus
        // ============================================================================

        /// <summary>
        /// Focus this MT5 window (required before FlaUI operations)
        /// </summary>
        public bool Focus()
        {
            try
            {
                if (MainWindow == null) return false;

                MainWindow.Focus();
                System.Threading.Thread.Sleep(100);
                return true;
            }
            catch
            {
                return false;
            }
        }

        // ============================================================================
        // Status Snapshot
        // ============================================================================

        /// <summary>
        /// Get a status snapshot for sending to the server
        /// </summary>
        public MT5InstanceStatusSnapshot GetStatusSnapshot()
        {
            return new MT5InstanceStatusSnapshot
            {
                AccountNumber = AccountNumber,
                Broker = Broker,
                Status = Status,
                EAStatus = EAStatus,
                WindowTitle = MainWindow?.Name,
                ProcessId = Process?.Id ?? 0,
                Balance = Balance,
                Equity = Equity,
                Margin = Margin,
                FreeMargin = FreeMargin,
                Profit = Profit,
                EALoaded = EALoaded,
                EARunning = EARunning,
                EAName = EAName,
                ChartSymbol = ChartSymbol,
                ChartTimeframe = ChartTimeframe,
                LastActivity = ((DateTimeOffset)LastActivity).ToUnixTimeMilliseconds(),
                LastError = LastError,
                ErrorCount = ErrorCount
            };
        }

        // ============================================================================
        // IDisposable
        // ============================================================================

        public void Dispose()
        {
            try
            {
                // Don't close the MT5 app - we're just detaching
                App?.Close();
                App?.Dispose();
            }
            catch { }

            IsAttached = false;
            Status = "offline";
        }
    }

    /// <summary>
    /// Status snapshot for serialization to the server
    /// </summary>
    public class MT5InstanceStatusSnapshot
    {
        public string AccountNumber { get; set; } = "";
        public string? Broker { get; set; }
        public string Status { get; set; } = "offline";
        public string EAStatus { get; set; } = "stopped";
        public string? WindowTitle { get; set; }
        public int ProcessId { get; set; }
        public double Balance { get; set; }
        public double Equity { get; set; }
        public double Margin { get; set; }
        public double FreeMargin { get; set; }
        public double Profit { get; set; }
        public bool EALoaded { get; set; }
        public bool EARunning { get; set; }
        public string? EAName { get; set; }
        public string? ChartSymbol { get; set; }
        public string? ChartTimeframe { get; set; }
        public long LastActivity { get; set; }
        public string? LastError { get; set; }
        public int ErrorCount { get; set; }
    }
}
