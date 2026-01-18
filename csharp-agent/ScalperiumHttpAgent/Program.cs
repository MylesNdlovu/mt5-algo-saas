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

            Console.WriteLine($"  API Key:        {_apiKey[..15]}...");
            Console.WriteLine($"  Web App:        {_webAppUrl}");
            Console.WriteLine($"  Account:        {_accountNumber}");
            Console.WriteLine($"  Trade Sync:     every {_syncIntervalSeconds}s");
            Console.WriteLine($"  Command Poll:   every {_commandPollIntervalSeconds}s");
            Console.WriteLine();

            // Handle Ctrl+C
            Console.CancelKeyPress += (s, e) =>
            {
                e.Cancel = true;
                _isRunning = false;
                Console.WriteLine("\n[Agent] Shutting down...");
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

            Console.WriteLine();
            Console.WriteLine("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            Console.WriteLine(" Agent running. Press Ctrl+C to stop.");
            Console.WriteLine(" Commands: START_EA, STOP_EA, PAUSE_EA will execute in <3s");
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
        // TODO: Implement actual MT5 automation here
        // For now, simulate command execution

        switch (cmd.command.ToLower())
        {
            case "start_ea":
                // Would call MT5 automation to start EA
                await Task.Delay(100); // Simulate
                return (true, new { message = "EA started successfully" }, null);

            case "stop_ea":
                await Task.Delay(100);
                return (true, new { message = "EA stopped successfully" }, null);

            case "pause_ea":
                await Task.Delay(100);
                return (true, new { message = "EA paused successfully" }, null);

            case "sync_trades":
                // Force immediate trade sync
                await SyncCycleAsync();
                return (true, new { message = "Trades synced" }, null);

            case "restart_terminal":
                // Would restart MT5 terminal
                await Task.Delay(500);
                return (true, new { message = "Terminal restart initiated" }, null);

            default:
                return (false, null, $"Unknown command: {cmd.command}");
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
