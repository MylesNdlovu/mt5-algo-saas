using System.Text.Json.Serialization;

namespace MT5Agent.WebSocket.Messages.ServerMessages;

/// <summary>
/// Command to start EA
/// </summary>
public class StartEAMessage : BaseMessage
{
    [JsonPropertyName("type")]
    public override string Type => MessageTypes.Server.StartEA;

    [JsonPropertyName("commandId")]
    public string CommandId { get; set; } = string.Empty;

    [JsonPropertyName("eaName")]
    public string? EaName { get; set; }

    [JsonPropertyName("symbol")]
    public string? Symbol { get; set; }

    [JsonPropertyName("timeframe")]
    public string? Timeframe { get; set; }
}

/// <summary>
/// Command to stop EA
/// </summary>
public class StopEAMessage : BaseMessage
{
    [JsonPropertyName("type")]
    public override string Type => MessageTypes.Server.StopEA;

    [JsonPropertyName("commandId")]
    public string CommandId { get; set; } = string.Empty;
}

/// <summary>
/// Command to pause EA
/// </summary>
public class PauseEAMessage : BaseMessage
{
    [JsonPropertyName("type")]
    public override string Type => MessageTypes.Server.PauseEA;

    [JsonPropertyName("commandId")]
    public string CommandId { get; set; } = string.Empty;
}

/// <summary>
/// Command to load EA on chart
/// </summary>
public class LoadEAMessage : BaseMessage
{
    [JsonPropertyName("type")]
    public override string Type => MessageTypes.Server.LoadEA;

    [JsonPropertyName("commandId")]
    public string CommandId { get; set; } = string.Empty;

    [JsonPropertyName("eaName")]
    public string EaName { get; set; } = string.Empty;

    [JsonPropertyName("symbol")]
    public string Symbol { get; set; } = string.Empty;

    [JsonPropertyName("timeframe")]
    public string Timeframe { get; set; } = string.Empty;

    [JsonPropertyName("settings")]
    public Dictionary<string, object>? Settings { get; set; }
}

/// <summary>
/// Command to update EA settings
/// </summary>
public class UpdateSettingsMessage : BaseMessage
{
    [JsonPropertyName("type")]
    public override string Type => MessageTypes.Server.UpdateSettings;

    [JsonPropertyName("commandId")]
    public string CommandId { get; set; } = string.Empty;

    [JsonPropertyName("settings")]
    public Dictionary<string, object> Settings { get; set; } = new();
}

/// <summary>
/// Command to sync trades
/// </summary>
public class SyncTradesMessage : BaseMessage
{
    [JsonPropertyName("type")]
    public override string Type => MessageTypes.Server.SyncTrades;

    [JsonPropertyName("commandId")]
    public string CommandId { get; set; } = string.Empty;
}

/// <summary>
/// Ping message from server
/// </summary>
public class PingMessage : BaseMessage
{
    [JsonPropertyName("type")]
    public override string Type => MessageTypes.Server.Ping;
}
