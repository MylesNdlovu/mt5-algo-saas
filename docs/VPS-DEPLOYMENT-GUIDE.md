# VPS Deployment Guide - Complete Setup

## Overview

This guide will help you deploy everything on your Prime VPS (12GB RAM) via Remote Desktop Protocol (RDP).

**What You'll Deploy:**
1. 6-10 portable MT5 terminals
2. C# Resource Monitor Desktop UI
3. MQL5 Trade Copier (already purchased)
4. C# Pool/Mother Agent (for Scalperium integration)

---

## Step 1: Connect to Your VPS via RDP

### On Your Mac:

1. **Download Microsoft Remote Desktop** from Mac App Store:
   - https://apps.apple.com/us/app/microsoft-remote-desktop/id1295203466

2. **Add Your VPS Connection:**
   - Open Microsoft Remote Desktop
   - Click `Add PC`
   - PC Name: `[Your VPS IP Address]`
   - Username: `Administrator` (or provided username)
   - Password: `[Your VPS Password]`
   - Friendly Name: `Prime VPS - London`
   - Click `Add`

3. **Connect:**
   - Double-click your VPS connection
   - Accept certificate if prompted
   - You should now see Windows Server desktop

---

## Step 2: Transfer Files to VPS

### Option A: GitHub (Recommended)

1. **On your Mac:**
   ```bash
   cd /Users/dmd/mt5-algo-saas
   git add .
   git commit -m "Add deployment scripts and C# monitor"
   git push origin main
   ```

2. **On VPS (via RDP):**
   ```powershell
   # Install Git if not installed
   winget install Git.Git

   # Clone repository
   cd C:\
   git clone https://github.com/YOUR_USERNAME/mt5-algo-saas.git
   ```

### Option B: Direct File Transfer via RDP

1. **In Microsoft Remote Desktop settings:**
   - Click on your VPS connection
   - Edit → Local Resources → Folders
   - Redirect: `/Users/dmd/mt5-algo-saas`

2. **On VPS:**
   - Access via `\\tsclient\mt5-algo-saas`
   - Copy files to `C:\mt5-algo-saas`

### Option C: Google Drive/Dropbox

1. Upload files from Mac to cloud storage
2. Download on VPS

---

## Step 3: Deploy MT5 Terminals (On VPS)

### 3.1 Run Deployment Script

1. **Open PowerShell as Administrator:**
   - Press `Windows Key`
   - Type: `PowerShell`
   - Right-click → `Run as Administrator`

2. **Navigate to scripts folder:**
   ```powershell
   cd C:\mt5-algo-saas\scripts
   ```

