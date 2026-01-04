namespace MT5AgentAPI.Models;

public enum EAStatus
{
    STOPPED,
    RUNNING,
    PAUSED,
    ERROR
}

public enum SafetyIndicator
{
    RED,
    ORANGE,
    GREEN
}

public class EAControlRequest
{
    public string AccountId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty; // start, stop, pause
}

public class EAStatusResponse
{
    public string AccountId { get; set; } = string.Empty;
    public EAStatus Status { get; set; }
    public SafetyIndicator SafetyIndicator { get; set; }
    public string? Message { get; set; }
}

public class AccountSetupRequest
{
    public string UserId { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string Broker { get; set; } = string.Empty;
    public string ServerName { get; set; } = string.Empty;
    public string Login { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class MT5Account
{
    public string Id { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string Login { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string ServerName { get; set; } = string.Empty;
    public string? VpsIp { get; set; }
    public int? VpsPort { get; set; }
    public EAStatus EaStatus { get; set; }
    public SafetyIndicator SafetyIndicator { get; set; }
}

public class TradeInfo
{
    public string Ticket { get; set; } = string.Empty;
    public string Symbol { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public double Volume { get; set; }
    public double OpenPrice { get; set; }
    public DateTime OpenTime { get; set; }
    public double? ClosePrice { get; set; }
    public DateTime? CloseTime { get; set; }
    public double Profit { get; set; }
    public double Commission { get; set; }
    public double Swap { get; set; }
    public int? MagicNumber { get; set; }
    public string? Comment { get; set; }
    public bool IsClosed { get; set; }
}

public class MarketCondition
{
    public double Volatility { get; set; }
    public double Spread { get; set; }
    public string Trend { get; set; } = string.Empty;
    public bool NewsImpact { get; set; }
    public SafetyIndicator SafetyIndicator { get; set; }
    public string Reason { get; set; } = string.Empty;
}
