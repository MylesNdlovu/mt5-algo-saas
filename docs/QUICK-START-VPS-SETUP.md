# Quick Start: VPS Setup in 30 Minutes

This guide gets you from zero to fully operational MT5 terminals with resource monitoring.

---

## Prerequisites Checklist

Before you start, make sure you have:

- [ ] Prime VPS (12GB RAM) or Dedicated Server (128GB RAM) access
- [ ] VPS IP address, username, and password
- [ ] Microsoft Remote Desktop installed on your Mac
- [ ] Broker account credentials (Master + Slave accounts)
- [ ] MQL5.com account login (for Trade Copier)
- [ ] Galaxy Gold Scalper EA file (.ex5)

---

## 30-Minute Setup Timeline

### Minutes 0-5: Connect to VPS

1. **Open Microsoft Remote Desktop** on your Mac
2. **Add connection:**
   - PC Name: `[Your VPS IP]`
   - Username: `Administrator`
   - Password: `[Your Password]`
3. **Connect** - Accept certificate

### Minutes 5-10: Transfer Files

**Fastest Method - GitHub:**
```bash
# On Mac
cd /Users/dmd/mt5-algo-saas
git add .
git commit -m "Add deployment files"
git push

# On VPS (PowerShell)
cd C:\
git clone https://github.com/YOUR_USERNAME/mt5-algo-saas.git
```

**Alternative - Direct Copy:**
- Edit RDP settings → Local Resources → Redirect `/Users/dmd/mt5-algo-saas`
- Copy to `C:\mt5-algo-saas` on VPS

### Minutes 10-20: Deploy MT5 Terminals

```powershell
# On VPS - Open PowerShell as Administrator

# Navigate to scripts
cd C:\mt5-algo-saas\scripts

# Allow script execution
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process

# Deploy 6 terminals (safe for 12GB RAM)
.\Deploy-MT5-Terminals.ps1 -TerminalCount 6

# Wait ~5-10 minutes for deployment
```

**What happens:**
- Downloads MT5 installer
- Creates 6 portable MT5 terminals
- Creates startup/shutdown scripts
- Generates desktop shortcuts

### Minutes 20-25: Build C# Resource Monitor

```powershell
# Install .NET 8.0 SDK (if not installed)
# Download from: https://dotnet.microsoft.com/download/dotnet/8.0
# Run installer, accept defaults

# Build monitor
cd C:\mt5-algo-saas\csharp\MT5ResourceMonitor
dotnet restore
dotnet build -c Release
dotnet publish -c Release -r win-x64 --self-contained false -o C:\MT5-Terminals\Monitor

# Create desktop shortcut
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\MT5 Resource Monitor.lnk")
$Shortcut.TargetPath = "C:\MT5-Terminals\Monitor\MT5ResourceMonitor.exe"
$Shortcut.Save()
```

### Minutes 25-30: Start and Verify

```powershell
# Start all terminals
cd C:\MT5-Terminals
.\Start-All-Terminals.ps1

# Launch resource monitor
# Double-click "MT5 Resource Monitor" on desktop
```

**Verify:**
- ✅ 6 MT5 terminals opened
- ✅ Resource monitor shows 6/6 terminals running
- ✅ RAM usage ~7-8 GB / 12 GB
- ✅ System status: HEALTHY

---

## Post-Setup Tasks (Do These Next)

### 1. Login to All Terminals (5 minutes)

**Master (Terminal-1):**
```
Login: [Master Account]
Password: [Master Password]
Server: [Broker Server]
☑ Save password
```

**Slaves (Terminals 2-6):**
```
Login: [Slave Account 1-5]
Password: [Slave Password]
Server: [Same Broker]
☑ Save password
```

### 2. Install Trade Copier (10 minutes)

**In EACH terminal:**
1. Tools → Options → Community → Login to MQL5.com
2. Toolbox → Market → My Products
3. Find "Local Trade Copier EA MT5"
4. Click Install
5. Restart terminal

### 3. Configure Trade Copier (15 minutes)

