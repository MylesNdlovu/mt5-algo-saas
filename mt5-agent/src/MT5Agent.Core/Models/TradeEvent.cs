namespace MT5Agent.Core.Models;

/// <summary>
/// Represents a trade event from the MQL5 bridge
/// </summary>
public class TradeEvent
{
    /// <summary>
    /// Type of event (Opened, Closed, Modified)
    /// </summary>
    public TradeEventType Type { get; set; }

    /// <summary>
    /// Trade ticket number
    /// </summary>
    public string Ticket { get; set; } = string.Empty;

    /// <summary>
    /// Trade type (Buy/Sell)
    /// </summary>
    public TradeType TradeType { get; set; }

    /// <summary>
    /// Trade volume
    /// </summary>
    public double Volume { get; set; }

    /// <summary>
    /// Trade price (open or close)
    /// </summary>
    public double Price { get; set; }

    /// <summary>
    /// Stop loss level
    /// </summary>
    public double? StopLoss { get; set; }

    /// <summary>
    /// Take profit level
    /// </summary>
    public double? TakeProfit { get; set; }

    /// <summary>
    /// Profit (for closed trades)
    /// </summary>
    public double? Profit { get; set; }

    /// <summary>
    /// Event timestamp
    /// </summary>
    public long Timestamp { get; set; }
}

/// <summary>
/// Trade event types
/// </summary>
public enum TradeEventType
{
    Opened,
    Closed,
    Modified
}
