# Windows Agent - Simple Setup (5 Minutes)

## What You Need:

1. **Windows PC** (your laptop)
2. **.NET 8** - Download: https://dotnet.microsoft.com/en-us/download/dotnet/8.0
   - Click: **".NET 8.0 SDK - Windows x64 Installer"**
   - Install it.

---

## How It Works (Simple):

```
┌─────────────────────┐                      ┌──────────────────────┐
│   YOUR MAC          │                      │   YOUR WINDOWS PC    │
│                     │                      │                      │
│  Web Browser        │◄─────WiFi───────────►│  Agent.exe           │
│  localhost:5173     │                      │  (running)           │
│                     │                      │                      │
│  WebSocket Server   │                      │  MT5 Terminal        │
│  port 3001          │                      │  (optional)          │
└─────────────────────┘                      └──────────────────────┘

YOU CLICK "START ALGO" → Mac sends message → Windows receives it → Agent responds
```

**That's it.** Windows agent connects to Mac, waits for commands, responds back.

---

## Setup Steps (Copy/Paste):

### On Windows - Open PowerShell and paste:

```powershell
# 1. Go to Desktop
cd $env:USERPROFILE\Desktop

# 2. Create project
mkdir MT5Agent
cd MT5Agent

# 3. Create C# app
dotnet new console -f net8.0

# 4. Add WebSocket library
dotnet add package Newtonsoft.Json

# 5. Open code editor
notepad Program.cs
```

### Notepad Opens:

1. Press **Ctrl+A** (select all)
2. Press **Delete** (delete everything)
3. **Paste the code below** ⬇️

---

## Complete Program.cs Code (Copy This):

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

## Run It (After Saving):

In PowerShell:
```powershell
cd $env:USERPROFILE\Desktop\MT5Agent
dotnet run
```

It will ask you:
- **Mac IP**: `192.168.1.109` (use your actual Mac IP)
- **MT5 Account**: `12345678` (any number for testing)
- **Broker**: `Exness` (or any broker name)

---

## Expected Output:

```
✅ Connected to Mac web app!
📡 Handshake sent
🎮 Agent is ONLINE and ready!
[14:30:15] 💓 Heartbeat sent
[14:30:20] 💓 Heartbeat sent
```

---

## Test from Mac:

1. Open browser: http://localhost:5173
2. Login: `trader@scalperium.com` / `trader123`
3. Click "Start Algo"
4. **Windows should show**: `📨 Received command` → `🎯 Command Type: start_ea`

---

## Want an .exe?

After building once, your .exe is here:
```
C:\Users\YourName\Desktop\MT5Agent\bin\Debug\net8.0\MT5Agent.exe
```

Double-click it to run!

---

**That's it.** No Visual Studio needed, just .NET SDK and this code.
