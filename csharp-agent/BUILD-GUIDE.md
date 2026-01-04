# SCALPERIUM MT5 Agent - Build & Installation Guide

## Building the Agent on Windows

### Prerequisites

1. **Install .NET 6.0 SDK**
   - Download from: https://dotnet.microsoft.com/download/dotnet/6.0
   - Choose "SDK" (not just Runtime)
   - Verify installation: Open PowerShell and run `dotnet --version`

2. **Install Git** (if cloning from repository)
   - Download from: https://git-scm.com/download/win

### Build Instructions

#### Option 1: Using PowerShell Build Script

```powershell
cd csharp-agent
.\build.ps1
```

#### Option 2: Manual Build

```powershell
cd csharp-agent/MT5AgentAPI

# Restore dependencies
dotnet restore

# Build Release version
dotnet build -c Release

# The executable will be at:
# bin/Release/net6.0/MT5Agent.exe
```

#### Option 3: Self-Contained Executable (No .NET Runtime Required)

```powershell
cd csharp-agent/MT5AgentAPI

# Publish as single self-contained exe
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true

# The executable will be at:
# bin/Release/net6.0/win-x64/publish/MT5Agent.exe
```

The self-contained version is larger (~60MB) but can run on any Windows machine without requiring .NET Runtime installation.

---

## Distributing the Agent

### For SCALPERIUM Web App Download

After building, copy the executable to the web app static folder:

```powershell
# Copy self-contained executable
Copy-Item "csharp-agent/MT5AgentAPI/bin/Release/net6.0/win-x64/publish/MT5Agent.exe" "web-app/static/downloads/SCALPERIUM-MT5-Agent.exe"
```

Or update the download API endpoint to serve from the build folder directly.

### Creating an Installer Package

For professional distribution, create an installer using:

- **NSIS** (Nullsoft Scriptable Install System): Free, scriptable
- **WiX Toolset**: MSI installer creation
- **Inno Setup**: Simple script-based installer

---

## Installation for Traders

### Quick Start

1. **Download Agent**
   - Download `SCALPERIUM-MT5-Agent.exe` from SCALPERIUM dashboard
   - Save to `C:\SCALPERIUM\`

2. **Get API Key**
   - Login to SCALPERIUM dashboard
   - Navigate to Settings → Agent API Key
   - Copy your unique API key

3. **Configure Environment**
   
   **Option A: System Environment Variables**
   ```powershell
   # Open PowerShell as Administrator
   [System.Environment]::SetEnvironmentVariable('SCALPERIUM_API_KEY', 'your-api-key-here', 'Machine')
   [System.Environment]::SetEnvironmentVariable('SCALPERIUM_WS_URL', 'wss://app.scalperium.com/ws/agent', 'Machine')
   ```

   **Option B: Create config.json**
   ```json
   {
     "ApiKey": "your-api-key-here",
     "WebSocketUrl": "wss://app.scalperium.com/ws/agent"
   }
   ```
   Save as `C:\SCALPERIUM\config.json`

4. **Ensure MT5 is Installed**
   - Download from: https://www.metatrader5.com/en/download
   - Login with your broker credentials
   - Keep MT5 running

5. **Run Agent**
   ```powershell
   cd C:\SCALPERIUM
   .\SCALPERIUM-MT5-Agent.exe
   ```

6. **Verify Connection**
   - Agent console should show "Connected to SCALPERIUM server"
   - Check SCALPERIUM dashboard → Agents (should show online status)

---

## Install as Windows Service (24/7 Operation)

For VPS deployment and continuous operation:

### 1. Install NSSM (Non-Sucking Service Manager)

```powershell
# Using Chocolatey
choco install nssm

# OR download from: https://nssm.cc/download
```

### 2. Create Windows Service

```powershell
# Install service
nssm install SCALPERIUM-Agent "C:\SCALPERIUM\SCALPERIUM-MT5-Agent.exe"

# Set working directory
nssm set SCALPERIUM-Agent AppDirectory "C:\SCALPERIUM"

# Set environment variables (if not using system env vars)
nssm set SCALPERIUM-Agent AppEnvironmentExtra "SCALPERIUM_API_KEY=your-api-key" "SCALPERIUM_WS_URL=wss://app.scalperium.com/ws/agent"

# Configure automatic restart on failure
nssm set SCALPERIUM-Agent AppExit Default Restart
nssm set SCALPERIUM-Agent AppRestartDelay 5000

# Start service
nssm start SCALPERIUM-Agent
```

### 3. Manage Service

```powershell
# Check status
nssm status SCALPERIUM-Agent

# Stop service
nssm stop SCALPERIUM-Agent

# Restart service
nssm restart SCALPERIUM-Agent

