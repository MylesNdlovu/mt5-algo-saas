using System.Text.Json.Serialization;

namespace MT5Agent.WebSocket.Messages.AgentMessages;

/// <summary>
/// Batched status update from pool agent for all managed MT5 instances
/// </summary>
public class MultiStatusUpdateMessage : BaseMessage
{
    [JsonPropertyName("type")]
    public override string Type => MessageTypes.Agent.MultiStatusUpdate;

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
    /// VPS system resource information
    /// </summary>
    [JsonPropertyName("systemInfo")]
    public SystemInfoDto SystemInfo { get; set; } = new();

    /// <summary>
    /// Status for each managed MT5 instance
    /// </summary>
    [JsonPropertyName("accounts")]
    public List<MT5InstanceStatusDto> Accounts { get; set; } = new();
}

/// <summary>
/// VPS system resource information
/// </summary>
public class SystemInfoDto
{
    [JsonPropertyName("cpuUsage")]
    public double CpuUsage { get; set; }

    [JsonPropertyName("memoryUsage")]
    public double MemoryUsage { get; set; }

    [JsonPropertyName("diskUsage")]
    public double DiskUsage { get; set; }

    [JsonPropertyName("mt5InstanceCount")]
    public int Mt5InstanceCount { get; set; }
}

/// <summary>
/// Status info for a single MT5 instance (matches TypeScript MT5InstanceStatus)
/// </summary>
public class MT5InstanceStatusDto
{
    [JsonPropertyName("accountNumber")]
    public string AccountNumber { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "offline"; // online, offline, error, starting

    [JsonPropertyName("eaStatus")]
    public string EaStatus { get; set; } = "stopped"; // running, stopped, paused, error

    [JsonPropertyName("windowTitle")]
    public string? WindowTitle { get; set; }

    [JsonPropertyName("processId")]
    public int? ProcessId { get; set; }

    // Account info
    [JsonPropertyName("balance")]
    public double Balance { get; set; }

    [JsonPropertyName("equity")]
    public double Equity { get; set; }

    [JsonPropertyName("margin")]
    public double Margin { get; set; }

    [JsonPropertyName("freeMargin")]
    public double FreeMargin { get; set; }

    [JsonPropertyName("profit")]
    public double Profit { get; set; }

    [JsonPropertyName("broker")]
    public string? Broker { get; set; }

    [JsonPropertyName("serverName")]
    public string? ServerName { get; set; }

    // EA info
    [JsonPropertyName("eaLoaded")]
    public bool EaLoaded { get; set; }

    [JsonPropertyName("eaRunning")]
    public bool EaRunning { get; set; }

    [JsonPropertyName("eaName")]
    public string? EaName { get; set; }

    [JsonPropertyName("chartSymbol")]
    public string? ChartSymbol { get; set; }

    [JsonPropertyName("chartTimeframe")]
    public string? ChartTimeframe { get; set; }

    // Traffic light indicator
    [JsonPropertyName("safetyIndicator")]
    public string SafetyIndicator { get; set; } = "RED";

    /// <summary>
    /// Indicator score (0-100)
    /// </summary>
    [JsonPropertyName("indicatorScore")]
    public double IndicatorScore { get; set; }

    [JsonPropertyName("lastActivity")]
    public long LastActivity { get; set; }
}
