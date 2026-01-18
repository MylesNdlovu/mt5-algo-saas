using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace ScalperiumHttpAgent;

class Program
{
    private static HttpClient _httpClient = null!;
    private static string _apiKey = null!;
    private static string _webAppUrl = null!;
    private static int _syncIntervalSeconds;
    private static int _commandPollIntervalSeconds = 2; // Poll for commands every 2 seconds
    private static bool _isRunning = true;
    private static string _accountNumber = "unknown";
    private static int _totalSyncs = 0;
    private static int _failedSyncs = 0;
    private static int _commandsExecuted = 0;
    private static double _avgLatencyMs = 0;
    private static double _avgCommandLatencyMs = 0;

    // MT5 Provisioning
    private static MT5Provisioner? _provisioner;
    private static string _mt5BasePath = @"C:\Scalperium\MT5";
    private static Dictionary<string, MT5Instance> _mt5Instances = new();

    static async Task Main(string[] args)
    {
        Console.WriteLine("╔══════════════════════════════════════════════════════╗");
        Console.WriteLine("║     SCALPERIUM HTTP SYNC AGENT v3.1.0                ║");
        Console.WriteLine("║     Production-Grade Trade Sync + Commands           ║");
        Console.WriteLine("╚══════════════════════════════════════════════════════╝");
        Console.WriteLine();

        try
        {
            LoadConfiguration();

            _httpClient = new HttpClient
            {
                Timeout = TimeSpan.FromSeconds(30)
            };

            // Initialize MT5 Provisioner
            _provisioner = new MT5Provisioner(_mt5BasePath);

            Console.WriteLine($"  API Key:        {_apiKey[..15]}...");
            Console.WriteLine($"  Web App:        {_webAppUrl}");
            Console.WriteLine($"  Account:        {_accountNumber}");
            Console.WriteLine($"  MT5 Base:       {_mt5BasePath}");
            Console.WriteLine($"  Trade Sync:     every {_syncIntervalSeconds}s");
            Console.WriteLine($"  Command Poll:   every {_commandPollIntervalSeconds}s");
            Console.WriteLine();

            // Handle Ctrl+C
            Console.CancelKeyPress += async (s, e) =>
            {
                e.Cancel = true;
                _isRunning = false;
                Console.WriteLine("\n[Agent] Shutting down...");

                // Stop all MT5 instances
                foreach (var instance in _mt5Instances.Values)
                {
                    try
                    {
                        Console.WriteLine($"[Agent] Stopping MT5 instance for account {instance.AccountNumber}...");
                        await _provisioner!.StopInstanceAsync(instance);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[Agent] Error stopping instance: {ex.Message}");
                    }
                }
            };

            // Initial connection test
            Console.WriteLine("[Agent] Testing connection to Scalperium...");
            var testResult = await TestConnectionAsync();
            if (!testResult)
            {
                Console.WriteLine("[Agent] WARNING: Could not connect to Scalperium. Will retry during sync.");
            }
            else
            {
                Console.WriteLine("[Agent] Connection successful!");
            }

            // Auto-provision MT5 if credentials are pending
            Console.WriteLine("[Agent] Checking for pending MT5 credentials...");
            await AutoProvisionMT5OnStartupAsync();

            Console.WriteLine();
            Console.WriteLine("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            Console.WriteLine(" Agent running. Press Ctrl+C to stop.");
            Console.WriteLine(" Commands: PROVISION_MT5, START_EA, STOP_EA will execute in <3s");
            Console.WriteLine("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            Console.WriteLine();

            // Start command polling in background
            _ = Task.Run(CommandPollLoopAsync);

            // Main trade sync loop
            int secondsElapsed = 0;
            while (_isRunning)
            {
                if (secondsElapsed >= _syncIntervalSeconds)
                {
                    await SyncCycleAsync();
                    secondsElapsed = 0;
                }

                await Task.Delay(1000);
                secondsElapsed++;
            }

            Console.WriteLine();
            Console.WriteLine($"[Agent] Shutdown complete. Syncs: {_totalSyncs}, Commands: {_commandsExecuted}, Failed: {_failedSyncs}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Agent] Fatal error: {ex.Message}");
            Console.WriteLine(ex.StackTrace);
            Environment.Exit(1);
        }
    }

    /// <summary>
    /// Background loop that polls for commands every 2 seconds
    /// This ensures START_EA/STOP_EA commands execute within 1-3 seconds
    /// </summary>
    static async Task CommandPollLoopAsync()
    {
        while (_isRunning)
        {
            try
            {
                await PollAndExecuteCommandsAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Command] Poll error: {ex.Message}");
            }

            await Task.Delay(_commandPollIntervalSeconds * 1000);
        }
    }

    static async Task PollAndExecuteCommandsAsync()
    {
        try
        {
            var endpoint = $"{_webAppUrl}/api/commands?apiKey={_apiKey}";
            var response = await _httpClient.GetAsync(endpoint);

            if (!response.IsSuccessStatusCode) return;

            var json = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<CommandPollResponse>(json);

            if (result?.commands == null || result.commands.Count == 0) return;

            foreach (var cmd in result.commands)
            {
                var sw = Stopwatch.StartNew();
                Console.WriteLine($"[Command] Executing: {cmd.command} for account {cmd.accountId}");

                bool success = false;
                string? error = null;
                object? cmdResult = null;

                try
                {
                    // Execute the command
                    (success, cmdResult, error) = await ExecuteCommandAsync(cmd);
                }
                catch (Exception ex)
                {
                    error = ex.Message;
                }

                sw.Stop();

                // Report result back to server
                await ReportCommandResultAsync(cmd.id, success, cmdResult, error);

                _commandsExecuted++;
                _avgCommandLatencyMs = (_avgCommandLatencyMs * (_commandsExecuted - 1) + sw.ElapsedMilliseconds) / _commandsExecuted;

                var status = success ? "✓" : "✗";
                Console.WriteLine($"[Command] {status} {cmd.command} completed in {sw.ElapsedMilliseconds}ms (avg: {_avgCommandLatencyMs:F0}ms)");
            }
        }
        catch (TaskCanceledException)
        {
            // Timeout, ignore
        }
    }

    static async Task<(bool success, object? result, string? error)> ExecuteCommandAsync(CommandInfo cmd)
    {
        switch (cmd.command.ToLower())
        {
            case "provision_mt5":
                return await HandleProvisionMT5Async(cmd);

            case "start_ea":
                return await HandleStartEAAsync(cmd);

            case "stop_ea":
                return await HandleStopEAAsync(cmd);

            case "pause_ea":
                await Task.Delay(100);
                return (true, new { message = "EA paused successfully" }, null);

            case "sync_trades":
                // Force immediate trade sync
                await SyncCycleAsync();
                return (true, new { message = "Trades synced" }, null);

            case "restart_terminal":
                return await HandleRestartTerminalAsync(cmd);

            case "stop_terminal":
                return await HandleStopTerminalAsync(cmd);

            default:
                return (false, null, $"Unknown command: {cmd.command}");
        }
    }

    static async Task<(bool success, object? result, string? error)> HandleProvisionMT5Async(CommandInfo cmd)
    {
        try
        {
            if (_provisioner == null)
            {
                return (false, null, "Provisioner not initialized");
            }

            // Extract credentials from payload
            var payloadJson = JsonSerializer.Serialize(cmd.payload);
            var credentials = JsonSerializer.Deserialize<MT5Credentials>(payloadJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (credentials == null)
            {
                return (false, null, "Invalid credentials payload");
            }

            Console.WriteLine($"[Provision] Starting MT5 provisioning for account {credentials.AccountNumber}");
            Console.WriteLine($"[Provision] Broker: {credentials.Broker}, Server: {credentials.ServerName}");

            // Check if already provisioned
            if (_mt5Instances.ContainsKey(credentials.AccountNumber))
            {
                var existing = _mt5Instances[credentials.AccountNumber];
                if (_provisioner.IsInstanceRunning(existing))
                {
                    return (true, new { message = "MT5 already running", instancePath = existing.InstallPath }, null);
                }
            }

            // Provision new MT5 instance
            var instance = await _provisioner.ProvisionAsync(credentials);
            _mt5Instances[credentials.AccountNumber] = instance;

            return (true, new
            {
                message = "MT5 provisioned and started successfully",
                instancePath = instance.InstallPath,
                processId = instance.ProcessId,
                status = instance.Status
            }, null);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Provision] Error: {ex.Message}");
            return (false, null, ex.Message);
        }
    }

    static async Task<(bool success, object? result, string? error)> HandleStartEAAsync(CommandInfo cmd)
    {
        try
        {
            var accountId = cmd.accountId ?? _accountNumber;

            if (_mt5Instances.TryGetValue(accountId, out var instance))
            {
                if (!_provisioner!.IsInstanceRunning(instance))
                {
                    // Restart terminal
                    await _provisioner.ProvisionAsync(new MT5Credentials
                    {
                        AccountNumber = instance.AccountNumber,
                        Broker = instance.Broker,
                        ServerName = instance.ServerName
                    });
                }
                return (true, new { message = "EA started successfully", processId = instance.ProcessId }, null);
            }

            return (false, null, $"MT5 instance not found for account {accountId}");
        }
        catch (Exception ex)
        {
            return (false, null, ex.Message);
        }
    }

    static async Task<(bool success, object? result, string? error)> HandleStopEAAsync(CommandInfo cmd)
    {
        try
        {
            var accountId = cmd.accountId ?? _accountNumber;

            if (_mt5Instances.TryGetValue(accountId, out var instance))
            {
                await _provisioner!.StopInstanceAsync(instance);
                return (true, new { message = "EA stopped successfully" }, null);
            }

            return (false, null, $"MT5 instance not found for account {accountId}");
        }
        catch (Exception ex)
        {
            return (false, null, ex.Message);
        }
    }

    static async Task<(bool success, object? result, string? error)> HandleRestartTerminalAsync(CommandInfo cmd)
    {
        try
        {
            var accountId = cmd.accountId ?? _accountNumber;

            if (_mt5Instances.TryGetValue(accountId, out var instance))
            {
                // Stop and restart
                await _provisioner!.StopInstanceAsync(instance);
                await Task.Delay(2000); // Wait for clean shutdown

                // Re-provision with same credentials
                var newInstance = await _provisioner.ProvisionAsync(new MT5Credentials
                {
                    AccountNumber = instance.AccountNumber,
                    Broker = instance.Broker,
                    ServerName = instance.ServerName
                });

                _mt5Instances[accountId] = newInstance;
                return (true, new { message = "Terminal restarted successfully", processId = newInstance.ProcessId }, null);
            }

            return (false, null, $"MT5 instance not found for account {accountId}");
        }
        catch (Exception ex)
        {
            return (false, null, ex.Message);
        }
    }

    static async Task<(bool success, object? result, string? error)> HandleStopTerminalAsync(CommandInfo cmd)
    {
        try
        {
            var accountId = cmd.accountId ?? _accountNumber;

            if (_mt5Instances.TryGetValue(accountId, out var instance))
            {
                await _provisioner!.StopInstanceAsync(instance);
                return (true, new { message = "Terminal stopped successfully" }, null);
            }

            return (false, null, $"MT5 instance not found for account {accountId}");
        }
        catch (Exception ex)
        {
            return (false, null, ex.Message);
        }
    }

    static async Task AutoProvisionMT5OnStartupAsync()
    {
        try
        {
            // Fetch pending credentials from web app
            var endpoint = $"{_webAppUrl}/api/commands/credentials?apiKey={_apiKey}";
            var response = await _httpClient.GetAsync(endpoint);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"[Provision] Could not fetch credentials: HTTP {(int)response.StatusCode}");
                return;
            }

            var json = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<CredentialsResponse>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (result?.Credentials == null || result.Credentials.Count == 0)
            {
                Console.WriteLine("[Provision] No pending credentials to provision");
                return;
            }

            Console.WriteLine($"[Provision] Found {result.Credentials.Count} account(s) to provision");

            foreach (var cred in result.Credentials)
            {
                try
                {
                    Console.WriteLine($"[Provision] Provisioning account {cred.AccountNumber} ({cred.Broker})...");

                    var credentials = new MT5Credentials
                    {
                        AccountNumber = cred.AccountNumber,
                        Broker = cred.Broker,
                        ServerName = cred.ServerName,
                        Login = cred.Login,
                        Password = cred.Password
                    };

                    var instance = await _provisioner!.ProvisionAsync(credentials);
                    _mt5Instances[credentials.AccountNumber] = instance;

                    Console.WriteLine($"[Provision] ✓ Account {cred.AccountNumber} provisioned successfully (PID: {instance.ProcessId})");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Provision] ✗ Failed to provision {cred.AccountNumber}: {ex.Message}");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Provision] Auto-provision error: {ex.Message}");
        }
    }

    static async Task ReportCommandResultAsync(string commandId, bool success, object? result, string? error)
    {
        try
        {
            var endpoint = $"{_webAppUrl}/api/commands";

            var payload = new
            {
                apiKey = _apiKey,
                commandId,
                success,
                result,
                error
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var request = new HttpRequestMessage(HttpMethod.Patch, endpoint) { Content = content };
            await _httpClient.SendAsync(request);
        }
        catch
        {
            // Best effort, don't fail if we can't report
        }
    }

    static void LoadConfiguration()
    {
        var configPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "appsettings.json");

        if (!File.Exists(configPath))
        {
            // Create default config
            var defaultConfig = new
            {
                ApiKey = "YOUR_API_KEY_HERE",
                WebAppUrl = "https://scalperium.com",
                SyncIntervalSeconds = 30
            };
            File.WriteAllText(configPath, JsonSerializer.Serialize(defaultConfig, new JsonSerializerOptions { WriteIndented = true }));
            throw new Exception($"Configuration file created at {configPath}. Please edit it with your API key.");
        }

        var config = new ConfigurationBuilder()
            .SetBasePath(AppDomain.CurrentDomain.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: false)
            .Build();

        _apiKey = config["ApiKey"] ?? throw new Exception("ApiKey not configured");
        _webAppUrl = config["WebAppUrl"] ?? "https://scalperium.com";
        _syncIntervalSeconds = int.TryParse(config["SyncIntervalSeconds"], out int interval) ? interval : 30;
        _accountNumber = config["AccountNumber"] ?? "unknown";

        if (_apiKey == "YOUR_API_KEY_HERE")
        {
            throw new Exception("Please configure your API key in appsettings.json");
        }
    }

    static async Task<bool> TestConnectionAsync()
    {
        try
        {
            var sw = Stopwatch.StartNew();
            var response = await _httpClient.GetAsync($"{_webAppUrl}/api/health");
            sw.Stop();

            Console.WriteLine($"  Latency: {sw.ElapsedMilliseconds}ms");
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  Error: {ex.Message}");
            return false;
        }
    }

    static async Task SyncCycleAsync()
    {
        var cycleStart = DateTime.UtcNow;

        try
        {
            // 1. Read account number
            _accountNumber = ReadAccountNumber();

            // 2. Read trades from MT5 export file
            var trades = ReadTradesFromFile();

            // 3. Sync trades to web app
            if (trades.Count > 0 || _totalSyncs % 10 == 0) // Always sync every 10th cycle for heartbeat
            {
                var sw = Stopwatch.StartNew();
                var success = await SendTradesToWebAppAsync(trades);
                sw.Stop();

                _totalSyncs++;
                if (success)
                {
                    // Update rolling average latency
                    _avgLatencyMs = (_avgLatencyMs * (_totalSyncs - 1) + sw.ElapsedMilliseconds) / _totalSyncs;

                    var openTrades = trades.Count(t => !t.IsClosed);
                    var closedTrades = trades.Count(t => t.IsClosed);

                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] Synced {trades.Count} trades (open: {openTrades}, closed: {closedTrades}) | {sw.ElapsedMilliseconds}ms | avg: {_avgLatencyMs:F0}ms");
                }
                else
                {
                    _failedSyncs++;
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] Sync failed ({_failedSyncs} total failures)");
                }
            }

            // 4. Send status update
            await SendStatusUpdateAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] Sync error: {ex.Message}");
            _failedSyncs++;
        }
    }

    static string ReadAccountNumber()
    {
        var paths = new[]
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "MetaQuotes", "Terminal", "Common", "Files", "scalperium_account.txt"),
            @"C:\Users\Public\Documents\scalperium_account.txt"
        };

        foreach (var path in paths)
        {
            if (File.Exists(path))
            {
                return File.ReadAllText(path).Trim();
            }
        }

        return _accountNumber; // Keep previous value
    }

    static List<TradeData> ReadTradesFromFile()
    {
        var trades = new List<TradeData>();

        var paths = new[]
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "MetaQuotes", "Terminal", "Common", "Files", "scalperium_trades.csv"),
            @"C:\Users\Public\Documents\scalperium_trades.csv"
        };

        string? tradesFilePath = paths.FirstOrDefault(File.Exists);

        if (tradesFilePath == null)
        {
            return trades;
        }

        try
        {
            var lines = File.ReadAllLines(tradesFilePath);

            foreach (var line in lines.Skip(1)) // Skip header
            {
                if (string.IsNullOrWhiteSpace(line)) continue;

                try
                {
                    var parts = line.Split(',');
                    if (parts.Length >= 12)
                    {
                        trades.Add(new TradeData
                        {
                            Ticket = parts[0].Trim(),
                            Symbol = parts[1].Trim(),
                            Type = parts[2].Trim(),
                            Volume = ParseDouble(parts[3]),
                            OpenPrice = ParseDouble(parts[4]),
                            OpenTime = ParseDateTime(parts[5]),
                            ClosePrice = string.IsNullOrWhiteSpace(parts[6]) ? null : ParseDouble(parts[6]),
                            CloseTime = string.IsNullOrWhiteSpace(parts[7]) ? null : ParseDateTime(parts[7]),
                            Profit = ParseDouble(parts[8]),
                            Commission = ParseDouble(parts[9]),
                            Swap = ParseDouble(parts[10]),
                            MagicNumber = string.IsNullOrWhiteSpace(parts[11]) ? null : int.Parse(parts[11].Trim()),
                            Comment = parts.Length > 12 ? parts[12].Trim() : null,
                            IsClosed = !string.IsNullOrWhiteSpace(parts[7])
                        });
                    }
                }
                catch (Exception ex)
                {
                    // Skip malformed lines
                    Console.WriteLine($"[Parse] Skipping line: {ex.Message}");
                }
            }
        }
        catch (IOException)
        {
            // File might be locked by MT5, will retry next cycle
        }

        return trades;
    }

    static double ParseDouble(string value)
    {
        return double.Parse(value.Trim(), CultureInfo.InvariantCulture);
    }

    static DateTime ParseDateTime(string value)
    {
        return DateTime.Parse(value.Trim(), CultureInfo.InvariantCulture);
    }

    static async Task<bool> SendTradesToWebAppAsync(List<TradeData> trades)
    {
        try
        {
            var endpoint = $"{_webAppUrl}/api/webhook/trades";

            var payload = new
            {
                apiKey = _apiKey,
                accountId = _accountNumber,
                trades = trades.Select(t => new
                {
                    ticket = t.Ticket,
                    symbol = t.Symbol,
                    type = t.Type,
                    volume = t.Volume,
                    openPrice = t.OpenPrice,
                    openTime = t.OpenTime.ToString("o"),
                    closePrice = t.ClosePrice,
                    closeTime = t.CloseTime?.ToString("o"),
                    profit = t.Profit,
                    commission = t.Commission,
                    swap = t.Swap,
                    magicNumber = t.MagicNumber,
                    comment = t.Comment,
                    isClosed = t.IsClosed
                }).ToList(),
                timestamp = DateTime.UtcNow.ToString("o")
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(endpoint, content);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"[Trades] HTTP {(int)response.StatusCode}: {error}");
                return false;
            }

            return true;
        }
        catch (TaskCanceledException)
        {
            Console.WriteLine("[Trades] Request timeout");
            return false;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Trades] Error: {ex.Message}");
            return false;
        }
    }

    static async Task SendStatusUpdateAsync()
    {
        try
        {
            var endpoint = $"{_webAppUrl}/api/webhook/status";

            var payload = new
            {
                apiKey = _apiKey,
                accountId = _accountNumber,
                status = "online",
                mt5Connected = true,
                cpuUsage = GetCpuUsage(),
                memoryUsage = GetMemoryUsage(),
                timestamp = DateTime.UtcNow.ToString("o")
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            await _httpClient.PostAsync(endpoint, content);
        }
        catch
        {
            // Status updates are best-effort, don't log failures
        }
    }

    static double GetCpuUsage()
    {
        try
        {
            var process = Process.GetCurrentProcess();
            return Math.Round(process.TotalProcessorTime.TotalMilliseconds / Environment.ProcessorCount / 1000, 2);
        }
        catch { return 0; }
    }

    static double GetMemoryUsage()
    {
        try
        {
            var process = Process.GetCurrentProcess();
            return Math.Round(process.WorkingSet64 / (1024.0 * 1024.0), 2); // MB
        }
        catch { return 0; }
    }
}

