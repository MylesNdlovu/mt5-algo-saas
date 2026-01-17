namespace MT5Agent.Core.Models;

/// <summary>
/// Expert Advisor status information
/// </summary>
public class EAStatus
{
    /// <summary>
    /// Whether an EA is loaded on the chart
    /// </summary>
    public bool Loaded { get; set; }

    /// <summary>
    /// Whether the EA is currently running (trading enabled)
    /// </summary>
    public bool Running { get; set; }

    /// <summary>
    /// Whether the EA is paused
    /// </summary>
    public bool Paused { get; set; }

    /// <summary>
    /// Name of the loaded EA
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Symbol the EA is running on
    /// </summary>
    public string? Symbol { get; set; }

    /// <summary>
    /// Timeframe the EA is running on
    /// </summary>
    public string? Timeframe { get; set; }

    /// <summary>
    /// EA's magic number for trade identification
    /// </summary>
    public int? MagicNumber { get; set; }

    /// <summary>
    /// Whether the EA was stopped by the indicator (RED signal).
    /// Used to track if we should auto-resume when conditions improve.
    /// </summary>
    public bool StoppedByIndicator { get; set; }

    /// <summary>
    /// Timestamp when EA was stopped by indicator
    /// </summary>
    public DateTime? StoppedByIndicatorAt { get; set; }

    /// <summary>
    /// Current EA state
    /// </summary>
    public EAState State => Running ? EAState.Running : (Paused ? EAState.Paused : (Loaded ? EAState.Stopped : EAState.NotLoaded));
}

/// <summary>
/// EA operational state
/// </summary>
public enum EAState
{
    /// <summary>No EA loaded</summary>
    NotLoaded,

    /// <summary>EA loaded but stopped</summary>
    Stopped,

    /// <summary>EA running and trading</summary>
    Running,

    /// <summary>EA paused (loaded but not trading)</summary>
    Paused,

    /// <summary>EA in error state</summary>
    Error
}