**Master (Terminal-1):**
1. Open XAUUSD chart (M5)
2. Drag Galaxy Gold Scalper EA to chart → Configure → OK
3. Drag "Local Trade Copier CLIENT" to same chart
   - Server IP: `127.0.0.1`
   - Port: `1200`
   - Magic: `123456`
4. Enable AutoTrading button

**Slaves (Terminals 2-6):**
1. Open XAUUSD chart (M5)
2. Drag "Local Trade Copier SERVER" to chart
   - Master IP: `127.0.0.1`
   - Port: `1200`
   - Magic: `123456`
3. Enable AutoTrading button

### 4. Test Trade Copier (5 minutes)

1. In Master terminal → Place test trade: BUY 0.01 lots XAUUSD
2. Watch Slaves → Should copy within 1-2 seconds
3. Close trade on Master → All slaves should close
4. ✅ If working, proceed to live trading
5. ❌ If not working, see troubleshooting below

---

## Resource Monitor Dashboard Guide

### What You See

**Top Cards:**
- **RAM Usage:** `7.5 / 12.0 GB (62%)` ← Good, under 70%
- **CPU Usage:** `25%` ← Normal during trading
- **Terminals:** `6 / 6` ← All running
- **Status:** `HEALTHY` ← Safe to operate

**Charts:**
- **RAM Chart (Green):** Memory usage over last 5 minutes
- **CPU Chart (Blue):** CPU usage over last 5 minutes

**Terminal List:**
- Shows each MT5 process with individual RAM/CPU usage
- Scroll to see all 6 terminals

### Action Buttons

- **⟳ Refresh** - Manual update (auto-updates every 5 seconds)
- **⚙ Settings** - Configure thresholds and refresh interval
- **+ Add New Terminal** - Start Terminal-7 (if safe)
- **⏹ Stop All Terminals** - Emergency shutdown

### Status Meanings

| Status | What It Means | Action |
|--------|--------------|--------|
| 🟢 **HEALTHY** | Resources normal | Continue operating |
| 🟡 **WARNING** | Resources elevated (70-80%) | Monitor closely, don't add more |
| 🔴 **DANGER** | Resources critical (>80%) | Stop adding terminals, consider removing |

---

## Common Issues & Quick Fixes

### ❌ Terminals Won't Start

**Error:** "Terminal64.exe not found"

**Fix:**
```powershell
# Verify installation
dir C:\MT5-Terminals
# Should show MT5-Terminal-1 through MT5-Terminal-6

# If missing, re-run deployment
.\Deploy-MT5-Terminals.ps1 -TerminalCount 6
```

### ❌ Resource Monitor Won't Launch

**Error:** "Application failed to start"

**Fix:**
```powershell
# Check .NET installed
dotnet --version
# If not found, install .NET 8.0 SDK from Microsoft
```

### ❌ Trade Copier Not Copying

**Error:** Trades placed on Master don't appear on Slaves

**Fix:**
1. Check AutoTrading is ENABLED (green button) on all terminals
2. Verify port 1200 not blocked:
   ```powershell
   netstat -ano | findstr 1200
   ```
3. Check Magic Numbers MATCH (123456) on Master and all Slaves
4. Restart Master terminal first, then all Slaves

### ❌ High RAM Usage

**Status:** Shows DANGER even with 6 terminals

**Fix:**
```powershell
# Restart all terminals (clears memory leaks)
.\Stop-All-Terminals.ps1
Start-Sleep -Seconds 10
.\Start-All-Terminals.ps1

# Or adjust thresholds in Resource Monitor Settings
```

---

## Scaling Guide

### Current Setup (12GB RAM)

```
✅ Safe: 6 terminals (75% RAM usage)
⚠️ Risky: 7-8 terminals (80-85% RAM usage)
❌ Unsafe: 9+ terminals (>85% RAM usage)
```

**Recommendation:** Stick with 6 terminals on 12GB RAM

### When Dedicated Server Ready (128GB RAM)

```
✅ Safe: 35-40 terminals (60-70% RAM usage)
✅ Optimal: 30 terminals (55% RAM usage)
✅ Room to grow: Can scale to 80+ terminals
```