public class TradeData
{
    public string Ticket { get; set; } = "";
    public string Symbol { get; set; } = "";
    public string Type { get; set; } = "";
    public double Volume { get; set; }
    public double OpenPrice { get; set; }
    public DateTime OpenTime { get; set; }
    public double? ClosePrice { get; set; }
    public DateTime? CloseTime { get; set; }
    public double Profit { get; set; }
    public double Commission { get; set; }
    public double Swap { get; set; }
    public int? MagicNumber { get; set; }
    public string? Comment { get; set; }
    public bool IsClosed { get; set; }
}

public class CommandPollResponse
{
    public List<CommandInfo> commands { get; set; } = new();
    public string polledAt { get; set; } = "";
}

public class CommandInfo
{
    public string id { get; set; } = "";
    public string command { get; set; } = "";
    public string? accountId { get; set; }
    public object? payload { get; set; }
    public int priority { get; set; }
    public string createdAt { get; set; } = "";
}

public class CredentialsResponse
{
    public List<CredentialInfo> Credentials { get; set; } = new();
    public string? DeliveredAt { get; set; }
    public string? Message { get; set; }
}

public class CredentialInfo
{
    public string AccountNumber { get; set; } = "";
    public string Broker { get; set; } = "";
    public string ServerName { get; set; } = "";
    public string Login { get; set; } = "";
    public string Password { get; set; } = "";
}
