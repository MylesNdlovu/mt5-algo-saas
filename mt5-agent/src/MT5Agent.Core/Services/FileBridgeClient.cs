using System.Text.Json;
using Microsoft.Extensions.Logging;
using MT5Agent.Core.Interfaces;
using MT5Agent.Core.Models;

namespace MT5Agent.Core.Services;

/// <summary>
/// File-based bridge client for communicating with MQL5 EAs via shared files.
/// This is the most reliable cross-broker solution for MT5 communication.
/// </summary>
public class FileBridgeClient : IEABridgeClient
{
    private readonly ILogger<FileBridgeClient> _logger;
    private readonly JsonSerializerOptions _jsonOptions;

    public FileBridgeClient(ILogger<FileBridgeClient> logger)
    {
        _logger = logger;
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
    }

    private string GetBridgePath(string dataPath, int magicNumber)
    {
        return Path.Combine(dataPath, "MQL5", "Files", "Bridge", magicNumber.ToString());
    }

    public async Task<bool> IsHealthyAsync(string dataPath, int magicNumber)
    {
        try
        {
            var bridgePath = GetBridgePath(dataPath, magicNumber);
            var statusFile = Path.Combine(bridgePath, "status.json");

            if (!File.Exists(statusFile))
                return false;

            var fileInfo = new FileInfo(statusFile);
            // Consider healthy if status updated within last 5 seconds
            return DateTime.UtcNow - fileInfo.LastWriteTimeUtc < TimeSpan.FromSeconds(5);
        }
        catch
        {
            return false;
        }
    }

    public async Task<EAStatus?> GetEAStatusAsync(string dataPath, int magicNumber)
    {
        try
        {
            var bridgePath = GetBridgePath(dataPath, magicNumber);
            var statusFile = Path.Combine(bridgePath, "status.json");

            if (!File.Exists(statusFile))
                return null;

            var json = await File.ReadAllTextAsync(statusFile);
            var status = JsonSerializer.Deserialize<BridgeStatusResponse>(json, _jsonOptions);

            return status?.Ea == null ? null : new EAStatus
            {
                Loaded = status.Ea.Loaded,
                Running = status.Ea.Running,
                Paused = status.Ea.Paused,
                Name = status.Ea.Name,
                Symbol = status.Ea.Symbol,
                Timeframe = status.Ea.Timeframe
            };
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to read EA status from bridge");
            return null;
        }
    }

    public async Task<AccountInfo?> GetAccountInfoAsync(string dataPath, int magicNumber)
    {
        try
        {
            var bridgePath = GetBridgePath(dataPath, magicNumber);
            var statusFile = Path.Combine(bridgePath, "status.json");

            if (!File.Exists(statusFile))
                return null;

            var json = await File.ReadAllTextAsync(statusFile);
            var status = JsonSerializer.Deserialize<BridgeStatusResponse>(json, _jsonOptions);

            return status?.Account == null ? null : new AccountInfo
            {
                Balance = status.Account.Balance,
                Equity = status.Account.Equity,
                Margin = status.Account.Margin,
                FreeMargin = status.Account.FreeMargin,
                Profit = status.Account.Profit,
                AccountNumber = status.Account.AccountNumber,
                Broker = status.Account.Broker,
                ServerName = status.Account.Server,
                Leverage = status.Account.Leverage,
                Currency = status.Account.Currency ?? "USD"
            };
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to read account info from bridge");
            return null;
        }
    }

    public async Task<SafetyIndicator> GetIndicatorSignalAsync(string dataPath, int magicNumber)
    {
        try
        {
            var bridgePath = GetBridgePath(dataPath, magicNumber);
            var statusFile = Path.Combine(bridgePath, "status.json");

            if (!File.Exists(statusFile))
                return SafetyIndicator.Red;

            var json = await File.ReadAllTextAsync(statusFile);
            var status = JsonSerializer.Deserialize<BridgeStatusResponse>(json, _jsonOptions);

            return status?.Indicator?.Signal?.ToUpperInvariant() switch
            {
                "GREEN" => SafetyIndicator.Green,
                "ORANGE" => SafetyIndicator.Orange,
                _ => SafetyIndicator.Red
            };
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to read indicator signal from bridge");
            return SafetyIndicator.Red;
        }
    }

