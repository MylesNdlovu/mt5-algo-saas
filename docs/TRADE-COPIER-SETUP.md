# MQL5 Trade Copier Setup Guide

## Overview

You've purchased: **Local Trade Copier EA MT5** ($50 USD)
- Product Link: https://www.mql5.com/en/market/product/68951
- Activations: 20 (enough for 20 terminals)
- Architecture: 1 Master → 9 Slaves

---

## Step 1: Download from MQL5 Market

### On Your VPS (via Remote Desktop):

1. **Open MetaTrader 5** on your VPS
2. **Login to your MQL5 account** in MT5:
   - Click `Tools` → `Options` → `Community` tab
   - Enter your MQL5.com credentials
   - Click `OK`

3. **Access Market Tab:**
   - In MT5, click `Toolbox` window at bottom
   - Click `Market` tab
   - Click `My Products` (top right)

4. **Find Your Purchase:**
   - Look for "Local Trade Copier EA MT5"
   - You should see it listed since you just purchased it
   - Click `Install` or `Download`

5. **Installation:**
   - Product will download to: `C:\Users\Administrator\AppData\Roaming\MetaQuotes\Terminal\<TERMINAL_ID>\MQL5\Market\`
   - MT5 will automatically copy it to: `MQL5\Experts\Market\`
   - Restart MT5 after installation

---

## Step 2: Verify Installation

1. **Check Navigator Panel:**
   - In MT5, press `Ctrl+N` to open Navigator
   - Expand `Expert Advisors` → `Market`
   - You should see TWO EAs:
     - **Local Trade Copier EA MT5 (Client)** ← Master
     - **Local Trade Copier EA MT5 (Server)** ← Slave

2. **If Not Visible:**
   - Restart MT5
   - Check `Tools` → `Options` → `Expert Advisors` → Enable "Allow automated trading"

---

## Step 3: Architecture Setup

### Your Configuration:
```
Master Terminal (1)
  ├─ Galaxy Gold Scalper EA (trades based on strategy)
  ├─ Local Trade Copier CLIENT EA (sends trades)
  └─ Traffic Light Indicator

Slave Terminals (9)
  ├─ Local Trade Copier SERVER EA (receives trades)
  └─ Traffic Light Indicator (read-only)
