using Microsoft.AspNetCore.Mvc;
using MT5AgentAPI.Models;
using MT5AgentAPI.Services;

namespace MT5AgentAPI.Controllers;

[ApiController]
[Route("api/account")]
public class AccountController : ControllerBase
{
    private readonly MT5ConnectionService _mt5Service;
    private readonly VPSManagementService _vpsService;
    private readonly LTCCopierService _copierService;
    private readonly ILogger<AccountController> _logger;

    public AccountController(
        MT5ConnectionService mt5Service,
        VPSManagementService vpsService,
        LTCCopierService copierService,
        ILogger<AccountController> logger)
    {
        _mt5Service = mt5Service;
        _vpsService = vpsService;
        _copierService = copierService;
        _logger = logger;
    }

    [HttpPost("setup")]
    public async Task<IActionResult> SetupAccount([FromBody] AccountSetupRequest request)
    {
        try
        {
            _logger.LogInformation($"Setting up account {request.AccountNumber} for user {request.UserId}");

            // Step 1: Provision VPS
            var vpsInfo = await _vpsService.ProvisionVPS(request.UserId);
            _logger.LogInformation($"VPS provisioned: {vpsInfo.IpAddress}");

            // Step 2: Install MT5 and EA on VPS
            await _vpsService.InstallMT5OnVPS(vpsInfo.IpAddress, request.ServerName);
            _logger.LogInformation("MT5 installed on VPS");

            // Step 3: Configure MT5 account
            var account = new MT5Account
            {
                Id = Guid.NewGuid().ToString(),
                AccountNumber = request.AccountNumber,
                Login = request.Login,
                Password = request.Password,
                ServerName = request.ServerName,
                VpsIp = vpsInfo.IpAddress,
                VpsPort = vpsInfo.Port,
                EaStatus = EAStatus.STOPPED,
                SafetyIndicator = SafetyIndicator.RED
            };

            await _mt5Service.ConfigureAccount(account);
            _logger.LogInformation("MT5 account configured");

            // Step 4: Setup LTC copier (slave)
            await _copierService.SetupSlaveCopier(account.Id, account.Login);
            _logger.LogInformation("LTC copier configured");

            return Ok(new
            {
                success = true,
                message = "Account setup completed successfully",
                accountId = account.Id,
                vpsIp = vpsInfo.IpAddress
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting up account");
            return StatusCode(500, new { success = false, message = "Account setup failed", error = ex.Message });
        }
    }
}