    public async Task<double> GetIndicatorScoreAsync(string dataPath, int magicNumber)
    {
        try
        {
            var bridgePath = GetBridgePath(dataPath, magicNumber);
            var statusFile = Path.Combine(bridgePath, "status.json");

            if (!File.Exists(statusFile))
                return 0.0;

            var json = await File.ReadAllTextAsync(statusFile);
            var status = JsonSerializer.Deserialize<BridgeStatusResponse>(json, _jsonOptions);

            return status?.Indicator?.Score ?? 0.0;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to read indicator score from bridge");
            return 0.0;
        }
    }

    public async Task<IEnumerable<Trade>> GetOpenPositionsAsync(string dataPath, int magicNumber)
    {
        try
        {
            var bridgePath = GetBridgePath(dataPath, magicNumber);
            var statusFile = Path.Combine(bridgePath, "status.json");

            if (!File.Exists(statusFile))
                return Enumerable.Empty<Trade>();

            var json = await File.ReadAllTextAsync(statusFile);
            var status = JsonSerializer.Deserialize<BridgeStatusResponse>(json, _jsonOptions);

            return status?.Positions?.Select(p => new Trade
            {
                Ticket = p.Ticket.ToString(),
                Symbol = p.Symbol ?? "",
                Type = p.Type?.ToUpperInvariant() == "BUY" ? TradeType.Buy : TradeType.Sell,
                Volume = p.Volume,
                OpenPrice = p.OpenPrice,
                OpenTime = p.OpenTime,
                StopLoss = p.StopLoss,
                TakeProfit = p.TakeProfit,
                Profit = p.Profit,
                Commission = p.Commission,
                Swap = p.Swap,
                MagicNumber = p.MagicNumber,
                Comment = p.Comment
            }) ?? Enumerable.Empty<Trade>();
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to read positions from bridge");
            return Enumerable.Empty<Trade>();
        }
    }

    public async Task<IEnumerable<TradeEvent>> GetTradeEventsAsync(string dataPath, int magicNumber)
    {
        try
        {
            var bridgePath = GetBridgePath(dataPath, magicNumber);
            var eventsFile = Path.Combine(bridgePath, "events.json");

            if (!File.Exists(eventsFile))
                return Enumerable.Empty<TradeEvent>();

            var json = await File.ReadAllTextAsync(eventsFile);
            var events = JsonSerializer.Deserialize<List<TradeEventResponse>>(json, _jsonOptions);

            // Clear events file after reading
            await File.WriteAllTextAsync(eventsFile, "[]");

            return events?.Select(e => new TradeEvent
            {
                Type = e.Type == "TRADE_OPENED" ? TradeEventType.Opened : TradeEventType.Closed,
                Ticket = e.Ticket.ToString(),
                TradeType = e.TradeType?.ToUpperInvariant() == "BUY" ? TradeType.Buy : TradeType.Sell,
                Volume = e.Volume,
                Price = e.Price,
                StopLoss = e.Sl,
                TakeProfit = e.Tp,
                Profit = e.Profit,
                Timestamp = e.Timestamp
            }) ?? Enumerable.Empty<TradeEvent>();
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to read trade events from bridge");
            return Enumerable.Empty<TradeEvent>();
        }
    }

