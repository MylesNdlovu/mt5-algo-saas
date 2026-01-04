using Microsoft.AspNetCore.Mvc;
using MT5AgentAPI.Services;

namespace MT5AgentAPI.Controllers;

[ApiController]
[Route("api/trades")]
public class TradesController : ControllerBase
{
    private readonly MT5ConnectionService _mt5Service;
    private readonly WebhookService _webhookService;
    private readonly ILogger<TradesController> _logger;

    public TradesController(
        MT5ConnectionService mt5Service,
        WebhookService webhookService,
        ILogger<TradesController> logger)
    {
        _mt5Service = mt5Service;
        _webhookService = webhookService;
        _logger = logger;
    }

    [HttpPost("sync/{accountId}")]
    public async Task<IActionResult> SyncTrades(string accountId)
    {
        try
        {
            _logger.LogInformation($"Syncing trades for account {accountId}");

            var trades = await _mt5Service.GetTrades(accountId);
            
            // Send trades to web app
            await _webhookService.SendTradesToWebApp(accountId, trades);

            return Ok(new
            {
                success = true,
                tradesCount = trades.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error syncing trades for account {accountId}");
            return StatusCode(500, new { error = "Failed to sync trades" });
        }
    }
}
