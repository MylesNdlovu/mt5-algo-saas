# Multi-Account Trading Architecture

## Overview

This document describes the multi-account trading system that allows users to select up to 5 MT5 accounts and execute trading algorithms across all selected accounts simultaneously.

## Architecture Layers

### 1. Database Layer (Prisma/PostgreSQL)

#### MT5Account Model Enhancement
```prisma
model MT5Account {
  // ... existing fields ...

  // Multi-Account Trading Control
  isEnabledForTrading Boolean @default(false) // User selection flag
}
```

**Key Points:**
- Each user can have multiple MT5 accounts
- `isEnabledForTrading` flag indicates which accounts are selected for algo execution
- Maximum of 5 accounts can be enabled per user (enforced at API level)
- Only `ACTIVE` accounts can be used for trading

---

### 2. Frontend Layer (SvelteKit)

#### Dashboard UI Components

**Location:** `/src/routes/dashboard/+page.svelte`

**Features:**

1. **Multi-Account Selector** (Settings Modal)
   - Lists all user MT5 accounts
   - Toggle switches to enable/disable each account
   - Visual indicators for active accounts
   - Real-time account count (X / 5 enabled)
   - Warning when no accounts are selected

2. **EA Control Buttons** (Header)
   - Start Algo: `startAlgo()` - Starts trading on all enabled accounts
   - Pause Algo: `pauseAlgo()` - Pauses trading on all enabled accounts
   - Stop Algo: `stopAlgo()` - Stops trading on all enabled accounts

**User Flow:**
1. User opens Settings modal
2. User toggles MT5 accounts on/off (max 5)
3. User clicks "Start Algo"
4. System sends commands to all enabled accounts
5. User sees confirmation with successful/failed account counts

---

### 3. API Layer (SvelteKit Server Routes)

#### Account Management APIs

**GET /api/user/mt5-accounts**
- Fetches all MT5 accounts for current user
- Returns enabled status, balance, broker info
- Enforces 5-account limit in response

**PATCH /api/user/mt5-accounts/[accountId]/toggle**
- Toggles `isEnabledForTrading` for specific account
- Validates 5-account limit before enabling
- Returns updated account state

#### EA Command API

**POST /api/user/ea/command**

**Purpose:** Central endpoint for multi-account EA control

**Request Body:**
```json
{
  "command": "start_ea" | "stop_ea" | "pause_ea"
}
```

**Process Flow:**
1. Authenticate user session
2. Query all enabled MT5 accounts for user
3. For each account, find the managing agent:
   - **Option A:** Pool Agent Assignment (multi-instance architecture)
     - Query `MT5AccountAssignment` table
     - Find pool agent managing this account
   - **Option B:** Dedicated Agent (legacy single-instance)
     - Query `Agent` table by userId and mt5AccountNumber
4. Send command to each agent via WebSocket with account-specific params
5. Aggregate results (successful/failed)
6. Log to SystemLog
7. Return summary response

**Response:**
```json
{
  "success": true,
  "message": "start_ea executed successfully on all 3 accounts",
  "totalAccounts": 3,
  "successfulAccounts": 3,
  "failedAccounts": 0,
  "accounts": [
    {
      "accountNumber": "12345",
      "broker": "Exness",
      "status": "success"
    }
  ]
}
```

---

### 4. Agent Communication Layer

#### WebSocket Infrastructure

**File:** `/src/lib/server/websocket-server.ts`

**Function:** `sendAgentCommand(agentId, messageType, payload, timeout)`
- Sends commands to C# agents via WebSocket
- Waits for agent response (default 30s timeout)
- Handles errors and disconnections
- Returns command result

**Message Format:**
```typescript
{
  type: 'start_ea' | 'stop_ea' | 'pause_ea',
  payload: {
    mt5AccountNumber: '12345',
    broker: 'Exness',
    serverName: 'Exness-MT5-Real3',
    // Additional settings from user preferences
    maxLotSize: 0.03,
    maxLoss: 7,
    safetyMode: 'green'
  }
}
```

