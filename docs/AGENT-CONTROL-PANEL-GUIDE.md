# 🤖 MT5 AGENT CONTROL PANEL - COMPLETE GUIDE

## Access the Control Panel

**URL:** `http://localhost:5173/agents` (or your domain + `/agents`)

**Navigation:** Admin Panel → 🤖 Agent Control (in sidebar)

---

## What You Can Monitor

### 1. **Agent Status Dashboard**
- Real-time online/offline status
- Total agents, online agents, master accounts
- Trade copier activity overview
- Auto-refresh every 10 seconds

### 2. **Each Agent Shows:**

#### **Basic Info:**
- ✅ Status indicator (green = online, gray = offline)
- 👤 User name linked to agent
- 📧 User email
- 🏦 MT5 account number
- 🏢 Broker name

#### **EA Status:**
- ✓ EA loaded/not loaded
- 🟢 Running or ⏸️ Stopped
- EA name (e.g., "Gold Scalper Pro")
- Chart symbol (XAUUSD)
- Timeframe (M5, M15, etc.)

#### **Trade Copier Info:**
- 👑 Master account badge
- 📋 Slave account indicator
- Number of slaves copying from master
- Master account ID for slaves

#### **Performance Metrics:**
- 💰 Total profit/loss
- 📊 Win rate percentage
- Total trades executed
- Profitable vs losing trades

#### **Indicator Settings (if EA loaded):**
- ATR Period
- ATR Multiplier
- 🟢 Green Threshold
- 🟠 Orange Threshold
- 🔴 Red Threshold

---

## Filter & Search

### **Search Bar:**
Type user name or MT5 account number to find specific agent

### **Status Filter:**
- All Status
- Online only
- Offline only

### **Type Filter:**
- All Types
- Master Accounts (have EAs, others copy from them)
- Slave Accounts (copy trades from master)

---

## Agent Controls (Quick Actions)

When agent is **ONLINE**, you can:

### 1. **📊 Details**
Opens detailed modal showing:
- Full account information
- EA configuration
- Complete indicator settings
- Performance statistics
- **Trade history table** with:
  - Ticket number
  - Symbol
  - Buy/Sell type
  - 🟢🟠🔴 Signal at entry
  - Volume
  - Entry/Exit prices
  - Profit/Loss
  - Timestamp

### 2. **🔍 Status**
Requests real-time status update from agent:
- MT5 connection status
- Account details
- Current charts
- EA state

### 3. **▶️ Start EA / ⏸️ Stop EA**
- Starts or stops the Expert Advisor
- Only shown if EA is loaded
- Changes AutoTrading state in MT5

### 4. **📸 Screenshot**
- Captures current MT5 terminal screen
- Saves to database
- Shows visual confirmation of setup

### 5. **🤖 AI Optimize** (only if 50+ trades executed)
- Analyzes trade history
- Identifies profitable patterns
- Optimizes indicator thresholds
- See detailed explanation below

---

## 🤖 AI OPTIMIZATION SYSTEM

### **What It Does:**

The AI analyzes **all historical trades** from the agent and finds patterns:

1. **Profitable Trade Analysis:**
   - What ATR values were present during winning trades?
   - What indicator signal (🟢🟠🔴) was active?
   - What market conditions led to best profits?

2. **Losing Trade Analysis:**
   - What caused losses?
   - Were RED/ORANGE signals ignored?
   - Was ATR too high (high volatility)?

3. **Pattern Recognition:**
   - GREEN signals with ATR < 10.5 had 88% win rate
   - Trades during high volatility (ATR > 15) had 40% win rate
   - Best entries occurred when threshold was 0.85 vs 0.80

### **How to Use AI Optimization:**

1. Click **🤖 AI Optimize** button on agent with 50+ trades
2. Wait 2-3 seconds for analysis
3. Review comparison:
   - **Current Settings** (left) - what's running now
   - **Optimized Settings** (right) - AI recommendation
4. See **expected improvement** in win rate
5. Read **AI Insights** explaining why changes help
6. Click **✅ Apply Optimized Settings** to update EA

### **What Happens When Applied:**

1. Agent **stops** the EA
2. Agent **modifies EA inputs** with new values:
   - ATR_Period
   - ATR_Multiplier
   - Green_Threshold
   - Orange_Threshold
   - Red_Threshold
