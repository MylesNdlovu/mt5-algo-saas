# MT5 Algo Trading SaaS - API Documentation

## Base URL
```
https://api.yourdomain.com
```

## Authentication

All API requests require authentication using either:

1. **Cookie-based (Web App)**
   - JWT token stored in HTTP-only cookie
   - Automatically sent with requests

2. **API Key (C# Agent)**
   - Include in header: `X-API-Key: your-api-key`

## Web Application API

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "userType": "DIRECT",
  "ibCode": "IB123" // optional, for IB clients
}
```

**Response**
```json
{
  "success": true,
  "token": "jwt-token-here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "USER",
    "userType": "DIRECT"
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "USER",
    "userType": "DIRECT"
  }
}
```

#### Logout
```http
POST /api/auth/logout
```

### EA Control Endpoints

#### Control EA
```http
POST /api/ea/control
Content-Type: application/json
Cookie: auth_token=jwt-token

{
  "accountId": "uuid",
  "action": "start" // start, stop, pause
}
```

**Response**
```json
{
  "success": true,
  "status": "RUNNING",
  "safetyIndicator": "GREEN",
  "message": "EA started successfully"
}
```

**Error Response (RED Indicator)**
```json
{
  "error": "Cannot start EA: Market conditions are unsafe (RED indicator)"
}
```

### Account Endpoints

#### Get User Accounts
```http
GET /api/user/accounts
Cookie: auth_token=jwt-token
```

**Response**
```json
[
  {
    "id": "uuid",
    "accountNumber": "12345678",
    "broker": "Exness",
    "balance": 1000.00,
    "equity": 1050.00,
    "eaStatus": "RUNNING",
    "safetyIndicator": "GREEN"
  }
]
```

#### Get Account Details
```http
GET /api/account/{accountId}
Cookie: auth_token=jwt-token
```

**Response**
```json
{
  "account": {
    "id": "uuid",
    "accountNumber": "12345678",
    "broker": "Exness",
    "balance": 1000.00,
    "equity": 1050.00,
    "eaStatus": "RUNNING",
    "safetyIndicator": "GREEN"
  },
  "pnl": {
    "total": 50.00,
    "profit": 75.00,
    "commission": -20.00,
    "swap": -5.00
  },
  "trades": {
    "open": [...],
    "closed": [...]
  }
}
```

### Admin Endpoints

#### Get System Stats
```http
GET /api/admin/stats
Cookie: auth_token=jwt-token (ADMIN role required)
```

**Response**
```json
{
  "totalUsers": 150,
  "activeAccounts": 120,
  "totalIBs": 10,
  "runningEAs": 85,
  "totalPL": 12500.50
}
```

#### Get All Users
```http
GET /api/admin/users
Cookie: auth_token=jwt-token (ADMIN role required)
```

**Response**
```json
[
  {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "USER",
    "userType": "DIRECT",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "lastLoginAt": "2024-01-15T10:30:00Z"
  }
]
```

#### Toggle User Status
```http
POST /api/admin/users/{userId}/toggle
Content-Type: application/json
Cookie: auth_token=jwt-token (ADMIN role required)

{
  "isActive": false
}
```

## C# Agent API

### EA Control

#### Control EA
```http
POST /api/ea/control
Content-Type: application/json
X-API-Key: your-api-key

{
  "accountId": "uuid",
  "action": "start"
}
```

**Response**
```json
{
  "accountId": "uuid",
  "status": "RUNNING",
  "safetyIndicator": "GREEN",
  "message": "EA started successfully"
}
```

#### Get EA Status
```http
GET /api/ea/status/{accountId}
X-API-Key: your-api-key
```

**Response**
```json
{
  "accountId": "uuid",
  "status": "RUNNING",
  "safetyIndicator": "GREEN",
  "message": "EA is RUNNING"
}
```

### Account Management

#### Setup New Account
```http
POST /api/account/setup
Content-Type: application/json
X-API-Key: your-api-key

{
  "userId": "uuid",
  "accountNumber": "12345678",
  "broker": "Exness",
  "serverName": "Exness-MT5Real",
  "login": "12345678",
  "password": "password"
}
```

**Response**
```json
{
  "success": true,
  "message": "Account setup completed successfully",
  "accountId": "uuid",
  "vpsIp": "192.168.1.100"
}
```

### Market Analysis

#### Get Safety Indicator
```http
GET /api/market/safety
X-API-Key: your-api-key
```

**Response**
```json
{
  "indicator": "GREEN",
  "reason": "Market conditions are favorable",
  "details": {
    "volatility": 2.5,
    "spread": 1.2,
    "trend": "BULLISH",
    "newsImpact": false
  }
}
```

### Trade Synchronization

#### Sync Trades
```http
POST /api/trades/sync/{accountId}
X-API-Key: your-api-key
```

**Response**
```json
{
  "success": true,
  "tradesCount": 15
}
```

## Data Models

### User
```typescript
{
  id: string
  email: string
  firstName: string
  lastName: string
  role: "ADMIN" | "USER"
  userType: "DIRECT" | "IB_CLIENT"
  isActive: boolean
  createdAt: Date
  lastLoginAt: Date
}
```

### MT5Account
```typescript
{
  id: string
  userId: string
  accountNumber: string
  broker: "Exness" | "PrimeXBT"
  serverName: string
  balance: number
  equity: number
  eaStatus: "STOPPED" | "RUNNING" | "PAUSED" | "ERROR"
  safetyIndicator: "RED" | "ORANGE" | "GREEN"
  vpsIp: string
  createdAt: Date
}
```

### Trade
```typescript
{
  id: string
  mt5AccountId: string
  ticket: string
  symbol: string
  type: "BUY" | "SELL"
  volume: number
  openPrice: number
  openTime: Date
  closePrice: number | null
  closeTime: Date | null
  profit: number
  commission: number
  swap: number
  isClosed: boolean
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

## Rate Limiting

- **Public endpoints**: 100 requests/hour
- **Authenticated users**: 1000 requests/hour
- **Admin users**: 5000 requests/hour
- **C# Agent**: Unlimited

## Webhooks

### Trade Update Webhook
```http
POST {your-webhook-url}
Content-Type: application/json

{
  "accountId": "uuid",
  "trades": [...],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Status Change Webhook
```http
POST {your-webhook-url}
Content-Type: application/json

{
  "accountId": "uuid",
  "status": "RUNNING",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## SDK Examples

### JavaScript/TypeScript
```typescript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password'
  })
});

// Start EA
const controlResponse = await fetch('/api/ea/control', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Important for cookies
  body: JSON.stringify({
    accountId: 'account-uuid',
    action: 'start'
  })
});
```

### C# (Agent)
```csharp
using var httpClient = new HttpClient();
httpClient.DefaultRequestHeaders.Add("X-API-Key", "your-api-key");

var request = new EAControlRequest
{
    AccountId = "account-uuid",
    Action = "start"
};

var response = await httpClient.PostAsJsonAsync(
    "http://localhost:5000/api/ea/control",
    request
);

var result = await response.Content.ReadFromJsonAsync<EAStatusResponse>();
```

## Testing

### Health Check
```bash
curl https://api.yourdomain.com/health
```

### Test Authentication
```bash
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

## Support

For API support:
- Email: api@yourdomain.com
- Documentation: https://docs.yourdomain.com
- Status Page: https://status.yourdomain.com
