using System.Text.Json.Serialization;

namespace MT5Agent.WebSocket.Messages;

/// <summary>
/// Base class for all WebSocket messages
/// </summary>
public abstract class BaseMessage
{
    /// <summary>
    /// Message type identifier
    /// </summary>
    [JsonPropertyName("type")]
    public abstract string Type { get; }

    /// <summary>
    /// Unix timestamp in milliseconds for latency tracking
    /// </summary>
    [JsonPropertyName("timestamp")]
    public long Timestamp { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

    /// <summary>
    /// Optional message ID for request-response correlation
    /// </summary>
    [JsonPropertyName("id")]
    public string? Id { get; set; }
}

/// <summary>
/// Message type constants matching TypeScript enums
/// </summary>
public static class MessageTypes
{
    // Agent -> Server message types
    public static class Agent
    {
        public const string Heartbeat = "heartbeat";
        public const string StatusUpdate = "status_update";
        public const string TradeUpdate = "trade_update";
        public const string IndicatorUpdate = "indicator_update";
        public const string CommandResult = "command_result";
        public const string Error = "error";
        public const string Auth = "auth";
        public const string MultiAuth = "multi_auth";
        public const string MultiStatusUpdate = "multi_status_update";
        public const string MultiHeartbeat = "multi_heartbeat";
    }

    // Server -> Agent message types
    public static class Server
    {
        public const string AuthResponse = "auth_response";
        public const string StartEA = "start_ea";
        public const string StopEA = "stop_ea";
        public const string PauseEA = "pause_ea";
        public const string LoadEA = "load_ea";
        public const string UpdateSettings = "update_settings";
        public const string SyncTrades = "sync_trades";
        public const string Ping = "ping";
        public const string MultiAuthResponse = "multi_auth_response";
        public const string TargetedCommand = "targeted_command";
    }
}
