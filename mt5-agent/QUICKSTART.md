# Quick Start: Deploy Scalperium MT5 Agent to Windows VPS

## Step 1: Prepare on Your Mac

Copy the entire `mt5-agent` folder to your Windows VPS via:
- Remote Desktop + drag/drop
- SFTP/SCP
- Cloud storage (OneDrive, Google Drive)

## Step 2: On Windows VPS

### Install Prerequisites

1. **Install .NET 8.0 SDK**
   ```
   Download: https://dotnet.microsoft.com/download/dotnet/8.0
   ```

2. **Install Inno Setup 6**
   ```
   Download: https://jrsoftware.org/isdl.php
   ```

3. **Install MetaTrader 5** (if not already installed)
   ```
   Download from your broker or: https://www.metatrader5.com/
   ```

### Build the Installer

1. Open Command Prompt as Administrator
2. Navigate to the installer folder:
   ```cmd
   cd C:\path\to\mt5-agent\installer
   ```
3. Run the build script:
   ```cmd
   build.bat
   ```

### Run the Installer

1. Find `MT5AgentSetup-1.0.0.exe` in the `output` folder
2. Double-click to run (or right-click > Run as Administrator)
3. Follow the wizard:
   - Enter your **API Key** (from Scalperium admin panel)
   - Confirm **WebSocket URL** (default: wss://api.scalperium.com:3001/ws)
   - Enter **VPS Name** (e.g., VPS-FOREX-01)
   - Enter **Master Account Number** (demo account recommended)
   - Select **MT5 installation folder**

## Step 3: Verify Installation

1. Check service is running:
   ```cmd
   sc query MT5AgentService
   ```

2. Check logs:
   ```cmd
   type C:\MT5Agent\Logs\agent-*.log
   ```

3. Verify in Scalperium admin panel:
   - Go to Admin > Agents
   - Your VPS should appear as "Online"

## Step 4: Compile MQL5 Indicator

The ScalperiumIndicator needs to be compiled to .ex5 format:

1. Open MetaTrader 5
2. Press F4 to open MetaEditor
3. Navigate to: `C:\MT5Agent\MQL5\Indicators\`
4. Open `ScalperiumIndicator.mq5`
5. Press F7 to compile
6. Verify `ScalperiumIndicator.ex5` is created

**Alternatively**, compile on any Windows machine with MT5 and copy the .ex5 file.

## Step 5: Add Local Trade Copier (Optional)

If using Master/Slave architecture:

1. Purchase Local Trade Copier EA from MQL5 Market
2. Copy `Local Trade Copier EA MT5.ex5` to:
   ```
   C:\MT5Agent\MQL5\Experts\
   ```

## Troubleshooting

**Service won't start:**
```cmd
# Check Windows Event Viewer
eventvwr.msc
# Look under: Windows Logs > Application
```

**Connection issues:**
- Verify API Key in `C:\MT5Agent\appsettings.json`
- Check firewall allows outbound on port 3001
- Ensure WebSocket URL is correct

**MT5 terminal not starting:**
- Verify MT5 is installed at the specified path
- Run MT5 manually once to accept terms

## Architecture Summary

```
+-------------------+     WebSocket      +------------------+
|  Scalperium Web   |<------------------>|  MT5 Agent       |
|  App (SvelteKit)  |     Port 3001      |  (Windows VPS)   |
+-------------------+                    +--------+---------+
                                                  |
                                    +-------------+-------------+
                                    |             |             |
                              +-----+----+  +-----+----+  +-----+----+
                              |  MASTER  |  |  SLAVE   |  |  SLAVE   |
                              | (Demo)   |  | (User 1) |  | (User 2) |
                              |  + EA    |  | +Copier  |  | +Copier  |
                              +----------+  +----------+  +----------+
```

- **MASTER**: Demo account running Galaxy Gold Scalper EA
- **SLAVES**: User accounts with Local Trade Copier EA
- **Indicator**: Traffic Light (RED/ORANGE/GREEN) controls EA

When indicator goes RED:
1. EA trading is automatically stopped
2. All open trades are closed (max ~$15 loss)
3. EA resumes when conditions improve (ORANGE/GREEN)