# Remove service
nssm remove SCALPERIUM-Agent confirm
```

---

## AI Learning Capability

The agent automatically learns from trade history to optimize indicator settings:

### How It Works

1. **Trade History Tracking**
   - Every trade is logged with:
     - Indicator signal at entry (GREEN/ORANGE/RED)
     - ATR value at entry
     - Trade outcome (profitable/loss)
     - Profit/loss amount

2. **Pattern Analysis**
   - Agent analyzes correlations between:
     - ATR values and profitable trades
     - Indicator signals and win rates
     - Market conditions and outcomes

3. **Automatic Optimization**
   - Every 24 hours, AI analyzes last 100 trades
   - Identifies optimal ATR period (default: 14)
   - Adjusts ATR multiplier (default: 1.5)
   - Recalibrates GREEN/ORANGE/RED thresholds
   - Sends optimization suggestions to dashboard

4. **Dashboard Control**
   - View AI optimization results in Agent Control Panel
   - See current vs optimized settings
   - Expected win rate improvement prediction
   - One-click apply optimized settings
   - Agent updates EA inputs automatically

### Viewing AI Insights

In SCALPERIUM dashboard:

1. Navigate to **Agents** panel
2. Find your agent (must have 50+ trades)
3. Click **🤖 AI Optimize** button
4. Review optimization suggestions:
   - Trades analyzed
   - Current settings
   - Optimized settings
   - Expected improvement
   - AI insights/reasoning
5. Click **Apply Settings** to update EA

---

## Troubleshooting

### Agent Won't Start

**Check .NET Runtime:**
```powershell
dotnet --version
# Should show 6.0 or higher
```

**Check MT5 is Running:**
```powershell
Get-Process -Name terminal64 -ErrorAction SilentlyContinue
# Should show MT5 process
```

**Check Firewall:**
- Ensure Windows Firewall allows MT5Agent.exe
- Ensure WebSocket port (443/WSS) is open

### Agent Shows Offline in Dashboard

**Verify API Key:**
```powershell
# Check environment variable
[System.Environment]::GetEnvironmentVariable('SCALPERIUM_API_KEY', 'Machine')
```

**Check WebSocket URL:**
```powershell
# Should be wss://app.scalperium.com/ws/agent (production)
# OR ws://localhost:5173/ws/agent (development)
[System.Environment]::GetEnvironmentVariable('SCALPERIUM_WS_URL', 'Machine')
```

**View Agent Logs:**
```powershell
# Logs are written to console
# If running as service, check Windows Event Viewer
```

### EA Not Loading

**Check EA Permissions:**
- MT5 → Tools → Options → Expert Advisors
- Enable "Allow automated trading"
- Enable "Allow DLL imports"

**Verify EA File:**
- EA must be in: `[MT5 Data Folder]\MQL5\Experts\`
- Restart MT5 after adding EA files

---

## Building for Different Environments

### Development Build (requires .NET Runtime)

```powershell
dotnet build -c Debug
# Output: bin/Debug/net6.0/MT5Agent.exe
```

### Production Build (requires .NET Runtime)

```powershell
dotnet build -c Release
# Output: bin/Release/net6.0/MT5Agent.exe
```

### Self-Contained (no .NET Runtime required)

```powershell
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true
# Output: bin/Release/net6.0/win-x64/publish/MT5Agent.exe
# Size: ~60MB
```

### Framework-Dependent (small, requires .NET Runtime)

```powershell
dotnet publish -c Release -r win-x64 --self-contained false
# Output: bin/Release/net6.0/win-x64/publish/MT5Agent.exe
# Size: ~200KB (but requires .NET 6 installed)
```

---

## Security Best Practices

1. **API Key Storage**
   - Never commit API keys to version control
   - Use environment variables or encrypted config
   - Rotate keys every 90 days

2. **Network Security**
   - Use WSS (WebSocket Secure) in production
   - Validate SSL certificates
   - Implement rate limiting

3. **VPS Hardening**
   - Enable Windows Firewall
   - Disable Remote Desktop when not needed
   - Use strong passwords
   - Keep Windows updated
   - Limit RDP access to specific IPs

4. **MT5 Security**
   - Use strong MT5 passwords
   - Enable two-factor authentication (if available)
   - Regularly monitor trading activity
   - Set stop-loss limits

---

## Updating the Agent

When a new version is released:

1. **Stop Service** (if running)
   ```powershell
   nssm stop SCALPERIUM-Agent
   ```

2. **Backup Current Version**
   ```powershell
   Copy-Item "C:\SCALPERIUM\SCALPERIUM-MT5-Agent.exe" "C:\SCALPERIUM\SCALPERIUM-MT5-Agent.exe.bak"
   ```

3. **Download New Version**
   - From SCALPERIUM dashboard → Agents → Download Agent

4. **Replace Executable**
   ```powershell
   Move-Item "Downloads\SCALPERIUM-MT5-Agent.exe" "C:\SCALPERIUM\SCALPERIUM-MT5-Agent.exe" -Force
   ```

5. **Restart Service**
   ```powershell
   nssm start SCALPERIUM-Agent
   ```

---

## Support

For issues or questions:

- **Documentation**: https://docs.scalperium.com
- **Email Support**: support@scalperium.com
- **Agent Control Panel**: https://app.scalperium.com/agents

---

*Last Updated: December 2025*
