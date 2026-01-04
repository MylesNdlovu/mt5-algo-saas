# C# Agent Setup Guide

## Prerequisites

- .NET 8.0 SDK
- Windows Server (for MT5 compatibility)
- MetaTrader 5 installed
- Gold Scalper EA files
- LTC Copier files

## Installation

### 1. Install .NET SDK

Download and install from https://dotnet.microsoft.com/download

Verify installation:
```bash
dotnet --version
```

### 2. Build the Project

```bash
cd csharp-agent/MT5AgentAPI
dotnet restore
dotnet build
```

### 3. Configuration

Edit `appsettings.json`:

```json
{
  "ApiKey": "your-secure-api-key-here",
  "WebAppUrl": "http://localhost:5173",
  "DatabaseUrl": "Host=localhost;Database=mt5_algo_saas;Username=postgres;Password=password",
  "MT5": {
    "ServerPath": "C:\\Program Files\\MetaTrader 5\\terminal64.exe",
    "DataPath": "C:\\Users\\User\\AppData\\Roaming\\MetaQuotes\\Terminal",
    "MasterAccountLogin": "12345678",
    "MasterAccountPassword": "your-master-password",
    "MasterAccountServer": "Exness-MT5Real"
  },
  "VPS": {
    "Provider": "AWS",
    "DefaultRegion": "us-east-1"
  }
}
```

### 4. MT5 Setup

#### Master Account Setup
1. Install MT5 on master server
2. Login to master account
3. Load Gold Scalper EA on XAUUSD chart
4. Configure EA parameters
5. Enable auto-trading

#### EA Configuration
Copy the Gold Scalper EA files to:
```
C:\Users\User\AppData\Roaming\MetaQuotes\Terminal\[TERMINAL_ID]\MQL5\Experts\
```

#### LTC Copier Installation
1. Install LTC Master on master MT5
2. Configure master copier settings
3. Note the copier identifier for slave configuration

### 5. Run the Agent

Development:
```bash
dotnet run
```

Production:
```bash
dotnet publish -c Release
cd bin/Release/net8.0/publish
dotnet MT5AgentAPI.dll
```

The API will be available at `http://localhost:5000`

## API Endpoints

### EA Control
- `POST /api/ea/control` - Start/Stop/Pause EA
- `GET /api/ea/status/{accountId}` - Get EA status

### Account Management
- `POST /api/account/setup` - Setup new account with VPS

### Market Analysis
- `GET /api/market/safety` - Get safety indicator

### Trade Sync
- `POST /api/trades/sync/{accountId}` - Sync trades to web app

## Architecture

```
┌─────────────────────┐
│   SvelteKit Web App │
└──────────┬──────────┘
           │ REST API
           ▼
┌─────────────────────┐
│   C# API Agent      │
├─────────────────────┤
│ - MT5 Connection    │
│ - VPS Management    │
│ - EA Control        │
│ - LTC Copier        │
│ - Market Analysis   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Master MT5 (Gold Scalper EA)   │
└─────────────────────────────────┘
           │
           │ LTC Copy
           ▼
┌─────────────────────────────────┐
│ Slave MT5 Accounts (User VPS)   │
└─────────────────────────────────┘
```

## Services

### MT5ConnectionService
- Manages MT5 account connections
- Fetches trades and account info
- Handles authentication

### EAControlService
- Controls EA start/stop/pause
- Enforces safety rules
- Coordinates with market analysis

### VPSManagementService
- Provisions VPS instances
- Installs MT5 on VPS
- Manages VPS health

### LTCCopierService
- Configures slave copiers
- Manages copy relationships
- Controls copy parameters

### MarketAnalysisService
- Analyzes market conditions
- Calculates safety indicator
- Monitors volatility and spread

## Safety Indicator Logic

### GREEN (Safe)
- Volatility < 4
- Spread < 1.5 pips
- No high-impact news

### ORANGE (Caution)
- Volatility 4-7
- Spread 1.5-3 pips
- Moderate conditions

### RED (Unsafe)
- Volatility > 7
- Spread > 3 pips
- High-impact news detected
- EA trading disabled

## Production Deployment

### Windows Service Setup

1. Publish the application:
```bash
dotnet publish -c Release --self-contained true -r win-x64
```

2. Install as Windows Service:
```bash
sc create MT5AgentAPI binPath="C:\path\to\MT5AgentAPI.exe"
sc start MT5AgentAPI
```

### VPS Provider Integration

Configure your VPS provider API credentials:
- AWS: IAM credentials in environment variables
- Azure: Service principal credentials
- DigitalOcean: API token

## Monitoring

### Health Check
```bash
curl http://localhost:5000/health
```

### Logs
Logs are written to console and can be redirected to file:
```bash
dotnet MT5AgentAPI.dll > logs/agent.log 2>&1
```

## Troubleshooting

### MT5 Connection Issues
- Verify MT5 is running
- Check login credentials
- Ensure terminal allows API connections

### VPS Provisioning Fails
- Check cloud provider credentials
- Verify API limits not exceeded
- Check network connectivity

### LTC Copier Not Working
- Verify master copier is running
- Check copier configuration
- Ensure slave has network access to master