3. Agent **restarts** the EA
4. New settings are **saved to database**
5. Future trades use optimized thresholds

### **Example AI Insights:**

```
• GREEN signals with ATR < 10.5 had 88% win rate vs 72% with higher ATR
• Increasing ATR period to 18 filters out false GREEN signals during high volatility
• Tightening GREEN threshold to 0.85 improves trade quality by 5.7%
• Most profitable trades occurred when ATR multiplier was between 1.6-2.0
• RED threshold at 0.25 better identifies unfavorable market conditions
```

---

## Trade History Details

Click **📊 Details** to see complete trade log:

### **Trade Table Columns:**

| Column | Description |
|--------|-------------|
| **Ticket** | MT5 ticket number |
| **Symbol** | Trading pair (XAUUSD) |
| **Type** | BUY (green) or SELL (red) |
| **Signal** | 🟢 GREEN, 🟠 ORANGE, or 🔴 RED at entry |
| **Volume** | Lot size (0.1, 0.5, etc.) |
| **Entry** | Open price |
| **Exit** | Close price |
| **Profit** | P&L in USD (green = profit, red = loss) |
| **Time** | When trade closed |

### **Why Signal Column Matters:**

- **🟢 GREEN trades** should be most profitable
- **🟠 ORANGE trades** should be moderate
- **🔴 RED trades** should be rare and usually losing

If you see **🔴 RED trades with profit**, indicator needs tightening!
If you see **🟢 GREEN trades with losses**, indicator is too loose!

**This is what AI optimization fixes automatically.**

---

## Master Account vs Slave Account

### **Master Account (👑):**
- Has EA loaded and running
- Makes trading decisions
- Executes trades based on 🟢🟠🔴 signals
- Can be optimized with AI
- Shows "X slaves" count

### **Slave Account (📋):**
- Copies trades from master
- No EA needed
- Same entry/exit as master
- Cannot be individually optimized
- Shows "Copying from master"

### **Setup Trade Copier:**

1. On master account, load EA
2. On slave accounts, enable trade copier via API
3. Slaves automatically mirror all master trades
4. All accounts show same performance (scaled by lot size)

---

## Real-Time Sync with Web App Users

### **How Agent Links to User:**

When agent first connects:
1. Sends `machineId` (computer identifier)
2. Sends MT5 account number
3. Backend matches MT5 account to web app user
4. Agent shows user's name/email
5. User can see their agent in dashboard

### **If "Unlinked Agent" Shows:**

This means:
- Agent is running
- But MT5 account not registered in web app
- User needs to register on website first
- Then refresh agent panel

---

## Troubleshooting

### **Agent shows OFFLINE:**
- Check if MT5 is running on that computer
- Check if C# agent process is running
- Check WebSocket connection (port 5173)
- Verify API key in environment variables

### **EA not loading:**
- Verify EA file exists in MT5/Experts folder
- Check EA name matches exactly
- Ensure MT5 allows automated trading
- Look for errors in agent console logs

### **AI Optimize button not showing:**
- Agent needs 50+ completed trades minimum
- Need enough data for statistical analysis
- If just started, wait for more trade history

### **Settings not applying:**
- Agent must be online
- EA must be loaded
- Check agent logs for errors
- Verify EA accepts external parameter changes

---

## API Endpoints (For Developers)

### **Get all agents:**
```
GET /api/agents
```

### **Get agent trade history:**
```
GET /api/agents/{agentId}/trades
```

### **Send command to agent:**
```
POST /api/agents/{agentId}/command
Body: { "command": "START_EA", "params": {} }
```

### **Run AI optimization:**
```
POST /api/agents/{agentId}/optimize
```

### **Apply optimized settings:**
```
POST /api/agents/{agentId}/apply-settings
Body: { "settings": { "atrPeriod": 18, ... } }
```

---

## Next Steps

1. **Connect your first agent** (see C# Agent Setup Guide)
2. **Link MT5 account** to web app user
3. **Load EA** on chart
4. **Start trading** and monitor performance
5. **After 50+ trades**, run AI optimization
6. **Apply optimized settings** for better results
7. **Monitor leaderboard** to compare with other traders

---

## Security Notes

- Only authenticated admins can access `/agents`
- Commands require valid session cookie
- WebSocket uses API key authentication
- All actions are logged to database
- Screenshots stored securely

---

**Questions? Check the full documentation or contact support.**
