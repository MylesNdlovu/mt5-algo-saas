namespace MT5Agent.Core.Models;

/// <summary>
/// Represents a trade/position in MT5
/// </summary>
public class Trade
{
    /// <summary>
    /// Unique ticket number
    /// </summary>
    public string Ticket { get; set; } = string.Empty;

    /// <summary>
    /// Trading symbol (e.g., XAUUSD)
    /// </summary>
    public string Symbol { get; set; } = string.Empty;

    /// <summary>
    /// Trade type
    /// </summary>
    public TradeType Type { get; set; }

    /// <summary>
    /// Volume in lots
    /// </summary>
    public double Volume { get; set; }

    /// <summary>
    /// Open price
    /// </summary>
    public double OpenPrice { get; set; }

    /// <summary>
    /// Open time (Unix timestamp in milliseconds)
    /// </summary>
    public long OpenTime { get; set; }

    /// <summary>
    /// Close price (null if still open)
    /// </summary>
    public double? ClosePrice { get; set; }

    /// <summary>
    /// Close time (null if still open)
    /// </summary>
    public long? CloseTime { get; set; }

    /// <summary>
    /// Stop loss level
    /// </summary>
    public double? StopLoss { get; set; }

    /// <summary>
    /// Take profit level
    /// </summary>
    public double? TakeProfit { get; set; }

    /// <summary>
    /// Current profit/loss
    /// </summary>
    public double Profit { get; set; }

    /// <summary>
    /// Commission charged
    /// </summary>
    public double Commission { get; set; }

    /// <summary>
    /// Swap charges
    /// </summary>
    public double Swap { get; set; }

    /// <summary>
    /// EA magic number for identification
    /// </summary>
    public int? MagicNumber { get; set; }

    /// <summary>
    /// Trade comment
    /// </summary>
    public string? Comment { get; set; }

    /// <summary>
    /// Whether this trade is closed
    /// </summary>
    public bool IsClosed => CloseTime.HasValue;
}

/// <summary>
/// Trade direction
/// </summary>
public enum TradeType
{
    Buy,
    Sell
}