**Migration Steps:**
1. Keep Prime VPS running
2. Deploy dedicated server using same scripts
3. Test on dedicated with 10 terminals
4. Scale to 20 → 30 → 40 terminals gradually
5. Migrate trades from Prime to Dedicated
6. Cancel Prime VPS

---

## Daily Operations Checklist

### Morning (09:00)
- [ ] Open Resource Monitor
- [ ] Check status: Should be HEALTHY
- [ ] Verify all 6 terminals connected
- [ ] Check Scalperium dashboard shows all accounts

### Throughout Day
- [ ] Monitor Resource Monitor for WARNINGS
- [ ] Check RAM usage stays under 80%
- [ ] Verify trades copying correctly

### Evening (18:00)
- [ ] Review trade copier logs (Experts tab)
- [ ] Check for any disconnections
- [ ] Verify all accounts have same P&L (within slippage)

### Weekly (Sunday)
- [ ] Restart all terminals (clear memory)
- [ ] Review Resource Monitor charts for trends
- [ ] Update EAs if new versions available
- [ ] Backup EA settings files

---

## Production Go-Live Checklist

Before trading with real money:

### Testing Phase (1-3 days)
- [ ] All 6 terminals running stable for 24 hours
- [ ] Trade copier tested with 0.01 lots successfully
- [ ] No memory leaks (RAM usage stable)
- [ ] No disconnections or crashes
- [ ] Resource Monitor shows HEALTHY consistently

### Configuration Verification
- [ ] Galaxy Gold Scalper configured correctly
- [ ] Trade Copier Magic Numbers match (123456)
- [ ] Port 1200 open and listening
- [ ] AutoTrading enabled on all terminals
- [ ] All terminals have auto-login saved
- [ ] Traffic light indicator working on all charts

### Risk Management
- [ ] Start with 0.01 lots per trade
- [ ] Set max daily loss limit
- [ ] Monitor first 10 trades manually
- [ ] Gradually scale to 0.05 → 0.10 lots
- [ ] Keep 20% RAM buffer (don't exceed 80%)

### Emergency Procedures
- [ ] Know how to stop all terminals (⏹ button)
- [ ] Have VPS provider support contact
- [ ] Backup of all EA settings saved locally
- [ ] Know how to close all trades manually

---

## Next Steps After Setup

1. **Test for 24 hours** - Run with 0.01 lots, monitor stability
2. **Review logs daily** - Check Experts tab for errors
3. **Scale gradually** - 0.01 → 0.05 → 0.10 lots over 1 week
4. **Deploy dedicated** - When ready in 6-8 days
5. **Scale to 30 terminals** - Use dedicated server's 128GB RAM

---

## Support & Documentation

**Full Guides:**
- [VPS Deployment Guide](VPS-DEPLOYMENT-GUIDE.md) - Complete step-by-step
- [Trade Copier Setup](TRADE-COPIER-SETUP.md) - Detailed copier configuration
- [C# Monitor README](../csharp/MT5ResourceMonitor/README.md) - Monitor documentation

**Scripts:**
- `Deploy-MT5-Terminals.ps1` - Automated MT5 deployment
- `Start-All-Terminals.ps1` - Launch all terminals
- `Stop-All-Terminals.ps1` - Stop all terminals

**Contacts:**
- **VPS Support:** support@forexvps.net
- **MT5 Help:** https://www.metatrader5.com/en/terminal/help
- **Trade Copier:** https://www.mql5.com/en/users/traderforum/seller

---

## Success Metrics

After 1 week of operation, you should see:

- ✅ 6 terminals running 24/7 without crashes
- ✅ RAM usage stable at 60-75%
- ✅ CPU usage 10-30% idle, 50-70% active
- ✅ All trades copying within 1-2 seconds
- ✅ No disconnections or login issues
- ✅ Resource Monitor shows GREEN status consistently
- ✅ All 6 accounts have matching P&L (within slippage)

**If you achieve all of above:** Ready to scale to dedicated server! 🚀

---

**Total Setup Time:** 30 minutes deployment + 30 minutes configuration = **1 hour to production**

Good luck with your deployment!
