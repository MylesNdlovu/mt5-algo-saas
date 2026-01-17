namespace MT5Agent.Core.Models;

/// <summary>
/// Represents a running MT5 terminal instance
/// </summary>
public class MT5Instance
{
    /// <summary>
    /// MT5 account number
    /// </summary>
    public string AccountNumber { get; set; } = string.Empty;

    /// <summary>
    /// Broker name (e.g., Exness, PrimeXBT)
    /// </summary>
    public string? Broker { get; set; }

    /// <summary>
    /// MT5 server name
    /// </summary>
    public string? ServerName { get; set; }

    /// <summary>
    /// Windows process ID
    /// </summary>
    public int ProcessId { get; set; }

    /// <summary>
    /// MT5 window title
    /// </summary>
    public string? WindowTitle { get; set; }

    /// <summary>
    /// Magic number for EA (used for bridge communication)
    /// </summary>
    public int MagicNumber { get; set; }

    /// <summary>
    /// Current instance status
    /// </summary>
    public MT5InstanceStatus Status { get; set; } = MT5InstanceStatus.Starting;

    /// <summary>
    /// Path to this instance's portable data folder
    /// </summary>
    public string? DataFolder { get; set; }

    /// <summary>
    /// Current account information
    /// </summary>
    public AccountInfo AccountInfo { get; set; } = new();

    /// <summary>
    /// Current EA status
    /// </summary>
    public EAStatus EAStatus { get; set; } = new();

    /// <summary>
    /// Current traffic light indicator value
    /// </summary>
    public SafetyIndicator IndicatorSignal { get; set; } = SafetyIndicator.Red;

    /// <summary>
    /// Indicator score (0-100)
    /// </summary>
    public double IndicatorScore { get; set; }

    /// <summary>
    /// Last activity timestamp
    /// </summary>
    public DateTime LastActivity { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When this instance was started
    /// </summary>
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Last error message if status is Error
    /// </summary>
    public string? LastError { get; set; }
}

/// <summary>
/// MT5 instance status
/// </summary>
public enum MT5InstanceStatus
{
    /// <summary>Terminal is starting up</summary>
    Starting,

    /// <summary>Terminal is running and connected</summary>
    Online,

    /// <summary>Terminal is not running</summary>
    Offline,

    /// <summary>Terminal encountered an error</summary>
    Error,

    /// <summary>Login to broker failed</summary>
    LoginFailed
}
