using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using MT5Agent.Core.Models;
using MT5Agent.WebSocket.Messages;

namespace MT5Agent.WebSocket;

/// <summary>
/// WebSocket client for communication with the web app server
/// </summary>
public class WebSocketClient : IDisposable
{
    private readonly ILogger<WebSocketClient> _logger;
    private readonly AgentConfiguration _config;
    private ClientWebSocket? _webSocket;
    private CancellationTokenSource? _receiveCts;
    private bool _isDisposed;
    private string? _agentId;

    /// <summary>
    /// Whether the WebSocket is currently connected
    /// </summary>
    public bool IsConnected => _webSocket?.State == WebSocketState.Open;

    /// <summary>
    /// Agent ID assigned by server after authentication
    /// </summary>
    public string? AgentId => _agentId;

    /// <summary>
    /// Event raised when a message is received from the server
    /// </summary>
    public event EventHandler<MessageReceivedEventArgs>? MessageReceived;

    /// <summary>
    /// Event raised when connection state changes
    /// </summary>
    public event EventHandler<ConnectionStateChangedEventArgs>? ConnectionStateChanged;

    /// <summary>
    /// Event raised when authentication completes
    /// </summary>
    public event EventHandler<AuthenticationResultEventArgs>? AuthenticationCompleted;

    public WebSocketClient(ILogger<WebSocketClient> logger, AgentConfiguration config)
    {
        _logger = logger;
        _config = config;
    }

    /// <summary>
    /// Connect to the WebSocket server
    /// </summary>
    public async Task ConnectAsync(CancellationToken cancellationToken = default)
    {
        if (IsConnected)
        {
            _logger.LogWarning("Already connected to WebSocket server");
            return;
        }

        _webSocket?.Dispose();
        _webSocket = new ClientWebSocket();

        try
        {
            _logger.LogInformation("Connecting to WebSocket server: {Url}", _config.WebSocketUrl);

            var uri = new Uri(_config.WebSocketUrl);
            await _webSocket.ConnectAsync(uri, cancellationToken);

            _logger.LogInformation("Connected to WebSocket server");
            OnConnectionStateChanged(true);

            // Start receiving messages
            _receiveCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            _ = ReceiveLoopAsync(_receiveCts.Token);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to connect to WebSocket server");
            OnConnectionStateChanged(false);
            throw;
        }
    }

    /// <summary>
    /// Disconnect from the WebSocket server
    /// </summary>
    public async Task DisconnectAsync()
    {
        if (_webSocket == null) return;

        try
        {
            _receiveCts?.Cancel();

            if (_webSocket.State == WebSocketState.Open)
            {
                await _webSocket.CloseAsync(
                    WebSocketCloseStatus.NormalClosure,
                    "Client disconnecting",
                    CancellationToken.None);
            }

            _logger.LogInformation("Disconnected from WebSocket server");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error during disconnect");
        }
        finally
        {
            OnConnectionStateChanged(false);
        }
    }

    /// <summary>
    /// Send a message to the server
    /// </summary>
    public async Task SendAsync<T>(T message, CancellationToken cancellationToken = default) where T : BaseMessage
    {
        if (!IsConnected)
        {
            throw new InvalidOperationException("WebSocket is not connected");
        }

        var json = JsonSerializer.Serialize(message, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        });

        var bytes = Encoding.UTF8.GetBytes(json);
        var segment = new ArraySegment<byte>(bytes);

        await _webSocket!.SendAsync(segment, WebSocketMessageType.Text, true, cancellationToken);

