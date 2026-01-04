# Leaderboard & Automation Quick Reference

## 🚀 Quick Start

### 1. Initialize Demo Data (Admin Only)
```bash
# Login as admin@scalperium.com / Admin123!
# Go to browser console or use curl:
curl -X POST http://localhost:5173/api/admin/seed \
  -H "Cookie: user_session=YOUR_SESSION_COOKIE"
```

### 2. View Leaderboard (Any User)
- Click Menu → 🏆 Leaderboard in dashboard
- Or visit `/automations` page
- Auto-refreshes every 60 seconds

### 3. Manage Automations (Any User)
- Visit `/automations` page
- Toggle switches to enable/disable notifications
- Changes save instantly

## 📊 Leaderboard Rankings

### Current Demo Leaders:
1. 🥇 **Mike Pro** - $18,500.00 (200 trades, 65% win rate)
2. 🥈 **John Trader** - $15,420.50 (150 trades, 63.3% win rate)
3. 🥉 **David Gold** - $14,200.00 (180 trades, 61.1% win rate)

### How Rankings Work:
- **Sorted by**: Total Profit (highest first)
- **Periods**: Daily / Weekly / Monthly
- **Updates**: Real-time with auto-refresh
- **Position**: Your rank shown prominently if logged in

## 🔧 Automation Logic

### Global Automations (Available to All Users):
```typescript
{
  userId: null,  // null = global
  isUserEnabled: true/false,  // User controls
  status: "ACTIVE"  // Admin controls
}
```
**Example**: Welcome emails, trial ending notifications

### User-Specific Automations:
```typescript
{
  userId: "user-123",  // Specific user
  isUserEnabled: true/false,  // User controls
  status: "ACTIVE"  // Admin controls
}
```
**Example**: Personal profit alerts, custom reminders

### Permission Matrix:
| Action | Admin | User (Global) | User (Personal) |
|--------|-------|---------------|-----------------|
| View | ✅ All | ✅ Yes | ✅ Yes |
| Enable/Disable | ✅ All | ✅ Yes | ✅ Yes |
| Edit Content | ✅ All | ❌ No | ✅ Yes |
| Delete | ✅ All | ❌ No | ✅ Yes |
| Create | ✅ All | ❌ No | ✅ Yes |

## 🎯 API Endpoints

### Leaderboard
```typescript
// Get leaderboard for period
GET /api/leaderboard?period=daily&limit=10
// Response: { entries: [...], userPosition: {...} }

// Force sync (admin only)
POST /api/leaderboard/sync
// Response: { daily: 5, weekly: 5, monthly: 5 }
```

### User Automations
```typescript
// Get user's automations
GET /api/user/automations
// Response: { data: [...] }

// Toggle automation
PATCH /api/user/automations/{id}/toggle
Body: { "isEnabled": false }
// Response: { success: true, message: "✅ Automation disabled" }
```

## 🗂️ Data Files

### Location: `/data/` directory
```
/data/
  ├── users.json          # User accounts & trading stats
  ├── automations.json    # Automation configurations
  └── leaderboard.json    # Leaderboard entries & rankings
```

### Backup Strategy:
```bash
# Backup data
cp -r data/ data_backup_$(date +%Y%m%d)/

# Restore data
cp -r data_backup_20250102/ data/
```

## 🔄 Sync Process

### When to Sync:
1. **After trades close** - Update user stats
2. **Periodic** - Hourly cron job recommended
3. **Manual** - Admin dashboard sync button
4. **On-demand** - Via API endpoint

### Sync Code Example:
```typescript
import { 
  updateUserTradingStats, 
  syncUserStatsToLeaderboard 
} from '$lib/server/userStorage';

// After trade closes
updateUserTradingStats(
  userId,
  1,      // trades
  profit >= 0 ? 1 : 0,  // winning trades
  profit < 0 ? 1 : 0,   // losing trades
  profit, // profit
  volume  // volume
);

// Then sync to leaderboard (or run periodically)
syncUserStatsToLeaderboard();
```

## 🎨 UI Components

### LeaderboardTable Props:
```typescript
<LeaderboardTable 
  period="daily"           // 'daily' | 'weekly' | 'monthly'
  showUserPosition={true}  // Show user's rank card
  limit={10}               // Top N entries
  autoRefresh={true}       // Auto-refresh enabled
  refreshInterval={60000}  // 60 seconds
/>
```

### Dashboard Integration:
```typescript
let showLeaderboard = false;  // Toggle visibility
let leaderboardPeriod = 'daily';  // Current period

// In menu:
<button on:click={() => showLeaderboard = !showLeaderboard}>
  🏆 Leaderboard
</button>

// In content:
{#if showLeaderboard}
  <LeaderboardTable period={leaderboardPeriod} ... />
{/if}
```

## 🐛 Troubleshooting

### Leaderboard Not Showing Data:
```bash
# 1. Check if demo users exist
cat data/users.json | grep -c "email"

# 2. If empty, seed data:
curl -X POST http://localhost:5173/api/admin/seed

# 3. Force sync:
curl -X POST http://localhost:5173/api/leaderboard/sync
```

### Automations Not Appearing:
```bash
# Check automation file
cat data/automations.json

# Should have entries with userId field
```

### Permission Errors:
- Ensure `user_session` cookie is set
- Verify user role (admin vs user)
- Check automation userId matches current user

## 📈 Performance Tips

### For Many Users (100+):
1. **Enable caching** - Store leaderboard in memory
2. **Limit queries** - Paginate beyond top 100
3. **Background jobs** - Sync stats via cron
4. **Database migration** - Move to PostgreSQL

### Redis Caching Example:
```typescript
// Cache leaderboard for 5 minutes
const cacheKey = `leaderboard:${period}`;
let cached = await redis.get(cacheKey);
if (!cached) {
  cached = getLeaderboard(period, 100);
  await redis.setex(cacheKey, 300, JSON.stringify(cached));
}
```

## 🎯 Testing Scenarios

### Test Leaderboard:
1. Login as demo user (john.trader@example.com)
2. Open dashboard → Click leaderboard
3. Verify your rank appears
4. Switch periods (daily/weekly/monthly)
5. Check rankings update

### Test Automations:
1. Visit `/automations` page
2. Toggle automation switches
3. Verify state persists on reload
4. Check user vs global indicators

### Test Admin Features:
1. Login as admin@scalperium.com
2. POST to `/api/admin/seed` - should work
3. POST to `/api/leaderboard/sync` - should work
4. View all automations in admin panel

## 📱 Mobile Considerations

- Leaderboard table scrolls horizontally
- Toggle switches work on touch
- Period tabs are finger-friendly
- User position card stacks vertically

## 🔐 Security Notes

- Never expose `user_session` cookie
- Validate userId on all user endpoints
- Admin-only endpoints check role
- Sanitize all user inputs
- Use HTTPS in production

## 🚀 Production Deployment

### Pre-Launch Checklist:
- [ ] Run `npx prisma migrate deploy`
- [ ] Set up Redis for caching
- [ ] Configure background job for sync
- [ ] Enable HTTPS
- [ ] Set up monitoring (errors, performance)
- [ ] Backup data directory
- [ ] Test all API endpoints
- [ ] Load test with 100+ concurrent users

### Environment Variables:
```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
NODE_ENV=production
```

## 📞 Support

For issues or questions:
1. Check `/docs/LEADERBOARD-AUTOMATION-IMPLEMENTATION.md`
2. Review error logs in console
3. Verify data files in `/data/` directory
4. Test API endpoints with curl

---

**System Status**: ✅ Operational
**Last Updated**: 2025-12-02
**Version**: 1.0.0
