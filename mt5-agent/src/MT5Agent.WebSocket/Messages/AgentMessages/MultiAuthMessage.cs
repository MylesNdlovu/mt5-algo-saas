using System.Text.Json.Serialization;

namespace MT5Agent.WebSocket.Messages.AgentMessages;

/// <summary>
/// Authentication message for pool agents managing multiple MT5 instances
/// </summary>
public class MultiAuthMessage : BaseMessage
{
    [JsonPropertyName("type")]
    public override string Type => MessageTypes.Agent.MultiAuth;

    /// <summary>
    /// API key for authentication
    /// </summary>
    [JsonPropertyName("apiKey")]
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// Hardware-bound machine ID
    /// </summary>
    [JsonPropertyName("machineId")]
    public string MachineId { get; set; } = string.Empty;

    /// <summary>
    /// Agent software version
    /// </summary>
    [JsonPropertyName("agentVersion")]
    public string? AgentVersion { get; set; }

    /// <summary>
    /// Operating system version
    /// </summary>
    [JsonPropertyName("osVersion")]
    public string? OsVersion { get; set; }

    /// <summary>
    /// Always true for pool agents
    /// </summary>
    [JsonPropertyName("isPoolAgent")]
    public bool IsPoolAgent { get; set; } = true;

    /// <summary>
    /// VPS identifier name
    /// </summary>
    [JsonPropertyName("vpsName")]
    public string VpsName { get; set; } = string.Empty;

    /// <summary>
    /// VPS geographic region
    /// </summary>
    [JsonPropertyName("vpsRegion")]
    public string? VpsRegion { get; set; }

    /// <summary>
    /// Maximum MT5 instances this agent can manage
    /// </summary>
    [JsonPropertyName("maxCapacity")]
    public int MaxCapacity { get; set; }

    /// <summary>
    /// All MT5 account numbers currently managed by this agent
    /// </summary>
    [JsonPropertyName("accountNumbers")]
    public List<string> AccountNumbers { get; set; } = new();
}
