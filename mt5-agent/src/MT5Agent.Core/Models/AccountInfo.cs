namespace MT5Agent.Core.Models;

/// <summary>
/// MT5 account information
/// </summary>
public class AccountInfo
{
    /// <summary>
    /// Account balance
    /// </summary>
    public double Balance { get; set; }

    /// <summary>
    /// Current equity
    /// </summary>
    public double Equity { get; set; }

    /// <summary>
    /// Used margin
    /// </summary>
    public double Margin { get; set; }

    /// <summary>
    /// Available margin
    /// </summary>
    public double FreeMargin { get; set; }

    /// <summary>
    /// Current floating profit/loss
    /// </summary>
    public double Profit { get; set; }

    /// <summary>
    /// MT5 account number
    /// </summary>
    public string? AccountNumber { get; set; }

    /// <summary>
    /// Broker name
    /// </summary>
    public string? Broker { get; set; }

    /// <summary>
    /// Server name
    /// </summary>
    public string? ServerName { get; set; }

    /// <summary>
    /// Account leverage
    /// </summary>
    public int Leverage { get; set; }

    /// <summary>
    /// Account currency (e.g., USD, EUR)
    /// </summary>
    public string Currency { get; set; } = "USD";
}
