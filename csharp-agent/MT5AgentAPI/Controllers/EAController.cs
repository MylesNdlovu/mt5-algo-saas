using Microsoft.AspNetCore.Mvc;
using MT5AgentAPI.Models;
using MT5AgentAPI.Services;

namespace MT5AgentAPI.Controllers;

[ApiController]
[Route("api/ea")]
public class EAController : ControllerBase
{
    private readonly EAControlService _eaService;
    private readonly MarketAnalysisService _marketService;
    private readonly ILogger<EAController> _logger;

    public EAController(
        EAControlService eaService, 
        MarketAnalysisService marketService,
        ILogger<EAController> logger)
    {
        _eaService = eaService;
        _marketService = marketService;
        _logger = logger;
    }

    [HttpPost("control")]
    public async Task<IActionResult> ControlEA([FromBody] EAControlRequest request)
    {
        try
        {
            _logger.LogInformation($"EA control request: {request.Action} for account {request.AccountId}");

            // Get current market conditions
            var marketCondition = await _marketService.GetCurrentConditions();

            // Check if action is allowed based on market conditions
            if (request.Action.ToLower() == "start" && marketCondition.SafetyIndicator == SafetyIndicator.RED)
            {
                return BadRequest(new { error = "Cannot start EA: Market conditions are unsafe (RED)" });
            }

            var response = await _eaService.ControlEA(request.AccountId, request.Action);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error controlling EA");
            return StatusCode(500, new { error = "Failed to control EA", details = ex.Message });
        }
    }

    [HttpGet("status/{accountId}")]
    public async Task<IActionResult> GetStatus(string accountId)
    {
        try
        {
            var status = await _eaService.GetEAStatus(accountId);
            return Ok(status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error getting EA status for account {accountId}");
            return StatusCode(500, new { error = "Failed to get EA status" });
        }
    }
}
