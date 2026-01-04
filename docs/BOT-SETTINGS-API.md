# Bot Settings API - C# Agent Integration

## Overview
The Bot Settings feature allows **ADMIN USERS ONLY** to configure global trading parameters that are sent to the C# Agent via API. These settings control all trading bots system-wide.

## Access Control
⚠️ **ADMIN ONLY** - This feature is restricted to admin users. Regular users and IB Partners cannot access or modify bot settings.

## Critical Risk Management Features

### Automatic Close on Maximum Loss
- **Maximum Loss ($)**: When total open losses across all trades reach this threshold, the **BOT automatically closes ALL trades**
- **Max Loss Per Trade ($)**: Individual trade loss limit per single trade
- Default: $5 for both settings (adjustable from $1 to $10,000)

### How Automatic Close Works
1. C# Agent/Bot continuously monitors total floating loss across all open positions
2. When `SUM(all open trade losses) >= maxTotalLoss`:
   - Bot automatically triggers close procedure
   - Closes ALL open trades immediately (market orders)
   - Logs auto-close event with reason and timestamp
   - Sends notification to admin
3. Trading can resume based on bot settings after auto-close

### Manual Close Functionality
- **Stop Button**: When user clicks "Stop" in the web app, it sends command to C# agent
- C# agent receives stop command and **manually closes all open trades**
- Different from automatic close - this is user-initiated
- Use cases:
  - User wants to stop trading immediately
  - Market conditions require manual intervention
  - Testing or maintenance mode

## API Endpoints

### Web App → C# Agent Communication

#### 1. Get Current Settings
```
GET /api/ea/settings
Headers:
  X-API-Key: your-csharp-agent-api-key

Response:
{
  "enabled": true,
  "lotSize": 0.01,
  "maxLotSize": 1.0,
  "stopLoss": 50,
  "takeProfit": 100,
  "maxTotalLoss": 5,           // NEW: Emergency close threshold in $
  "maxLossPerTrade": 5,        // NEW: Per-trade loss limit in $
  "maxDailyProfit": 1000,
  "tradingHours": {
    "start": "00:00",
    "end": "23:59"
  },
  "allowedSymbols": ["XAUUSD", "EURUSD"],
  "riskLevel": "MEDIUM",
  "maxOpenTrades": 5,
  "trailingStop": false,
  "trailingStopDistance": 30,
  "breakEven": true,
  "breakEvenPips": 20
}
```

#### 2. Apply New Settings
```
POST /api/ea/configure
Headers:
  Content-Type: application/json
  X-API-Key: your-csharp-agent-api-key

Body:
{
  "enabled": true,
  "lotSize": 0.02,
  "maxLotSize": 2.0,
  "stopLoss": 75,
  "takeProfit": 150,
  "maxTotalLoss": 10,          // Emergency close at $10 total loss
  "maxLossPerTrade": 5,        // Max $5 loss per individual trade
  "maxDailyProfit": 2000,
  "tradingHours": {
    "start": "08:00",
    "end": "16:00"
  },
  "allowedSymbols": ["XAUUSD"],
  "riskLevel": "LOW",
  "maxOpenTrades": 3,
  "trailingStop": true,
  "trailingStopDistance": 40,
  "breakEven": true,
  "breakEvenPips": 25,
  "timestamp": "2025-12-16T10:00:00Z",
  "updatedBy": "admin@scalperium.com"
}

Response:
{
  "success": true,
  "message": "Settings applied successfully",
  "appliedAt": "2025-12-16T10:00:00Z"
}
```

## C# Agent Implementation

### Controller Example
```csharp
// File: MT5AgentAPI/Controllers/EAController.cs

[ApiController]
[Route("api/ea")]
public class EAController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly EAControlService _eaService;

    [HttpGet("settings")]
    [ServiceFilter(typeof(ApiKeyAuthAttribute))]
    public IActionResult GetSettings()
    {
        var settings = _eaService.GetCurrentSettings();
        return Ok(settings);
    }

    [HttpPost("configure")]
    [ServiceFilter(typeof(ApiKeyAuthAttribute))]
    public IActionResult ConfigureEA([FromBody] EASettings settings)
    {
        try
        {
            // Validate settings
            if (settings.LotSize < 0.01 || settings.LotSize > 100)
            {
                return BadRequest("Invalid lot size");
            }

            // Apply settings to all running EAs
            _eaService.ApplyGlobalSettings(settings);

            return Ok(new
            {
                success = true,
                message = "Settings applied successfully",
                appliedAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
```

