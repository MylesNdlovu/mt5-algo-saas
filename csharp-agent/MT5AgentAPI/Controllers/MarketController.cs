using Microsoft.AspNetCore.Mvc;
using MT5AgentAPI.Models;
using MT5AgentAPI.Services;

namespace MT5AgentAPI.Controllers;

[ApiController]
[Route("api/market")]
public class MarketController : ControllerBase
{
    private readonly MarketAnalysisService _marketService;
    private readonly ILogger<MarketController> _logger;

    public MarketController(MarketAnalysisService marketService, ILogger<MarketController> logger)
    {
        _marketService = marketService;
        _logger = logger;
    }

    [HttpGet("safety")]
    public async Task<IActionResult> GetSafetyIndicator()
    {
        try
        {
            var conditions = await _marketService.GetCurrentConditions();
            return Ok(new
            {
                indicator = conditions.SafetyIndicator.ToString(),
                reason = conditions.Reason,
                details = new
                {
                    volatility = conditions.Volatility,
                    spread = conditions.Spread,
                    trend = conditions.Trend,
                    newsImpact = conditions.NewsImpact
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting safety indicator");
            return StatusCode(500, new { error = "Failed to get safety indicator" });
        }
    }
}
