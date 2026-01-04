# Admin System Quick Reference

## 🚀 Quick Start

### 1. Database Setup
```bash
cd /Users/dmd/mt5-algo-saas/web-app

# Create .env file (already done)
# DATABASE_URL="postgresql://user:password@localhost:5432/mt5_algo_saas"

# Run migration
npx prisma migrate dev --name admin_system_overhaul

# Generate Prisma client
npx prisma generate

# Create admin user
node scripts/create-admin.js
```

### 2. Start Development Server
```bash
npm run dev
# Server runs on http://localhost:5173
```

### 3. Access Admin Panel
- URL: http://localhost:5173/admin
- Login required with ADMIN role
- Redirects non-admins to dashboard

## 📡 API Endpoints

### User Management
```bash
# List all users with insights
GET /api/admin/users?page=1&limit=20&search=john&tier=PREMIUM&status=ACTIVE

# Update user
PATCH /api/admin/users
Body: { userId: "abc", updates: { role: "ADMIN", subscriptionTier: "VIP" } }
```

### Dashboard Stats
```bash
# Get comprehensive platform statistics
GET /api/admin/stats
```

### Automations
```bash
# List automations
GET /api/admin/automations?status=ACTIVE

# Create automation
POST /api/admin/automations
Body: {
  name: "Welcome Email",
  triggerType: "MT5_REGISTRATION",
  actionType: "EMAIL",
  messageSubject: "Welcome to SCALPERIUM!",
  messageTemplate: "Hi {firstName}, welcome aboard!"
}

# Update automation
PATCH /api/admin/automations
Body: { automationId: "abc", updates: { status: "PAUSED" } }

# Delete automation
DELETE /api/admin/automations?id=abc
```

### User Insights
```bash
# Calculate insights for one user
POST /api/admin/insights
Body: { userId: "abc" }

# Calculate insights for ALL users (batch)
POST /api/admin/insights
Body: { action: "calculate_all" }

# Get high churn risk users
GET /api/admin/insights?segment=high_churn_risk&threshold=0.7

# Get upsell-ready users
GET /api/admin/insights?segment=upsell_ready&threshold=0.6
```

## 🔑 Authentication

### Login Flow
```typescript
// 1. Verify credentials
const user = await prisma.user.findUnique({ where: { email } });
const valid = await verifyPassword(password, user.passwordHash);

// 2. Set session
import { setSession } from '$lib/server/auth';
setSession(cookies, { id: user.id, email: user.email, role: user.role });

// 3. Redirect
throw redirect(303, user.role === 'ADMIN' ? '/admin' : '/dashboard');
```

### Protected Routes
```typescript
// In +layout.server.ts or +page.server.ts
import { requireAdmin } from '$lib/server/auth';

export const load = async (event) => {
  const user = await requireAdmin(event); // Auto-redirects if not admin
  return { user };
};
```

### API Authentication
```typescript
export const GET: RequestHandler = async (event) => {
  const user = await requireAdmin(event);
  // User is guaranteed to be admin here
};
```

## 📊 User Insight Metrics

### Trading Performance
- **Win Rate**: % of profitable trades (0-1)
- **Profit Factor**: Gross profit / Gross loss
- **Sharpe Ratio**: (Avg return - risk-free rate) / Std deviation
- **Max Drawdown**: Largest peak-to-trough decline ($)

### Behavior Metrics
- **Trading Days Active**: Number of unique trading days
- **Avg Trades Per Day**: Total trades / trading days
- **Consecutive Wins/Losses**: Max streak
- **Days Since Last Trade**: Inactivity period
- **Risk Level**: LOW/MEDIUM/HIGH

### Business Metrics
- **Lifetime Value**: Monthly fee × months active (capped at 12)
- **Total Revenue**: Monthly fee × actual months
- **Churn Risk**: 0-1 scale (0 = no risk, 1 = high risk)
- **Engagement Score**: 0-1 scale (activity + login frequency)

### Predictions
- **Retention Probability**: 0-1 scale (inverse of churn + engagement boost)
- **Upsell Probability**: 0-1 scale (based on profit + engagement + current tier)
- **Predicted Next Action**: 
  - `CONTINUE_TRADING` - Active, healthy account
  - `NEEDS_ENGAGEMENT` - Inactive but not churning
  - `READY_FOR_UPGRADE` - High upsell probability
  - `LIKELY_TO_CHURN` - High churn risk

## 🤖 Automation System

### Trigger Types (10)
1. **LEAD_OPTIN** - New lead capture
2. **MT5_REGISTRATION** - MT5 account connected
3. **WINNING_TRADES** - X consecutive wins
4. **LOSING_TRADES** - X consecutive losses
5. **SUBSCRIPTION_UPGRADE** - Tier upgraded
6. **SUBSCRIPTION_EXPIRED** - Subscription ended
7. **HIGH_PROFIT_ACHIEVED** - Profit threshold reached
8. **CONSECUTIVE_LOSSES** - Loss streak detected
9. **ACCOUNT_INACTIVE** - No trades for X days
10. **TRIAL_ENDING** - Trial expiring soon

