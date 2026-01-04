# C# Agent Structure

## Directory Organization

```
csharp-agent/
└── MT5AgentAPI/
    ├── Controllers/               # API endpoint controllers
    │   ├── EAController.cs        # EA control endpoints
    │   ├── AccountController.cs   # Account setup endpoints
    │   ├── MarketController.cs    # Market data endpoints
    │   └── TradesController.cs    # Trade sync endpoints
    │
    ├── Services/                  # Business logic layer
    │   ├── MT5ConnectionService.cs     # MT5 integration
    │   ├── EAControlService.cs         # EA management
    │   ├── VPSManagementService.cs     # VPS provisioning
    │   ├── LTCCopierService.cs         # Trade copying
    │   ├── MarketAnalysisService.cs    # Safety indicator
    │   └── WebhookService.cs           # Web app communication
    │
    ├── Models/                    # Data models
    │   └── DTOs.cs                # Data transfer objects
    │
    ├── Middleware/                # Custom middleware
    │   └── ApiKeyAuthMiddleware.cs # API key authentication
    │
    ├── Program.cs                 # Application entry point
    ├── appsettings.json          # Configuration
    ├── appsettings.Development.json  # Dev config (git-ignored)
    └── MT5AgentAPI.csproj        # Project file
```

## Key Components

### Controllers Layer
HTTP API endpoints that handle requests:
- **EAController** - POST /api/ea/control, GET /api/ea/status/{id}
- **AccountController** - POST /api/account/setup
- **MarketController** - GET /api/market/safety
- **TradesController** - POST /api/trades/sync/{id}

### Services Layer
Business logic and external integrations:
- **MT5ConnectionService** - Manages MT5 connections and data fetching
- **EAControlService** - Orchestrates EA start/stop/pause operations
- **VPSManagementService** - Handles VPS provisioning and MT5 installation
- **LTCCopierService** - Configures and manages trade copying
- **MarketAnalysisService** - Calculates safety indicator
- **WebhookService** - Sends updates to web application

### Models
- **DTOs.cs** - Data transfer objects for API requests/responses

### Middleware
- **ApiKeyAuthMiddleware** - Validates X-API-Key header

## Service Dependencies

```
Controllers
    ↓
Services (injected via DI)
    ↓
External Systems (MT5, VPS, Database)
```

## Configuration Structure

**appsettings.json:**
```json
{
  "ApiKey": "secure-key",
  "WebAppUrl": "http://localhost:5173",
  "DatabaseUrl": "connection-string",
  "MT5": {
    "ServerPath": "path-to-mt5",
    "MasterAccountLogin": "login",
    "MasterAccountPassword": "password",
    "MasterAccountServer": "server-name"
  },
  "VPS": {
    "Provider": "AWS|Azure|DigitalOcean",
    "DefaultRegion": "us-east-1"
  }
}
```

## Dependency Injection

Services are registered in `Program.cs`:
```csharp
builder.Services.AddSingleton<MT5ConnectionService>();
builder.Services.AddSingleton<EAControlService>();
builder.Services.AddSingleton<VPSManagementService>();
builder.Services.AddSingleton<LTCCopierService>();
builder.Services.AddSingleton<MarketAnalysisService>();
builder.Services.AddHttpClient<WebhookService>();
```

## API Flow

```
HTTP Request
    ↓
Middleware (API Key Auth)
    ↓
Controller (Route handling)
    ↓
Service (Business logic)
    ↓
External System (MT5/VPS/Database)
    ↓
Response
```

## File Naming Conventions

- **Controllers**: PascalCase + "Controller" suffix
- **Services**: PascalCase + "Service" suffix
- **Models**: PascalCase
- **Middleware**: PascalCase + "Middleware" suffix

## Best Practices

1. **Controllers** should be thin - delegate to services
2. **Services** contain all business logic
3. **Use dependency injection** for all services
4. **Configuration** is read from appsettings.json
5. **Logging** is done via ILogger<T>
6. **Async/await** for all I/O operations
