using System.Text.Json.Serialization;

namespace MT5Agent.WebSocket.Messages.ServerMessages;

/// <summary>
/// Command targeting a specific MT5 instance on a pool agent
/// </summary>
public class TargetedCommandMessage : BaseMessage
{
    [JsonPropertyName("type")]
    public override string Type => MessageTypes.Server.TargetedCommand;

    /// <summary>
    /// Unique command ID for tracking responses
    /// </summary>
    [JsonPropertyName("commandId")]
    public string CommandId { get; set; } = string.Empty;

    /// <summary>
    /// MT5 account number to execute command on
    /// </summary>
    [JsonPropertyName("targetAccount")]
    public string TargetAccount { get; set; } = string.Empty;

    /// <summary>
    /// Command to execute
    /// </summary>
    [JsonPropertyName("command")]
    public string Command { get; set; } = string.Empty;

    /// <summary>
    /// Command-specific payload
    /// </summary>
    [JsonPropertyName("payload")]
    public Dictionary<string, object>? Payload { get; set; }
}

/// <summary>
/// Supported targeted commands
/// </summary>
public static class TargetedCommands
{
    public const string StartEA = "start_ea";
    public const string StopEA = "stop_ea";
    public const string PauseEA = "pause_ea";
    public const string ResumeEA = "resume_ea";
    public const string LoadEA = "load_ea";
    public const string UpdateSettings = "update_settings";
    public const string SyncTrades = "sync_trades";
    public const string TakeScreenshot = "take_screenshot";
    public const string GetStatus = "get_status";
    public const string CloseAllTrades = "close_all_trades";
    public const string ProvisionAccount = "provision_account"; // New user provisioning
}
