using MT5AgentAPI.Models;

namespace MT5AgentAPI.Services;

public class MarketAnalysisService
{
    private readonly ILogger<MarketAnalysisService> _logger;
    private MarketCondition _currentCondition;
    private readonly Timer _updateTimer;

    public MarketAnalysisService(ILogger<MarketAnalysisService> logger)
    {
        _logger = logger;
        _currentCondition = new MarketCondition
        {
            Volatility = 0,
            Spread = 0,
            Trend = "NEUTRAL",
            NewsImpact = false,
            SafetyIndicator = SafetyIndicator.GREEN,
            Reason = "Initial state"
        };

        // Update market conditions every 30 seconds
        _updateTimer = new Timer(UpdateMarketConditions, null, TimeSpan.Zero, TimeSpan.FromSeconds(30));
    }

    private async void UpdateMarketConditions(object? state)
    {
        try
        {
            var conditions = await AnalyzeMarketConditions();
            _currentCondition = conditions;
            _logger.LogInformation($"Market conditions updated: {conditions.SafetyIndicator} - {conditions.Reason}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating market conditions");
        }
    }

    public async Task<MarketCondition> GetCurrentConditions()
    {
        return await Task.FromResult(_currentCondition);
    }

    private async Task<MarketCondition> AnalyzeMarketConditions()
    {
        // In production, this would:
        // 1. Fetch current XAUUSD (Gold) data from MT5
        // 2. Calculate volatility (ATR, standard deviation)
        // 3. Check spread conditions
        // 4. Analyze trend (MA, trend lines)
        // 5. Check economic calendar for high-impact news
        // 6. Evaluate overall risk

        // Simulated analysis
        var random = new Random();
        var volatility = random.NextDouble() * 10; // 0-10
        var spread = random.NextDouble() * 5; // 0-5 pips
        var hasNews = random.Next(0, 10) > 8; // 20% chance of news

        var indicator = DetermineSafetyIndicator(volatility, spread, hasNews);
        var reason = GetSafetyReason(volatility, spread, hasNews);

        return await Task.FromResult(new MarketCondition
        {
            Volatility = volatility,
            Spread = spread,
            Trend = DetermineTrend(),
            NewsImpact = hasNews,
            SafetyIndicator = indicator,
            Reason = reason
        });
    }

    private SafetyIndicator DetermineSafetyIndicator(double volatility, double spread, bool hasNews)
    {
        // RED: Unsafe conditions
        if (hasNews || volatility > 7 || spread > 3)
        {
            return SafetyIndicator.RED;
        }

        // ORANGE: Caution conditions
        if (volatility > 4 || spread > 1.5)
        {
            return SafetyIndicator.ORANGE;
        }

        // GREEN: Safe conditions
        return SafetyIndicator.GREEN;
    }

    private string GetSafetyReason(double volatility, double spread, bool hasNews)
    {
        if (hasNews)
            return "High-impact news event detected";
        
        if (volatility > 7)
            return "Extremely high volatility";
        
        if (spread > 3)
            return "Spread too wide";
        
        if (volatility > 4)
            return "Elevated volatility - trade with caution";
        
        if (spread > 1.5)
            return "Increased spread - monitor closely";
        
        return "Market conditions are favorable";
    }

    private string DetermineTrend()
    {
        var trends = new[] { "BULLISH", "BEARISH", "NEUTRAL", "RANGING" };
        return trends[new Random().Next(trends.Length)];
    }
}
