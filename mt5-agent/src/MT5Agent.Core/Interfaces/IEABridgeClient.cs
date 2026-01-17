using MT5Agent.Core.Models;

namespace MT5Agent.Core.Interfaces;

/// <summary>
/// Interface for communicating with MQL5 EAs via the file-based bridge
/// </summary>
public interface IEABridgeClient
{
    /// <summary>
    /// Check if the EA bridge is healthy (status file updated recently)
    /// </summary>
    Task<bool> IsHealthyAsync(string dataPath, int magicNumber);

    /// <summary>
    /// Get EA status (loaded, running, paused)
    /// </summary>
    Task<EAStatus?> GetEAStatusAsync(string dataPath, int magicNumber);

    /// <summary>
    /// Get account information
    /// </summary>
    Task<AccountInfo?> GetAccountInfoAsync(string dataPath, int magicNumber);

    /// <summary>
    /// Get current indicator signal (RED/ORANGE/GREEN)
    /// </summary>
    Task<SafetyIndicator> GetIndicatorSignalAsync(string dataPath, int magicNumber);

    /// <summary>
    /// Get current indicator score (0-100)
    /// </summary>
    Task<double> GetIndicatorScoreAsync(string dataPath, int magicNumber);

    /// <summary>
    /// Get open positions
    /// </summary>
    Task<IEnumerable<Trade>> GetOpenPositionsAsync(string dataPath, int magicNumber);

    /// <summary>
    /// Get and consume trade events (opens, closes)
    /// </summary>
    Task<IEnumerable<TradeEvent>> GetTradeEventsAsync(string dataPath, int magicNumber);

    /// <summary>
    /// Send a command to the EA
    /// </summary>
    Task<bool> SendCommandAsync(string dataPath, int magicNumber, string command, object? parameters = null);

    /// <summary>
    /// Start EA trading
    /// </summary>
    Task<bool> StartTradingAsync(string dataPath, int magicNumber);

    /// <summary>
    /// Stop EA trading
    /// </summary>
    Task<bool> StopTradingAsync(string dataPath, int magicNumber);

    /// <summary>
    /// Pause EA trading
    /// </summary>
    Task<bool> PauseTradingAsync(string dataPath, int magicNumber);

    /// <summary>
    /// Resume EA trading
    /// </summary>
    Task<bool> ResumeTradingAsync(string dataPath, int magicNumber);

    /// <summary>
    /// Close all open positions
    /// </summary>
    Task<bool> CloseAllPositionsAsync(string dataPath, int magicNumber);

    /// <summary>
    /// Update EA settings
    /// </summary>
    Task<bool> UpdateSettingsAsync(string dataPath, int magicNumber, Dictionary<string, object> settings);
}
