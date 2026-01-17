namespace MT5Agent.Core.Models;

/// <summary>
/// Traffic light safety indicator for trading conditions
/// </summary>
public enum SafetyIndicator
{
    /// <summary>
    /// RED - No trading. EA stopped or market conditions unsafe.
    /// Trading is halted to protect the account.
    /// </summary>
    Red,

    /// <summary>
    /// ORANGE - OK conditions. Proceed with caution.
    /// Trading is allowed but with reduced risk/lot sizes.
    /// </summary>
    Orange,

    /// <summary>
    /// GREEN - Great conditions. Optimal for scalping.
    /// Full trading with normal risk parameters.
    /// </summary>
    Green
}

/// <summary>
/// Extension methods for SafetyIndicator
/// </summary>
public static class SafetyIndicatorExtensions
{
    /// <summary>
    /// Convert to string representation for WebSocket messages
    /// </summary>
    public static string ToMessageString(this SafetyIndicator indicator) => indicator switch
    {
        SafetyIndicator.Red => "RED",
        SafetyIndicator.Orange => "ORANGE",
        SafetyIndicator.Green => "GREEN",
        _ => "RED"
    };

    /// <summary>
    /// Parse from string (case-insensitive)
    /// </summary>
    public static SafetyIndicator FromString(string value) => value.ToUpperInvariant() switch
    {
        "RED" => SafetyIndicator.Red,
        "ORANGE" => SafetyIndicator.Orange,
        "GREEN" => SafetyIndicator.Green,
        _ => SafetyIndicator.Red
    };

    /// <summary>
    /// Whether trading is allowed with this indicator
    /// </summary>
    public static bool IsTradingAllowed(this SafetyIndicator indicator) =>
        indicator != SafetyIndicator.Red;

    /// <summary>
    /// Get risk multiplier based on indicator
    /// </summary>
    public static double GetRiskMultiplier(this SafetyIndicator indicator) => indicator switch
    {
        SafetyIndicator.Red => 0.0,    // No trading
        SafetyIndicator.Orange => 0.5,  // 50% risk
        SafetyIndicator.Green => 1.0,   // Full risk
        _ => 0.0
    };
}