        _logger.LogDebug("Sent message: {Type}", message.Type);
    }

    /// <summary>
    /// Send raw JSON string to the server
    /// </summary>
    public async Task SendRawAsync(string json, CancellationToken cancellationToken = default)
    {
        if (!IsConnected)
        {
            throw new InvalidOperationException("WebSocket is not connected");
        }

        var bytes = Encoding.UTF8.GetBytes(json);
        var segment = new ArraySegment<byte>(bytes);

        await _webSocket!.SendAsync(segment, WebSocketMessageType.Text, true, cancellationToken);
    }

    /// <summary>
    /// Set the agent ID after successful authentication
    /// </summary>
    public void SetAgentId(string agentId)
    {
        _agentId = agentId;
    }

    private async Task ReceiveLoopAsync(CancellationToken cancellationToken)
    {
        var buffer = new byte[8192];
        var messageBuilder = new StringBuilder();

        try
        {
            while (!cancellationToken.IsCancellationRequested && IsConnected)
            {
                var result = await _webSocket!.ReceiveAsync(
                    new ArraySegment<byte>(buffer),
                    cancellationToken);

                if (result.MessageType == WebSocketMessageType.Close)
                {
                    _logger.LogInformation("Server closed connection: {Status} {Description}",
                        result.CloseStatus, result.CloseStatusDescription);
                    break;
                }

                if (result.MessageType == WebSocketMessageType.Text)
                {
                    messageBuilder.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));

                    if (result.EndOfMessage)
                    {
                        var message = messageBuilder.ToString();
                        messageBuilder.Clear();

                        ProcessMessage(message);
                    }
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Normal cancellation
        }
        catch (WebSocketException ex)
        {
            _logger.LogError(ex, "WebSocket error in receive loop");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in receive loop");
        }
        finally
        {
            OnConnectionStateChanged(false);
        }
    }

    private void ProcessMessage(string json)
    {
        try
        {
            using var document = JsonDocument.Parse(json);
            var root = document.RootElement;

            if (!root.TryGetProperty("type", out var typeProperty))
            {
                _logger.LogWarning("Received message without type: {Json}", json);
                return;
            }

            var messageType = typeProperty.GetString();
            _logger.LogDebug("Received message: {Type}", messageType);

            // Handle authentication responses specially
            if (messageType == MessageTypes.Server.AuthResponse ||
                messageType == MessageTypes.Server.MultiAuthResponse)
            {
                HandleAuthResponse(json, messageType);
                return;
            }

            // Handle ping
            if (messageType == MessageTypes.Server.Ping)
            {
                HandlePing();
                return;
            }

            // Raise event for other messages
            MessageReceived?.Invoke(this, new MessageReceivedEventArgs(messageType!, json));
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse message: {Json}", json);
        }
    }

    private void HandleAuthResponse(string json, string? messageType)
    {
        try
        {
            if (messageType == MessageTypes.Server.MultiAuthResponse)
            {
                var response = JsonSerializer.Deserialize<Messages.ServerMessages.MultiAuthResponseMessage>(json,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (response != null)
                {
                    if (response.Success && response.AgentId != null)
                    {
                        _agentId = response.AgentId;
                        _logger.LogInformation("Authentication successful. Agent ID: {AgentId}", _agentId);
                    }
                    else
                    {
                        _logger.LogError("Authentication failed: {Error}", response.Error);
                    }

                    AuthenticationCompleted?.Invoke(this, new AuthenticationResultEventArgs(
                        response.Success,
                        response.AgentId,
                        response.Error,
                        response.RegisteredAccounts,
                        response.FailedAccounts?.Select(f => (f.AccountNumber, f.Reason)).ToList()));
                }
            }
            else
            {
                var response = JsonSerializer.Deserialize<Messages.ServerMessages.AuthResponseMessage>(json,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (response != null)
                {
                    if (response.Success && response.AgentId != null)
                    {
                        _agentId = response.AgentId;
                        _logger.LogInformation("Authentication successful. Agent ID: {AgentId}", _agentId);
                    }
                    else
                    {
                        _logger.LogError("Authentication failed: {Error}", response.Error);
                    }

                    AuthenticationCompleted?.Invoke(this, new AuthenticationResultEventArgs(
                        response.Success,
                        response.AgentId,
                        response.Error));
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling auth response");
        }
    }

    private async void HandlePing()
    {
        // Respond to ping with a heartbeat or pong
        _logger.LogDebug("Received ping from server");
        // The heartbeat service will handle regular heartbeats
    }

    private void OnConnectionStateChanged(bool isConnected)
    {
        ConnectionStateChanged?.Invoke(this, new ConnectionStateChangedEventArgs(isConnected));
    }

    public void Dispose()
    {
        if (_isDisposed) return;
        _isDisposed = true;

        _receiveCts?.Cancel();
        _receiveCts?.Dispose();
        _webSocket?.Dispose();
    }
}

/// <summary>
/// Event args for received messages
/// </summary>
public class MessageReceivedEventArgs : EventArgs
{
    public string MessageType { get; }
    public string RawJson { get; }

    public MessageReceivedEventArgs(string messageType, string rawJson)
    {
        MessageType = messageType;
        RawJson = rawJson;
    }
}

/// <summary>
/// Event args for connection state changes
/// </summary>
public class ConnectionStateChangedEventArgs : EventArgs
{
    public bool IsConnected { get; }

    public ConnectionStateChangedEventArgs(bool isConnected)
    {
        IsConnected = isConnected;
    }
}

/// <summary>
/// Event args for authentication result
/// </summary>
public class AuthenticationResultEventArgs : EventArgs
{
    public bool Success { get; }
    public string? AgentId { get; }
    public string? Error { get; }
    public List<string>? RegisteredAccounts { get; }
    public List<(string AccountNumber, string Reason)>? FailedAccounts { get; }

    public AuthenticationResultEventArgs(
        bool success,
        string? agentId,
        string? error,
        List<string>? registeredAccounts = null,
        List<(string AccountNumber, string Reason)>? failedAccounts = null)
    {
        Success = success;
        AgentId = agentId;
        Error = error;
        RegisteredAccounts = registeredAccounts;
        FailedAccounts = failedAccounts;
    }
}
