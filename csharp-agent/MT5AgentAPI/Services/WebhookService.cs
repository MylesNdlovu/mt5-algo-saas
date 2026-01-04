using MT5AgentAPI.Models;
using System.Text;
using System.Text.Json;

namespace MT5AgentAPI.Services;

public class WebhookService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<WebhookService> _logger;

    public WebhookService(HttpClient httpClient, IConfiguration configuration, ILogger<WebhookService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendTradesToWebApp(string accountId, List<TradeInfo> trades)
    {
        try
        {
            var webAppUrl = _configuration["WebAppUrl"];
            var endpoint = $"{webAppUrl}/api/webhook/trades";

            var payload = new
            {
                accountId,
                trades,
                timestamp = DateTime.UtcNow
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(endpoint, content);
            response.EnsureSuccessStatusCode();

            _logger.LogInformation($"Sent {trades.Count} trades to web app for account {accountId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to send trades to web app for account {accountId}");
        }
    }

    public async Task NotifyStatusChange(string accountId, EAStatus status)
    {
        try
        {
            var webAppUrl = _configuration["WebAppUrl"];
            var endpoint = $"{webAppUrl}/api/webhook/status";

            var payload = new
            {
                accountId,
                status = status.ToString(),
                timestamp = DateTime.UtcNow
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(endpoint, content);
            response.EnsureSuccessStatusCode();

            _logger.LogInformation($"Notified web app of status change for account {accountId}: {status}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to notify status change for account {accountId}");
        }
    }
}
