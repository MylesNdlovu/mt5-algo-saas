using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using MT5Agent.Core.Interfaces;
using MT5Agent.Core.Models;

namespace MT5Agent.Core.Services;

/// <summary>
/// HTTP client for communicating with the MQL5 Bridge EA running inside MT5.
/// Note: This is an alternative to FileBridgeClient for HTTP-based communication.
/// Currently not used as the primary implementation.
/// </summary>
public class EABridgeClient : IDisposable
{
    private readonly ILogger<EABridgeClient> _logger;
    private readonly HttpClient _httpClient;
    private readonly JsonSerializerOptions _jsonOptions;

    public EABridgeClient(ILogger<EABridgeClient> logger)
    {
        _logger = logger;
        _httpClient = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(5)
        };
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };
    }

    private string GetBaseUrl(int port) => $"http://127.0.0.1:{port}";

    public async Task<bool> IsHealthyAsync(int port)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{GetBaseUrl(port)}/health");
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    public async Task<EAStatus?> GetEAStatusAsync(int port)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{GetBaseUrl(port)}/ea/status");
            if (!response.IsSuccessStatusCode) return null;

            var json = await response.Content.ReadAsStringAsync();
            var dto = JsonSerializer.Deserialize<EAStatusResponse>(json, _jsonOptions);

            return dto == null ? null : new EAStatus
            {
                Loaded = dto.Loaded,
                Running = dto.Running,
                Paused = dto.Paused,
                Name = dto.Name,
                Symbol = dto.Symbol,
                Timeframe = dto.Timeframe,
                MagicNumber = dto.MagicNumber
            };
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to get EA status from port {Port}", port);
            return null;
        }
    }

    public async Task<AccountInfo?> GetAccountInfoAsync(int port)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{GetBaseUrl(port)}/account");
            if (!response.IsSuccessStatusCode) return null;

            var json = await response.Content.ReadAsStringAsync();
            var dto = JsonSerializer.Deserialize<AccountInfoResponse>(json, _jsonOptions);

            return dto == null ? null : new AccountInfo
            {
                Balance = dto.Balance,
                Equity = dto.Equity,
                Margin = dto.Margin,
                FreeMargin = dto.FreeMargin,
                Profit = dto.Profit,
                AccountNumber = dto.AccountNumber,
                Broker = dto.Broker,
                ServerName = dto.Server,
                Leverage = dto.Leverage,
                Currency = dto.Currency ?? "USD"
            };
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to get account info from port {Port}", port);
            return null;
        }
    }

    public async Task<SafetyIndicator> GetIndicatorSignalAsync(int port)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{GetBaseUrl(port)}/indicator/signal");
            if (!response.IsSuccessStatusCode) return SafetyIndicator.Red;

            var json = await response.Content.ReadAsStringAsync();
            var dto = JsonSerializer.Deserialize<IndicatorSignalResponse>(json, _jsonOptions);

            return dto?.Signal?.ToUpperInvariant() switch
            {
                "GREEN" => SafetyIndicator.Green,
                "ORANGE" => SafetyIndicator.Orange,
                _ => SafetyIndicator.Red
            };
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to get indicator signal from port {Port}", port);
            return SafetyIndicator.Red;
        }
    }

    public async Task<IEnumerable<Trade>> GetOpenPositionsAsync(int port)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{GetBaseUrl(port)}/positions");
            if (!response.IsSuccessStatusCode) return Enumerable.Empty<Trade>();

            var json = await response.Content.ReadAsStringAsync();
            var positions = JsonSerializer.Deserialize<List<PositionResponse>>(json, _jsonOptions);

            return positions?.Select(p => new Trade
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
            _logger.LogDebug(ex, "Failed to get positions from port {Port}", port);
            return Enumerable.Empty<Trade>();
        }
    }

    public async Task<IEnumerable<Trade>> GetTradeHistoryAsync(int port, DateTime? since = null)
    {
        try
        {
            var url = $"{GetBaseUrl(port)}/history";
            if (since.HasValue)
            {
                var sinceTimestamp = new DateTimeOffset(since.Value).ToUnixTimeMilliseconds();
                url += $"?since={sinceTimestamp}";
            }

            var response = await _httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode) return Enumerable.Empty<Trade>();

            var json = await response.Content.ReadAsStringAsync();
            var trades = JsonSerializer.Deserialize<List<TradeHistoryResponse>>(json, _jsonOptions);

            return trades?.Select(t => new Trade
            {
                Ticket = t.Ticket.ToString(),
                Symbol = t.Symbol ?? "",
                Type = t.Type?.ToUpperInvariant() == "BUY" ? TradeType.Buy : TradeType.Sell,
                Volume = t.Volume,
                OpenPrice = t.OpenPrice,
                OpenTime = t.OpenTime,
                ClosePrice = t.ClosePrice,
                CloseTime = t.CloseTime,
                StopLoss = t.StopLoss,
                TakeProfit = t.TakeProfit,
                Profit = t.Profit,
                Commission = t.Commission,
                Swap = t.Swap,
                MagicNumber = t.MagicNumber,
                Comment = t.Comment
            }) ?? Enumerable.Empty<Trade>();
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to get trade history from port {Port}", port);
            return Enumerable.Empty<Trade>();
        }
    }

    public async Task<bool> StartTradingAsync(int port)
    {
        try
        {
            var response = await _httpClient.PostAsync($"{GetBaseUrl(port)}/ea/start", null);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to start trading on port {Port}", port);
            return false;
        }
    }

    public async Task<bool> StopTradingAsync(int port)
    {
        try
        {
            var response = await _httpClient.PostAsync($"{GetBaseUrl(port)}/ea/stop", null);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to stop trading on port {Port}", port);
            return false;
        }
    }

    public async Task<bool> PauseTradingAsync(int port)
    {
        try
        {
            var response = await _httpClient.PostAsync($"{GetBaseUrl(port)}/ea/pause", null);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to pause trading on port {Port}", port);
            return false;
        }
    }

    public async Task<bool> UpdateSettingsAsync(int port, Dictionary<string, object> settings)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync($"{GetBaseUrl(port)}/ea/settings", settings);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to update settings on port {Port}", port);
            return false;
        }
    }

    public void Dispose()
    {
        _httpClient.Dispose();
    }

    // Response DTOs matching the EA's JSON output
    private class EAStatusResponse
    {
        public bool Loaded { get; set; }
        public bool Running { get; set; }
        public bool Paused { get; set; }
        public string? Name { get; set; }
        public string? Symbol { get; set; }
        public string? Timeframe { get; set; }
        public int? MagicNumber { get; set; }
    }

    private class AccountInfoResponse
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

    private class IndicatorSignalResponse
    {
        public string? Signal { get; set; } // RED, ORANGE, GREEN
        public double? Score { get; set; }
        public long Timestamp { get; set; }
    }

    private class PositionResponse
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

    private class TradeHistoryResponse : PositionResponse
    {
        public double? ClosePrice { get; set; }
        public long? CloseTime { get; set; }
    }
}