```

---

## Step 4: Configure MASTER Terminal

### 4.1 Install Galaxy Gold Scalper EA

1. **Copy EA to Master Terminal:**
   - Place `GalaxyGoldScalper.ex5` in `MQL5\Experts\` folder
   - Restart MT5

2. **Attach Galaxy Gold Scalper to Chart:**
   - Open XAUUSD (Gold) chart
   - Drag `GalaxyGoldScalper.ex5` onto chart
   - Configure EA settings as per your strategy
   - Enable "Allow DLL imports" (required for C++ DLL)
   - Click `OK`

### 4.2 Install Trade Copier CLIENT EA

1. **Attach Trade Copier CLIENT to SAME Chart:**
   - Drag `Local Trade Copier EA MT5 (Client)` onto XAUUSD chart
   - This will open the settings panel

2. **Critical Settings:**
   ```
   ====================
   GENERAL SETTINGS
   ====================
   Enable EA: true
   Trade Server IP: 127.0.0.1 (localhost - all terminals on same VPS)
   Trade Server Port: 1200 (default, or choose your own)

   ====================
   COPYING SETTINGS
   ====================
   Copy All Symbols: false
   Symbols to Copy: XAUUSD (only Gold)

   Copy Market Orders: true
   Copy Pending Orders: true
   Copy SL/TP: true
   Copy Partial Closes: true

   ====================
   RISK MANAGEMENT
   ====================
   Lot Multiplier: 1.0 (slaves trade same lot size as master)
   Risk %: 0 (disabled - use fixed lots from master)
   Max Spread: 50 (points - reject if spread too high)

   ====================
   ADVANCED
   ====================
   Magic Number: 123456 (unique ID for copier trades)
   Comment Prefix: [COPIER]
   Enable Alerts: true
   ```

3. **Enable AutoTrading:**
   - Click green `AutoTrading` button in MT5 toolbar
   - Should turn green and show "Auto Trading Enabled"
   - You should see smiley face icon on chart (top right)

### 4.3 Verify Master is Running

- In MT5 `Experts` tab (bottom panel), you should see:
  ```
  2026.01.16 10:30:00  Local Trade Copier Client: Initialized
  2026.01.16 10:30:00  Local Trade Copier Client: Listening on port 1200
  2026.01.16 10:30:01  GalaxyGoldScalper: Initialized successfully
  ```

---

## Step 5: Configure SLAVE Terminals (Repeat for All 9 Slaves)

### 5.1 Launch Slave Terminal

1. **Copy MT5 Installation:**
   - Copy entire MT5 folder 9 times:
     ```
     C:\Program Files\MetaTrader 5\
     →
     C:\Program Files\MetaTrader 5 - Account 2\
     C:\Program Files\MetaTrader 5 - Account 3\
     ...
     C:\Program Files\MetaTrader 5 - Account 10\
     ```

2. **Login to Different Broker Account:**
   - Open each copied MT5 terminal
   - Login with unique MT5 account credentials (from broker)
   - Ensure all accounts are funded and ready

### 5.2 Install Trade Copier SERVER EA

1. **Download Product to EACH Slave:**
   - Repeat Step 1 for each slave terminal
   - Or manually copy from Master:
     - Copy from Master: `MQL5\Experts\Market\Local Trade Copier EA MT5 (Server).ex5`
     - Paste to Slave: `MQL5\Experts\`

2. **Attach Trade Copier SERVER to Chart:**
   - Open XAUUSD chart in slave terminal
   - Drag `Local Trade Copier EA MT5 (Server)` onto chart

3. **Critical Settings:**
   ```
   ====================
   GENERAL SETTINGS
   ====================
   Enable EA: true
   Master Server IP: 127.0.0.1 (same VPS)
   Master Server Port: 1200 (MUST match master)

   ====================
   COPYING SETTINGS
   ====================
   Receive All Symbols: false
   Symbols to Receive: XAUUSD

   Copy Market Orders: true
   Copy Pending Orders: true
   Copy SL/TP: true

   ====================
   RISK MANAGEMENT
   ====================
   Lot Multiplier: 1.0 (or adjust per slave if needed)
   Max Slippage: 50 (points)

   ====================
   ADVANCED
   ====================
   Magic Number: 123456 (MUST match master)
   Comment Prefix: [COPIER]
   Enable Alerts: true
   ```

4. **Enable AutoTrading:**
   - Click green `AutoTrading` button
   - Verify smiley face icon appears on chart

### 5.3 Verify Slave is Connected

- In Slave MT5 `Experts` tab, you should see:
  ```
  2026.01.16 10:32:00  Local Trade Copier Server: Initialized
  2026.01.16 10:32:00  Local Trade Copier Server: Connected to Master at 127.0.0.1:1200
  2026.01.16 10:32:01  Local Trade Copier Server: Ready to receive trades
  ```

---

## Step 6: Test the Setup

### 6.1 Manual Test Trade on Master

1. **Place Test Trade on Master:**
   - Open XAUUSD chart on Master terminal
   - Right-click chart → `Trading` → `New Order`
   - Place small market buy: 0.01 lots
   - Set SL: -10 pips, TP: +10 pips
   - Click `Buy`

2. **Watch Slave Terminals:**
   - Within 1-2 seconds, all 9 slaves should:
     - Open identical BUY order
     - Same symbol: XAUUSD
     - Same lot size: 0.01
     - Same SL/TP levels
     - Comment: [COPIER] or similar

3. **Check Experts Tab on Slaves:**
   ```
   2026.01.16 10:35:00  Local Trade Copier Server: Trade received from Master
   2026.01.16 10:35:00  Local Trade Copier Server: Opening BUY 0.01 XAUUSD
   2026.01.16 10:35:01  Local Trade Copier Server: Order #12345678 opened successfully
   ```

### 6.2 Close Test Trade on Master

1. **Close the test trade on Master terminal**
2. **Verify all slaves close simultaneously**
3. **Check profit/loss matches (within slippage tolerance)**

### 6.3 If Trades Don't Copy:

**Troubleshooting Checklist:**
- [ ] AutoTrading enabled on all terminals? (green button)
- [ ] Port 1200 not blocked by Windows Firewall?
  - Run: `netstat -ano | findstr 1200` in CMD
  - Should show LISTENING
- [ ] Magic Number matches on Master CLIENT and Slave SERVER?
- [ ] Symbol name identical? (some brokers use XAUUSD, others GOLD)
- [ ] Check Experts tab for error messages

**Common Errors:**
```
Error: "Connection refused"
→ Master CLIENT EA not running or port wrong

