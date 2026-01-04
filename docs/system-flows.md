# System Flow Diagrams

## 1. User Registration & Onboarding Flow

```
┌──────────────┐
│   Browser    │
└──────┬───────┘
       │
       │ 1. Register (email, password, name, userType)
       ▼
┌──────────────────────────────────┐
│  SvelteKit Web App               │
│  POST /api/auth/register         │
└──────┬───────────────────────────┘
       │
       │ 2. Hash password, save to DB
       ▼
┌──────────────────────────────────┐
│  PostgreSQL Database             │
│  INSERT INTO User                │
└──────┬───────────────────────────┘
       │
       │ 3. Return JWT token
       ▼
┌──────────────┐
│   Browser    │
│  (Dashboard) │
└──────────────┘
```

## 2. EA Start Flow (Core Feature)

```
┌──────────────┐
│   User       │
│  Dashboard   │
└──────┬───────┘
       │
       │ 1. Click "Start EA"
       ▼
┌─────────────────────────────────────┐
│  Frontend (EAControl Component)     │
│  Check safety indicator             │
└──────┬──────────────────────────────┘
       │
       │ 2. POST /api/ea/control { action: "start" }
       ▼
┌─────────────────────────────────────┐
│  SvelteKit API Route                │
│  Verify user auth                   │
│  Check account ownership            │
└──────┬──────────────────────────────┘
       │
       │ 3. Forward to C# Agent
       ▼
┌─────────────────────────────────────┐
│  C# Agent API                       │
│  POST /api/ea/control               │
└──────┬──────────────────────────────┘
       │
       ├─────► 4a. Check Market Safety
       │       ┌──────────────────────────┐
       │       │ MarketAnalysisService    │
       │       │ - Calculate volatility   │
       │       │ - Check spread           │
       │       │ - Detect news            │
       │       │ - Return RED/ORANGE/GREEN│
       │       └──────────────────────────┘
       │
       ├─────► 4b. If GREEN/ORANGE: Enable EA
       │       ┌──────────────────────────┐
       │       │ EAControlService         │
       │       │ - Connect to VPS         │
       │       │ - Enable MT5 auto-trade  │
       │       │ - Start Gold Scalper EA  │
       │       └──────────────────────────┘
       │
       └─────► 4c. Enable LTC Copier
               ┌──────────────────────────┐
               │ LTCCopierService         │
               │ - Enable slave copier    │
               │ - Connect to master      │
               │ - Start copying trades   │
               └──────────────────────────┘
       │
       │ 5. Update database
       ▼
┌─────────────────────────────────────┐
│  PostgreSQL                         │
│  UPDATE MT5Account                  │
│  SET eaStatus = 'RUNNING'           │
└──────┬──────────────────────────────┘
       │
       │ 6. Return success
       ▼
┌──────────────┐
│  Dashboard   │
│  Shows "EA   │
│   Running"   │
└──────────────┘
```

## 3. Trade Copying Flow

```
┌──────────────────────────────────┐
│  Master MT5 Server               │
│  (Gold Scalper EA Trading)       │
│  Symbol: XAUUSD                  │
│  Open: BUY 0.01 @ 2050.50        │
└──────┬───────────────────────────┘
       │
       │ LTC Master detects new trade
       ▼
┌──────────────────────────────────┐
│  LTC Master Copier               │
│  Broadcasts trade signal         │
└──────┬───────────────────────────┘
       │
       │ Signal: BUY XAUUSD 0.01 @ 2050.50
       │
       ├────────────┬────────────┬────────────┐
       │            │            │            │
       ▼            ▼            ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ User VPS │ │ User VPS │ │ User VPS │ │ User VPS │
│   #1     │ │   #2     │ │   #3     │ │   #4     │
└────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │            │            │
     ▼            ▼            ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│LTC Slave │ │LTC Slave │ │LTC Slave │ │LTC Slave │
│ Copier   │ │ Copier   │ │ Copier   │ │ Copier   │
└────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │            │            │
     ▼            ▼            ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│   MT5    │ │   MT5    │ │   MT5    │ │   MT5    │
│ Execute  │ │ Execute  │ │ Execute  │ │ Execute  │
│  Trade   │ │  Trade   │ │  Trade   │ │  Trade   │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

## 4. Safety Indicator Update Flow

```
┌─────────────────────────────────┐
│  C# Agent                       │
│  Timer (every 30 seconds)       │
└──────┬──────────────────────────┘
       │
       │ 1. Analyze market
       ▼
