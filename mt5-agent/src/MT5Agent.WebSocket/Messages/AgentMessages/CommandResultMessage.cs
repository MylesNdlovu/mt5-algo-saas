using System.Text.Json.Serialization;

namespace MT5Agent.WebSocket.Messages.AgentMessages;

/// <summary>
/// Response to a command from the server
/// </summary>
public class CommandResultMessage : BaseMessage
{
    [JsonPropertyName("type")]
    public override string Type => MessageTypes.Agent.CommandResult;

    /// <summary>
    /// Agent ID
    /// </summary>
    [JsonPropertyName("agentId")]
    public string AgentId { get; set; } = string.Empty;

    /// <summary>
    /// ID of the command being responded to
    /// </summary>
    [JsonPropertyName("commandId")]
    public string CommandId { get; set; } = string.Empty;

    /// <summary>
    /// Whether the command succeeded
    /// </summary>
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    /// <summary>
    /// Result data (if any)
    /// </summary>
    [JsonPropertyName("result")]
    public object? Result { get; set; }

    /// <summary>
    /// Error message if failed
    /// </summary>
    [JsonPropertyName("error")]
    public string? Error { get; set; }

    /// <summary>
    /// Target account number (for pool agent commands)
    /// </summary>
    [JsonPropertyName("targetAccount")]
    public string? TargetAccount { get; set; }
}
