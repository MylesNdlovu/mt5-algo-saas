using System.Text.Json.Serialization;

namespace MT5Agent.WebSocket.Messages.AgentMessages;

/// <summary>
/// Trade update notification from agent to server
/// </summary>
public class TradeUpdateMessage : BaseMessage
{
    [JsonPropertyName("type")]
    public override string Type => MessageTypes.Agent.TradeUpdate;

    /// <summary>
    /// Agent ID
    /// </summary>
    [JsonPropertyName("agentId")]
    public string AgentId { get; set; } = string.Empty;

    /// <summary>
    /// MT5 account number (for pool agents)
    /// </summary>
    [JsonPropertyName("accountNumber")]
    public string? AccountNumber { get; set; }

    /// <summary>
    /// Trade information
    /// </summary>
    [JsonPropertyName("trade")]
    public TradeInfoDto Trade { get; set; } = new();

    /// <summary>
    /// What happened to the trade
    /// </summary>
    [JsonPropertyName("action")]
    public string Action { get; set; } = "opened"; // opened, closed, modified
}

/// <summary>
/// Trade information DTO (matches TypeScript TradeInfo)
/// </summary>
public class TradeInfoDto
{
    [JsonPropertyName("ticket")]
    public string Ticket { get; set; } = string.Empty;

    [JsonPropertyName("symbol")]
    public string Symbol { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = "BUY"; // BUY or SELL

    [JsonPropertyName("volume")]
    public double Volume { get; set; }

    [JsonPropertyName("openPrice")]
    public double OpenPrice { get; set; }

    [JsonPropertyName("openTime")]
    public long OpenTime { get; set; }

    [JsonPropertyName("closePrice")]
    public double? ClosePrice { get; set; }

    [JsonPropertyName("closeTime")]
    public long? CloseTime { get; set; }

    [JsonPropertyName("stopLoss")]
    public double? StopLoss { get; set; }

    [JsonPropertyName("takeProfit")]
    public double? TakeProfit { get; set; }

    [JsonPropertyName("profit")]
    public double Profit { get; set; }

    [JsonPropertyName("commission")]
    public double Commission { get; set; }

    [JsonPropertyName("swap")]
    public double Swap { get; set; }

    [JsonPropertyName("magicNumber")]
    public int? MagicNumber { get; set; }

    [JsonPropertyName("comment")]
    public string? Comment { get; set; }
}