### Settings Model
```csharp
// File: MT5AgentAPI/Models/EASettings.cs

public class EASettings
{
    public bool Enabled { get; set; }
    public double LotSize { get; set; }
    public double MaxLotSize { get; set; }
    public int StopLoss { get; set; }
    public int TakeProfit { get; set; }
    public double MaxDailyLoss { get; set; }
    public double MaxDailyProfit { get; set; }
    public TradingHours TradingHours { get; set; }
    public List<string> AllowedSymbols { get; set; }
    public string RiskLevel { get; set; }
    public int MaxOpenTrades { get; set; }
    public bool TrailingStop { get; set; }
    public int TrailingStopDistance { get; set; }
    public bool BreakEven { get; set; }
    public int BreakEvenPips { get; set; }
    public DateTime? Timestamp { get; set; }
    public string UpdatedBy { get; set; }
}

public class TradingHours
{
    public string Start { get; set; }
    public string End { get; set; }
}
```

### Service Implementation
```csharp
// File: MT5AgentAPI/Services/EAControlService.cs

public class EAControlService
{
    private EASettings _globalSettings;

    public EASettings GetCurrentSettings()
    {
        return _globalSettings ?? new EASettings
        {
            Enabled = true,
            LotSize = 0.01,
            MaxLotSize = 1.0,
            StopLoss = 50,
            TakeProfit = 100,
            MaxDailyLoss = 500,
            MaxDailyProfit = 1000,
            TradingHours = new TradingHours { Start = "00:00", End = "23:59" },
            AllowedSymbols = new List<string> { "XAUUSD" },
            RiskLevel = "MEDIUM",
            MaxOpenTrades = 5,
            TrailingStop = false,
            TrailingStopDistance = 30,
            BreakEven = true,
            BreakEvenPips = 20
        };
    }

    public void ApplyGlobalSettings(EASettings settings)
    {
        _globalSettings = settings;

        // Apply to all running MT5 automation instances
        foreach (var automation in _activeAutomations)
        {
            automation.UpdateSettings(settings);
        }

        // Log the update
        Console.WriteLine($"[{DateTime.UtcNow}] Settings updated by {settings.UpdatedBy}");
        Console.WriteLine($"  - Lot Size: {settings.LotSize}");
        Console.WriteLine($"  - Stop Loss: {settings.StopLoss} pips");
        Console.WriteLine($"  - Take Profit: {settings.TakeProfit} pips");
        Console.WriteLine($"  - Risk Level: {settings.RiskLevel}");
    }
}
```

## Admin Dashboard Integration

### UI Location
- **Path**: `/admin` → Bot Settings Tab
- **Access**: Admin users only
- **Features**:
  - Real-time settings editor
  - Save & apply to C# agent
  - Visual feedback on save success/failure
  - Connection status indicator

### Settings Categories

1. **General Settings**
   - Trading Enabled (On/Off)
   - Risk Level (Low/Medium/High)
   - Max Open Trades

2. **Lot Size & Volume**
   - Default Lot Size
   - Maximum Lot Size

3. **Risk Management**
   - Stop Loss (pips)
   - Take Profit (pips)
   - Max Daily Loss ($)
   - Max Daily Profit ($)

4. **Advanced Features**
   - Trailing Stop (enabled/distance)
   - Break Even (enabled/trigger pips)

5. **Trading Hours & Symbols**
   - Start/End time
   - Allowed trading symbols

## Security

- ✅ Admin-only access enforced via session check
- ✅ API key authentication to C# agent
- ✅ Input validation on both client and server
- ✅ Audit trail (updatedBy, timestamp)
- ❌ Users and IB Partners **cannot** access this feature

## Environment Variables

```env
# .env file
CSHARP_AGENT_URL=http://localhost:5000
CSHARP_AGENT_API_KEY=your-secure-api-key-here
```

## Testing

### Manual Test
1. Login as admin (`admin@scalperium.com` / `Admin123!`)
2. Navigate to Admin → Bot Settings
3. Modify any setting
4. Click "Save & Apply to Agent"
5. Verify C# agent receives the settings

### API Test
```bash
# Get current settings
curl http://localhost:5173/api/admin/bot-settings \
  -H "Cookie: user_session=<admin_session>"

# Update settings
curl -X POST http://localhost:5173/api/admin/bot-settings \
  -H "Content-Type: application/json" \
  -H "Cookie: user_session=<admin_session>" \
  -d '{
    "enabled": true,
    "lotSize": 0.05,
    "stopLoss": 100,
    "takeProfit": 200
  }'
```

## Error Handling

- **C# Agent Offline**: Settings saved locally but warning shown
- **Invalid Settings**: Validation errors displayed
- **Unauthorized Access**: 403 Forbidden
- **Network Error**: User-friendly error message

## Future Enhancements

1. Settings version history
2. Rollback to previous settings
3. Per-user bot configuration override
4. Real-time settings sync via WebSocket
5. A/B testing different configurations
