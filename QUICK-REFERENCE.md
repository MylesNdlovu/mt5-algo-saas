# 🚀 Quick Reference Card

## Essential Commands

### Web App (SvelteKit)
```bash
# Install & Setup
cd web-app
npm install
cp .env.example .env
npm run db:push
node scripts/seed-admin.js

# Development
npm run dev              # Start dev server (http://localhost:5173)
npm run build            # Production build
npm run preview          # Preview production build

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database
npm run db:migrate       # Create migration
npm run db:studio        # Open Prisma Studio
```

### C# Agent
```bash
# Build & Run
cd csharp-agent/MT5AgentAPI
dotnet restore           # Install dependencies
dotnet build             # Build project
dotnet run               # Start agent (http://localhost:5000)

# Production
dotnet publish -c Release
sc create MT5AgentAPI binPath="C:\path\to\MT5AgentAPI.exe"
sc start MT5AgentAPI
```

## Default Credentials

### Admin Account
- **Email:** admin@mt5algo.com
- **Password:** Admin@123456
- ⚠️ Change immediately after first login!

### Sample IB
- **Code:** SAMPLE123
- **Name:** Sample IB

## Key URLs

### Development
- Web App: http://localhost:5173
- C# Agent: http://localhost:5000
- Prisma Studio: http://localhost:5555

### Routes
- Login: `/login`
- Dashboard: `/dashboard`
- Admin: `/admin`
- Register: `/register`

## API Endpoints Cheat Sheet

### Authentication
```
POST   /api/auth/register    Register new user
POST   /api/auth/login       Login user
POST   /api/auth/logout      Logout user
```

### EA Control
```
POST   /api/ea/control       Start/Stop/Pause EA
GET    /api/account/{id}     Get account data & trades
```

### Admin
```
GET    /api/admin/stats      System statistics
GET    /api/admin/users      All users
GET    /api/admin/accounts   All accounts
POST   /api/admin/users/{id}/toggle   Toggle user status
```

### C# Agent
```
POST   /api/ea/control       Control EA
GET    /api/ea/status/{id}   Get EA status
POST   /api/account/setup    Setup new account
GET    /api/market/safety    Get safety indicator
POST   /api/trades/sync/{id} Sync trades
```

## Environment Variables

### Web App (.env)
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/mt5_algo_saas"
JWT_SECRET="min-32-character-secret-key"
CSHARP_AGENT_URL="http://localhost:5000"
CSHARP_AGENT_API_KEY="your-api-key"
PUBLIC_APP_URL="http://localhost:5173"
EXNESS_IB_LINK="https://your-ib-link"
PRIMEXBT_IB_LINK="https://your-ib-link"
```

### C# Agent (appsettings.json)
```json
{
  "ApiKey": "match-web-app-api-key",
  "WebAppUrl": "http://localhost:5173",
  "MT5": {
    "ServerPath": "C:\\Program Files\\MetaTrader 5\\terminal64.exe",
    "MasterAccountLogin": "12345678",
    "MasterAccountPassword": "password",
    "MasterAccountServer": "Exness-MT5Real"
  }
}
```

## Safety Indicator

| Color | Volatility | Spread | Action |
|-------|-----------|--------|--------|
| 🟢 GREEN | < 4 | < 1.5 | ✅ Can trade |
| 🟠 ORANGE | 4-7 | 1.5-3 | ⚠️ Caution |
| 🔴 RED | > 7 | > 3 | 🛑 Auto-stop |

## Database Schema Quick Ref

```sql
User {
  id, email, passwordHash, firstName, lastName
  role (ADMIN/USER), userType (DIRECT/IB_CLIENT)
  ibId, isActive, createdAt
}

MT5Account {
  id, userId, accountNumber, broker, serverName
  vpsIp, eaStatus, safetyIndicator
  balance, equity, status
}

Trade {
  id, mt5AccountId, ticket, symbol, type
  volume, openPrice, closePrice
  profit, commission, swap, isClosed
}

IB {
  id, name, code, contactEmail
  commission, isActive
}

Subscription {
  id, userId, status, startDate, endDate
  monthlyFee
}
```

## Common Tasks

### Create Admin User
```bash
cd web-app
node scripts/seed-admin.js
```

### Reset Database
```bash
cd web-app
npm run db:push -- --force-reset
node scripts/seed-admin.js
```

### View Database
```bash
cd web-app
npm run db:studio
```

### Check Logs
```bash
# PM2 (if using)
pm2 logs mt5-algo-saas

# C# Agent (Windows)
Get-EventLog -LogName Application -Source MT5AgentAPI
```

## Troubleshooting

### Can't login?
- Check JWT_SECRET is set
- Verify database connection
- Clear browser cookies

### EA won't start?
- Check safety indicator (must be GREEN/ORANGE)
- Verify C# agent is running
- Check MT5 connection
- Review C# agent logs

### Database connection failed?
- Verify PostgreSQL is running
- Check DATABASE_URL format
- Test with `psql` command

### C# Agent not responding?
- Check Windows Service status
- Verify API key matches
- Check firewall rules
- Review event logs

## File Locations

### Web App
- Config: `web-app/.env`
- Schema: `web-app/prisma/schema.prisma`
- Components: `web-app/src/lib/components/`
- API Routes: `web-app/src/routes/api/`

### C# Agent
- Config: `csharp-agent/MT5AgentAPI/appsettings.json`
- Services: `csharp-agent/MT5AgentAPI/Services/`
- Controllers: `csharp-agent/MT5AgentAPI/Controllers/`

### Documentation
- Setup: `docs/web-app-setup.md`
- Deployment: `docs/deployment-guide.md`
- User Guide: `docs/user-guide.md`
- API Docs: `docs/api-documentation.md`

## Port Numbers

- **5173** - SvelteKit dev server
- **5432** - PostgreSQL
- **5000** - C# Agent API
- **5555** - Prisma Studio
- **3389** - RDP (VPS access)

## Security Checklist

- [ ] Change admin password
- [ ] Generate unique JWT secret
- [ ] Set strong API keys
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall
- [ ] Backup database
- [ ] Rotate secrets regularly
- [ ] Monitor logs

## Performance Tips

- Use connection pooling for database
- Enable Prisma query optimization
- Cache static assets
- Implement Redis for sessions (future)
- Monitor server resources
- Optimize database indexes

## Support Contacts

- Technical: support@yourdomain.com
- Trading: trading@yourdomain.com
- API: api@yourdomain.com

## Useful SQL Queries

```sql
-- Count active users
SELECT COUNT(*) FROM "User" WHERE "isActive" = true;

-- Count running EAs
SELECT COUNT(*) FROM "MT5Account" WHERE "eaStatus" = 'RUNNING';

-- Total P&L
SELECT SUM("profit" + "commission" + "swap") FROM "Trade";

-- Recent trades
SELECT * FROM "Trade" ORDER BY "openTime" DESC LIMIT 10;
```

## Quick Test

```bash
# Test web app
curl http://localhost:5173/health

# Test C# agent
curl http://localhost:5000/health

# Test database
psql -U postgres -c "SELECT 1"

# Test authentication
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mt5algo.com","password":"Admin@123456"}'
```

---

**Keep this card handy for quick reference during development and deployment!** 📌