    public async Task<bool> SendCommandAsync(string dataPath, int magicNumber, string command, object? parameters = null)
    {
        try
        {
            var bridgePath = GetBridgePath(dataPath, magicNumber);

            // Ensure directory exists
            Directory.CreateDirectory(bridgePath);

            var commandFile = Path.Combine(bridgePath, "command.json");
            var responseFile = Path.Combine(bridgePath, "response.json");

            // Clear any old response
            if (File.Exists(responseFile))
                File.Delete(responseFile);

            // Write command
            var commandObj = new
            {
                command = command.ToLowerInvariant(),
                @params = parameters ?? new { },
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            };

            var json = JsonSerializer.Serialize(commandObj, _jsonOptions);
            await File.WriteAllTextAsync(commandFile, json);

            _logger.LogDebug("Sent command {Command} to bridge at {Path}", command, bridgePath);

            // Wait for response (with timeout)
            var timeout = DateTime.UtcNow.AddSeconds(5);
            while (DateTime.UtcNow < timeout)
            {
                if (File.Exists(responseFile))
                {
                    var responseJson = await File.ReadAllTextAsync(responseFile);
                    var response = JsonSerializer.Deserialize<CommandResponse>(responseJson, _jsonOptions);

                    _logger.LogDebug("Received response: {Success} - {Message}",
                        response?.Success, response?.Message);

                    return response?.Success ?? false;
                }
                await Task.Delay(100);
            }

            _logger.LogWarning("Command {Command} timed out waiting for response", command);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send command {Command} to bridge", command);
            return false;
        }
    }

    public Task<bool> StartTradingAsync(string dataPath, int magicNumber)
        => SendCommandAsync(dataPath, magicNumber, "START");

    public Task<bool> StopTradingAsync(string dataPath, int magicNumber)
        => SendCommandAsync(dataPath, magicNumber, "STOP");

    public Task<bool> PauseTradingAsync(string dataPath, int magicNumber)
        => SendCommandAsync(dataPath, magicNumber, "PAUSE");

    public Task<bool> ResumeTradingAsync(string dataPath, int magicNumber)
        => SendCommandAsync(dataPath, magicNumber, "RESUME");

    public Task<bool> CloseAllPositionsAsync(string dataPath, int magicNumber)
        => SendCommandAsync(dataPath, magicNumber, "CLOSE_ALL");

    public Task<bool> UpdateSettingsAsync(string dataPath, int magicNumber, Dictionary<string, object> settings)
        => SendCommandAsync(dataPath, magicNumber, "UPDATE_SETTINGS", settings);

    // Response DTOs matching the MQL5 Bridge JSON output
    private class BridgeStatusResponse
    {
        public string? Health { get; set; }
        public long Timestamp { get; set; }
        public AccountDto? Account { get; set; }
        public EADto? Ea { get; set; }
        public IndicatorDto? Indicator { get; set; }
        public List<PositionDto>? Positions { get; set; }
    }

    private class AccountDto
    {
        public double Balance { get; set; }
        public double Equity { get; set; }
        public double Margin { get; set; }
        public double FreeMargin { get; set; }
        public double Profit { get; set; }
        public string? AccountNumber { get; set; }
        public string? Broker { get; set; }
        public string? Server { get; set; }
        public int Leverage { get; set; }
        public string? Currency { get; set; }
    }

    private class EADto
    {
        public bool Loaded { get; set; }
        public bool Running { get; set; }
        public bool Paused { get; set; }
        public string? Name { get; set; }
        public string? Symbol { get; set; }
        public string? Timeframe { get; set; }
    }

    private class IndicatorDto
    {
        public string? Signal { get; set; }
        public double Score { get; set; }
    }

    private class PositionDto
    {
        public long Ticket { get; set; }
        public string? Symbol { get; set; }
        public string? Type { get; set; }
        public double Volume { get; set; }
        public double OpenPrice { get; set; }
        public long OpenTime { get; set; }
        public double? StopLoss { get; set; }
        public double? TakeProfit { get; set; }
        public double Profit { get; set; }
        public double Commission { get; set; }
        public double Swap { get; set; }
        public int? MagicNumber { get; set; }
        public string? Comment { get; set; }
    }

    private class TradeEventResponse
    {
        public string? Type { get; set; }
        public long Ticket { get; set; }
        public string? TradeType { get; set; }
        public double Volume { get; set; }
        public double Price { get; set; }
        public double? Sl { get; set; }
        public double? Tp { get; set; }
        public double? Profit { get; set; }
        public long Timestamp { get; set; }
    }

    private class CommandResponse
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public long Timestamp { get; set; }
    }
}