┌─────────────────────────────────┐
│  MarketAnalysisService          │
├─────────────────────────────────┤
│  Calculate:                     │
│  • Volatility (ATR)             │
│  • Spread (bid-ask)             │
│  • Trend (MA)                   │
│  • News events                  │
└──────┬──────────────────────────┘
       │
       │ 2. Determine indicator
       ▼
┌─────────────────────────────────┐
│  Safety Logic                   │
├─────────────────────────────────┤
│  IF volatility > 7              │
│     OR spread > 3               │
│     OR high-impact news         │
│  THEN RED                       │
│                                 │
│  ELSE IF volatility > 4         │
│          OR spread > 1.5        │
│  THEN ORANGE                    │
│                                 │
│  ELSE GREEN                     │
└──────┬──────────────────────────┘
       │
       │ 3. Update database
       ▼
┌─────────────────────────────────┐
│  PostgreSQL                     │
│  INSERT INTO MarketCondition    │
└──────┬──────────────────────────┘
       │
       │ 4. If RED: Auto-stop all EAs
       ▼
┌─────────────────────────────────┐
│  Auto-stop running EAs          │
│  (Safety protection)            │
└──────┬──────────────────────────┘
       │
       │ 5. Notify web app
       ▼
┌─────────────────────────────────┐
│  Dashboard shows updated        │
│  indicator color                │
└─────────────────────────────────┘
```

## 5. Admin User Management Flow

```
┌──────────────┐
│   Admin      │
│  Dashboard   │
└──────┬───────┘
       │
       │ 1. View users list
       ▼
┌─────────────────────────────────┐
│  GET /api/admin/users           │
│  (Admin auth required)          │
└──────┬──────────────────────────┘
       │
       │ 2. Fetch all users
       ▼
┌─────────────────────────────────┐
│  PostgreSQL                     │
│  SELECT * FROM User             │
└──────┬──────────────────────────┘
       │
       │ 3. Display table
       ▼
┌─────────────────────────────────┐
│  Admin Panel Table              │
│  Email | Name | Type | Status   │
│  user@x.com | John | DIRECT | ✓ │
│  test@y.com | Jane | IB | ✓    │
└──────┬──────────────────────────┘
       │
       │ 4. Click "Deactivate" on user
       ▼
┌─────────────────────────────────┐
│  POST /api/admin/users/{id}/    │
│  toggle { isActive: false }     │
└──────┬──────────────────────────┘
       │
       │ 5. Update user status
       ▼
┌─────────────────────────────────┐
│  PostgreSQL                     │
│  UPDATE User                    │
│  SET isActive = false           │
└──────┬──────────────────────────┘
       │
       │ 6. User can't login anymore
       ▼
┌─────────────────────────────────┐
│  Login blocked for user         │
└─────────────────────────────────┘
```

## 6. Account Setup & VPS Provisioning

```
┌──────────────┐
│   User       │
│  Dashboard   │
└──────┬───────┘
       │
       │ 1. Click "Setup Account"
       │    Enter MT5 credentials
       ▼
┌─────────────────────────────────┐
│  POST /api/account/setup        │
│  {                              │
│    accountNumber: "12345678",   │
│    broker: "Exness",            │
│    login: "12345678",           │
│    password: "***"              │
│  }                              │
└──────┬──────────────────────────┘
       │
       │ 2. Forward to C# Agent
       ▼
┌─────────────────────────────────┐
│  C# Agent                       │
│  POST /api/account/setup        │
└──────┬──────────────────────────┘
       │
       ├─────► Step 1: Provision VPS
       │       ┌──────────────────────────┐
       │       │ VPSManagementService     │
       │       │ - Call cloud provider    │
       │       │ - Create Windows Server  │
       │       │ - Configure firewall     │
       │       │ Return: IP, credentials  │
       │       └──────────────────────────┘
       │
       ├─────► Step 2: Install MT5
       │       ┌──────────────────────────┐
       │       │ VPSManagementService     │
       │       │ - Connect to VPS         │
       │       │ - Download MT5 installer │
       │       │ - Silent install         │
       │       │ - Configure terminal     │
       │       └──────────────────────────┘
       │
       ├─────► Step 3: Deploy EA
       │       ┌──────────────────────────┐
       │       │ MT5ConnectionService     │
       │       │ - Copy Gold Scalper EA   │
       │       │ - Configure parameters   │
       │       │ - Load on XAUUSD chart   │
       │       └──────────────────────────┘
       │
       └─────► Step 4: Setup LTC Copier
               ┌──────────────────────────┐
               │ LTCCopierService         │
               │ - Install slave copier   │
               │ - Configure master conn  │
               │ - Test connectivity      │
               └──────────────────────────┘
       │
       │ 3. Save to database
       ▼
