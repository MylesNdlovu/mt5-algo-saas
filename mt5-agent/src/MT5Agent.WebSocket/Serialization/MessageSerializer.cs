using System.Text.Json;
using System.Text.Json.Serialization;
using MT5Agent.WebSocket.Messages;
using MT5Agent.WebSocket.Messages.ServerMessages;

namespace MT5Agent.WebSocket.Serialization;

/// <summary>
/// Handles JSON serialization/deserialization of WebSocket messages
/// </summary>
public static class MessageSerializer
{
    private static readonly JsonSerializerOptions _options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = false
    };

    /// <summary>
    /// Serialize a message to JSON
    /// </summary>
    public static string Serialize<T>(T message) where T : BaseMessage
    {
        return JsonSerializer.Serialize(message, _options);
    }

    /// <summary>
    /// Deserialize a message from JSON
    /// </summary>
    public static T? Deserialize<T>(string json) where T : class
    {
        return JsonSerializer.Deserialize<T>(json, _options);
    }

    /// <summary>
    /// Get the message type from raw JSON
    /// </summary>
    public static string? GetMessageType(string json)
    {
        try
        {
            using var document = JsonDocument.Parse(json);
            if (document.RootElement.TryGetProperty("type", out var typeProperty))
            {
                return typeProperty.GetString();
            }
        }
        catch
        {
            // Ignore parse errors
        }
        return null;
    }

    /// <summary>
    /// Deserialize a server message based on its type
    /// </summary>
    public static object? DeserializeServerMessage(string json)
    {
        var messageType = GetMessageType(json);
        if (messageType == null) return null;

        return messageType switch
        {
            MessageTypes.Server.AuthResponse => Deserialize<AuthResponseMessage>(json),
            MessageTypes.Server.MultiAuthResponse => Deserialize<MultiAuthResponseMessage>(json),
            MessageTypes.Server.TargetedCommand => Deserialize<TargetedCommandMessage>(json),
            MessageTypes.Server.StartEA => Deserialize<StartEAMessage>(json),
            MessageTypes.Server.StopEA => Deserialize<StopEAMessage>(json),
            MessageTypes.Server.PauseEA => Deserialize<PauseEAMessage>(json),
            MessageTypes.Server.LoadEA => Deserialize<LoadEAMessage>(json),
            MessageTypes.Server.UpdateSettings => Deserialize<UpdateSettingsMessage>(json),
            MessageTypes.Server.SyncTrades => Deserialize<SyncTradesMessage>(json),
            MessageTypes.Server.Ping => Deserialize<PingMessage>(json),
            _ => null
        };
    }
}
