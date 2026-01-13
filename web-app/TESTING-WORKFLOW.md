# Multi-Account Trading System - Complete Testing & Deployment Workflow

## 📋 Overview

This guide walks you through testing locally first, then deploying to production.

---

## ✅ Phase 1: Local Testing (5-10 minutes)

### Quick Start

1. **Server is already running at**: http://localhost:5173

2. **Run test verification**:
   ```bash
   ./test-local.sh
   ```

3. **Open browser and test**:
   - URL: http://localhost:5173
   - Login: `trader@scalperium.com` / `trader123`
   - Click **Settings** (⚙️ icon)
   - Find **"Trading Accounts"** section
   - Test toggles, counters, and Start Algo button

### What You'll See

- **4 MT5 Accounts**:
  - ✅ Exness - 50099101 (ENABLED, $5,000)
  - ✅ Exness - 50099102 (ENABLED, $3,000)
  - ⭕ PrimeXBT - 50099103 (DISABLED, $4,500)
  - ⏳ Exness - 50099104 (PENDING, $1,000)

### Test Checklist

- [ ] Login works
- [ ] Dashboard loads
- [ ] Settings modal opens
- [ ] See "Trading Accounts" section
- [ ] 4 accounts displayed
- [ ] Toggle switches work
- [ ] Green highlight for enabled accounts
- [ ] Counter updates (X / 4)
- [ ] Can't enable PENDING account
- [ ] Try enabling 5+ accounts (should block at 5 max)
- [ ] "Start Algo" button shows response
- [ ] Toggles persist after page refresh

### Expected Behavior

**Without C# Agent Running:**
- ✅ UI works perfectly
- ✅ Toggles work
- ✅ Database persists selections
- ⚠️ "Start Algo" shows: "No online agent found..."
  - **This is normal!** C# agent deployment comes later

---

## 🚀 Phase 2: Deploy to Production (10-15 minutes)

### Prerequisites

Before deploying:
1. ✅ Local testing completed and working
2. ✅ All features verified
3. ✅ No critical bugs found

### Option A: Automated Deployment Script (Recommended)

```bash
./deploy.sh
```

This script will:
1. Check for uncommitted changes
2. Fix GitHub remote (if needed)
3. Push to GitHub
4. Check Vercel CLI
5. Verify environment variables
6. Deploy to Vercel production

### Option B: Manual Deployment

#### Step 1: Fix GitHub Authentication

```bash
# Remove old remote with expired token
git remote remove origin

# Add SSH remote (recommended)
git remote add origin git@github.com:MylesNdlovu/mt5-algo-saas.git

# Or use HTTPS
git remote add origin https://github.com/MylesNdlovu/mt5-algo-saas.git
```

#### Step 2: Commit and Push

```bash
# Commit any remaining changes
git add -A
git commit -m "Ready for production deployment"

# Push to GitHub
git push -u origin main
```

#### Step 3: Configure Vercel Environment Variables

Go to: https://vercel.com/myles-projects-dd515697/web-app/settings/environment-variables

**Required Variables:**
```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
SESSION_SECRET=your-secure-random-string-min-32-chars
JWT_SECRET=your-jwt-secret-key
```

**Optional Variables:**
```env
MAILGUN_API_KEY=key-xxx
MAILGUN_DOMAIN=mg.yourdomain.com
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890
```

#### Step 4: Deploy

```bash
vercel --prod
```

---

## 🧪 Production Testing

Once deployed, test on your production URL:

1. Login with demo account
2. Test all features from Phase 1 checklist
3. Verify database persistence
4. Check that toggles work across page refreshes
5. Verify role-based access (try different user roles)

### Demo Accounts for Production Testing

```
SUPER_ADMIN: admin@scalperium.com / admin123
USER:        user@scalperium.com / user123
TRADER:      trader@scalperium.com / trader123
IB:          ib@scalperium.com / ib123
```

---

## 🔧 Phase 3: C# Agent Integration (Optional - For Full Functionality)

To enable actual trading:

1. **Deploy C# Pool Agent to VPS**
   - See: `/docs/POOL-AGENT-DEPLOYMENT.md`

2. **Configure Agent Connection**
   - WebSocket URL: Your production URL + `/ws`
   - Agent API Key: Generate in admin panel

3. **Test Full System**
   - Start Algo → Should start EA on all enabled accounts
   - Monitor trades in dashboard
   - Test multi-account execution

---

## 🐛 Troubleshooting

### Local Testing Issues

**Server not running:**
```bash
npm run dev
```

**Database not connected:**
```bash
# Check .env file has DATABASE_URL
# Restart server
```

**No demo accounts:**
```bash
npm run db:seed
```

### Deployment Issues

**GitHub push fails (403):**
- Token expired
- Fix: Use SSH key or generate new token

**Vercel build fails:**
- Missing DATABASE_URL
- Fix: Add in Vercel environment variables

**"No agent found" in production:**
- Normal without C# agent
- Deploy agent to VPS for full functionality

---

## ✅ Success Criteria

### Phase 1 Complete When:
- [ ] Can login locally
- [ ] See all 4 MT5 accounts
- [ ] Toggles work smoothly
- [ ] Counter updates correctly
- [ ] Settings persist

### Phase 2 Complete When:
- [ ] Code pushed to GitHub
- [ ] Vercel deployment successful
- [ ] Production URL accessible
- [ ] All Phase 1 tests pass in production
- [ ] Database persists in production

### Phase 3 Complete When:
- [ ] C# agent deployed to VPS
- [ ] Agent shows "online" in dashboard
- [ ] Start Algo actually starts EA
- [ ] Trades appear in MT5 terminals
- [ ] Multi-account execution works

---

## 📊 What You Built

✅ **Multi-Account Trading System**
- Select up to 5 MT5 accounts
- Toggle accounts on/off
- Visual feedback and counters
- Start/Stop/Pause across all enabled accounts
- Fault-tolerant execution
- Complete API layer
- Comprehensive documentation

**Architecture:**
- Frontend: SvelteKit + Tailwind CSS
- Backend: Node.js + Prisma
- Database: PostgreSQL
- Real-time: WebSocket
- Agent: C# + FlaUI (for MT5 automation)

---

## 🆘 Need Help?

- Local issues: Check `./test-local.sh` output
- Deployment issues: Check `./deploy.sh` output
- Architecture questions: See `/docs/MULTI-ACCOUNT-TRADING-ARCHITECTURE.md`
- C# agent help: See `/docs/POOL-AGENT-DEPLOYMENT.md`

---

**Ready to test?** Start with Phase 1 - open http://localhost:5173 right now! 🚀
