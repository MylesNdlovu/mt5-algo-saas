using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MT5Agent.Core.Interfaces;
using MT5Agent.Core.Models;
using MT5Agent.WebSocket;
using MT5Agent.WebSocket.Messages;
using MT5Agent.WebSocket.Messages.AgentMessages;
using MT5Agent.WebSocket.Messages.ServerMessages;
using MT5Agent.WebSocket.Serialization;
using System.Reflection;

namespace MT5Agent.Service;

/// <summary>
/// Main background worker for the MT5 Agent service
/// </summary>
public class AgentWorker : BackgroundService
{
    private readonly ILogger<AgentWorker> _logger;
    private readonly WebSocketClient _wsClient;
    private readonly AgentConfiguration _config;
    private readonly IMT5InstanceManager _instanceManager;
    private readonly IEABridgeClient _bridgeClient;
    private string? _agentId;
    private bool _isAuthenticated;
    private Timer? _heartbeatTimer;
    private Timer? _statusTimer;
    private Timer? _bridgePollingTimer;

    public AgentWorker(
        ILogger<AgentWorker> logger,
        WebSocketClient wsClient,
        AgentConfiguration config,
        IMT5InstanceManager instanceManager,
        IEABridgeClient bridgeClient)
    {
        _logger = logger;
        _wsClient = wsClient;
        _config = config;
        _instanceManager = instanceManager;
        _bridgeClient = bridgeClient;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("MT5 Agent Worker starting...");
        _logger.LogInformation("VPS Name: {VpsName}", _config.VpsName);
        _logger.LogInformation("Machine ID: {MachineId}", _config.MachineId);
        _logger.LogInformation("Pool Agent: {IsPoolAgent}", _config.IsPoolAgent);
        _logger.LogInformation("Max Capacity: {MaxCapacity}", _config.MaxCapacity);

        // Register event handlers
        _wsClient.MessageReceived += OnMessageReceived;
        _wsClient.ConnectionStateChanged += OnConnectionStateChanged;
        _wsClient.AuthenticationCompleted += OnAuthenticationCompleted;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ConnectAndRunAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Connection error, reconnecting in {Delay}ms", _config.ReconnectDelayMs);
                await Task.Delay(_config.ReconnectDelayMs, stoppingToken);
            }
        }

        _logger.LogInformation("MT5 Agent Worker stopping...");
        await ShutdownAsync();
    }

    private async Task ConnectAndRunAsync(CancellationToken stoppingToken)
    {
        // Connect to WebSocket server
        await _wsClient.ConnectAsync(stoppingToken);

        // Send authentication message
        await AuthenticateAsync();

        // Wait for authentication result
        var authTimeout = Task.Delay(10000, stoppingToken);
        while (!_isAuthenticated && !authTimeout.IsCompleted)
        {
            await Task.Delay(100, stoppingToken);
        }

        if (!_isAuthenticated)
        {
            throw new Exception("Authentication timeout");
        }

        // Start heartbeat timer
        _heartbeatTimer = new Timer(
            async _ => await SendHeartbeatAsync(),
            null,
            _config.HeartbeatIntervalMs,
            _config.HeartbeatIntervalMs);

        // Start status update timer (less frequent than heartbeat)
        _statusTimer = new Timer(
            async _ => await SendStatusUpdateAsync(),
            null,
            15000, // 15 seconds
            15000);

        // Start bridge polling timer (for trade events and status updates)
        _bridgePollingTimer = new Timer(
            async _ => await PollBridgeEventsAsync(),
            null,
            2000, // Start after 2 seconds
            2000); // Every 2 seconds

        // Keep running until disconnected
        while (_wsClient.IsConnected && !stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(1000, stoppingToken);
        }
    }

    private async Task AuthenticateAsync()
    {
        _logger.LogInformation("Sending authentication message...");

        var accountNumbers = _instanceManager.Instances.Select(i => i.AccountNumber).ToList();

        var authMessage = new MultiAuthMessage
        {
            ApiKey = _config.ApiKey,
            MachineId = _config.MachineId,
            AgentVersion = GetAgentVersion(),
            OsVersion = Environment.OSVersion.ToString(),
            IsPoolAgent = _config.IsPoolAgent,
            VpsName = _config.VpsName,
            VpsRegion = _config.VpsRegion,
            MaxCapacity = _config.MaxCapacity,
            AccountNumbers = accountNumbers
        };

        await _wsClient.SendAsync(authMessage);
    }

    private async Task SendHeartbeatAsync()
    {
        if (!_wsClient.IsConnected || string.IsNullOrEmpty(_agentId)) return;

        try
        {
            var instances = _instanceManager.Instances;
            var onlineCount = instances.Count(i => i.Status == MT5InstanceStatus.Online);
            var errorCount = instances.Count(i => i.Status == MT5InstanceStatus.Error);

            var heartbeat = new MultiHeartbeatMessage
            {
                AgentId = _agentId,
                VpsName = _config.VpsName,
                Status = "online",
                TotalAccounts = instances.Count,
                OnlineAccounts = onlineCount,
                ErrorAccounts = errorCount,
                CpuUsage = GetCpuUsage(),
                MemoryUsage = GetMemoryUsage()
            };

            await _wsClient.SendAsync(heartbeat);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send heartbeat");
        }
    }

    private async Task SendStatusUpdateAsync()
    {
        if (!_wsClient.IsConnected || string.IsNullOrEmpty(_agentId)) return;

        try
        {
            var instances = _instanceManager.Instances;

            var statusUpdate = new MultiStatusUpdateMessage
            {
                AgentId = _agentId,
                VpsName = _config.VpsName,
                SystemInfo = new SystemInfoDto
                {
                    CpuUsage = GetCpuUsage(),
                    MemoryUsage = GetMemoryUsage(),
                    DiskUsage = GetDiskUsage(),
                    Mt5InstanceCount = instances.Count
                },
                Accounts = instances.Select(i => new MT5InstanceStatusDto
                {
                    AccountNumber = i.AccountNumber,
                    Status = i.Status.ToString().ToLowerInvariant(),
                    EaStatus = i.EAStatus?.Running == true ? "running" : "stopped",
                    WindowTitle = i.WindowTitle,
                    ProcessId = i.ProcessId > 0 ? i.ProcessId : null,
                    Balance = i.AccountInfo.Balance,
                    Equity = i.AccountInfo.Equity,
                    Margin = i.AccountInfo.Margin,
                    FreeMargin = i.AccountInfo.FreeMargin,
                    Profit = i.AccountInfo.Profit,
                    Broker = i.Broker,
                    ServerName = i.ServerName,
                    EaLoaded = i.EAStatus?.Loaded ?? false,
                    EaRunning = i.EAStatus?.Running ?? false,
                    EaName = _config.EADisplayName, // Hide real EA name from users
                    ChartSymbol = i.EAStatus?.Symbol,
                    ChartTimeframe = i.EAStatus?.Timeframe,
                    SafetyIndicator = i.IndicatorSignal.ToMessageString(),
                    IndicatorScore = i.IndicatorScore,
                    LastActivity = new DateTimeOffset(i.LastActivity).ToUnixTimeMilliseconds()
                }).ToList()
            };

            await _wsClient.SendAsync(statusUpdate);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send status update");
        }
    }

    private async Task PollBridgeEventsAsync()
    {
        try
        {
            foreach (var instance in _instanceManager.Instances)
            {
                if (string.IsNullOrEmpty(instance.DataFolder)) continue;

                // Get trade events
                var events = await _bridgeClient.GetTradeEventsAsync(instance.DataFolder, instance.MagicNumber);
                foreach (var evt in events)
                {
                    await SendTradeEventAsync(instance.AccountNumber, evt);
                }

                // Update instance indicator status
                var signal = await _bridgeClient.GetIndicatorSignalAsync(instance.DataFolder, instance.MagicNumber);
                var score = await _bridgeClient.GetIndicatorScoreAsync(instance.DataFolder, instance.MagicNumber);

                if (instance.IndicatorSignal != signal)
                {
                    var oldSignal = instance.IndicatorSignal;
                    instance.IndicatorSignal = signal;
                    instance.IndicatorScore = score;
                    instance.LastActivity = DateTime.UtcNow;

                    // Send indicator change notification
                    await SendIndicatorChangeAsync(instance.AccountNumber, oldSignal, signal, score);

                    // AUTO-CONTROL: Stop/Start EA based on indicator signal
                    if (_config.AutoControlEA)
                    {
                        await AutoControlEABySignalAsync(instance, oldSignal, signal);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Error polling bridge events");
        }
    }

    /// <summary>
    /// Automatically controls EA trading based on indicator signal.
    /// RED = Stop trading AND close all positions (market is choppy/unpredictable)
    /// ORANGE/GREEN = Allow trading
    /// </summary>
    private async Task AutoControlEABySignalAsync(MT5Instance instance, SafetyIndicator oldSignal, SafetyIndicator newSignal)
    {
        try
        {
            // Signal went RED - STOP the EA AND CLOSE ALL TRADES to prevent further losses
            if (newSignal == SafetyIndicator.Red && oldSignal != SafetyIndicator.Red)
            {
                _logger.LogWarning(
                    "SAFETY: Stopping EA and closing trades for account {Account} - Market conditions deteriorated (Score: {Score}%)",
                    instance.AccountNumber, instance.IndicatorScore);

                // First, stop the EA from opening new trades
                var stopped = await _bridgeClient.StopTradingAsync(instance.DataFolder!, instance.MagicNumber);
                if (stopped)
                {
                    instance.EAStatus.Running = false;
                    instance.EAStatus.StoppedByIndicator = true;
                    instance.EAStatus.StoppedByIndicatorAt = DateTime.UtcNow;
                    _logger.LogInformation("EA stopped for account {Account} due to RED signal", instance.AccountNumber);
                }

                // Then, close all outstanding trades to cut losses
                // EA typically has 2-3 trades open at any time, max $5 loss per trade
                if (_config.CloseTradesOnRedSignal)
                {
                    _logger.LogWarning("SAFETY: Closing all open positions for account {Account}", instance.AccountNumber);
                    var closed = await _bridgeClient.CloseAllPositionsAsync(instance.DataFolder!, instance.MagicNumber);
                    if (closed)
                    {
                        _logger.LogInformation("All positions closed for account {Account} - protecting from choppy market",
                            instance.AccountNumber);
                    }
                    else
                    {
                        _logger.LogError("Failed to close positions for account {Account}", instance.AccountNumber);
                    }
                }
            }
            // Signal improved from RED - RESUME the EA (only if we stopped it)
            else if (oldSignal == SafetyIndicator.Red && newSignal != SafetyIndicator.Red)
            {
                // Only resume if we were the ones who stopped it
                if (instance.EAStatus.StoppedByIndicator)
                {
                    _logger.LogInformation(
                        "SAFETY: Resuming EA for account {Account} - Market conditions improved to {Signal} (Score: {Score}%)",
                        instance.AccountNumber, newSignal, instance.IndicatorScore);

                    var started = await _bridgeClient.StartTradingAsync(instance.DataFolder!, instance.MagicNumber);
                    if (started)
                    {
                        instance.EAStatus.Running = true;
                        instance.EAStatus.StoppedByIndicator = false;
                        instance.EAStatus.StoppedByIndicatorAt = null;
                        _logger.LogInformation("EA resumed for account {Account} - Signal: {Signal}",
                            instance.AccountNumber, newSignal);
                    }
                    else
                    {
                        _logger.LogError("Failed to resume EA for account {Account}", instance.AccountNumber);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in auto-control EA for account {Account}", instance.AccountNumber);
        }
    }

    private async Task SendTradeEventAsync(string accountNumber, TradeEvent evt)
    {
        if (!_wsClient.IsConnected || string.IsNullOrEmpty(_agentId)) return;

        var tradeUpdate = new TradeUpdateMessage
        {
            AgentId = _agentId,
            AccountNumber = accountNumber,
            Action = evt.Type == TradeEventType.Opened ? "opened" : "closed",
            Trade = new TradeInfoDto
            {
                Ticket = evt.Ticket,
                Type = evt.TradeType == TradeType.Buy ? "BUY" : "SELL",
                Volume = evt.Volume,
                OpenPrice = evt.Price,
                Profit = evt.Profit ?? 0,
                StopLoss = evt.StopLoss,
                TakeProfit = evt.TakeProfit
            }
        };

        await _wsClient.SendAsync(tradeUpdate);
    }

    private async Task SendIndicatorChangeAsync(string accountNumber, SafetyIndicator oldSignal, SafetyIndicator newSignal, double score)
    {
        if (!_wsClient.IsConnected || string.IsNullOrEmpty(_agentId)) return;

        var indicatorUpdate = new IndicatorUpdateMessage
        {
            AgentId = _agentId,
            AccountNumber = accountNumber,
            OldSignal = oldSignal.ToMessageString(),
            NewSignal = newSignal.ToMessageString(),
            Score = score
        };

        await _wsClient.SendAsync(indicatorUpdate);
    }

    private void OnMessageReceived(object? sender, MessageReceivedEventArgs e)
    {
        _logger.LogDebug("Received message: {Type}", e.MessageType);

        try
        {
            // Handle targeted commands for pool agents
            if (e.MessageType == MessageTypes.Server.TargetedCommand)
            {
                var command = MessageSerializer.Deserialize<TargetedCommandMessage>(e.RawJson);
                if (command != null)
                {
                    _ = HandleTargetedCommandAsync(command);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling message: {Type}", e.MessageType);
        }
    }

    private async Task HandleTargetedCommandAsync(TargetedCommandMessage command)
    {
        _logger.LogInformation("Handling command: {Command} for account: {Account}",
            command.Command, command.TargetAccount);

        var result = new CommandResultMessage
        {
            AgentId = _agentId!,
            CommandId = command.CommandId,
            TargetAccount = command.TargetAccount
        };

        try
        {
            // Find the target instance
            var instance = _instanceManager.GetInstance(command.TargetAccount);

            switch (command.Command)
            {
                case TargetedCommands.ProvisionAccount:
                    // Handle new user provisioning
                    var provisionResult = await ProvisionNewAccountAsync(command.Payload);
                    result.Success = provisionResult.success;
                    result.Error = provisionResult.error;
                    break;

                case TargetedCommands.StartEA:
                    if (instance == null)
                    {
                        result.Success = false;
                        result.Error = "Account not found";
                    }
                    else if (string.IsNullOrEmpty(instance.DataFolder))
                    {
                        result.Success = false;
                        result.Error = "Instance not properly provisioned";
                    }
                    else
                    {
                        result.Success = await _bridgeClient.StartTradingAsync(instance.DataFolder, instance.MagicNumber);
                        if (result.Success)
                        {
                            instance.EAStatus = new EAStatus { Running = true, Loaded = true };
                        }
                    }
                    break;

                case TargetedCommands.StopEA:
                    if (instance != null && !string.IsNullOrEmpty(instance.DataFolder))
                    {
                        result.Success = await _bridgeClient.StopTradingAsync(instance.DataFolder, instance.MagicNumber);
                        if (result.Success)
                        {
                            instance.EAStatus = new EAStatus { Running = false, Loaded = true };
                        }
                    }
                    else
                    {
                        result.Success = false;
                        result.Error = "Account not found";
                    }
                    break;

                case TargetedCommands.PauseEA:
                    if (instance != null && !string.IsNullOrEmpty(instance.DataFolder))
                    {
                        result.Success = await _bridgeClient.PauseTradingAsync(instance.DataFolder, instance.MagicNumber);
                        if (result.Success && instance.EAStatus != null)
                        {
                            instance.EAStatus.Paused = true;
                        }
                    }
                    else
                    {
                        result.Success = false;
                        result.Error = "Account not found";
                    }
                    break;

                case TargetedCommands.ResumeEA:
                    if (instance != null && !string.IsNullOrEmpty(instance.DataFolder))
                    {
                        result.Success = await _bridgeClient.ResumeTradingAsync(instance.DataFolder, instance.MagicNumber);
                        if (result.Success && instance.EAStatus != null)
                        {
                            instance.EAStatus.Paused = false;
                        }
                    }
                    else
                    {
                        result.Success = false;
                        result.Error = "Account not found";
                    }
                    break;

                case TargetedCommands.CloseAllTrades:
                    if (instance != null && !string.IsNullOrEmpty(instance.DataFolder))
                    {
                        result.Success = await _bridgeClient.CloseAllPositionsAsync(instance.DataFolder, instance.MagicNumber);
                    }
                    else
                    {
                        result.Success = false;
                        result.Error = "Account not found";
                    }
                    break;

                case TargetedCommands.GetStatus:
                    if (instance != null)
                    {
                        result.Success = true;
                        result.Result = new
                        {
                            instance.Status,
                            instance.EAStatus,
                            instance.AccountInfo,
                            instance.IndicatorSignal,
                            instance.IndicatorScore
                        };
                    }
                    else
                    {
                        result.Success = false;
                        result.Error = "Account not found";
                    }
                    break;

                case TargetedCommands.UpdateSettings:
                    if (instance != null && !string.IsNullOrEmpty(instance.DataFolder) && command.Payload != null)
                    {
                        var settings = command.Payload.ToDictionary(
                            kvp => kvp.Key,
                            kvp => kvp.Value);
                        result.Success = await _bridgeClient.UpdateSettingsAsync(instance.DataFolder, instance.MagicNumber, settings);
                    }
                    else
                    {
                        result.Success = false;
                        result.Error = "Account not found or invalid payload";
                    }
                    break;

                default:
                    result.Success = false;
                    result.Error = $"Unknown command: {command.Command}";
                    break;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing command: {Command}", command.Command);
            result.Success = false;
            result.Error = ex.Message;
        }

        await _wsClient.SendAsync(result);
    }

    private async Task<(bool success, string? error)> ProvisionNewAccountAsync(Dictionary<string, object>? payload)
    {
        if (payload == null)
            return (false, "Missing payload");

        _logger.LogInformation("Provisioning new MT5 account...");

        // Extract account details from payload
        var accountNumber = payload.GetValueOrDefault("accountNumber")?.ToString();
        var broker = payload.GetValueOrDefault("broker")?.ToString();
        var serverName = payload.GetValueOrDefault("serverName")?.ToString();
        var login = payload.GetValueOrDefault("login")?.ToString();
        var password = payload.GetValueOrDefault("password")?.ToString();
        var userId = payload.GetValueOrDefault("userId")?.ToString();

        if (string.IsNullOrEmpty(accountNumber) || string.IsNullOrEmpty(broker) ||
            string.IsNullOrEmpty(serverName) || string.IsNullOrEmpty(login))
        {
            _logger.LogError("Missing required account details for provisioning");
            return (false, "Missing required account details");
        }

        // Check capacity
        if (_instanceManager.Instances.Count >= _config.MaxCapacity)
        {
            _logger.LogWarning("Agent at maximum capacity: {Count}/{Max}",
                _instanceManager.Instances.Count, _config.MaxCapacity);
            return (false, "Agent at maximum capacity");
        }

        // Use instance manager for full provisioning
        var credentials = new MT5AccountCredentials
        {
            AccountNumber = accountNumber,
            Broker = broker,
            ServerName = serverName,
            Login = login,
            Password = password ?? string.Empty,
            UserId = userId ?? string.Empty
        };

        var result = await _instanceManager.ProvisionAccountAsync(credentials);

        if (result.Success)
        {
            _logger.LogInformation("Account {AccountNumber} provisioned successfully", accountNumber);
            return (true, null);
        }
        else
        {
            _logger.LogError("Failed to provision account {AccountNumber}: {Error}",
                accountNumber, result.Error);
            return (false, result.Error);
        }
    }

    private void OnConnectionStateChanged(object? sender, ConnectionStateChangedEventArgs e)
    {
        _logger.LogInformation("Connection state changed: {IsConnected}", e.IsConnected);

        if (!e.IsConnected)
        {
            _isAuthenticated = false;
            _agentId = null;
            _heartbeatTimer?.Dispose();
            _statusTimer?.Dispose();
            _bridgePollingTimer?.Dispose();
        }
    }

    private void OnAuthenticationCompleted(object? sender, AuthenticationResultEventArgs e)
    {
        _isAuthenticated = e.Success;
        _agentId = e.AgentId;

        if (e.Success)
        {
            _logger.LogInformation("Authentication successful. Agent ID: {AgentId}", e.AgentId);

            if (e.RegisteredAccounts?.Any() == true)
            {
                _logger.LogInformation("Registered accounts: {Accounts}",
                    string.Join(", ", e.RegisteredAccounts));
            }

            if (e.FailedAccounts?.Any() == true)
            {
                foreach (var (account, reason) in e.FailedAccounts)
                {
                    _logger.LogWarning("Failed to register account {Account}: {Reason}", account, reason);
                }
            }
        }
        else
        {
            _logger.LogError("Authentication failed: {Error}", e.Error);
        }
    }

    private async Task ShutdownAsync()
    {
        _heartbeatTimer?.Dispose();
        _statusTimer?.Dispose();
        _bridgePollingTimer?.Dispose();

        // Stop all MT5 instances
        await _instanceManager.ShutdownAllAsync();

        await _wsClient.DisconnectAsync();
    }

    private static string GetAgentVersion()
    {
        return Assembly.GetExecutingAssembly()
            .GetName()
            .Version?
            .ToString() ?? "1.0.0";
    }

    private static double GetCpuUsage()
    {
        // TODO: Implement actual CPU monitoring
        return 0;
    }

    private static double GetMemoryUsage()
    {
        // TODO: Implement actual memory monitoring
        var process = System.Diagnostics.Process.GetCurrentProcess();
        var totalMemory = GC.GetTotalMemory(false);
        return Math.Round((double)totalMemory / (1024 * 1024), 2); // MB
    }

    private static double GetDiskUsage()
    {
        // TODO: Implement actual disk monitoring
        return 0;
    }
}
