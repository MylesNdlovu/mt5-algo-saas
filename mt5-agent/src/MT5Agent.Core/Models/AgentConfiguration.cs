namespace MT5Agent.Core.Models;

/// <summary>
/// Configuration for the MT5 Pool Agent
/// </summary>
public class AgentConfiguration
{
    /// <summary>
    /// API key for authentication with the web app
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// Hardware-bound machine ID for security
    /// </summary>
    public string MachineId { get; set; } = string.Empty;

    /// <summary>
    /// WebSocket URL to connect to (e.g., wss://api.scalperium.com:3001/ws)
    /// </summary>
    public string WebSocketUrl { get; set; } = "wss://localhost:3001/ws";

    /// <summary>
    /// Whether this agent manages multiple MT5 instances (pool/mother agent)
    /// </summary>
    public bool IsPoolAgent { get; set; } = true;

    /// <summary>
    /// VPS identifier name (e.g., VPS-FOREX-PROD-01)
    /// </summary>
    public string VpsName { get; set; } = string.Empty;

    /// <summary>
    /// VPS geographic region (e.g., London, New York, Tokyo)
    /// </summary>
    public string? VpsRegion { get; set; }

    /// <summary>
    /// Maximum number of MT5 instances this agent can manage
    /// </summary>
    public int MaxCapacity { get; set; } = 50;

    /// <summary>
    /// Heartbeat interval in milliseconds
    /// </summary>
    public int HeartbeatIntervalMs { get; set; } = 5000;

    /// <summary>
    /// Reconnection delay in milliseconds when connection is lost
    /// </summary>
    public int ReconnectDelayMs { get; set; } = 5000;

    /// <summary>
    /// Path to MT5 terminal executable
    /// </summary>
    public string MT5TerminalPath { get; set; } = @"C:\Program Files\MetaTrader 5\terminal64.exe";

    /// <summary>
    /// Base folder for MT5 portable instances
    /// </summary>
    public string MT5PortableBasePath { get; set; } = @"C:\MT5Agent\Terminals";

    /// <summary>
    /// Base port for EA HTTP bridge (increments per instance)
    /// </summary>
    public int EABridgePortBase { get; set; } = 8080;

    /// <summary>
    /// Path to indicator and EA files to install
    /// </summary>
    public string MQL5FilesPath { get; set; } = @"C:\MT5Agent\MQL5";

    /// <summary>
    /// Automatically stop/start EA based on traffic light indicator.
    /// When RED (choppy market), EA is stopped to prevent losses.
    /// When conditions improve to ORANGE/GREEN, EA is resumed.
    /// </summary>
    public bool AutoControlEA { get; set; } = true;

    /// <summary>
    /// Close all open trades when indicator goes RED.
    /// Protects users from losses in choppy/unpredictable markets.
    /// EA typically has 2-3 trades open, max $5 loss per trade.
    /// </summary>
    public bool CloseTradesOnRedSignal { get; set; } = true;

    /// <summary>
    /// Display name shown to users instead of actual EA name.
    /// Users should never see internal EA names like "Galaxy_Gold_Scalper".
    /// </summary>
    public string EADisplayName { get; set; } = "Scalperium Trading Bot";

    // ========== MASTER/SLAVE TRADE COPIER SETTINGS ==========

    /// <summary>
    /// Whether this agent uses Master/Slave architecture with Local Trade Copier.
    /// If true, only one terminal runs the trading EA (MASTER),
    /// and trades are copied to user terminals (SLAVES) via Local Trade Copier EA.
    /// </summary>
    public bool UseTradeCopier { get; set; } = true;

    /// <summary>
    /// Account number for the MASTER terminal that runs the trading EA.
    /// This can be a demo account for perfect market conditions.
    /// Trades from this account are copied to all slave (user) accounts.
    /// </summary>
    public string? MasterAccountNumber { get; set; }

    /// <summary>
    /// Whether the MASTER terminal uses a demo account.
    /// Demo accounts have perfect execution and no slippage,
    /// making indicator signals more accurate.
    /// </summary>
    public bool MasterIsDemoAccount { get; set; } = true;

    /// <summary>
    /// Path to Local Trade Copier EA file (.ex5)
    /// </summary>
    public string TradeCopierEAPath { get; set; } = @"C:\MT5Agent\MQL5\Experts\Local Trade Copier EA MT5.ex5";
}