┌─────────────────────────────────┐
│  PostgreSQL                     │
│  INSERT INTO MT5Account         │
│  (vpsIp, eaStatus, etc.)        │
└──────┬──────────────────────────┘
       │
       │ 4. Return success
       ▼
┌──────────────┐
│  Dashboard   │
│  "Account    │
│   Ready!"    │
└──────────────┘
```

## 7. Real-Time P&L Update

```
┌──────────────────────────────────┐
│  User Dashboard                  │
│  (Polling every 10 seconds)      │
└──────┬───────────────────────────┘
       │
       │ 1. GET /api/account/{id}
       ▼
┌─────────────────────────────────┐
│  SvelteKit API                  │
└──────┬──────────────────────────┘
       │
       │ 2. Fetch account & trades
       ▼
┌─────────────────────────────────┐
│  PostgreSQL                     │
│  SELECT * FROM MT5Account       │
│  SELECT * FROM Trade            │
│  WHERE mt5AccountId = ?         │
└──────┬──────────────────────────┘
       │
       │ 3. Calculate P&L
       ▼
┌─────────────────────────────────┐
│  P&L Calculation                │
│  totalProfit = Σ trade.profit   │
│  totalCommission = Σ commission │
│  totalSwap = Σ swap             │
│  netPL = total + comm + swap    │
└──────┬──────────────────────────┘
       │
       │ 4. Return to frontend
       ▼
┌─────────────────────────────────┐
│  Dashboard Updates:             │
│  • Balance: $1,000.00           │
│  • Equity: $1,050.00            │
│  • Total P&L: +$50.00 (green)   │
│  • Open Trades: 2               │
│  • Closed Trades: 15            │
└─────────────────────────────────┘
```

## 8. Authentication Flow

```
┌──────────────┐
│  Login Page  │
└──────┬───────┘
       │
       │ 1. POST /api/auth/login
       │    { email, password }
       ▼
┌─────────────────────────────────┐
│  SvelteKit API                  │
│  Auth Route                     │
└──────┬──────────────────────────┘
       │
       │ 2. Find user in DB
       ▼
┌─────────────────────────────────┐
│  PostgreSQL                     │
│  SELECT * FROM User             │
│  WHERE email = ?                │
└──────┬──────────────────────────┘
       │
       │ 3. Verify password
       ▼
┌─────────────────────────────────┐
│  bcrypt.compare()               │
│  hash vs stored hash            │
└──────┬──────────────────────────┘
       │
       │ 4. Generate JWT
       ▼
┌─────────────────────────────────┐
│  jwt.sign()                     │
│  Payload: { userId, role }      │
│  Secret: JWT_SECRET             │
│  Expires: 7 days                │
└──────┬──────────────────────────┘
       │
       │ 5. Set HTTP-only cookie
       ▼
┌─────────────────────────────────┐
│  Set-Cookie: auth_token=...     │
│  HttpOnly, Secure, SameSite     │
└──────┬──────────────────────────┘
       │
       │ 6. Redirect to dashboard
       ▼
┌──────────────┐
│  Dashboard   │
│  (User        │
│   logged in) │
└──────────────┘
```

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                         Complete System                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Browser ←→ SvelteKit ←→ PostgreSQL                             │
│                ↓                                                 │
│                ↓ REST API                                        │
│                ↓                                                 │
│          C# Agent ←→ Master MT5 ←→ Slave MT5s                   │
│                ↑                         ↑                       │
│                └──────── LTC Copy ───────┘                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

**Note:** These are logical flow diagrams. Actual implementation includes error handling, validation, logging, and additional security measures not shown here for clarity.