Error: "Symbol not found"
→ Slave broker uses different symbol name (GOLD vs XAUUSD)
→ Solution: Add symbol mapping in settings

Error: "Invalid volume"
→ Slave account minimum lot size different from master
→ Solution: Adjust Lot Multiplier in slave settings
```

---

## Step 7: Integrate with Galaxy Gold Scalper

### 7.1 Master Terminal Configuration

**Master runs BOTH EAs on same chart:**
```
XAUUSD Chart (M5 or M15)
  ├─ Galaxy Gold Scalper EA (generates trades)
  └─ Local Trade Copier CLIENT (copies trades to slaves)
```

**Galaxy Gold Scalper Settings:**
- Magic Number: 999999 (different from copier)
- Risk %: 1-2% per trade
- Max Spread: 30 points
- Trading Hours: 24/7 or specific sessions

**Trade Copier CLIENT Settings:**
- Magic Number Filter: DISABLED (copy all trades from master, regardless of magic)
  - OR set to 999999 to only copy Galaxy trades
- Symbol Filter: XAUUSD only

### 7.2 Slave Terminals

**Slaves run ONLY trade copier:**
```
XAUUSD Chart
  └─ Local Trade Copier SERVER (receives trades)
```

**DO NOT attach Galaxy Gold Scalper to slaves** - they receive trades passively

---

## Step 8: Production Deployment Checklist

### Before Going Live:

- [ ] **Test with 0.01 lots for 24 hours**
  - Monitor all 10 terminals
  - Verify trades copy correctly
  - Check latency (should be <1 second)

- [ ] **Check broker fees:**
  - Commission per trade × 10 accounts
  - Spread costs
  - Ensure profitable after fees

- [ ] **Set up monitoring:**
  - C# Pool Agent connected to all terminals
  - Scalperium dashboard shows all accounts
  - Telegram/Discord alerts configured

- [ ] **Resource monitoring on VPS:**
  - RAM usage: Should be ~15GB / 128GB (12%)
  - CPU usage: Should be ~10-20% at idle
  - Disk space: Monitor logs don't fill up

- [ ] **Backup EA files:**
  - Copy all `.ex5` files to external storage
  - Save all EA settings as `.set` files
  - Document Magic Numbers and port configurations

### Go-Live Steps:

1. **Start with Master only** - Let Galaxy Gold Scalper trade for 1 day
2. **Enable 2-3 slaves** - Test copier with small subset
3. **Scale to all 9 slaves** - Once confident trades copy correctly
4. **Monitor for 1 week** - Ensure stable operation
5. **Scale lot sizes gradually** - Start 0.01 → 0.05 → 0.10 lots

---

## Step 9: Maintenance and Monitoring

### Daily Checks:

1. **Verify all terminals connected:**
   - Check Scalperium dashboard
   - All 10 accounts showing "Connected" status

2. **Check trade copier logs:**
   - Master should show: "X trades sent today"
   - Slaves should show: "X trades received today"
   - Numbers should match

3. **Monitor RAM/CPU:**
   - Windows Task Manager
   - Each MT5 terminal: ~1.2-1.5GB RAM
   - Total: 12-15GB / 128GB available

### Weekly Checks:

1. **Review trade performance:**
   - Are all 10 accounts profitable?
   - Any accounts with different P&L? (investigate slippage)
   - Total fees vs total profit

2. **Update EAs if needed:**
   - Check MQL5 Market for updates to Trade Copier
   - Check Galaxy Gold Scalper for updates

3. **Backup account data:**
   - Export trade history from all terminals
   - Save to cloud storage

---

## Step 10: Scaling to 30+ Terminals (Future)

When you're ready to scale from 10 → 30 terminals:

### Server Capacity:
- **Current:** 10 terminals = 15GB RAM / 128GB (12%)
- **At 30 terminals:** 30 terminals = 45GB RAM / 128GB (35%)
- **CPU:** 30 terminals = 30% load / 8 cores (comfortable)

### Trade Copier Activations:
- **Current:** 10 terminals used / 20 activations available
- **At 30 terminals:** Need to purchase 1-2 more licenses
  - 20 activations = $50 USD
  - For 30 terminals, buy 1 more license = $100 total

### Network Considerations:
- Copier can handle 30+ slaves easily
- May want to split into 2 Master terminals (each managing 15 slaves)
- Monitor port 1200 for connection timeouts

---

## Troubleshooting Common Issues

### Issue 1: Trades Copy with Delay (>5 seconds)

**Cause:** High CPU load or network latency
**Solution:**
1. Check Windows Task Manager - CPU usage
2. Reduce MT5 terminal chart count (close unused charts)
3. Disable unnecessary indicators on slave terminals
4. Use M5 or M15 timeframes (not M1 tick charts)

### Issue 2: Slaves Open Trades at Different Prices

**Cause:** Slippage or different broker quotes
**Solution:**
1. Check Master vs Slave spread at trade time
2. Increase `Max Slippage` in slave settings (50 → 100 points)
3. Consider using same broker for all accounts (same liquidity pool)

### Issue 3: Some Slaves Miss Trades

**Cause:** Terminal disconnected or EA crashed
**Solution:**
1. Check MT5 connection status (green icon bottom right)
2. Check Experts tab for error messages
3. Restart affected slave terminal
4. Verify AutoTrading still enabled after restart

### Issue 4: Master EA Stops Trading

**Cause:** Galaxy Gold Scalper EA crashed or VPS rebooted
**Solution:**
1. Check Windows Event Viewer for crashes
2. Restart Master MT5 terminal
3. Re-attach both EAs (Galaxy + Copier CLIENT)
4. Check EA logs for crash reason

### Issue 5: RAM Usage Keeps Growing

**Cause:** MT5 memory leak or excessive logs
**Solution:**
1. Restart all terminals weekly (scheduled task)
2. Clear Expert logs: Delete `MQL5\Logs\` folder contents
3. Reduce chart history: Tools → Options → Charts → Max bars in history (5000)

---

## Quick Reference: Port and Magic Numbers

```
====================
MASTER TERMINAL
====================
Galaxy Gold Scalper Magic: 999999
Trade Copier CLIENT Magic: 123456
Trade Copier Port: 1200

