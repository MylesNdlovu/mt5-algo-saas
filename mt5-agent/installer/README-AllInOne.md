# Scalperium All-in-One Installer

## For Support Team / VPS Setup

### Quick Start

1. Download `ScalperiumSetup-1.0.0.exe` from the shared drive
2. Run as Administrator
3. Enter the configuration:
   - **VPS Name**: e.g., VPS-FOREX-01
   - **Database URL**: Get from Neon dashboard
   - **Mailgun API Key**: Get from Mailgun dashboard
   - **Agent API Key**: Generate in admin panel
4. Click Install
5. Done! Both services start automatically.

### What Gets Installed

```
C:\Scalperium\
├── Agent\                    # C# MT5 Agent Service
│   ├── MT5AgentService.exe   # Main agent
│   ├── appsettings.json      # Agent config (auto-generated)
│   ├── Logs\                 # Agent logs
│   └── Terminals\            # MT5 portable instances
│
├── NodeJS\                   # Node.js runtime (portable)
│   └── node.exe
│
├── WebApp\                   # Web server
│   ├── build\                # SvelteKit app
│   ├── .env                  # Environment config (auto-generated)
│   └── Logs\                 # Web server logs
│
└── MQL5\                     # Trading files
    ├── Indicators\           # Traffic light indicator
    ├── Experts\              # Trading EA, Copier EA
    ├── Include\              # Bridge files
    └── Libraries\            # Shared libraries
```

### Services Installed

| Service | Description | Port |
|---------|-------------|------|
| ScalperiumAgent | MT5 terminal manager | - |
| ScalperiumWebServer | Web API + WebSocket | 3000, 3001 |

### Verifying Installation

```cmd
# Check services are running
sc query ScalperiumAgent
sc query ScalperiumWebServer

# View logs
type C:\Scalperium\Agent\Logs\agent-*.log
type C:\Scalperium\WebApp\Logs\*.log

# Test WebSocket (should show connected)
curl http://localhost:3000/health
```

### Troubleshooting

**Service won't start:**
```cmd
# Check Windows Event Viewer
eventvwr.msc
# Look under: Windows Logs > Application
```

**Database connection issues:**
- Verify DATABASE_URL in `C:\Scalperium\WebApp\.env`
- Ensure Neon database allows connections from VPS IP

**Agent not connecting:**
- Check `C:\Scalperium\Agent\appsettings.json`
- Verify WebSocket URL is `ws://127.0.0.1:3001/ws`

### Manual Service Management

```cmd
# Stop services
sc stop ScalperiumAgent
sc stop ScalperiumWebServer

# Start services
sc start ScalperiumAgent
sc start ScalperiumWebServer

# Restart services
sc stop ScalperiumAgent && sc start ScalperiumAgent
```

### Prerequisites

The installer includes everything needed. The VPS only needs:
- Windows Server 2019+ or Windows 10+
- MetaTrader 5 installed

### Building the Installer (Dev Only)

On the development machine:
```powershell
cd mt5-agent\installer
.\build-all-in-one.ps1
```

This creates `ScalperiumSetup-1.0.0.exe` in the `output` folder.
