# Local MT5 Testing Guide - Windows Laptop + Mac Web App

## 🎯 Overview

Test the complete system end-to-end:
- **Mac:** Web app running on http://localhost:5173
- **Windows Laptop:** MT5 terminal + C# agent
- **Connection:** WebSocket over local network

---

## 📋 Prerequisites

### On Mac (Web App)
- ✅ Web app running: `npm run dev`
- ✅ Database seeded with demo accounts
- ✅ WebSocket server running on port 3001

### On Windows Laptop
- ✅ MetaTrader 5 installed
- ✅ MT5 account logged in
- ✅ Visual Studio 2022 or .NET 8 SDK
- ✅ FlaUI NuGet packages (for MT5 automation)

---

## 🔧 Step 1: Get Your Mac's IP Address

On your Mac, find your local IP:

```bash
# Method 1: Using ifconfig
ifconfig | grep "inet " | grep -v 127.0.0.1

# Method 2: Using System Preferences
# System Preferences → Network → Wi-Fi → Advanced → TCP/IP
# Look for "IPv4 Address"

# Example output: 192.168.1.100
```

**Your Mac IP:** `_____________` (write it down!)

---

## 🌐 Step 2: Allow Network Access on Mac

### Option A: Open Firewall Port (Recommended)

```bash
# Allow port 3001 (WebSocket) and 5173 (Web App)
# System Preferences → Security & Privacy → Firewall → Firewall Options

# Or use command line:
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock /usr/local/bin/node
```

### Option B: Disable Firewall Temporarily (For Testing)

```bash
# System Preferences → Security & Privacy → Firewall → Turn Off
# (Remember to turn back on after testing!)
```

---

## 🖥️ Step 3: Create Simple C# Agent (Windows)

### 3.1 Create New Console Project

```bash
# On Windows, in PowerShell or CMD
cd C:\Projects
mkdir MT5LocalAgent
cd MT5LocalAgent
dotnet new console
```

### 3.2 Install Required NuGet Packages

```bash
dotnet add package System.Net.WebSockets
dotnet add package System.Net.WebSockets.Client
```

### 3.3 Replace Program.cs

Copy this code to `Program.cs`:

```csharp
using System;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace MT5LocalAgent
{
    class Program
    {
        static async Task Main(string[] args)
        {
            Console.WriteLine("╔══════════════════════════════════════════╗");
            Console.WriteLine("║  MT5 Agent - Local Network Testing      ║");
            Console.WriteLine("╚══════════════════════════════════════════╝");
            Console.WriteLine();

            // Get Mac IP
            Console.Write("Enter your Mac's IP address: ");
            var macIp = Console.ReadLine();

            if (string.IsNullOrEmpty(macIp))
            {
                Console.WriteLine("❌ Invalid IP");
                return;
            }

            var wsUrl = $"ws://{macIp}:3001/ws";
            Console.WriteLine($"Connecting to: {wsUrl}");
            Console.WriteLine();

            using var ws = new ClientWebSocket();

            try
            {
                // Connect
                await ws.ConnectAsync(new Uri(wsUrl), CancellationToken.None);
                Console.WriteLine("✅ Connected to Mac web app!");

                // Send handshake
                var handshake = new
                {
                    type = "agent_connect",
                    agentId = Guid.NewGuid().ToString(),
                    machineId = Environment.MachineName,
                    mt5AccountNumber = "50099101",
                    mt5Broker = "Exness",
                    status = "online",
                    timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                };

                await SendMessage(ws, handshake);
                Console.WriteLine("📡 Handshake sent");
                Console.WriteLine();
                Console.WriteLine("🎮 Agent is online!");
                Console.WriteLine("Listening for commands from web app...");
                Console.WriteLine("Press Ctrl+C to stop");
                Console.WriteLine();

                // Listen for commands
                var buffer = new byte[4096];
                while (ws.State == WebSocketState.Open)
                {
                    var result = await ws.ReceiveAsync(
                        new ArraySegment<byte>(buffer),
                        CancellationToken.None
                    );

                    if (result.MessageType == WebSocketMessageType.Text)
                    {
                        var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                        Console.WriteLine($"📨 Received: {message}");

                        // Parse command
                        using var doc = JsonDocument.Parse(message);
                        var root = doc.RootElement;

                        if (root.TryGetProperty("type", out var type))
                        {
                            var commandType = type.GetString();
                            Console.WriteLine($"🎯 Command: {commandType}");

                            // Respond to command
                            var response = new
                            {
                                type = "command_response",
                                commandId = GetProperty(root, "commandId"),
                                success = true,
                                message = $"{commandType} executed successfully",
                                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                            };

                            await SendMessage(ws, response);
                            Console.WriteLine($"✅ Response sent");
                            Console.WriteLine();
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error: {ex.Message}");
            }

            Console.WriteLine("👋 Disconnected");
            Console.WriteLine("Press any key to exit...");
            Console.ReadKey();
        }

        static async Task SendMessage(ClientWebSocket ws, object message)
        {
            var json = JsonSerializer.Serialize(message);
            var bytes = Encoding.UTF8.GetBytes(json);
            await ws.SendAsync(
                new ArraySegment<byte>(bytes),
                WebSocketMessageType.Text,
                true,
                CancellationToken.None
            );
        }

        static string GetProperty(JsonElement element, string propertyName)
        {
            return element.TryGetProperty(propertyName, out var prop)
                ? prop.GetString() ?? "unknown"
                : "unknown";
        }
    }
}
```

