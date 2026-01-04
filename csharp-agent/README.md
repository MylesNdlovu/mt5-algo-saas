# SCALPERIUM MT5 Automation Agent

C# desktop agent that automates MetaTrader 5 using FlaUI for UI automation.

## Features

- ✅ Real-time WebSocket connection to SCALPERIUM server
- ✅ Automated chart management (open/close)
- ✅ EA loading and configuration
- ✅ AutoTrading enable/disable
- ✅ Live status monitoring and heartbeat
- ✅ Screenshot capture
- ✅ Comprehensive error handling and logging

## Prerequisites

- .NET 6.0 SDK or later
- Windows OS (FlaUI requires Windows)
- MetaTrader 5 installed
- Active SCALPERIUM account

## Installation

### 1. Install .NET Runtime

Download from: https://dotnet.microsoft.com/download/dotnet/6.0

```powershell
winget install Microsoft.DotNet.Runtime.6
```

### 2. Clone Repository

```bash
git clone https://github.com/your-org/scalperium-agent.git
cd scalperium-agent/csharp-agent
```

### 3. Build Project

```bash
cd MT5AgentAPI
dotnet restore
dotnet build -c Release
```

## Configuration

### Environment Variables

Set these before running:

```powershell
# Required
$env:SCALPERIUM_API_KEY = "your-api-key-here"

# Optional (defaults shown)
$env:SCALPERIUM_WS_URL = "wss://scalperium.com/ws/agent"  # Production
# OR
$env:SCALPERIUM_WS_URL = "ws://localhost:5173/ws/agent"   # Development
```

### Get Your API Key

1. Login to SCALPERIUM dashboard
2. Navigate to Settings → API Keys
3. Generate new agent key
4. Copy and save securely

## Building the Agent

### Quick Build on Windows

```bash
cd MT5AgentAPI
dotnet build -c Release
```

The executable will be created at: `MT5AgentAPI/bin/Release/net6.0/MT5Agent.exe`

### Self-Contained Build (No .NET Runtime Required)

For distribution to traders who don't have .NET installed:

```bash
cd MT5AgentAPI
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true
```

The standalone executable will be at: `MT5AgentAPI/bin/Release/net6.0/win-x64/publish/MT5Agent.exe`

### Development Mode (Without Building)

```bash
cd MT5AgentAPI
dotnet run
```

## Install as Windows Service

For 24/7 operation on VPS:

### 1. Install NSSM (Non-Sucking Service Manager)

```powershell
winget install nssm
```

### 2. Create Service

```powershell
nssm install SCALPERIUM-MT5-Agent "C:\path\to\MT5Agent.exe"
nssm set SCALPERIUM-MT5-Agent AppDirectory "C:\path\to\MT5Agent"
nssm set SCALPERIUM-MT5-Agent AppEnvironmentExtra "SCALPERIUM_API_KEY=your-key"
nssm set SCALPERIUM-MT5-Agent DisplayName "SCALPERIUM MT5 Automation Agent"
nssm set SCALPERIUM-MT5-Agent Description "Automated MT5 trading agent for SCALPERIUM"
nssm set SCALPERIUM-MT5-Agent Start SERVICE_AUTO_START
```

### 3. Start Service

```powershell
nssm start SCALPERIUM-MT5-Agent
```

### 4. Check Status

```powershell
nssm status SCALPERIUM-MT5-Agent
```

## Supported Commands

The agent responds to these commands from the SCALPERIUM server:

### OPEN_CHART
```json
{
  "type": "OPEN_CHART",
  "params": {
    "symbol": "EURUSD",
    "timeframe": "H1"
  }
}
```

### LOAD_EA
```json
{
  "type": "LOAD_EA",
  "params": {
    "chartId": "chart-id-here",
    "eaName": "MyExpertAdvisor",
    "inputs": {
      "Lots": 0.01,
      "StopLoss": 50,
      "TakeProfit": 100
    }
  }
}
```

### START_EA
```json
{
  "type": "START_EA",
  "params": {
    "chartId": "chart-id-here",
    "eaName": "MyExpertAdvisor"
  }
}
```

### STOP_EA
```json
{
  "type": "STOP_EA",
  "params": {
    "chartId": "chart-id-here"
  }
}
```

### GET_STATUS
```json
{
  "type": "GET_STATUS",
  "params": {}
}
```

### TAKE_SCREENSHOT
```json
{
  "type": "TAKE_SCREENSHOT",
  "params": {}
}
```

## Troubleshooting

### Agent Won't Connect

1. Check MT5 is running
2. Verify API key is correct
3. Check firewall isn't blocking WebSocket connection
4. Ensure WebSocket URL is correct

### MT5 Automation Fails

1. Ensure MT5 is not minimized
2. Check FlaUI can access MT5 UI elements
3. Run as Administrator if needed
4. Verify MT5 version compatibility

### EA Won't Load

1. Ensure EA is compiled (.ex5 file exists)
2. Check EA name matches exactly
3. Verify EA is in correct Experts folder
4. Check EA doesn't have compilation errors

## Logs

Agent logs are sent to SCALPERIUM server in real-time and displayed in console:

- `DEBUG`: Detailed diagnostic information
- `INFO`: General operational messages
- `WARNING`: Warning conditions
- `ERROR`: Error conditions
- `CRITICAL`: Critical failures

## Development

### Project Structure

```
MT5AgentAPI/
├── Agent/
│   ├── Program.cs           # Main entry point
│   └── MT5Automation.cs     # FlaUI automation logic
├── MT5Agent.csproj          # Project configuration
└── README.md               # This file
```

### Adding New Commands

1. Add case to `ExecuteCommand` switch in `Program.cs`
2. Implement automation logic in `MT5Automation.cs`
3. Update command documentation above
4. Test thoroughly before deploying

## Security Notes

- Never commit API keys to version control
- Use environment variables for sensitive config
- Run with least privileges necessary
- Keep agent updated with latest security patches

## Support

- Documentation: https://docs.scalperium.com/agent
- Email: support@scalperium.com
- Discord: https://discord.gg/scalperium

## License

Proprietary - SCALPERIUM © 2025
