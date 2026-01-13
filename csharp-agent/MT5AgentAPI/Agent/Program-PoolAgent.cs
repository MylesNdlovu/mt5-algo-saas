using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Websocket.Client;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using MT5AgentAPI.Agent;

namespace MT5Agent
{
    /// <summary>
    /// Pool Agent Program - Manages 40-50 MT5 terminals on a single VPS
    /// </summary>
    class Program
    {
        private static WebsocketClient? _wsClient;
        private static MultiMT5Controller? _controller;
        private static string _apiKey = "";
        private static string _machineId = "";
        private static string _agentId = "";
        private static Timer? _heartbeatTimer;
        private static Timer? _statusUpdateTimer;
        private static bool _isRunning = true;

        // Configuration
        private static bool _isPoolAgent = true; // Set via config
        private static string _vpsName = "";
        private static string _vpsRegion = "";
        private static int _maxCapacity = 50;

        static async Task Main(string[] args)
        {
            Console.WriteLine("╔════════════════════════════════════════════════╗");
            Console.WriteLine("║    SCALPERIUM MT5 POOL AGENT (MOTHER AGENT)   ║");
            Console.WriteLine("║              v2.0.0 - Multi-Instance           ║");
            Console.WriteLine("╚════════════════════════════════════════════════╝");
            Console.WriteLine();

            // Load configuration
            LoadConfiguration();

            Console.WriteLine($"Machine ID: {_machineId}");
            Console.WriteLine($"VPS Name: {_vpsName}");
            Console.WriteLine($"VPS Region: {_vpsRegion}");
            Console.WriteLine($"Max Capacity: {_maxCapacity} terminals");
            Console.WriteLine();

            try
            {
                if (_isPoolAgent)
                {
                    Console.WriteLine("🔍 Discovering MT5 terminals...");
                    _controller = new MultiMT5Controller();

                    var discoveredCount = await _controller.DiscoverAndAttachAllAsync();
                    Console.WriteLine($"✓ Discovered and attached to {discoveredCount} MT5 terminals");

                    // Start health monitoring
                    _controller.StartHealthMonitoring(TimeSpan.FromSeconds(30));
                    Console.WriteLine("✓ Health monitoring started (30s interval)");
                }
                else
                {
                    Console.WriteLine("❌ Non-pool agent mode not supported in this version");
                    return;
                }

                Console.WriteLine();
                Console.WriteLine("Connecting to SCALPERIUM server...");

                // Connect to WebSocket
                await ConnectToServer();

                // Handle Ctrl+C gracefully
                Console.CancelKeyPress += async (sender, e) =>
                {
                    e.Cancel = true;
                    _isRunning = false;
                    Console.WriteLine("\nShutting down pool agent...");
                    await Cleanup();
                    Environment.Exit(0);
                };

                // Keep alive
                Console.WriteLine("\n✓ Pool Agent running. Press Ctrl+C to exit.");
                Console.WriteLine("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

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

        static void LoadConfiguration()
        {
            // Load from environment variables or config file
            _apiKey = Environment.GetEnvironmentVariable("SCALPERIUM_API_KEY") ?? "dev-pool-agent-key";
            _machineId = GetMachineId();
            _vpsName = Environment.GetEnvironmentVariable("VPS_NAME") ?? $"VPS-{_machineId}";
            _vpsRegion = Environment.GetEnvironmentVariable("VPS_REGION") ?? "Unknown";

            if (int.TryParse(Environment.GetEnvironmentVariable("MAX_CAPACITY"), out int capacity))
            {
                _maxCapacity = capacity;
            }

            _isPoolAgent = Environment.GetEnvironmentVariable("IS_POOL_AGENT")?.ToLower() != "false";
        }

        static async Task ConnectToServer()
        {
            var url = new Uri(Environment.GetEnvironmentVariable("SCALPERIUM_WS_URL") ?? "ws://localhost:3001");
            _wsClient = new WebsocketClient(url);

            _wsClient.ReconnectTimeout = TimeSpan.FromSeconds(30);
            _wsClient.ErrorReconnectTimeout = TimeSpan.FromSeconds(60);

            _wsClient.ReconnectionHappened.Subscribe(info =>
            {
                Console.WriteLine($"🔄 Reconnection: {info.Type}");
                if (info.Type != Websocket.Client.Models.ReconnectionType.Initial)
                {
                    Console.WriteLine("[Reconnect] Re-authenticating...");
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

                // Stop timers on disconnect
                _heartbeatTimer?.Dispose();
                _statusUpdateTimer?.Dispose();
            });

            await _wsClient.Start();
        }

        static async Task Authenticate()
        {
            if (_controller == null)
            {
                Console.WriteLine("❌ Controller not initialized");
                return;
            }

            var accountNumbers = _controller.Instances
                .Select(i => i.AccountNumber)
                .ToArray();

            Console.WriteLine($"[Auth] Sending multi_auth with {accountNumbers.Length} accounts");

            var authMessage = new
            {
                type = "multi_auth",
                apiKey = _apiKey,
                machineId = _machineId,
                agentVersion = "2.0.0",
                osVersion = Environment.OSVersion.ToString(),
                // Pool agent specific
                isPoolAgent = true,
                vpsName = _vpsName,
                vpsRegion = _vpsRegion,
                maxCapacity = _maxCapacity,
                accountNumbers = accountNumbers,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            };

            SendMessage(authMessage);
        }

        static void StartTimers()
        {
            // Heartbeat every 10 seconds (less frequent than single agent)
            _heartbeatTimer?.Dispose();
            _heartbeatTimer = new Timer(SendHeartbeat, null, TimeSpan.Zero, TimeSpan.FromSeconds(10));

            // Full status update every 15 seconds (batched)
            _statusUpdateTimer?.Dispose();
            _statusUpdateTimer = new Timer(SendStatusUpdate, null, TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(15));

            Console.WriteLine("✓ Timers started (heartbeat: 10s, status: 15s)");
        }

        static void SendHeartbeat(object? state)
        {
            if (_wsClient?.IsRunning != true || _controller == null) return;

            try
            {
                var allStatuses = _controller.GetAllStatuses();
                var onlineCount = allStatuses.Count(s => s.Status == "online");
                var errorCount = allStatuses.Count(s => s.Status == "error");

                var heartbeat = new
                {
                    type = "multi_heartbeat",
                    agentId = _agentId,
                    vpsName = _vpsName,
                    status = "online",
                    totalAccounts = allStatuses.Count,
                    onlineAccounts = onlineCount,
                    errorAccounts = errorCount,
                    cpuUsage = GetCpuUsage(),
                    memoryUsage = GetMemoryUsage(),
                    timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                };

                SendMessage(heartbeat);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Heartbeat] Error: {ex.Message}");
            }
        }

        static void SendStatusUpdate(object? state)
        {
            if (_wsClient?.IsRunning != true || _controller == null) return;

            try
            {
                var allStatuses = _controller.GetAllStatuses();

                // Build MT5 instance status for each account
                var accounts = allStatuses.Select(s => new
                {
                    accountNumber = s.AccountNumber,
                    status = s.Status,
                    eaStatus = "unknown", // TODO: Get from MT5
                    windowTitle = s.WindowTitle,
                    processId = s.ProcessId,
                    // Account info (TODO: Get from MT5)
                    balance = 0.0,
                    equity = 0.0,
                    margin = 0.0,
                    freeMargin = 0.0,
                    profit = 0.0,
                    // EA info (TODO: Get from MT5)
                    eaLoaded = false,
                    eaRunning = false,
                    eaName = (string?)null,
                    chartSymbol = (string?)null,
                    chartTimeframe = (string?)null,
                    lastActivity = ((DateTimeOffset)s.LastActivity).ToUnixTimeMilliseconds()
                }).ToArray();

                var statusUpdate = new
                {
                    type = "multi_status_update",
                    agentId = _agentId,
                    vpsName = _vpsName,
                    systemInfo = new
                    {
                        cpuUsage = GetCpuUsage(),
                        memoryUsage = GetMemoryUsage(),
                        diskUsage = GetDiskUsage(),
                        mt5InstanceCount = _controller.InstanceCount
                    },
                    accounts = accounts,
                    timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                };

                SendMessage(statusUpdate);
                Console.WriteLine($"[Status] Sent update for {accounts.Length} accounts");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Status] Error: {ex.Message}");
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
                    case "multi_auth_response":
                        await HandleAuthResponse(message);
                        break;

                    case "targeted_command":
                        await HandleTargetedCommand(message);
                        break;

                    case "ping":
                        SendPong();
                        break;

                    default:
                        Console.WriteLine($"⚠️  Unknown message type: {messageType}");
                        break;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[HandleMessage] Error: {ex.Message}");
            }
        }

        static async Task HandleAuthResponse(JObject message)
        {
            bool success = message["success"]?.ToObject<bool>() ?? false;

            if (success)
            {
                _agentId = message["agentId"]?.ToString() ?? "";
                var registeredAccounts = message["registeredAccounts"]?.ToObject<string[]>() ?? Array.Empty<string>();
                var failedAccounts = message["failedAccounts"]?.ToObject<object[]>() ?? Array.Empty<object>();

                Console.WriteLine($"✓ Authenticated as Pool Agent: {_agentId}");
                Console.WriteLine($"✓ Registered: {registeredAccounts.Length} accounts");

                if (failedAccounts.Length > 0)
                {
                    Console.WriteLine($"⚠️  Failed: {failedAccounts.Length} accounts");
                }

                // Start periodic timers
                StartTimers();
            }
            else
            {
                var error = message["error"]?.ToString();
                Console.WriteLine($"❌ Authentication failed: {error}");
                _isRunning = false;
            }

            await Task.CompletedTask;
        }

        static async Task HandleTargetedCommand(JObject message)
        {
            if (_controller == null) return;

            var commandId = message["commandId"]?.ToString() ?? "";
            var targetAccount = message["targetAccount"]?.ToString() ?? "";
            var command = message["command"]?.ToString() ?? "";
            var payload = message["payload"] as JObject;

            Console.WriteLine($"[Command] {command} → {targetAccount} (ID: {commandId})");

            var startTime = DateTime.UtcNow;

            try
            {
                var result = await _controller.ExecuteCommandAsync(targetAccount, command, payload);

                var duration = (int)(DateTime.UtcNow - startTime).TotalMilliseconds;

                var resultMessage = new
                {
                    type = "command_result",
                    agentId = _agentId,
                    commandId = commandId,
                    success = result.Success,
                    result = new
                    {
                        accountNumber = targetAccount,
                        message = result.Message,
                        data = result.Data
                    },
                    error = result.Success ? null : result.Message,
                    timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                };

                SendMessage(resultMessage);

                if (result.Success)
                {
                    Console.WriteLine($"✓ {command} completed on {targetAccount} ({duration}ms)");
                }
                else
                {
                    Console.WriteLine($"❌ {command} failed on {targetAccount}: {result.Message}");
                }
            }
            catch (Exception ex)
            {
                var duration = (int)(DateTime.UtcNow - startTime).TotalMilliseconds;

                var errorMessage = new
                {
                    type = "command_result",
                    agentId = _agentId,
                    commandId = commandId,
                    success = false,
                    error = ex.Message,
                    timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                };

                SendMessage(errorMessage);
                Console.WriteLine($"❌ Exception executing {command}: {ex.Message}");
            }
        }

        static void SendPong()
        {
            var pong = new
            {
                type = "pong",
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            };

            SendMessage(pong);
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
                Console.WriteLine($"[Send] Error: {ex.Message}");
            }
        }

        // System monitoring helpers
        static double GetCpuUsage()
        {
            try
            {
                using var cpuCounter = new System.Diagnostics.PerformanceCounter("Processor", "% Processor Time", "_Total");
                cpuCounter.NextValue(); // First call returns 0
                System.Threading.Thread.Sleep(100);
                return Math.Round(cpuCounter.NextValue(), 2);
            }
            catch
            {
                return 0;
            }
        }

        static double GetMemoryUsage()
        {
            try
            {
                var process = System.Diagnostics.Process.GetCurrentProcess();
                var totalMemory = GC.GetTotalMemory(false);
                var workingSet = process.WorkingSet64;

                // Get system memory
                var computerInfo = new Microsoft.VisualBasic.Devices.ComputerInfo();
                var totalPhysicalMemory = (double)computerInfo.TotalPhysicalMemory;
                var availableMemory = (double)computerInfo.AvailablePhysicalMemory;
                var usedMemory = totalPhysicalMemory - availableMemory;

                return Math.Round((usedMemory / totalPhysicalMemory) * 100, 2);
            }
            catch
            {
                return 0;
            }
        }

        static double GetDiskUsage()
        {
            try
            {
                var drive = new System.IO.DriveInfo("C:");
                var totalSpace = (double)drive.TotalSize;
                var freeSpace = (double)drive.AvailableFreeSpace;
                var usedSpace = totalSpace - freeSpace;

                return Math.Round((usedSpace / totalSpace) * 100, 2);
            }
            catch
            {
                return 0;
            }
        }

        static string GetMachineId()
        {
            return $"{Environment.MachineName}_{Environment.UserName}".Replace(" ", "_");
        }

        static async Task Cleanup()
        {
            Console.WriteLine("Cleaning up resources...");

            _heartbeatTimer?.Dispose();
            _statusUpdateTimer?.Dispose();

            if (_wsClient != null)
            {
                await _wsClient.Stop(System.Net.WebSockets.WebSocketCloseStatus.NormalClosure, "Pool agent shutting down");
                _wsClient.Dispose();
            }

            _controller?.Dispose();

            Console.WriteLine("✓ Cleanup complete");
        }
    }
}
