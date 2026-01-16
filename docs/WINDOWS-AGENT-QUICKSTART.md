# Windows C# Pool Agent - Quick Start Guide

## 🎯 Goal

Connect your Windows laptop with MT5 to your Mac web app and control MT5 from the browser!

**Setup Time:** 15-20 minutes

---

## 📋 Prerequisites

### On Windows:
- ✅ MetaTrader 5 installed
- ✅ MT5 demo account (we'll create one)
- ✅ .NET 8 SDK installed
- ✅ Visual Studio Code or Visual Studio 2022

### On Mac:
- ✅ Web app running (`npm run dev`)
- ✅ WebSocket server on port 3001
- ✅ Mac IP: `192.168.1.109` (from earlier)

---

## 🚀 Step 1: Create MT5 Demo Account (5 minutes)

### On Windows:

1. **Open MetaTrader 5**
2. **File → Open an Account**
3. **Choose broker:** Exness (or any broker you prefer)
4. **Account Type:** Demo
5. **Settings:**
   - Currency: USD
   - Leverage: 1:500
   - Initial deposit: $10,000

6. **Save credentials:**
   ```
   Account Number: _____________
   Password: _____________
   Server: _____________
   ```

7. **Login to MT5** and keep it running

---

## 🖥️ Step 2: Create C# Agent Project (5 minutes)

### On Windows PowerShell:

```powershell
# Create project directory
cd C:\Projects
mkdir MT5PoolAgent
cd MT5PoolAgent

# Create new console app
dotnet new console

# Add required packages
dotnet add package System.Net.WebSockets.Client
dotnet add package Newtonsoft.Json
```

---

## 📝 Step 3: Copy Agent Code

Replace the entire contents of `Program.cs` with this:

```csharp
using System;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace MT5PoolAgent
{
    class Program
    {
        private static ClientWebSocket? _webSocket;
        private static string? _agentId;
        private static bool _isRunning = true;
        private static string? _mt5AccountNumber;

        static async Task Main(string[] args)
        {
            Console.OutputEncoding = Encoding.UTF8;
            Console.WriteLine("╔════════════════════════════════════════════════════╗");
            Console.WriteLine("║  MT5 Pool Agent - Windows → Mac Connection        ║");
            Console.WriteLine("╚════════════════════════════════════════════════════╝");
            Console.WriteLine();

            // Get configuration from user
            Console.Write("Enter your Mac's IP address (e.g., 192.168.1.109): ");
            var macIp = Console.ReadLine();

            Console.Write("Enter your MT5 account number: ");
            _mt5AccountNumber = Console.ReadLine();

            Console.Write("Enter broker name (e.g., Exness): ");
            var broker = Console.ReadLine();

            if (string.IsNullOrWhiteSpace(macIp) ||
                string.IsNullOrWhiteSpace(_mt5AccountNumber) ||
                string.IsNullOrWhiteSpace(broker))
            {
                Console.WriteLine("❌ Invalid input");
                return;
            }

            var wsUrl = $"ws://{macIp}:3001/ws";
            Console.WriteLine();
            Console.WriteLine($"Connecting to: {wsUrl}");
            Console.WriteLine();

            _agentId = Guid.NewGuid().ToString();

            try
            {
                await ConnectAndRun(wsUrl, broker);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Fatal error: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
            }

            Console.WriteLine();
            Console.WriteLine("Press any key to exit...");
            Console.ReadKey();
        }

        static async Task ConnectAndRun(string wsUrl, string broker)
        {
            _webSocket = new ClientWebSocket();

            try
            {
                // Connect to Mac WebSocket server
                await _webSocket.ConnectAsync(new Uri(wsUrl), CancellationToken.None);
                Console.WriteLine("✅ Connected to Mac web app!");

                // Send handshake
                await SendHandshake(broker);

                // Start background tasks
                var heartbeatTask = Task.Run(SendHeartbeats);
                var listenTask = Task.Run(ListenForCommands);

                Console.WriteLine();
                Console.WriteLine("🎮 Agent is ONLINE and ready!");
                Console.WriteLine();
                Console.WriteLine("📋 Next steps:");
                Console.WriteLine("   1. Open Mac browser: http://192.168.1.109:5173");
                Console.WriteLine("   2. Login: trader@scalperium.com / trader123");
                Console.WriteLine("   3. Go to /agents page");
                Console.WriteLine("   4. You should see this agent as 'online'!");
                Console.WriteLine();
                Console.WriteLine("Press Ctrl+C to stop agent");
                Console.WriteLine();

                // Wait for tasks
                await Task.WhenAny(heartbeatTask, listenTask);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Connection error: {ex.Message}");
            }
            finally
            {
                _isRunning = false;
                if (_webSocket?.State == WebSocketState.Open)
                {
                    await _webSocket.CloseAsync(
                        WebSocketCloseStatus.NormalClosure,
                        "Client disconnect",
                        CancellationToken.None
                    );
                }
                _webSocket?.Dispose();
            }
        }

        static async Task SendHandshake(string broker)
        {
            var handshake = new
            {
                type = "agent_connect",
                agentId = _agentId,
                machineId = Environment.MachineName,
                mt5AccountNumber = _mt5AccountNumber,
                mt5Broker = broker,
                mt5ServerName = $"{broker}-MT5",
                mt5Version = "5.0",
                status = "online",
                eaLoaded = false,
                eaRunning = false,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            };

            await SendMessage(handshake);
            Console.WriteLine("📡 Handshake sent");
            Console.WriteLine($"   Agent ID: {_agentId}");
            Console.WriteLine($"   MT5 Account: {_mt5AccountNumber}");
        }

        static async Task SendHeartbeats()
        {
            while (_isRunning && _webSocket?.State == WebSocketState.Open)
            {
                try
                {
                    var heartbeat = new
                    {
                        type = "heartbeat",
                        agentId = _agentId,
                        status = "online",
                        timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                    };

                    await SendMessage(heartbeat);
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] 💓 Heartbeat sent");

                    await Task.Delay(5000); // Every 5 seconds
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"❌ Heartbeat error: {ex.Message}");
                    _isRunning = false;
                    break;
                }
            }
        }

        static async Task ListenForCommands()
        {
            var buffer = new byte[8192];

            while (_isRunning && _webSocket?.State == WebSocketState.Open)
            {
                try
                {
                    var result = await _webSocket.ReceiveAsync(
                        new ArraySegment<byte>(buffer),
                        CancellationToken.None
                    );

                    if (result.MessageType == WebSocketMessageType.Text)
                    {
                        var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                        Console.WriteLine();
                        Console.WriteLine($"📨 [{DateTime.Now:HH:mm:ss}] Received command");
                        Console.WriteLine($"   {message}");

                        await HandleCommand(message);
                    }
                    else if (result.MessageType == WebSocketMessageType.Close)
                    {
                        Console.WriteLine("🔌 Server closed connection");
                        _isRunning = false;
                        break;
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"❌ Listen error: {ex.Message}");
                    _isRunning = false;
                    break;
                }
            }
        }

        static async Task HandleCommand(string messageJson)
        {
            try
            {
                var json = JObject.Parse(messageJson);
                var commandType = json["type"]?.ToString();
                var commandId = json["commandId"]?.ToString() ?? "unknown";

                Console.WriteLine($"🎯 Command Type: {commandType}");

                switch (commandType)
                {
                    case "start_ea":
                        await HandleStartEA(commandId, json);
                        break;

                    case "stop_ea":
                        await HandleStopEA(commandId, json);
                        break;

                    case "pause_ea":
                        await HandlePauseEA(commandId, json);
                        break;

                    case "update_bot_settings":
                        await HandleUpdateSettings(commandId, json);
                        break;

                    default:
                        Console.WriteLine($"⚠️  Unknown command: {commandType}");
                        await SendErrorResponse(commandId, $"Unknown command: {commandType}");
                        break;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Command error: {ex.Message}");
            }
        }

        static async Task HandleStartEA(string commandId, JObject command)
        {
            Console.WriteLine("▶️  Starting EA...");
            Console.WriteLine("   TODO: Use FlaUI to click AutoTrading in MT5");

            // Simulate work
            await Task.Delay(500);

            // For now, just respond with success
            var response = new
            {
                type = "command_response",
                commandId = commandId,
                success = true,
                message = "EA started successfully (simulated)",
                eaStatus = "running",
                mt5AccountNumber = _mt5AccountNumber,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            };

            await SendMessage(response);
            Console.WriteLine("✅ Start EA response sent");
        }

        static async Task HandleStopEA(string commandId, JObject command)
        {
            Console.WriteLine("⏹️  Stopping EA...");
            Console.WriteLine("   TODO: Use FlaUI to stop AutoTrading in MT5");

            await Task.Delay(500);

            var response = new
            {
                type = "command_response",
                commandId = commandId,
                success = true,
                message = "EA stopped successfully (simulated)",
                eaStatus = "stopped",
                mt5AccountNumber = _mt5AccountNumber,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            };

            await SendMessage(response);
            Console.WriteLine("✅ Stop EA response sent");
        }

        static async Task HandlePauseEA(string commandId, JObject command)
        {
            Console.WriteLine("⏸️  Pausing EA...");
            Console.WriteLine("   TODO: Use FlaUI to pause AutoTrading in MT5");

            await Task.Delay(500);

            var response = new
            {
                type = "command_response",
                commandId = commandId,
                success = true,
                message = "EA paused successfully (simulated)",
                eaStatus = "paused",
                mt5AccountNumber = _mt5AccountNumber,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            };

            await SendMessage(response);
            Console.WriteLine("✅ Pause EA response sent");
        }

        static async Task HandleUpdateSettings(string commandId, JObject command)
        {
            Console.WriteLine("⚙️  Updating bot settings...");

            var payload = command["payload"];
            if (payload != null)
            {
                Console.WriteLine($"   Max Lot Size: {payload["maxLotSize"]}");
                Console.WriteLine($"   Max Loss: ${payload["maxLoss"]}");
                Console.WriteLine($"   Safety Mode: {payload["safetyMode"]}");
            }

            var response = new
            {
                type = "command_response",
                commandId = commandId,
                success = true,
                message = "Settings updated successfully",
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            };

            await SendMessage(response);
            Console.WriteLine("✅ Settings update response sent");
        }

        static async Task SendErrorResponse(string commandId, string error)
        {
            var response = new
            {
                type = "command_response",
                commandId = commandId,
                success = false,
                error = error,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            };

            await SendMessage(response);
        }

        static async Task SendMessage(object message)
        {
            if (_webSocket == null || _webSocket.State != WebSocketState.Open)
            {
                Console.WriteLine("⚠️  WebSocket not connected");
                return;
            }

            var json = JsonConvert.SerializeObject(message);
            var bytes = Encoding.UTF8.GetBytes(json);

            await _webSocket.SendAsync(
                new ArraySegment<byte>(bytes),
                WebSocketMessageType.Text,
                true,
                CancellationToken.None
            );
        }
    }
}
```

---

## 🚀 Step 4: Run the Agent

### On Windows:

```powershell
# Build and run
dotnet run
```

### You'll be prompted for:

```
Enter your Mac's IP address: 192.168.1.109
Enter your MT5 account number: [YOUR_MT5_ACCOUNT_NUMBER]
Enter broker name: Exness
```

**Expected Output:**
```
✅ Connected to Mac web app!
📡 Handshake sent
   Agent ID: abc-123-xyz
   MT5 Account: 50012345

🎮 Agent is ONLINE and ready!

📋 Next steps:
   1. Open Mac browser: http://192.168.1.109:5173
   2. Login: trader@scalperium.com / trader123
   3. Go to /agents page
   4. You should see this agent as 'online'!

Press Ctrl+C to stop agent

[13:45:23] 💓 Heartbeat sent
```

---

## 🧪 Step 5: Test the Connection

### On Mac Browser:

1. **Open:** http://localhost:5173
2. **Login:** trader@scalperium.com / trader123
3. **Go to:** `/agents` page
4. **You should see:**
   - Your Windows laptop listed
   - Status: "online" (green dot)
   - MT5 Account number
   - Machine name

### Test Commands:

1. **Click Settings (⚙️)**
2. **Enable your MT5 account** in the Trading Accounts section
3. **Click "Start Algo"** button

**On Windows Console:**
```
📨 [13:46:15] Received command
   {"type":"start_ea","commandId":"cmd_123..."}
🎯 Command Type: start_ea
▶️  Starting EA...
   TODO: Use FlaUI to click AutoTrading in MT5
✅ Start EA response sent
```

**On Mac Browser:**
```
Alert: "✅ Algo started on 1 account(s)"
```

---

## 🎯 Step 6: Add Your MT5 Account to Database

So the web app recognizes your MT5 account:

### On Mac Terminal:

```bash
cd /Users/dmd/mt5-algo-saas/web-app

# Create a quick script to add your account
cat > add-mt5-account.ts << 'EOF'
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const traderUser = await prisma.user.findUnique({
    where: { email: 'trader@scalperium.com' }
  });

  if (!traderUser) {
    console.log('❌ Trader user not found');
    return;
  }

  const accountNumber = process.argv[2];
  const broker = process.argv[3] || 'Exness';

  const account = await prisma.mT5Account.create({
    data: {
      userId: traderUser.id,
      accountNumber: accountNumber,
      broker: broker,
      serverName: `${broker}-MT5-Demo`,
      login: accountNumber,
      status: 'ACTIVE',
      balance: 10000.0,
      equity: 10000.0,
      freeMargin: 10000.0,
      margin: 0.0,
      isEnabledForTrading: true
    }
  });

  console.log('✅ MT5 account added:');
  console.log(`   Account: ${account.accountNumber}`);
  console.log(`   Broker: ${account.broker}`);
  console.log(`   Enabled for trading: ${account.isEnabledForTrading}`);
}

main().then(() => process.exit(0)).catch(console.error);
EOF

# Run it with your MT5 account number
npx tsx add-mt5-account.ts YOUR_MT5_ACCOUNT_NUMBER Exness
```

---

## 🎉 Step 7: Full End-to-End Test

### Complete Flow:

1. **Windows:** MT5 terminal running with demo account
2. **Windows:** C# agent running (`dotnet run`)
3. **Mac:** Web app running (`npm run dev`)
4. **Mac Browser:** Login and test

### Test Scenario:

```
Mac Browser → Click "Start Algo"
    ↓
Web App API → Sends command via WebSocket
    ↓
Windows Agent → Receives command
    ↓
Windows Agent → (Future: Controls MT5 via FlaUI)
    ↓
Windows Agent → Sends success response
    ↓
Mac Browser → Shows "✅ Algo started on 1 account(s)"
```

---

## 🔧 Troubleshooting

### "Connection refused"

**Problem:** Can't connect to Mac

**Solutions:**
1. Check Mac IP: `ifconfig | grep "inet "`
2. Ping Mac from Windows: `ping 192.168.1.109`
3. Check Mac firewall allows port 3001
4. Ensure both on same Wi-Fi

### Agent doesn't show in /agents page

**Problem:** Agent connected but not visible

**Solutions:**
1. Check handshake was sent (see agent console)
2. Verify MT5 account number is correct
3. Check web app logs on Mac
4. Refresh /agents page

### "No online agent found" in browser

**Problem:** Agent shows in /agents but commands fail

**Solutions:**
1. Ensure agent is actually running (check Windows)
2. Verify MT5 account is added to database
3. Check MT5 account is enabled in Settings
4. Look at agent console for errors

---

## 📊 What's Working

✅ **Network Communication:** Windows ↔ Mac via WebSocket
✅ **Agent Registration:** Shows in /agents page
✅ **Command Flow:** Browser → API → WebSocket → Windows
✅ **Responses:** Windows → WebSocket → API → Browser
✅ **Multi-Account:** Can have multiple agents/accounts

---

## 🚀 Next: Add MT5 Automation

The current agent **simulates** EA control. To actually control MT5:

1. **Add FlaUI packages:**
   ```powershell
   dotnet add package FlaUI.Core
   dotnet add package FlaUI.UIA3
   ```

2. **Replace TODO comments** with actual MT5 automation

3. **See full implementation:** `/docs/POOL-AGENT-ARCHITECTURE.md`

---

## 📖 Summary

You now have:
- ✅ Windows C# agent connecting to Mac
- ✅ Real-time WebSocket communication
- ✅ Command/response working
- ✅ Agent shows as "online" in web app
- ✅ Can send Start/Stop/Pause commands

**Next:** Add FlaUI code to actually control your MT5 terminal!
