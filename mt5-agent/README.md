# MT5 Agent for Windows VPS

A C# Windows Service that manages multiple MT5 terminal instances and communicates with the Scalperium web app via WebSocket.

## Features

- **Pool Agent Architecture**: Single agent manages multiple MT5 instances
- **WebSocket Communication**: Real-time bidirectional communication with web app
- **Traffic Light Indicator**: RED/ORANGE/GREEN signal sync to dashboard
- **Auto-Provisioning**: Automatically sets up MT5 for new users
- **Trade Monitoring**: Real-time trade detection and reporting
- **Hardware-Bound Security**: Machine ID prevents unauthorized use

## Requirements

- Windows Server 2019 or later
- .NET 8.0 Runtime
- MetaTrader 5 Terminal
- 4GB+ RAM recommended for 50 MT5 instances

## Installation

### 1. Build the Solution

```bash
dotnet build MT5Agent.sln -c Release
```

### 2. Publish for Windows

```bash
dotnet publish src/MT5Agent.Service/MT5Agent.Service.csproj -c Release -r win-x64 --self-contained
```

### 3. Install as Windows Service

```powershell
# Run as Administrator
sc.exe create MT5AgentService binPath= "C:\MT5Agent\MT5Agent.Service.exe" start= auto
sc.exe description MT5AgentService "Scalperium MT5 Pool Agent Service"
```

### 4. Configure

Edit `appsettings.json`:

```json
{
  "Agent": {
    "ApiKey": "your-api-key-from-web-app",
    "WebSocketUrl": "wss://api.scalperium.com:3001/ws",
    "VpsName": "VPS-FOREX-01",
    "VpsRegion": "London",
    "MaxCapacity": 50
  }
}
```

### 5. Start the Service

```powershell
sc.exe start MT5AgentService
```

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `ApiKey` | API key for authentication | Required |
| `MachineId` | Hardware-bound ID (auto-generated) | Auto |
| `WebSocketUrl` | WebSocket server URL | wss://api.scalperium.com:3001/ws |
| `IsPoolAgent` | Enable multi-account management | true |
| `VpsName` | VPS identifier name | Required |
| `VpsRegion` | Geographic region | Optional |
| `MaxCapacity` | Max MT5 instances | 50 |
| `HeartbeatIntervalMs` | Heartbeat frequency | 5000 |
| `MT5TerminalPath` | Path to MT5 executable | C:\Program Files\MetaTrader 5\terminal64.exe |
| `MT5PortableBasePath` | Base folder for portable instances | C:\MT5Agent\Terminals |
| `EABridgePortBase` | Starting port for EA HTTP bridges | 8080 |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Windows VPS                               │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              MT5Agent.Service                        │    │
│  │                                                      │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │    │
│  │  │ WebSocket   │  │ Instance    │  │ Heartbeat   │  │    │
│  │  │ Client      │  │ Manager     │  │ Service     │  │    │
│  │  └──────┬──────┘  └──────┬──────┘  └─────────────┘  │    │
│  │         │                │                           │    │
│  └─────────┼────────────────┼───────────────────────────┘    │
│            │                │                                │
│            │                ▼                                │
│            │   ┌─────────────────────────────────────┐      │
│            │   │        MT5 Instances                 │      │
│            │   │                                      │      │
│            │   │  ┌────────┐ ┌────────┐ ┌────────┐   │      │
│            │   │  │ User 1 │ │ User 2 │ │ User N │   │      │
│            │   │  │ MT5    │ │ MT5    │ │ MT5    │   │      │
│            │   │  │:8080   │ │:8081   │ │:808N   │   │      │
│            │   │  └────────┘ └────────┘ └────────┘   │      │
│            │   └─────────────────────────────────────┘      │
│            │                                                │
└────────────┼────────────────────────────────────────────────┘
             │
             │ WebSocket (wss://)
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                  Scalperium Web App                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ WebSocket    │  │ Agent        │  │ Dashboard    │       │
│  │ Server:3001  │  │ Manager      │  │ API          │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## Message Types

### Agent to Server

- `multi_auth` - Pool agent authentication
- `multi_heartbeat` - Keep-alive with summary stats
- `multi_status_update` - Full status of all MT5 instances
- `trade_update` - Real-time trade notifications
- `command_result` - Response to server commands

### Server to Agent

- `multi_auth_response` - Authentication result
- `targeted_command` - Command for specific MT5 account
- `ping` - Keep-alive ping

## Logs

Logs are stored in `C:\MT5Agent\Logs\` with daily rotation.

## Troubleshooting

### Service won't start
1. Check `appsettings.json` for valid configuration
2. Verify API key is correct
3. Check Windows Event Viewer for errors

### Connection issues
1. Verify WebSocket URL is correct
2. Check firewall allows outbound on port 3001
3. Verify SSL certificate is valid

### MT5 instances not starting
1. Check MT5TerminalPath is correct
2. Verify MT5 is installed
3. Check available memory

## Development

### Building

```bash
dotnet build
```

### Running locally

```bash
dotnet run --project src/MT5Agent.Service
```

### Running tests

```bash
dotnet test
```

## License

Copyright 2026 Scalperium. All rights reserved.