3. **Set execution policy (first time only):**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
   ```

4. **Run deployment script:**
   ```powershell
   # For 6 terminals (safe for 12GB RAM)
   .\Deploy-MT5-Terminals.ps1 -TerminalCount 6

   # OR for 10 terminals (if you want to push limits)
   .\Deploy-MT5-Terminals.ps1 -TerminalCount 10
   ```

5. **Wait for deployment:**
   - Script will download MT5 installer (~50MB)
   - Create base MT5 installation
   - Clone to 6-10 portable terminals
   - Create startup/shutdown scripts
   - Takes 5-10 minutes

6. **Verify installation:**
   ```powershell
   dir C:\MT5-Terminals
   ```

   You should see:
   ```
   MT5-Base/
   MT5-Terminal-1/
   MT5-Terminal-2/
   ...
   MT5-Terminal-6/
   Start-All-Terminals.ps1
   Stop-All-Terminals.ps1
   ResourceMonitor.json
   ```

---

## Step 4: Build C# Resource Monitor

### 4.1 Install .NET SDK

1. **Download .NET 8.0 SDK:**
   - Open browser on VPS
   - Go to: https://dotnet.microsoft.com/download/dotnet/8.0
   - Download: `Windows x64 SDK Installer`
   - Run installer, accept defaults

2. **Verify installation:**
   ```powershell
   dotnet --version
   # Should show: 8.0.x
   ```

### 4.2 Build the Monitor

1. **Navigate to project folder:**
   ```powershell
   cd C:\mt5-algo-saas\csharp\MT5ResourceMonitor
   ```

2. **Restore dependencies:**
   ```powershell
   dotnet restore
   ```

3. **Build the application:**
   ```powershell
   dotnet build -c Release
   ```

4. **Publish standalone executable:**
   ```powershell
   dotnet publish -c Release -r win-x64 --self-contained false -o C:\MT5-Terminals\Monitor
   ```

5. **Create desktop shortcut:**
   ```powershell
   $WshShell = New-Object -ComObject WScript.Shell
   $Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\MT5 Resource Monitor.lnk")
   $Shortcut.TargetPath = "C:\MT5-Terminals\Monitor\MT5ResourceMonitor.exe"
   $Shortcut.WorkingDirectory = "C:\MT5-Terminals\Monitor"
   $Shortcut.Description = "MT5 Resource Monitor"
   $Shortcut.Save()
   ```

---

## Step 5: Start MT5 Terminals

### 5.1 Launch All Terminals

1. **Run startup script:**
   ```powershell
   cd C:\MT5-Terminals
   .\Start-All-Terminals.ps1
   ```

2. **Verify terminals are running:**
   - You should see 6-10 MT5 windows open
   - Each will prompt for broker login credentials

### 5.2 Login to Each Terminal

**For MASTER terminal (Terminal-1):**
```
Login: [Your Master Account Number]
Password: [Your Master Account Password]
Server: [Your Broker Server - e.g., Exness-MT5Real5]
```

**For SLAVE terminals (Terminal-2 through Terminal-6/10):**
```
Login: [Slave Account Number]
Password: [Slave Account Password]
Server: [Same Broker Server]
```

**IMPORTANT:** Save login credentials in each terminal (check "Save password")

---

## Step 6: Launch Resource Monitor

1. **Double-click desktop shortcut:**
   - `MT5 Resource Monitor.lnk`

2. **You should see:**
   - Dashboard showing RAM usage (e.g., 7.5 / 12.0 GB)
   - CPU usage percentage
   - List of running terminals
   - Real-time charts
   - Green "HEALTHY" status

3. **Verify detection:**
   - The monitor should show all 6-10 terminals in the right panel
   - Each terminal should display RAM and CPU usage

---

## Step 7: Install Trade Copier

### 7.1 Download from MQL5 Market (Do this in EACH terminal)

**MASTER Terminal (Terminal-1):**

1. Open MT5 Terminal-1
2. Click `Tools` → `Options` → `Community` tab
3. Login with your MQL5.com account credentials
4. Click `Toolbox` window (bottom) → `Market` tab
5. Click `My Products` (top right)
6. Find: "Local Trade Copier EA MT5"
7. Click `Install` or `Download`
8. Wait for download to complete
9. Restart MT5 Terminal-1

**Repeat for ALL terminals** (2 through 6/10)

### 7.2 Configure MASTER (Terminal-1)

1. **Open XAUUSD chart:**
   - File → New Chart → XAUUSD
   - Set timeframe: M5 or M15

2. **Attach Galaxy Gold Scalper EA:**
   - Navigator (Ctrl+N) → Expert Advisors → Find your Galaxy EA
   - Drag onto XAUUSD chart
   - Configure settings (your existing strategy)
   - Enable "Allow DLL imports"
   - Click OK

3. **Attach Trade Copier CLIENT EA:**
   - Navigator → Expert Advisors → Market → "Local Trade Copier EA MT5 (Client)"
   - Drag onto SAME XAUUSD chart
   - Configure:
     ```
     Server IP: 127.0.0.1
     Server Port: 1200
     Magic Number: 123456
     Copy Symbols: XAUUSD
     ```
   - Click OK

4. **Enable AutoTrading:**
   - Click green "AutoTrading" button in toolbar
   - Should show smiley face on chart

### 7.3 Configure SLAVES (Terminals 2-6/10)

1. **Open XAUUSD chart in each slave**

2. **Attach Trade Copier SERVER EA:**
   - Navigator → Expert Advisors → Market → "Local Trade Copier EA MT5 (Server)"
   - Drag onto XAUUSD chart
   - Configure:
     ```
     Master IP: 127.0.0.1
     Master Port: 1200 (MUST match master)
     Magic Number: 123456 (MUST match master)
     Receive Symbols: XAUUSD
     ```
   - Click OK

3. **Enable AutoTrading** in each slave terminal

### 7.4 Test Trade Copying

1. **In Master terminal (Terminal-1):**
   - Right-click XAUUSD chart → Trading → New Order
   - Place test trade: BUY 0.01 lots
   - Set SL: -10 pips, TP: +10 pips
   - Click "Buy"

2. **Watch slave terminals:**
   - Within 1-2 seconds, all slaves should open identical trades
   - Check "Experts" tab for confirmation messages

3. **Close test trade on master:**
   - All slaves should close simultaneously

4. **If trades don't copy, see troubleshooting in TRADE-COPIER-SETUP.md**

---

## Step 8: Monitor Resource Usage

### 8.1 Using C# Resource Monitor

**Dashboard Overview:**
- **RAM Usage:** Should be 7-10 GB / 12 GB (60-80%)
- **CPU Usage:** Should be 10-30% at idle, 50-70% during trading
- **Terminals Running:** 6/6 or 10/10
- **System Status:** Should show "HEALTHY" or "WARNING"

**Safe to Add More?**
- If status shows "Safe to add X more", you can launch additional terminals
- Click "Add New Terminal" button to start next available terminal

**Resource Alerts:**
- Yellow "WARNING": Resource usage 70-80% (monitor closely)
- Red "DANGER": Resource usage >80% (stop adding terminals)

### 8.2 What to Monitor

**Every Hour:**
- Check RAM usage isn't climbing
- Verify all terminals still connected
- Check Scalperium dashboard shows all accounts

**Daily:**
- Review trade copier logs (Experts tab in MT5)
- Verify all trades copied correctly
- Check for any disconnections

**Weekly:**
- Restart all terminals (to clear memory leaks)
- Review C# Resource Monitor charts for trends
- Update EAs if new versions available

---

## Step 9: Auto-Start on VPS Reboot (Optional)

### 9.1 Create Startup Task

1. **Open Task Scheduler:**
   - Press Windows Key
   - Type: `Task Scheduler`
   - Press Enter

2. **Create New Task:**
   - Actions → Create Task
   - Name: `Start MT5 Terminals`
   - Description: `Automatically start all MT5 terminals on boot`

3. **Triggers Tab:**
   - New → Begin the task: `At startup`
   - Delay task for: `30 seconds`
   - Click OK

4. **Actions Tab:**
   - New → Action: `Start a program`
   - Program: `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File "C:\MT5-Terminals\Start-All-Terminals.ps1"`
   - Click OK

5. **Conditions Tab:**
   - Uncheck "Start only if on AC power" (if laptop/portable)

6. **Settings Tab:**
   - Check "Allow task to be run on demand"
   - Check "If task fails, restart every: 1 minute"

7. **Click OK to save**

### 9.2 Auto-Start Resource Monitor

Repeat above steps:
- Task Name: `Start MT5 Resource Monitor`
- Program: `C:\MT5-Terminals\Monitor\MT5ResourceMonitor.exe`
- Delay: 60 seconds (start after terminals)

---

## Step 10: Install C# Pool/Mother Agent (Scalperium Integration)

### 10.1 Prerequisites

The C# Pool Agent connects all MT5 terminals to your Scalperium web app via WebSocket.

**Required:**
- All MT5 terminals running and logged in
- Scalperium web app deployed on Vercel
- Database connection string

### 10.2 Deploy Pool Agent

1. **Copy Pool Agent executable to VPS:**
   ```powershell
   # If you have it built, copy to:
   C:\MT5-Terminals\PoolAgent\
   ```

2. **Configure connection:**
   ```json
   {
     "WebSocketUrl": "wss://your-app.vercel.app/ws/agent",
     "AgentId": "prime-vps-london",
     "MT5Terminals": [
       { "Login": "12345678", "Path": "C:\\MT5-Terminals\\MT5-Terminal-1" },
       { "Login": "12345679", "Path": "C:\\MT5-Terminals\\MT5-Terminal-2" }
       // ... add all terminals
     ]
   }
   ```

3. **Run Pool Agent:**
   ```powershell
   cd C:\MT5-Terminals\PoolAgent
   .\ScalperiumPoolAgent.exe
   ```

4. **Verify connection:**
   - Check Scalperium dashboard
   - All 6-10 accounts should show as "Connected"
   - Green status indicators

---

## Step 11: Production Checklist

Before going live with real money:

- [ ] All 6-10 terminals running and connected
- [ ] Trade copier tested with 0.01 lot trades
- [ ] All trades copying correctly (Master → Slaves)
- [ ] Galaxy Gold Scalper EA running on Master
- [ ] C# Resource Monitor showing HEALTHY status
- [ ] RAM usage < 80% (leave headroom)
- [ ] CPU usage < 70% during trading
- [ ] All terminals auto-login saved
- [ ] Startup tasks configured for auto-restart
- [ ] Scalperium dashboard shows all accounts
- [ ] Traffic light indicator working on all charts
- [ ] Backup of all EA settings saved
- [ ] VPS provider support contact info saved
- [ ] Emergency stop procedure documented

---

## Troubleshooting

### Issue: Terminals Won't Start

**Solution:**
```powershell
# Check if terminal64.exe is blocked by Windows
Get-Process -Name "terminal64" -ErrorAction SilentlyContinue
# If none found, check:
Get-ChildItem C:\MT5-Terminals -Recurse -Filter "terminal64.exe" | Unblock-File
```

### Issue: Resource Monitor Won't Launch

**Solution:**
```powershell
# Check .NET is installed
dotnet --version