### Action Types (5)
1. **EMAIL** - Send email via SendGrid/Mailgun
2. **SMS** - Send SMS via Twilio
3. **WHATSAPP** - Send WhatsApp message via Twilio
4. **PUSH_NOTIFICATION** - Browser push via Firebase
5. **IN_APP_MESSAGE** - Dashboard notification

### Template Variables
Available in message templates:
- `{firstName}` - User's first name
- `{lastName}` - User's last name
- `{email}` - User's email
- `{totalTrades}` - Total trade count
- `{totalProfit}` - Total profit amount
- `{winRate}` - Win rate percentage
- `{subscriptionTier}` - Current tier

Example:
```
Hi {firstName},

Congratulations on achieving {totalProfit} profit with a {winRate}% win rate!

You're in the top 10% of SCALPERIUM traders. Ready to upgrade to {nextTier}?

- SCALPERIUM Team
```

## 🔍 Common Queries

### Find Churning Users
```typescript
const churnRisk = await prisma.userInsight.findMany({
  where: { 
    churnRisk: { gte: 0.7 },
    user: { 
      subscriptionTier: { not: 'FREE' }
    }
  },
  include: { user: true },
  orderBy: { churnRisk: 'desc' }
});
```

### Find High-Value Users
```typescript
const highValue = await prisma.user.findMany({
  where: {
    totalProfit: { gte: 10000 },
    isActive: true
  },
  include: { insights: true },
  orderBy: { totalProfit: 'desc' }
});
```

### Get Active Trading Stats
```typescript
const stats = await prisma.trade.groupBy({
  by: ['userId'],
  where: {
    closeTime: {
      gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }
  },
  _count: true,
  _sum: { profit: true }
});
```

## 🎨 UI Components

### Admin Menu Tabs
```typescript
let activeTab = 'overview'; // 'overview' | 'automations' | 'users' | 'bots' | 'trades'
```

### Stat Card Component
```svelte
<div class="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
  <div class="flex items-center justify-between">
    <div>
      <p class="text-gray-400 text-sm">{label}</p>
      <p class="text-3xl font-bold text-white mt-2">{value}</p>
      <p class="text-sm mt-1" class:text-green-400={trend > 0} class:text-red-400={trend < 0}>
        {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
      </p>
    </div>
    <div class="text-4xl opacity-50">{icon}</div>
  </div>
</div>
```

## 🛠️ Troubleshooting

### Database Connection Issues
```bash
# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Test connection
npx prisma db pull

# View database in Prisma Studio
npm run db:studio
```

### Migration Errors
```bash
# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Force push schema without migration
npx prisma db push --force-reset
```

### Authentication Issues
```bash
# Check JWT_SECRET is set
cat .env | grep JWT_SECRET

# Verify session cookie exists
# In browser DevTools: Application > Cookies > session
```

### Admin Access Denied
1. Check user role in database:
   ```sql
   SELECT email, role FROM "User" WHERE email = 'admin@scalperium.com';
   ```
2. Ensure role is `ADMIN` (not `USER` or `TRADER`)
3. Clear cookies and re-login

## 📈 Performance Optimization

### Database Indexes
Already optimized in schema:
- User: email (unique), role, subscriptionTier
- Trade: userId, mt5AccountId, eaId, isClosed
- NotificationLog: automationId, userId, status
- UserInsight: userId (unique), churnRisk, engagementScore

### Caching Strategy (TODO)
```typescript
import { LRUCache } from 'lru-cache';

const statsCache = new LRUCache({
  max: 100,
  ttl: 1000 * 60 * 5 // 5 minutes
});

export const GET: RequestHandler = async (event) => {
  const cached = statsCache.get('admin_stats');
  if (cached) return json(cached);
  
  const stats = await calculateStats();
  statsCache.set('admin_stats', stats);
  return json(stats);
};
```

## 🔔 Monitoring

### Health Check Endpoint (TODO)
```typescript
// src/routes/api/health/+server.ts
export const GET: RequestHandler = async () => {
  const dbCheck = await prisma.$queryRaw`SELECT 1`;
  return json({
    status: 'healthy',
    database: 'connected',
    timestamp: new Date().toISOString()
  });
};
```

### Error Tracking
```typescript
// Install Sentry
npm install @sentry/sveltekit

// Configure in hooks.server.ts
import * as Sentry from '@sentry/sveltekit';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});
```

---

**Quick Links**:
- Full Documentation: `/docs/ADMIN-SYSTEM-IMPLEMENTATION.md`
- API Docs: `/docs/api-documentation.md`
- Schema: `/web-app/prisma/schema.prisma`
- Auth: `/web-app/src/lib/server/auth.ts`
- Insights: `/web-app/src/lib/server/insights.ts`
