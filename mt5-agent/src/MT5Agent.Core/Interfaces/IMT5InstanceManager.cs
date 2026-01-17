using MT5Agent.Core.Models;

namespace MT5Agent.Core.Interfaces;

/// <summary>
/// Manages MT5 terminal instances
/// </summary>
public interface IMT5InstanceManager
{
    /// <summary>
    /// All currently managed MT5 instances
    /// </summary>
    IReadOnlyList<MT5Instance> Instances { get; }

    /// <summary>
    /// Provision and start a new MT5 instance for a user
    /// </summary>
    /// <param name="account">Account details from web app</param>
    /// <returns>True if provisioning succeeded</returns>
    Task<ProvisionResult> ProvisionAccountAsync(MT5AccountCredentials account);

    /// <summary>
    /// Start an existing MT5 instance
    /// </summary>
    Task<bool> StartInstanceAsync(string accountNumber);

    /// <summary>
    /// Stop an MT5 instance
    /// </summary>
    Task<bool> StopInstanceAsync(string accountNumber);

    /// <summary>
    /// Restart an MT5 instance
    /// </summary>
    Task<bool> RestartInstanceAsync(string accountNumber);

    /// <summary>
    /// Get a specific instance by account number
    /// </summary>
    MT5Instance? GetInstance(string accountNumber);

    /// <summary>
    /// Start EA on an instance
    /// </summary>
    Task<bool> StartEAAsync(string accountNumber);

    /// <summary>
    /// Stop EA on an instance
    /// </summary>
    Task<bool> StopEAAsync(string accountNumber);

    /// <summary>
    /// Get current indicator signal from an instance
    /// </summary>
    Task<SafetyIndicator> GetIndicatorSignalAsync(string accountNumber);

    /// <summary>
    /// Get account info from an instance
    /// </summary>
    Task<AccountInfo?> GetAccountInfoAsync(string accountNumber);

    /// <summary>
    /// Get open trades from an instance
    /// </summary>
    Task<IEnumerable<Trade>> GetOpenTradesAsync(string accountNumber);

    /// <summary>
    /// Shutdown all instances
    /// </summary>
    Task ShutdownAllAsync();

    /// <summary>
    /// Event raised when instance status changes
    /// </summary>
    event EventHandler<InstanceStatusChangedEventArgs>? InstanceStatusChanged;

    /// <summary>
    /// Event raised when a trade is opened
    /// </summary>
    event EventHandler<TradeEventArgs>? TradeOpened;

    /// <summary>
    /// Event raised when a trade is closed
    /// </summary>
    event EventHandler<TradeEventArgs>? TradeClosed;

    /// <summary>
    /// Event raised when indicator signal changes
    /// </summary>
    event EventHandler<IndicatorSignalEventArgs>? IndicatorSignalChanged;
}

/// <summary>
/// Account credentials for MT5 provisioning
/// </summary>
public class MT5AccountCredentials
{
    public string AccountNumber { get; set; } = string.Empty;
    public string Broker { get; set; } = string.Empty;
    public string ServerName { get; set; } = string.Empty;
    public string Login { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
}

/// <summary>
/// Result of provisioning operation
/// </summary>
public class ProvisionResult
{
    public bool Success { get; set; }
    public string? Error { get; set; }
    public MT5Instance? Instance { get; set; }
}

/// <summary>
/// Event args for instance status changes
/// </summary>
public class InstanceStatusChangedEventArgs : EventArgs
{
    public string AccountNumber { get; }
    public MT5InstanceStatus OldStatus { get; }
    public MT5InstanceStatus NewStatus { get; }

    public InstanceStatusChangedEventArgs(string accountNumber, MT5InstanceStatus oldStatus, MT5InstanceStatus newStatus)
    {
        AccountNumber = accountNumber;
        OldStatus = oldStatus;
        NewStatus = newStatus;
    }
}

/// <summary>
/// Event args for trade events
/// </summary>
public class TradeEventArgs : EventArgs
{
    public string AccountNumber { get; }
    public Trade Trade { get; }

    public TradeEventArgs(string accountNumber, Trade trade)
    {
        AccountNumber = accountNumber;
        Trade = trade;
    }
}

/// <summary>
/// Event args for indicator signal changes
/// </summary>
public class IndicatorSignalEventArgs : EventArgs
{
    public string AccountNumber { get; }
    public SafetyIndicator OldSignal { get; }
    public SafetyIndicator NewSignal { get; }

    public IndicatorSignalEventArgs(string accountNumber, SafetyIndicator oldSignal, SafetyIndicator newSignal)
    {
        AccountNumber = accountNumber;
        OldSignal = oldSignal;
        NewSignal = newSignal;
    }
}
