using System.Text.Json.Serialization;

namespace MT5Agent.WebSocket.Messages.AgentMessages;

/// <summary>
/// Heartbeat from pool agent with summary info
/// </summary>
public class MultiHeartbeatMessage : BaseMessage
{
    [JsonPropertyName("type")]
    public override string Type => MessageTypes.Agent.MultiHeartbeat;

    /// <summary>
    /// Agent ID assigned by server
    /// </summary>
    [JsonPropertyName("agentId")]
    public string AgentId { get; set; } = string.Empty;

    /// <summary>
    /// VPS identifier name
    /// </summary>
    [JsonPropertyName("vpsName")]
    public string VpsName { get; set; } = string.Empty;

    /// <summary>
    /// Agent status
    /// </summary>
    [JsonPropertyName("status")]
    public string Status { get; set; } = "online";

    /// <summary>
    /// Total number of managed accounts
    /// </summary>
    [JsonPropertyName("totalAccounts")]
    public int TotalAccounts { get; set; }

    /// <summary>
    /// Number of accounts currently online
    /// </summary>
    [JsonPropertyName("onlineAccounts")]
    public int OnlineAccounts { get; set; }

    /// <summary>
    /// Number of accounts with errors
    /// </summary>
    [JsonPropertyName("errorAccounts")]
    public int ErrorAccounts { get; set; }

    /// <summary>
    /// CPU usage percentage
    /// </summary>
    [JsonPropertyName("cpuUsage")]
    public double CpuUsage { get; set; }

    /// <summary>
    /// Memory usage percentage
    /// </summary>
    [JsonPropertyName("memoryUsage")]
    public double MemoryUsage { get; set; }
}
