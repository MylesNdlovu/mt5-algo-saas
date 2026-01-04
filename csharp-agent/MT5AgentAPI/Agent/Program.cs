using System;
using System.Threading;
using System.Threading.Tasks;
using Websocket.Client;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace MT5Agent
{
    class Program
    {
        private static WebsocketClient? _wsClient;
        private static MT5Automation? _mt5;
        private static string _apiKey = "";
        private static string _machineId = "";
        private static string _agentId = "";
        private static Timer? _heartbeatTimer;
        private static bool _isRunning = true;

        static async Task Main(string[] args)
        {
            Console.WriteLine("╔════════════════════════════════════════╗");
            Console.WriteLine("║    SCALPERIUM MT5 AUTOMATION AGENT    ║");
            Console.WriteLine("║              v1.0.0                    ║");
            Console.WriteLine("╚════════════════════════════════════════╝");
            Console.WriteLine();

            // Load configuration from environment or config file
            _apiKey = Environment.GetEnvironmentVariable("SCALPERIUM_API_KEY") ?? "dev-test-key";
            _machineId = GetMachineId();

            Console.WriteLine($"Machine ID: {_machineId}");
            Console.WriteLine("Initializing MT5 automation...");

            try
            {
                // Initialize MT5 automation
                _mt5 = new MT5Automation();
                await _mt5.Initialize();

                Console.WriteLine("✓ MT5 automation initialized");
                Console.WriteLine("Connecting to SCALPERIUM server...");

                // Connect to WebSocket
                await ConnectToServer();

                // Handle Ctrl+C gracefully
                Console.CancelKeyPress += async (sender, e) =>
                {
                    e.Cancel = true;
                    _isRunning = false;
                    Console.WriteLine("\nShutting down agent...");
                    await Cleanup();
                    Environment.Exit(0);
                };

                // Keep alive
                Console.WriteLine("\n✓ Agent running. Press Ctrl+C to exit.");
                Console.WriteLine("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

                while (_isRunning)
                {
                    await Task.Delay(1000);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Fatal error: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
                await Cleanup();
                Environment.Exit(1);
            }
        }

        static async Task ConnectToServer()
        {
            var url = new Uri(Environment.GetEnvironmentVariable("SCALPERIUM_WS_URL") ?? "ws://localhost:5173/ws/agent");
            _wsClient = new WebsocketClient(url);

            _wsClient.ReconnectTimeout = TimeSpan.FromSeconds(30);
            _wsClient.ErrorReconnectTimeout = TimeSpan.FromSeconds(60);

            _wsClient.ReconnectionHappened.Subscribe(info =>
            {
                Console.WriteLine($"🔄 Reconnection: {info.Type}");
                if (info.Type != Websocket.Client.Models.ReconnectionType.Initial)
                {
                    SendLog("INFO", "Reconnected to server");
                }
                _ = Authenticate();
            });

            _wsClient.MessageReceived.Subscribe(msg =>
            {
                _ = HandleMessage(msg.Text);
            });

            _wsClient.DisconnectionHappened.Subscribe(info =>
            {
                Console.WriteLine($"⚠️  Disconnected: {info.Type}");
                SendLog("WARNING", $"Disconnected from server: {info.Type}");
            });

            await _wsClient.Start();
        }

        static async Task Authenticate()
        {
            var authMessage = new
            {
                type = "agent_auth",
                apiKey = _apiKey,
                machineId = _machineId,
                ipAddress = GetLocalIPAddress(),
                agentVersion = "1.0.0"
            };

            SendMessage(authMessage);

            // Start heartbeat timer (every 5 seconds)
            _heartbeatTimer?.Dispose();
            _heartbeatTimer = new Timer(SendHeartbeat, null, TimeSpan.Zero, TimeSpan.FromSeconds(5));
        }

        static void SendHeartbeat(object? state)
        {
            if (_wsClient?.IsRunning != true || _mt5 == null) return;

            try
            {
                var heartbeat = new
                {
                    type = "heartbeat",
                    mt5Connected = _mt5.IsConnected,
                    mt5Version = _mt5.GetVersion(),
                    mt5Account = _mt5.GetAccount(),
                    mt5Broker = _mt5.GetBroker(),
                    timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                };

                SendMessage(heartbeat);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Heartbeat error: {ex.Message}");
            }
        }

        static async Task HandleMessage(string messageJson)
        {
            try
            {
                var message = JObject.Parse(messageJson);
                string messageType = message["type"]?.ToString() ?? "";

                switch (messageType)
                {
                    case "auth_success":
                        _agentId = message["agentId"]?.ToString() ?? "";
                        Console.WriteLine($"✓ Authenticated as Agent: {_agentId}");
                        SendLog("INFO", "Agent authenticated successfully");
                        break;

                    case "auth_failed":
                        Console.WriteLine($"❌ Authentication failed: {message["error"]}");
                        SendLog("ERROR", $"Authentication failed: {message["error"]}");
                        _isRunning = false;
                        break;

                    case "execute_command":
                        await ExecuteCommand(message);
                        break;

                    case "heartbeat_ack":
                        // Heartbeat acknowledged (silent)
                        break;

                    default:
                        Console.WriteLine($"⚠️  Unknown message type: {messageType}");
                        break;
                }
            }
            catch (Exception ex)
            {
                SendLog("ERROR", $"Error handling message: {ex.Message}");
                Console.WriteLine($"Error: {ex.Message}");
            }
        }

        static async Task ExecuteCommand(JObject message)
        {
            if (_mt5 == null) return;

            string actionId = message["actionId"]?.ToString() ?? "";
            var command = message["command"] as JObject;
            string commandType = command?["type"]?.ToString() ?? "";

            var startTime = DateTime.UtcNow;
            Console.WriteLine($"▶️  Executing: {commandType} (Action: {actionId})");
            SendLog("INFO", $"Executing command: {commandType}", actionId);

            try
            {
                object? result = null;

                switch (commandType)
                {
                    case "OPEN_CHART":
                        result = await _mt5.OpenChart(command?["params"]);
                        break;

                    case "CLOSE_CHART":
                        result = await _mt5.CloseChart(command?["params"]);
                        break;

                    case "ADD_INDICATOR":
                        result = await _mt5.AddIndicator(command?["params"]);
                        break;

                    case "LOAD_EA":
                        result = await _mt5.LoadEA(command?["params"]);
                        break;

                    case "MODIFY_EA_INPUTS":
                        result = await _mt5.ModifyEAInputs(command?["params"]);
                        break;

                    case "START_EA":
                        result = await _mt5.StartEA(command?["params"]);
                        break;

                    case "STOP_EA":
                        result = await _mt5.StopEA(command?["params"]);
                        break;

                    case "GET_STATUS":
                        result = await _mt5.GetStatus(command?["params"]);
                        break;

                    case "TAKE_SCREENSHOT":
                        result = await _mt5.TakeScreenshot(command?["params"]);
                        break;

                    case "CHECK_CONNECTION":
                        result = new { connected = _mt5.IsConnected, version = _mt5.GetVersion() };
                        break;

                    default:
                        throw new Exception($"Unknown command type: {commandType}");
                }

                var duration = (int)(DateTime.UtcNow - startTime).TotalMilliseconds;

                SendActionResult(actionId, true, result, null, duration);
                Console.WriteLine($"✓ Completed: {commandType} ({duration}ms)");
                SendLog("INFO", $"Command completed: {commandType} in {duration}ms", actionId);
            }
            catch (Exception ex)
            {
                var duration = (int)(DateTime.UtcNow - startTime).TotalMilliseconds;
                SendActionResult(actionId, false, null, ex.Message, duration);
                Console.WriteLine($"❌ Failed: {commandType} - {ex.Message}");
                SendLog("ERROR", $"Command failed: {ex.Message}", actionId);
            }
        }

        static void SendActionResult(string actionId, bool success, object? result, string? error, int duration)
        {
            var resultMessage = new
            {
                type = "action_result",
                actionId,
                success,
                result,
                error,
                duration
            };

            SendMessage(resultMessage);
        }

        static void SendLog(string level, string message, string? actionId = null)
        {
            var logMessage = new
            {
                type = "log",
                level,
                message,
                actionId,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            };

            SendMessage(logMessage);
        }

        static void SendMessage(object message)
        {
            if (_wsClient?.IsRunning != true) return;

            try
            {
                var json = JsonConvert.SerializeObject(message);
                _wsClient.Send(json);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Send error: {ex.Message}");
            }
        }

        static string GetMachineId()
        {
            return $"{Environment.MachineName}_{Environment.UserName}".Replace(" ", "_");
        }

        static string GetLocalIPAddress()
        {
            try
            {
                var host = System.Net.Dns.GetHostEntry(System.Net.Dns.GetHostName());
                foreach (var ip in host.AddressList)
                {
                    if (ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
                    {
                        return ip.ToString();
                    }
                }
            }
            catch { }
            return "127.0.0.1";
        }

        static async Task Cleanup()
        {
            Console.WriteLine("Cleaning up resources...");
            
            _heartbeatTimer?.Dispose();
            
            if (_wsClient != null)
            {
                await _wsClient.Stop(System.Net.WebSockets.WebSocketCloseStatus.NormalClosure, "Agent shutting down");
                _wsClient.Dispose();
            }

            _mt5?.Dispose();
            
            Console.WriteLine("✓ Cleanup complete");
        }
    }
}
