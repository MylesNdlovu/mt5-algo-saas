# MT5 SYNC ARCHITECTURE & DATA FLOW

## Overview
This document outlines the complete data flow between MT5 (MetaTrader 5), C# FlaUI Agent, Web Backend, and PostgreSQL Database.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    USER (Web Browser)                        │
│              http://localhost:5173/dashboard                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│               SVELTEKIT WEB APP (Node.js)                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Routes: /dashboard, /agents, /admin, /leaderboard     │ │
│  │  API: /api/agents/*, /api/user/*, /api/admin/*        │ │
│  │  Auth: JWT + Cookies, Role-Based Access Control        │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Prisma ORM → PostgreSQL                               │ │
│  │  Models: User, MT5Account, Trade, Agent, IBPartner     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   POSTGRESQL DATABASE                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Tables: users, mt5_accounts, trades, agents,          │ │
│  │          ib_partners, leaderboard_entries, prizes       │ │
│  │  Indexes: Optimized for queries by userId, ibId, role  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                      ▲
                      │
                      │ WebSocket / REST API
                      │
┌─────────────────────┴───────────────────────────────────────┐
│             C# MT5 AUTOMATION AGENT (Windows)                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Program.cs: Main entry, WebSocket client              │ │
│  │  - Agent authentication via API key                     │ │
│  │  - Heartbeat every 5 seconds                            │ │
│  │  - Command listener (start EA, stop EA, sync trades)    │ │
│  │  └─────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  MT5Automation.cs: FlaUI automation                     │ │
│  │  - Detect MT5 window                                    │ │
│  │  - Read account info (balance, equity, margin)          │ │
│  │  - Read open/closed trades from MT5 UI                  │ │
│  │  - Control EA (attach, start, stop, modify settings)    │ │
│  │  - Trade copier (master/slave sync)                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 METATRADER 5 (Windows App)                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  - Trading account (Exness/PrimeXBT)                    │ │
│  │  - Expert Advisors (EAs) running                        │ │
│  │  - Chart data, indicators, market feed                  │ │
│  │  - Terminal UI (FlaUI automation target)                │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Sequences

### 1. AGENT REGISTRATION & AUTHENTICATION

```
User → Web App → Database
  1. User logs in to web app
  2. User navigates to /agents
  3. User generates API key: POST /api/agents/api-key
  4. Database creates Agent record with userId, apiKey

C# Agent → Web App → Database
  5. Agent starts on Windows machine
  6. Agent reads API key from environment variable
  7. Agent connects via WebSocket: ws://server/agent-ws
  8. Agent sends: { type: "agent_auth", apiKey: "sk_..." }
  9. Server validates apiKey → finds Agent record
 10. Server updates Agent: { status: "online", lastHeartbeat: now() }
 11. Server sends: { type: "auth_success", agentId: "..." }
```

### 2. MT5 ACCOUNT SYNC (Every 30 seconds)

```
C# Agent → MT5 → Web App → Database
  1. Timer triggers MT5Automation.SyncAccountData()
  2. FlaUI detects MT5 window by title/class
  3. Read account info from MT5 UI:
     - Account number (from terminal info)
     - Broker name
     - Balance (from balance display)
     - Equity (from equity display)
     - Margin level (from margin display)
  4. Agent sends to server via WebSocket:
     {
       type: "account_update",
       accountNumber: "12345678",
       broker: "Exness",
       balance: 1000.00,
       equity: 1050.25,
       margin: 100.00,
       freeMargin: 950.25,
       marginLevel: 1050.25
     }
  5. Server receives → Prisma query:
     - Find MT5Account by accountNumber
     - If exists: UPDATE
     - If not exists: CREATE with userId from Agent
  6. Database updated with latest account data
  7. User sees real-time balance on /dashboard
```

### 3. TRADE SYNC (Every 15 seconds)

```
C# Agent → MT5 → Web App → Database
  1. Timer triggers MT5Automation.SyncTrades()
  2. FlaUI switches to "Terminal" → "Trade" tab in MT5
  3. Read open positions table:
     For each row:
       - Ticket number
       - Symbol (XAUUSD, EURUSD, etc.)
       - Type (BUY/SELL)
       - Volume (lots)
       - Open price
       - Current price
       - Profit/Loss
       - Open time
  4. Read closed trades (Account History tab):
     For each row:
       - Same fields + close price, close time
  5. Agent sends to server:
     {
       type: "trades_update",
       openTrades: [...],
       closedTrades: [...]
     }
  6. Server processes each trade:
     - Find Trade by ticket number
     - If exists AND not closed: UPDATE profit, closePrice
     - If exists AND closed: UPDATE isClosed=true, closeTime
     - If not exists: CREATE new Trade record
  7. Calculate user stats:
     totalTrades = count(*)
     winningTrades = count WHERE profit > 0
     losingTrades = count WHERE profit < 0
     totalProfit = SUM(profit)
  8. Update User model with aggregated stats
  9. Update LeaderboardEntry for current period
```

### 4. EA CONTROL (Start/Stop/Modify)

```
User → Web App → C# Agent → MT5
  1. User clicks "Start EA" on /dashboard
  2. POST /api/ea/start { accountId: "...", eaName: "ScalperBot" }
  3. Server validates: user owns this MT5 account
  4. Server sends WebSocket command to Agent:
     {
       type: "command",
       command: "start_ea",
       eaName: "ScalperBot",
       symbol: "XAUUSD",
       timeframe: "M5"
     }
  5. Agent receives → MT5Automation.StartEA()
  6. FlaUI:
     - Navigate to MT5 Navigator panel
     - Find EA file in Expert Advisors list
     - Drag EA to chart window
     - Wait for EA parameters dialog
     - Click "OK" to attach
     - EA starts running
  7. Agent verifies EA is running (check chart for EA name)
  8. Agent sends result:
     {
       type: "action_result",
       success: true,
       message: "EA started on XAUUSD M5"
     }
  9. Server updates EA model: { status: "RUNNING" }
 10. User sees "Running" status on dashboard
```

### 5. TRADE COPIER (Master → Slave Accounts)

```
Master Agent → Web App → Slave Agents → MT5
  1. Admin configures Agent1 as Master (isMasterAccount=true)
  2. Admin sets Agent2 as Slave (masterAgentId = Agent1.id)
  3. Master Agent detects new trade on MT5
  4. Master sends trade signal:
     {
       type: "trade_opened",
       symbol: "XAUUSD",
       type: "BUY",
       volume: 0.01,
       price: 2050.25,
       sl: 2045.00,
       tp: 2060.00
     }
  5. Server receives → finds all Slave Agents WHERE masterAgentId = Master.id
  6. Server broadcasts to each Slave:
     {
       type: "command",
       command: "copy_trade",
       symbol: "XAUUSD",
       type: "BUY",
       volume: 0.01,  // Auto-adjusted based on account equity
       sl: 2045.00,
       tp: 2060.00
     }
  7. Each Slave Agent executes:
     - MT5Automation.PlaceTrade()
     - FlaUI: Click "New Order" button
     - Fill in symbol, volume, SL, TP
     - Click "Buy"
     - Confirm trade executed
  8. Slave sends confirmation → Server → Database
  9. All accounts now have synchronized positions
```

### 6. AI OPTIMIZATION (Indicator Tuning)

```
Web App → Database → C# Agent → MT5
  1. Admin clicks "Optimize AI" on /agents page
  2. POST /api/agents/optimize { agentId: "..." }
  3. Server queries trade history for this agent:
     - Last 100 closed trades
     - Win rate calculation
     - ATR values at trade open times
  4. AI algorithm analyzes:
     - Winning trades avg ATR threshold
     - Losing trades avg ATR threshold
     - Calculate optimal: greenThreshold, orangeThreshold, redThreshold
     Example:
       Current: green < 0.5, orange 0.5-1.0, red > 1.0
       After AI: green < 0.35, orange 0.35-0.8, red > 0.8
       (More conservative = higher win rate)
  5. Server saves to Agent.indicatorSettings JSON
  6. Server sends command to Agent:
     {
       type: "command",
       command: "update_indicator",
       settings: {
         atrPeriod: 14,
         atrMultiplier: 2.0,
         greenThreshold: 0.35,
         orangeThreshold: 0.8,
         redThreshold: 1.5
       }
     }
  7. Agent → MT5Automation.UpdateIndicator()
  8. FlaUI:
     - Right-click indicator on chart
     - Select "Properties"
     - Modify input values
     - Click "OK"
  9. Indicator now uses AI-optimized thresholds
 10. Expected result: +8-12% win rate improvement
```

## ROLE-BASED DATA ACCESS

### SUPER_ADMIN Query Flow
```sql
-- Can see ALL users, ALL agents, ALL trades
SELECT * FROM users;
SELECT * FROM agents;
SELECT * FROM trades;
SELECT * FROM ib_partners;  -- Full IB management
```

### ADMIN Query Flow
```sql
-- Can see ALL users and trades, but limited IB access
SELECT * FROM users;
SELECT * FROM agents;
SELECT * FROM trades;
-- Cannot manage IB partners (SUPER_ADMIN only)
```

### IB PARTNER Query Flow
```sql
-- Can ONLY see their own users
SELECT * FROM users WHERE ibPartnerId = 'ib_123';

-- Can ONLY see agents of their users
SELECT a.* FROM agents a
JOIN users u ON a.userId = u.id
WHERE u.ibPartnerId = 'ib_123';

-- Can ONLY see trades of their users
SELECT t.* FROM trades t
JOIN users u ON t.userId = u.id
WHERE u.ibPartnerId = 'ib_123';

-- Can see their own revenue stats
SELECT 
  COUNT(*) as totalTraders,
  SUM(monthlyFee) as monthlyRevenue
FROM users
WHERE ibPartnerId = 'ib_123' AND subscriptionTier != 'FREE';
```

### USER Query Flow
```sql
-- Can ONLY see their own data
SELECT * FROM users WHERE id = 'user_456';
SELECT * FROM agents WHERE userId = 'user_456';
SELECT * FROM trades WHERE userId = 'user_456';
SELECT * FROM mt5_accounts WHERE userId = 'user_456';
```

## DATABASE SCHEMA RELATIONSHIPS

```
User (id, role, ibPartnerId)
  ↓ (one-to-many)
MT5Account (userId, accountNumber, balance, equity)
  ↓ (one-to-many)
Trade (mt5AccountId, userId, ticket, profit, isClosed)

User (id)
  ↓ (one-to-many)
Agent (userId, machineId, status, mt5AccountNumber)
  ↓ (self-referential for Trade Copier)
Agent (masterAgentId → Agent.id)

IBPartner (id, ibCode, isApproved, pricingTier)
  ↓ (one-to-many)
User (ibPartnerId, ibCode)

User (id, totalProfit, winningTrades)
  ↓ (one-to-many)
LeaderboardEntry (userId, period, profit, rank)

Admin configures →
Prize (period, rank, amount)
```

## CRITICAL SYNC POINTS

1. **Agent Heartbeat**: Every 5 seconds
   - Agent sends: `{ type: "heartbeat" }`
   - Server updates: `Agent.lastHeartbeat = now()`
   - If no heartbeat for 30 seconds → `Agent.status = "offline"`

2. **Account Sync**: Every 30 seconds
   - Ensures balance/equity always up-to-date
   - Critical for margin calculations

3. **Trade Sync**: Every 15 seconds
   - Fast enough for real-time P/L display
   - Slower than account sync to reduce load

4. **Leaderboard Rebuild**: Every 5 minutes (cron job)
   - Aggregate all trades for current period
   - Calculate rankings
   - Update LeaderboardEntry table

5. **IB Revenue Calculation**: Daily at midnight (cron job)
   - Count active traders per IB
   - Calculate spread revenue share
   - Update IBPartner.monthlyRevenue

## ERROR HANDLING & RESILIENCE

1. **Agent Disconnect**:
   - Server detects: no heartbeat for 30s
   - Server sets: `Agent.status = "offline"`
   - EA continues running on MT5 (independent)
   - User sees "Offline" on /agents page
   - Agent reconnects → resumes sync

2. **MT5 Window Not Found**:
   - FlaUI fails to detect MT5
   - Agent logs: "MT5 window not detected"
   - Agent sends: `{ type: "log", level: "ERROR", message: "..." }`
   - Server stores in SystemLog table
   - Admin sees in logs

3. **Database Connection Lost**:
   - Prisma auto-retry (3 attempts)
   - If fails → return 500 error to frontend
   - Frontend shows: "Connection error, retrying..."

4. **Invalid Trade Data**:
   - Agent sends malformed trade
   - Server validates: ticket, symbol, volume, profit
   - If invalid → reject with error
   - Log to SystemLog for debugging

## PERFORMANCE OPTIMIZATIONS

1. **Database Indexes**:
   - `users(ibPartnerId)` → Fast IB user lookup
   - `agents(userId, status)` → Fast agent filtering
   - `trades(userId, isClosed, openTime)` → Fast trade queries
   - `leaderboard_entries(period, periodDate, rank)` → Fast rankings

2. **Query Batching**:
   - Agent sends all trades in single WebSocket message
   - Server uses Prisma `createMany()` instead of individual inserts

3. **Caching** (Future):
   - Redis cache for leaderboard (avoid DB query every request)
   - Cache TTL: 60 seconds

4. **Pagination**:
   - Trades list: 50 per page (with skip/take)
   - Leaderboard: Top 100 only

## SECURITY MEASURES

1. **API Key Authentication**:
   - Agent API key: `sk_[base64_encoded_hash]`
   - Stored hashed in database
   - Validated on every WebSocket connection

2. **Role-Based Middleware**:
   - Every API route checks: `locals.user.role`
   - Uses `permissions.ts` to validate access
   - Returns 403 if unauthorized

3. **Data Isolation**:
   - IB can NEVER see other IB's data
   - User can NEVER see other user's data
   - Enforced at database query level (WHERE clause)

4. **MT5 Credentials**:
   - Passwords encrypted before storage
   - Never sent to frontend
   - Only C# agent has access (read from DB, decrypt)

## SUMMARY

This architecture ensures:
✅ **Robust sync** between MT5 and web backend
✅ **Clear separation** of User, IB, Admin permissions
✅ **Real-time updates** via WebSocket
✅ **Fault tolerance** with reconnection logic
✅ **Scalable** database schema with proper indexes
✅ **Secure** API key authentication and role-based access