====================
SLAVE TERMINALS (1-9)
====================
Trade Copier SERVER Magic: 123456 (must match master)
Trade Copier Port: 1200 (must match master)
Master IP: 127.0.0.1 (localhost - same VPS)

====================
SCALPERIUM C# AGENT
====================
WebSocket Port: 8080 (different from copier)
Connects to all 10 terminals independently
```

---

## Cost Breakdown Summary

| Item | Cost | Type |
|------|------|------|
| **MQL5 Trade Copier** | $50 USD | ONE-TIME ✅ PURCHASED |
| **Galaxy Gold Scalper** | ??? | ONE-TIME (already owned?) |
| **Prime VPS (12GB)** | R1240/mo | Monthly (temporary testing) |
| **Dedicated Server** | R1240 base | Monthly |
| + RAM Upgrade (128GB) | +R1640/mo | Monthly |
| + CPU Upgrade (E-2388G) | +R1640/mo | Monthly |
| **Total Monthly** | **R4520/mo** | **When dedicated ready** |

**Cost per terminal:** R452/mo (R4520 ÷ 10 terminals)

---

## Next Steps

1. ✅ **Connect to Prime VPS via Remote Desktop**
2. ✅ **Install MQL5 Trade Copier from Market (Steps 1-2)**
3. ✅ **Configure Master terminal (Steps 3-4)**
4. ✅ **Configure 2 slave terminals first (Step 5)** - Test with small subset
5. ✅ **Run test trades (Step 6)**
6. ✅ **Scale to all 9 slaves once confirmed working**
7. ✅ **Deploy on dedicated server when ready (6-8 days)**

---

## Support Resources

- **MQL5 Trade Copier Support:** https://www.mql5.com/en/users/traderforum/seller
- **Product Manual:** Available in MQL5 Market product page
- **MT5 Documentation:** https://www.metatrader5.com/en/terminal/help
- **Scalperium C# Agent:** Your custom integration (separate guide)

Good luck with your deployment! 🚀
