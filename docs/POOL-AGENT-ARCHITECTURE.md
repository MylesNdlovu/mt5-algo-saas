# Pool Agent Architecture - Mother Agent for 40-50 MT5 Terminals

## Overview

The **Pool Agent** (Mother Agent) architecture allows a single C# agent to manage **40-50 MT5 terminal instances** simultaneously on a dedicated Forex VPS. This is optimized for the $399/month dedicated server tier.

---

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                    Dedicated Forex VPS                         │
│                   ($399/month - London DC)                     │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │          C# Pool Agent (Mother Agent)                    │ │
│  │  - MultiMT5Controller.cs                                 │ │
│  │  - Manages 40-50 MT5 instances                           │ │
│  │  - One WebSocket connection to server                    │ │
│  └──────────────────────────────────────────────────────────┘ │
│                            │                                   │
│         ┌──────────────────┼──────────────────┐               │
│         │                  │                  │               │
│   ┌─────▼─────┐      ┌─────▼─────┐     ┌─────▼─────┐        │
│   │ MT5 #1    │      │ MT5 #2    │ ... │ MT5 #50   │        │
│   │ User A    │      │ User B    │     │ User Z    │        │
│   │ 50012345  │      │ 50067890  │     │ 50099999  │        │
│   └───────────┘      └───────────┘     └───────────┘        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                            │
                     WebSocket (wss://)
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│              SvelteKit Web App (Vercel)                        │
│  - Routes commands to correct MT5 instance                     │
│  - Tracks which users belong to which pool agent               │
│  - Real-time status monitoring                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Agent Model (Pool Agent)

```prisma
model Agent {
  id String @id @default(uuid())

  // Pool Agent Identification
  isPoolAgent     Boolean  @default(false)  // TRUE for mother agents
  managedAccounts String[]                  // ["50012345", "50067890", ...]
  maxCapacity     Int      @default(50)
  currentLoad     Int      @default(0)

  // VPS Info
  vpsName   String?  // "VPS-FOREX-LONDON-01"
  vpsRegion String?  // "London"
  vpsIp     String?

  // Machine Identity
  machineId String @unique
  apiKey    String? @unique

  // Status
  status         String    @default("offline")
  lastHeartbeat  DateTime?

  // Resource Monitoring
  cpuUsage        Float?
  memoryUsage     Float?
  mt5InstanceCount Int @default(0)

  // Relationships
  accountAssignments MT5AccountAssignment[]
}
```

### MT5AccountAssignment Model

```prisma
model MT5AccountAssignment {
  id String @id @default(uuid())

  // Ownership
  userId String
  user   User @relation(fields: [userId], references: [id])

  // Pool Agent Assignment
  agentId String
  agent   Agent @relation(fields: [agentId], references: [id])

  // MT5 Account
  mt5AccountNumber String @unique
  mt5Broker        String?
  mt5ServerName    String?

  // Real-time Status (updated by pool agent)
  status        String   @default("offline")
  eaStatus      String   @default("stopped")
  lastHeartbeat DateTime?

  // Account Info (synced from MT5)
  balance    Float @default(0)
  equity     Float @default(0)
  profit     Float @default(0)

  // EA Info
  eaLoaded  Boolean @default(false)
  eaRunning Boolean @default(false)
  eaName    String?
}
```

---

## C# Implementation

### Key Files Created/Modified

1. **`MultiMT5Controller.cs`** ✅ Created
   - Manages 40-50 MT5 instances simultaneously
   - Auto-discovers all MT5 processes on startup
   - Routes commands to specific MT5 terminal
   - Health monitoring every 30 seconds
   - Auto-recovery for crashed terminals

2. **`Program.cs`** - Needs Update
   - Replace single-instance logic with MultiMT5Controller
   - Send multi_auth message on connection
   - Handle targeted_command messages

3. **`MT5Automation.cs`** - Can keep as-is
   - Individual MT5 operations still work the same
   - MultiMT5Controller calls these methods per instance

---

## WebSocket Protocol

### 1. Pool Agent Authentication

**From C# Agent → Server:**
```json
{
  "type": "multi_auth",
  "apiKey": "agent-master-key-xyz",
  "machineId": "VPS-FOREX-LONDON-01",
  "isPoolAgent": true,
  "vpsName": "VPS-FOREX-LONDON-01",
  "vpsRegion": "London",
  "maxCapacity": 50,
  "accountNumbers": [
    "50012345",
    "50067890",
    "50045678",
    ...
  ],
  "timestamp": 1705012345678
}
```

**Server → C# Agent:**
```json
{
  "type": "multi_auth_response",
  "success": true,
  "agentId": "agent-uuid-123",
  "vpsName": "VPS-FOREX-LONDON-01",
  "registeredAccounts": ["50012345", "50067890", ...],
  "failedAccounts": [],
  "timestamp": 1705012345680
}
```

### 2. Batched Status Updates

**From C# Agent → Server (every 10 seconds):**
```json
{
  "type": "multi_status_update",
  "agentId": "agent-uuid-123",
  "vpsName": "VPS-FOREX-LONDON-01",
  "systemInfo": {
    "cpuUsage": 45.2,
    "memoryUsage": 68.5,
    "diskUsage": 32.1,
    "mt5InstanceCount": 48
  },
  "accounts": [
    {
      "accountNumber": "50012345",
      "status": "online",
      "eaStatus": "running",
      "balance": 5000.00,
      "equity": 5245.75,
      "profit": 245.75,
      "eaLoaded": true,
      "eaRunning": true,
      "eaName": "Gold Scalper Pro v2.1",
      "processId": 4567,
      "lastActivity": 1705012345000
    },
    {
      "accountNumber": "50067890",
      "status": "online",
      "eaStatus": "stopped",
      "balance": 3000.00,
      ...
    },
    ... // up to 50 accounts
  ],
  "timestamp": 1705012345678
}
```

### 3. Targeted Commands

**From Server → C# Agent:**
```json
{
  "type": "targeted_command",
  "commandId": "cmd-uuid-456",
  "targetAccount": "50012345",
  "command": "start_ea",
  "payload": {
    "eaName": "Gold Scalper Pro v2.1",
    "symbol": "XAUUSD",
    "timeframe": "M5"
  },
  "timestamp": 1705012345678
}
```

**From C# Agent → Server:**
```json
{
  "type": "command_result",
  "agentId": "agent-uuid-123",
  "commandId": "cmd-uuid-456",
  "success": true,
  "result": {
    "accountNumber": "50012345",
    "message": "EA started successfully"
  },
  "timestamp": 1705012346123
}
```

---

## VPS Setup Guide

### Server Requirements

| Specification | Minimum | Recommended |
|---------------|---------|-------------|
| **OS** | Windows Server 2019 | Windows Server 2022 |
| **CPU** | 8 cores @ 3.0GHz | 16 cores @ 3.5GHz+ |
| **RAM** | 32 GB | 64 GB |
| **Disk** | 500 GB SSD | 1 TB NVMe SSD |
| **Network** | 100 Mbps | 1 Gbps |
| **Location** | Near broker DC | London/New York |

### Estimated Resource Usage

| MT5 Instances | CPU Usage | RAM Usage | Notes |
|---------------|-----------|-----------|-------|
| 10 terminals | 10-15% | 4-6 GB | Light load |
| 25 terminals | 25-35% | 10-15 GB | Moderate |
| 50 terminals | 45-60% | 20-30 GB | Full capacity |

### Installation Steps

#### 1. Install MT5 Terminals (x50)

```powershell
# Create directory structure
New-Item -Path "C:\MT5Terminals" -ItemType Directory

# Install 50 separate MT5 instances
for ($i=1; $i -le 50; $i++) {
    $path = "C:\MT5Terminals\Terminal$i"
    New-Item -Path $path -ItemType Directory

    # Copy MT5 installer and run silently
    # Each terminal in separate folder
}
```

#### 2. Configure Each MT5 Terminal

For each MT5 terminal (1-50):
- Login with user's account credentials
- Install Gold Scalper EA
- Configure chart (XAUUSD, M5)
- DO NOT enable AutoTrading yet (agent will control this)
- Ensure window title shows account number

#### 3. Install C# Pool Agent

```powershell
# Install .NET 8 Runtime
winget install Microsoft.DotNet.Runtime.8

# Clone agent code
git clone https://github.com/yourcompany/mt5-agent.git
cd mt5-agent

# Configure appsettings.json
@"
{
  "IsPoolAgent": true,
  "VpsName": "VPS-FOREX-LONDON-01",
  "VpsRegion": "London",
  "MaxCapacity": 50,
  "WebSocketServer": "wss://scalperium.com/ws",
  "ApiKey": "your-master-agent-api-key-here"
}
"@ | Out-File appsettings.json

# Build and run
dotnet build
dotnet run
```

#### 4. Register Pool Agent in Web App

```sql
-- Insert pool agent into database
INSERT INTO "Agent" (
  id, "machineId", "apiKey", "isPoolAgent", "maxCapacity",
  "vpsName", "vpsRegion", status
) VALUES (
  'agent-uuid-123',
  'VPS-FOREX-LONDON-01_Administrator',
  'your-master-agent-api-key-here',
  true,
  50,
  'VPS-FOREX-LONDON-01',
  'London',
  'offline'
);
```

#### 5. Assign Users to Pool Agent

When a user signs up, assign their MT5 account to the pool agent:

```sql
INSERT INTO "MT5AccountAssignment" (
  id, "userId", "agentId", "mt5AccountNumber",
  "mt5Broker", "mt5ServerName", status
) VALUES (
  gen_random_uuid(),
  'user-uuid-456',
  'agent-uuid-123',
  '50012345',
  'Exness',
  'Exness-MT5Real',
  'offline'
);
```

---

## Resource Monitoring

### Health Checks

The pool agent performs health checks every 30 seconds:

1. **Process Check**: Verify all MT5 processes are running
2. **Window Check**: Verify windows are available
3. **Activity Check**: Flag inactive terminals (no activity > 30 min)
4. **Auto-Recovery**: Restart crashed terminals
5. **Resource Monitoring**: CPU, memory, disk usage

### Dashboard Monitoring

Admin dashboard shows:
- Total pool agents online
- MT5 instances per pool agent
- Resource usage per VPS
- Error rates
- Latency metrics

---

## Scaling Strategy

### Single VPS (0-50 users)

```
1 Pool Agent = 1 VPS = 50 MT5 terminals
Cost: $399/month
```

### Multi-VPS (50-500 users)

```
10 Pool Agents = 10 VPS = 500 MT5 terminals
Cost: $3,990/month ($7.98 per user)
```

### Regional Distribution (500+ users)

```
VPS-LONDON-01    → 50 users (EU traders)
VPS-LONDON-02    → 50 users
VPS-NEWYORK-01   → 50 users (US traders)
VPS-NEWYORK-02   → 50 users
VPS-TOKYO-01     → 50 users (Asian traders)
...
```

---

## Performance Optimizations

### 1. Batched Updates
- Don't send 50 separate status updates
- Batch into single `multi_status_update` message
- Send every 10 seconds (not 5 seconds)

### 2. Lazy Window Attachment
- Don't keep all 50 windows attached
- Attach only when command needs execution
- Reduces FlaUI overhead

### 3. Parallel Command Execution
- Use `Task.WhenAll` for independent commands
- Execute commands on different MT5 instances in parallel

### 4. Connection Pooling
- Reuse window handles
- Cache automation elements
- Minimize process lookups

---

## Error Handling

### MT5 Process Crashes

```csharp
if (instance.Process.HasExited) {
    Console.WriteLine($"MT5 {accountNumber} crashed");
    // 1. Mark as offline in database
    // 2. Remove from instances dictionary
    // 3. Alert admin via webhook
    // 4. Auto-restart if configured
}
```

### Window Not Available

```csharp
if (!instance.MainWindow.IsAvailable) {
    Console.WriteLine($"MT5 {accountNumber} window lost");
    // 1. Try to reattach
    // 2. If fails 3 times, mark as error
    // 3. Send alert to user
}
```

### Network Disconnection

```csharp
// WebSocket disconnect
protected override async Task OnDisconnected() {
    Console.WriteLine("WebSocket disconnected");
    // 1. Try to reconnect every 30s
    // 2. Keep MT5 instances running
    // 3. Buffer status updates locally
    // 4. Sync when reconnected
}
```

---

## API Endpoints

### Get Pool Agent Status

```http
GET /api/admin/pool-agents

Response:
{
  "agents": [
    {
      "id": "agent-uuid-123",
      "vpsName": "VPS-FOREX-LONDON-01",
      "status": "online",
      "managedAccounts": 48,
      "maxCapacity": 50,
      "cpuUsage": 52.3,
      "memoryUsage": 68.5,
      "lastHeartbeat": "2026-01-12T14:30:00Z"
    }
  ]
}
```

### Send Command to Specific User

```http
POST /api/agents/command

Request:
{
  "userId": "user-uuid-456",
  "command": "start_ea",
  "payload": {...}
}

Response:
{
  "success": true,
  "commandId": "cmd-uuid-789",
  "poolAgent": "VPS-FOREX-LONDON-01",
  "targetAccount": "50012345"
}
```

---

## Next Steps

1. ✅ MultiMT5Controller.cs created
2. ✅ Database schema updated
3. ✅ WebSocket types defined
4. ⏳ Update C# Program.cs to use MultiMT5Controller
5. ⏳ Update WebSocket server to handle pool agent auth
6. ⏳ Create admin dashboard for pool monitoring
7. ⏳ Setup first production VPS
8. ⏳ Test with 5-10 MT5 terminals
9. ⏳ Scale to 50 terminals
10. ⏳ Deploy to production

---

## Support

For issues or questions about pool agent setup:
- Check logs: `C:\MT5Agent\logs\`
- WebSocket connection: Verify firewall rules
- MT5 terminals: Ensure all logged in and visible
- Resource usage: Monitor Task Manager

---

**Last Updated**: January 12, 2026