---

### 5. C# Agent Layer (Implementation Required)

#### Pool Agent Architecture

The system supports two agent architectures:

**A. Pool Agent (Recommended for Scale)**
- Single C# agent manages multiple MT5 terminal instances
- Uses FlaUI automation to control each MT5 window
- Tracks state for each MT5 account independently
- Located on VPS with sufficient resources

**B. Dedicated Agent (Legacy)**
- One C# agent per MT5 account
- Simpler but less scalable
- Higher resource overhead

#### C# Agent Command Handling

**Required Implementation:**

```csharp
// In MT5Instance.cs or MultiMT5Controller.cs

public async Task HandleCommand(string command, Dictionary<string, object> payload)
{
    string accountNumber = payload["mt5AccountNumber"].ToString();
    string broker = payload["broker"].ToString();
    string serverName = payload["serverName"].ToString();

    // Find the MT5 terminal instance for this account
    var mt5Instance = GetMT5Instance(accountNumber);

    if (mt5Instance == null)
    {
        throw new Exception($"MT5 instance not found for account {accountNumber}");
    }

    switch (command)
    {
        case "start_ea":
            await StartEA(mt5Instance, payload);
            break;

        case "stop_ea":
            await StopEA(mt5Instance);
            break;

        case "pause_ea":
            await PauseEA(mt5Instance);
            break;

        default:
            throw new Exception($"Unknown command: {command}");
    }
}

private async Task StartEA(MT5Instance instance, Dictionary<string, object> payload)
{
    // 1. Verify MT5 terminal is logged in
    if (!instance.IsLoggedIn)
    {
        throw new Exception("MT5 terminal not logged in");
    }

    // 2. Load EA if not already loaded
    if (!instance.EALoaded)
    {
        await LoadEA(instance);
    }

    // 3. Apply settings from payload
    if (payload.ContainsKey("maxLotSize"))
    {
        await SetEAParameter(instance, "MaxLotSize", payload["maxLotSize"]);
    }

    if (payload.ContainsKey("maxLoss"))
    {
        await SetEAParameter(instance, "MaxLoss", payload["maxLoss"]);
    }

    // 4. Enable AutoTrading on chart
    await instance.EnableAutoTrading();

    // 5. Update database status
    await UpdateAccountStatus(instance.AccountNumber, "running");

    // 6. Start monitoring trades
    instance.StartTradeMonitor();
}

private async Task StopEA(MT5Instance instance)
{
    // 1. Disable AutoTrading
    await instance.DisableAutoTrading();

    // 2. Close all open positions (if required by user settings)
    await instance.CloseAllPositions();

    // 3. Update database status
    await UpdateAccountStatus(instance.AccountNumber, "stopped");

    // 4. Stop trade monitoring
    instance.StopTradeMonitor();
}

private async Task PauseEA(MT5Instance instance)
{
    // 1. Disable AutoTrading (but don't close positions)
    await instance.DisableAutoTrading();

    // 2. Update database status
    await UpdateAccountStatus(instance.AccountNumber, "paused");
}
```

#### WebSocket Response

After executing command, C# agent should respond:

```csharp
var response = new
{
    success = true,
    message = "EA started successfully",
    accountNumber = instance.AccountNumber,
    eaStatus = "running",
    timestamp = DateTime.UtcNow
};

await SendWebSocketResponse(commandId, response);
```

---

## Best Practices & Meta-Level Design

### 1. Separation of Concerns
- **Frontend:** User interaction and state management
- **API Layer:** Business logic and validation
- **Agent Layer:** MT5 automation and execution

### 2. Fault Tolerance
- Each account operates independently
- Failure on one account doesn't affect others
- Graceful degradation (partial success is valid)