---

## 🚀 Step 4: Test the Connection

### On Mac (Terminal 1):
```bash
cd /Users/dmd/mt5-algo-saas/web-app
npm run dev
```

Output should show:
```
➜  Local:   http://localhost:5173/
[WebSocket] Server started on port 3001
```

### On Mac (Terminal 2):
```bash
# Check WebSocket is listening
lsof -i :3001

# Should show node listening on port 3001
```

### On Windows:
```bash
cd C:\Projects\MT5LocalAgent
dotnet run
```

Enter your Mac's IP when prompted (e.g., `192.168.1.100`)

**Expected Output:**
```
✅ Connected to Mac web app!
📡 Handshake sent
🎮 Agent is online!
Listening for commands from web app...
```

---

## 🧪 Step 5: Test from Web App

### On Mac Browser:

1. Open http://localhost:5173
2. Login: `trader@scalperium.com` / `trader123`
3. Go to `/agents` page
4. **You should see your Windows agent listed as "online"!**

### Test Commands:

1. Click **Settings** (⚙️)
2. Scroll to **"Trading Accounts"**
3. Enable 2-3 accounts
4. Click **"Start Algo"** button

**On Windows Console:**
```
📨 Received: {"type":"start_ea","commandId":"cmd_123..."}
🎯 Command: start_ea
✅ Response sent
```

**On Mac Browser:**
```
Alert: "✅ Algo started on 2 account(s)"
```

---

## 🎯 Step 6: Add MT5 Automation (Optional)

To actually control MT5, add FlaUI:

```bash
dotnet add package FlaUI.Core
dotnet add package FlaUI.UIA3
```

Then enhance the agent to:
1. Find MT5 window
2. Click AutoTrading button
3. Load EA onto chart
4. Monitor trades

See `/docs/POOL-AGENT-ARCHITECTURE.md` for complete MT5 automation code.

---

## 🔍 Troubleshooting

### "Connection refused" on Windows

**Problem:** Can't connect to Mac

**Solutions:**
1. Check Mac firewall is allowing port 3001
2. Verify Mac IP is correct (`ifconfig`)
3. Ensure both devices on same Wi-Fi network
4. Try pinging Mac from Windows: `ping 192.168.1.100`

### "WebSocket server not found"

**Problem:** WebSocket not running on Mac

**Solutions:**
```bash
# On Mac, check if server is running
lsof -i :3001

# Restart web app
cd /Users/dmd/mt5-algo-saas/web-app
npm run dev
```

### Agent connects but no commands received

**Problem:** Agent not registered properly

**Solutions:**
1. Check handshake includes correct `mt5AccountNumber`
2. Verify account number matches database (`trader@scalperium.com` accounts)
3. Check agent appears in `/agents` page as "online"

### Firewall blocks connection

**Solutions:**
```bash
# Temporarily disable Mac firewall for testing
sudo pfctl -d

# Re-enable after testing
sudo pfctl -e
```

---

## 📊 What You're Testing

✅ **Network Communication:**
- Mac web app → Windows agent (WebSocket)
- Commands flow correctly
- Responses received

✅ **Multi-Account System:**
- Enable/disable accounts in UI
- Commands sent to agent for each account
- Agent responds successfully

✅ **Real-Time Updates:**
- Agent shows "online" in web app
- Commands execute immediately
- Feedback displayed in browser

---

## 🎉 Success Checklist

- [ ] Mac web app running on http://localhost:5173
- [ ] Windows C# agent connects successfully
- [ ] Agent shows as "online" in `/agents` page
- [ ] "Start Algo" button sends command to Windows
- [ ] Windows agent receives and responds to command
- [ ] Web app shows success message
- [ ] Can toggle accounts on/off
- [ ] Multi-account commands work

---

## 🚀 Next Steps

Once local testing works:

1. **Add MT5 Automation:** Use FlaUI to actually control MT5
2. **Deploy to VPS:** Move agent to cloud Windows VPS
3. **Production Testing:** Connect VPS agent to production web app
4. **Scale:** Add more agents for more accounts

---

## 📝 Quick Reference

| Component | Location | Port | URL/Command |
|-----------|----------|------|-------------|
| Web App | Mac | 5173 | http://localhost:5173 |
| WebSocket | Mac | 3001 | ws://[MAC_IP]:3001/ws |
| C# Agent | Windows | - | dotnet run |
| MT5 Terminal | Windows | - | Manual/FlaUI control |

**Test with real MT5 account:** Change `mt5AccountNumber` in agent to match your actual MT5 account!
