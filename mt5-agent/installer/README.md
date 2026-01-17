# Scalperium MT5 Agent Windows Installer

This folder contains everything needed to build the Windows installer for the Scalperium MT5 Agent.

## Prerequisites

On your Windows VPS or build machine, install:

1. **.NET 8.0 SDK**
   - Download from: https://dotnet.microsoft.com/download/dotnet/8.0
   - Choose "SDK" (not just Runtime)
   - Verify with: `dotnet --version`

2. **Inno Setup 6**
   - Download from: https://jrsoftware.org/isdl.php
   - Install to default location: `C:\Program Files (x86)\Inno Setup 6\`

3. **MetaTrader 5** (on target VPS)
   - Required for running the agent
   - Download from your broker or https://www.metatrader5.com/

## Building the Installer

### Option 1: Automated Build (Recommended)

1. Copy the entire `mt5-agent` folder to your Windows machine
2. Open Command Prompt as Administrator
3. Navigate to the installer folder:
   ```cmd
   cd C:\path\to\mt5-agent\installer
   ```
4. Run the build script:
   ```cmd
   build.bat
   ```
5. Installer will be created at: `output\MT5AgentSetup-1.0.0.exe`

### Option 2: Manual Build

1. Build the C# project:
   ```cmd
   cd mt5-agent\src\MT5Agent.Service
   dotnet publish -c Release -r win-x64 --self-contained true -o ..\..\installer\bin\Release\net8.0-windows\publish
   ```

2. Compile the installer:
   ```cmd
   cd mt5-agent\installer
   "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" MT5AgentSetup.iss
   ```

## Folder Structure

```
installer/
├── MT5AgentSetup.iss    # Inno Setup script
├── build.bat            # Automated build script
├── README.md            # This file
├── assets/
│   ├── scalperium.ico   # App icon (you need to add this)
│   └── README.txt       # Icon instructions
├── bin/                 # Created during build
│   └── Release/
│       └── net8.0-windows/
│           └── publish/  # Compiled C# files
└── output/              # Created during build
    └── MT5AgentSetup-1.0.0.exe  # Final installer
```

## Installation Types

The installer offers three installation types:

| Type | Description | Components |
|------|-------------|------------|
| **Full** | Master + Slave support | Service + Indicator + Trading EA + Trade Copier |
| **Master** | Master terminal only | Service + Indicator + Trading EA (runs on demo) |
| **Slave** | Slave terminals only | Service + Indicator + Trade Copier |

## What the Installer Does

1. **Collects Configuration**
   - API Key (from Scalperium admin panel)
   - WebSocket URL (default: wss://api.scalperium.com:3001/ws)
   - VPS Name and Region
   - Master Account Number

2. **Installs Files**
   - C# Windows Service to `C:\MT5Agent\`
   - MQL5 files (Indicators, Experts, Libraries, Presets)
   - Creates Terminals and Logs folders

3. **Registers Windows Service**
   - Service Name: `MT5AgentService`
   - Start Type: Automatic
   - Recovery: Auto-restart on failure

4. **Creates Configuration**
   - Generates `appsettings.json` with user-provided settings

## Post-Installation

After installation:

1. **Start the Service**
   ```cmd
   sc start MT5AgentService
   ```

2. **Check Logs**
   - Location: `C:\MT5Agent\Logs\`
   - Current log: `agent-YYYYMMDD.log`

3. **Verify Connection**
   - Check Scalperium admin panel
   - Agent should appear as "Online"

## Uninstallation

Run the uninstaller from:
- Start Menu: `Scalperium MT5 Agent > Uninstall`
- Or: `C:\MT5Agent\unins000.exe`

The uninstaller will:
1. Stop the Windows Service
2. Remove the service registration
3. Delete all installed files

## Troubleshooting

### Service won't start
```cmd
# Check service status
sc query MT5AgentService

# View Windows Event Log
eventvwr.msc
```

### Connection issues
- Verify API Key in `C:\MT5Agent\appsettings.json`
- Check firewall allows outbound WebSocket (port 3001)
- Check logs at `C:\MT5Agent\Logs\`

### MT5 not found
- Ensure MetaTrader 5 is installed
- Update `MT5TerminalPath` in `appsettings.json`

## Configuration File

Location: `C:\MT5Agent\appsettings.json`

```json
{
  "Agent": {
    "ApiKey": "your-api-key",
    "WebSocketUrl": "wss://api.scalperium.com:3001/ws",
    "IsPoolAgent": true,
    "VpsName": "VPS-FOREX-01",
    "VpsRegion": "London",
    "MaxCapacity": 20,
    "MT5TerminalPath": "C:\\Program Files\\MetaTrader 5\\terminal64.exe",
    "AutoControlEA": true,
    "CloseTradesOnRedSignal": true,
    "UseTradeCopier": true,
    "MasterAccountNumber": "12345678",
    "MasterIsDemoAccount": true
  }
}
```

## Version History

- **1.0.0** - Initial release
  - Windows Service installation
  - MT5 portable mode support
  - Master/Slave Trade Copier architecture
  - Traffic Light indicator integration