# If not found, reinstall .NET 8.0 SDK
# Download from: https://dotnet.microsoft.com/download/dotnet/8.0
```

### Issue: Trade Copier Not Copying

**Solution:**
1. Check Windows Firewall isn't blocking port 1200
2. Verify Magic Numbers match on Master CLIENT and Slave SERVER
3. Check Experts tab for error messages
4. Restart Master terminal first, then Slaves

### Issue: High RAM Usage

**Solution:**
```powershell
# Restart all terminals weekly to clear memory leaks
.\Stop-All-Terminals.ps1
Start-Sleep -Seconds 10
.\Start-All-Terminals.ps1
```

---

## Cost Summary

| Item | Cost | Type |
|------|------|------|
| Prime VPS (12GB) | R1,240/mo | Monthly (temporary) |
| Dedicated Server (128GB) | R4,520/mo | Monthly (when ready) |
| MQL5 Trade Copier | $50 | ONE-TIME ✅ |
| Galaxy Gold Scalper | ??? | ONE-TIME (owned?) |
| C# Resource Monitor | FREE | Open source |
| .NET 8.0 SDK | FREE | Microsoft |

---

## Next Steps After Setup

1. **Run for 24 hours with 0.01 lots** - Test stability
2. **Monitor Resource Monitor dashboard** - Ensure no memory leaks
3. **Scale to 0.05 lots** - Increase position sizes gradually
4. **Deploy on dedicated server** - When ready in 6-8 days
5. **Scale to 30+ terminals** - Use dedicated server's 128GB RAM

---

## Support

**VPS Issues:**
- Contact ForexVPS support: support@forexvps.net

**MT5 Issues:**
- MetaQuotes documentation: https://www.metatrader5.com/en/terminal/help

**Trade Copier Issues:**
- MQL5 Product Support: https://www.mql5.com/en/users/traderforum/seller

**Scalperium Issues:**
- Check logs in C# Pool Agent
- Verify WebSocket connection in browser console

Good luck with your deployment! 🚀
