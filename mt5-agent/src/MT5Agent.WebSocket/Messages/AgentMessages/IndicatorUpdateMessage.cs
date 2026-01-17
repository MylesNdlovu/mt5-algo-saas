using System.Text.Json.Serialization;

namespace MT5Agent.WebSocket.Messages.AgentMessages;

/// <summary>
/// Sent when the traffic light indicator signal changes
/// </summary>
public class IndicatorUpdateMessage : BaseMessage
{
    [JsonPropertyName("type")]
    public override string Type => MessageTypes.Agent.IndicatorUpdate;

    /// <summary>
    /// Agent ID
    /// </summary>
    [JsonPropertyName("agentId")]
    public string AgentId { get; set; } = string.Empty;

    /// <summary>
    /// MT5 account number
    /// </summary>
    [JsonPropertyName("accountNumber")]
    public string AccountNumber { get; set; } = string.Empty;

    /// <summary>
    /// Previous signal (RED, ORANGE, GREEN)
    /// </summary>
    [JsonPropertyName("oldSignal")]
    public string OldSignal { get; set; } = "RED";

    /// <summary>
    /// New signal (RED, ORANGE, GREEN)
    /// </summary>
    [JsonPropertyName("newSignal")]
    public string NewSignal { get; set; } = "RED";

    /// <summary>
    /// Current indicator score (0-100)
    /// </summary>
    [JsonPropertyName("score")]
    public double Score { get; set; }
}
