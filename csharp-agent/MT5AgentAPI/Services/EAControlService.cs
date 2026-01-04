using MT5AgentAPI.Models;

namespace MT5AgentAPI.Services;

public class EAControlService
{
    private readonly MT5ConnectionService _mt5Service;
    private readonly LTCCopierService _copierService;
    private readonly MarketAnalysisService _marketService;
    private readonly ILogger<EAControlService> _logger;

    public EAControlService(
        MT5ConnectionService mt5Service,
        LTCCopierService copierService,
        MarketAnalysisService marketService,
        ILogger<EAControlService> logger)
    {
        _mt5Service = mt5Service;
        _copierService = copierService;
        _marketService = marketService;
        _logger = logger;
    }

    public async Task<EAStatusResponse> ControlEA(string accountId, string action)
    {
        var account = _mt5Service.GetAccount(accountId);
        if (account == null)
        {
            throw new Exception("Account not found");
        }

        var marketCondition = await _marketService.GetCurrentConditions();

        switch (action.ToLower())
        {
            case "start":
                return await StartEA(account, marketCondition);
            
            case "stop":
                return await StopEA(account);
            
            case "pause":
                return await PauseEA(account);
            
            default:
                throw new ArgumentException($"Invalid action: {action}");
        }
    }

    private async Task<EAStatusResponse> StartEA(MT5Account account, MarketCondition condition)
    {
        _logger.LogInformation($"Starting EA for account {account.AccountNumber}");

        if (condition.SafetyIndicator == SafetyIndicator.RED)
        {
            throw new Exception("Cannot start EA: Market conditions are unsafe");
        }

        // In production:
        // 1. Connect to MT5 terminal on VPS
        // 2. Enable auto-trading
        // 3. Start the Gold Scalper EA
        // 4. Enable LTC copier for this slave

        await _copierService.EnableCopier(account.Id);

        _mt5Service.UpdateAccountStatus(account.Id, EAStatus.RUNNING, condition.SafetyIndicator);

        return new EAStatusResponse
        {
            AccountId = account.Id,
            Status = EAStatus.RUNNING,
            SafetyIndicator = condition.SafetyIndicator,
            Message = "EA started successfully"
        };
    }

    private async Task<EAStatusResponse> StopEA(MT5Account account)
    {
        _logger.LogInformation($"Stopping EA for account {account.AccountNumber}");

        // In production:
        // 1. Disable auto-trading on MT5
        // 2. Stop the EA
        // 3. Close all open positions (optional, based on configuration)
        // 4. Disable LTC copier

        await _copierService.DisableCopier(account.Id);

        _mt5Service.UpdateAccountStatus(account.Id, EAStatus.STOPPED, SafetyIndicator.RED);

        return new EAStatusResponse
        {
            AccountId = account.Id,
            Status = EAStatus.STOPPED,
            SafetyIndicator = SafetyIndicator.RED,
            Message = "EA stopped successfully"
        };
    }

    private async Task<EAStatusResponse> PauseEA(MT5Account account)
    {
        _logger.LogInformation($"Pausing EA for account {account.AccountNumber}");

        await _copierService.DisableCopier(account.Id);

        var currentCondition = await _marketService.GetCurrentConditions();
        _mt5Service.UpdateAccountStatus(account.Id, EAStatus.PAUSED, currentCondition.SafetyIndicator);

        return new EAStatusResponse
        {
            AccountId = account.Id,
            Status = EAStatus.PAUSED,
            SafetyIndicator = currentCondition.SafetyIndicator,
            Message = "EA paused"
        };
    }

    public async Task<EAStatusResponse> GetEAStatus(string accountId)
    {
        var account = _mt5Service.GetAccount(accountId);
        if (account == null)
        {
            throw new Exception("Account not found");
        }

        var marketCondition = await _marketService.GetCurrentConditions();

        return new EAStatusResponse
        {
            AccountId = account.Id,
            Status = account.EaStatus,
            SafetyIndicator = marketCondition.SafetyIndicator,
            Message = $"EA is {account.EaStatus}"
        };
    }
}