### 3. Scalability
- Pool agent architecture supports 50+ accounts per VPS
- Horizontal scaling: Add more pool agents as users grow
- Database indexes on critical queries (userId, isEnabledForTrading)

### 4. User Experience
- Clear feedback on success/failure per account
- Visual indicators for account status
- Warnings when no accounts are selected
- Real-time status updates via WebSocket

### 5. Security
- Session-based authentication
- Account ownership verification
- Command validation at every layer
- Audit logging in SystemLog table

### 6. Monitoring & Observability
- SystemLog entries for all EA commands
- Track success/failure rates per account
- Agent heartbeat monitoring
- MT5 connection status tracking

### 7. Database Optimization
- Composite indexes on frequently queried fields
- Eager loading of related data (reduce N+1 queries)
- Connection pooling with PrismaClient

---

## Testing Checklist

### Database
- [ ] Can enable up to 5 accounts per user
- [ ] Cannot enable more than 5 accounts
- [ ] isEnabledForTrading persists correctly

### Frontend
- [ ] Account list loads in settings modal
- [ ] Toggle switches work correctly
- [ ] Visual feedback for enabled/disabled accounts
- [ ] Start button checks for enabled accounts
- [ ] Success/failure messages display correctly

### API
- [ ] GET /api/user/mt5-accounts returns correct data
- [ ] PATCH toggle enforces 5-account limit
- [ ] POST /api/user/ea/command validates enabled accounts
- [ ] Multi-account commands execute in parallel
- [ ] Partial failures are handled gracefully

### C# Agent
- [ ] Receives commands via WebSocket
- [ ] Routes commands to correct MT5 instance
- [ ] Starts EA with user-defined parameters
- [ ] Stops/pauses EA correctly
- [ ] Sends response back to web app
- [ ] Updates database status

---

## Deployment Considerations

### VPS Setup (Pool Agent)
- Minimum: 8GB RAM, 4 CPU cores
- Windows Server with Remote Desktop
- Multiple MT5 terminals installed
- Each terminal logged into different account
- C# Pool Agent runs as Windows Service
- Auto-restart on failure

### Database Migration
```bash
npm run db:push  # Apply schema changes
npm run db:seed  # (Optional) Seed test accounts
```

### Environment Variables
```env
# WebSocket Configuration
WEBSOCKET_PORT=3001
WEBSOCKET_TIMEOUT=30000

# Database
DATABASE_URL=postgresql://...

# Redis (optional, for WebSocket scaling)
REDIS_URL=redis://...
```

---

## Troubleshooting

### "No enabled accounts found"
- User hasn't selected any accounts in Settings
- Solution: Guide user to Settings → Trading Accounts

### "No online agent found for account"
- C# agent is offline or disconnected
- Solution: Restart C# agent on VPS

### "Command timeout"
- C# agent took >30s to respond
- Solution: Check VPS resources, MT5 terminal health

### Partial Success (e.g., 2/3 accounts started)
- One account's agent is offline
- Solution: Check individual agent status, retry failed accounts

---

## Future Enhancements

1. **Real-Time Status Dashboard**
   - Live EA status per account
   - Trade count and P&L per account
   - Visual chart showing performance by account

2. **Account Grouping**
   - Create groups of accounts (e.g., "Conservative", "Aggressive")
   - Start/stop entire groups with one click

3. **Risk Management**
   - Set different risk parameters per account
   - Auto-disable accounts hitting loss limits
   - Portfolio-level stop loss

4. **Scheduled Trading**
   - Enable/disable accounts based on time of day
   - Weekend auto-stop
   - News event pause

---

## Contact & Support

For C# agent integration questions, refer to:
- `/docs/POOL-AGENT-ARCHITECTURE.md`
- `/docs/POOL-AGENT-DEPLOYMENT.md`
- C# agent code: `../csharp-agent/MT5AgentAPI/`

For web app questions:
- SvelteKit docs: https://kit.svelte.dev/
- Prisma docs: https://www.prisma.io/docs
