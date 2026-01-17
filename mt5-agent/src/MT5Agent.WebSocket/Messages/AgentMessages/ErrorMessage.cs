using System.Text.Json.Serialization;

namespace MT5Agent.WebSocket.Messages.AgentMessages;

/// <summary>
/// Error notification from agent to server
/// </summary>
public class ErrorMessage : BaseMessage
{
    [JsonPropertyName("type")]
    public override string Type => MessageTypes.Agent.Error;

    /// <summary>
    /// Agent ID (may be null if error during auth)
    /// </summary>
    [JsonPropertyName("agentId")]
    public string? AgentId { get; set; }

    /// <summary>
    /// Error code
    /// </summary>
    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable error message
    /// </summary>
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Additional error details
    /// </summary>
    [JsonPropertyName("details")]
    public object? Details { get; set; }

    /// <summary>
    /// Target account number (for pool agent errors)
    /// </summary>
    [JsonPropertyName("targetAccount")]
    public string? TargetAccount { get; set; }
}

/// <summary>
/// Common error codes
/// </summary>
public static class ErrorCodes
{
    public const string AuthFailed = "AUTH_FAILED";
    public const string InvalidApiKey = "INVALID_API_KEY";
    public const string MachineIdMismatch = "MACHINE_ID_MISMATCH";
    public const string MT5ConnectionFailed = "MT5_CONNECTION_FAILED";
    public const string MT5LoginFailed = "MT5_LOGIN_FAILED";
    public const string EALoadFailed = "EA_LOAD_FAILED";
    public const string EAStartFailed = "EA_START_FAILED";
    public const string CommandFailed = "COMMAND_FAILED";
    public const string AccountNotFound = "ACCOUNT_NOT_FOUND";
    public const string CapacityExceeded = "CAPACITY_EXCEEDED";
    public const string InternalError = "INTERNAL_ERROR";
}
