using System.Text.Json.Serialization;

namespace MT5Agent.WebSocket.Messages.ServerMessages;

/// <summary>
/// Authentication response from server
/// </summary>
public class AuthResponseMessage : BaseMessage
{
    [JsonPropertyName("type")]
    public override string Type => MessageTypes.Server.AuthResponse;

    /// <summary>
    /// Whether authentication succeeded
    /// </summary>
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    /// <summary>
    /// Assigned agent ID (if successful)
    /// </summary>
    [JsonPropertyName("agentId")]
    public string? AgentId { get; set; }

    /// <summary>
    /// Error message (if failed)
    /// </summary>
    [JsonPropertyName("error")]
    public string? Error { get; set; }
}

/// <summary>
/// Authentication response for pool agents
/// </summary>
public class MultiAuthResponseMessage : BaseMessage
{
    [JsonPropertyName("type")]
    public override string Type => MessageTypes.Server.MultiAuthResponse;

    /// <summary>
    /// Whether authentication succeeded
    /// </summary>
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    /// <summary>
    /// Assigned agent ID (if successful)
    /// </summary>
    [JsonPropertyName("agentId")]
    public string? AgentId { get; set; }

    /// <summary>
    /// VPS name confirmed by server
    /// </summary>
    [JsonPropertyName("vpsName")]
    public string? VpsName { get; set; }

    /// <summary>
    /// Error message (if failed)
    /// </summary>
    [JsonPropertyName("error")]
    public string? Error { get; set; }

    /// <summary>
    /// List of accounts successfully registered
    /// </summary>
    [JsonPropertyName("registeredAccounts")]
    public List<string>? RegisteredAccounts { get; set; }

    /// <summary>
    /// List of accounts that failed registration
    /// </summary>
    [JsonPropertyName("failedAccounts")]
    public List<FailedAccountDto>? FailedAccounts { get; set; }
}

/// <summary>
/// Details about a failed account registration
/// </summary>
public class FailedAccountDto
{
    [JsonPropertyName("accountNumber")]
    public string AccountNumber { get; set; } = string.Empty;

    [JsonPropertyName("reason")]
    public string Reason { get; set; } = string.Empty;
}
