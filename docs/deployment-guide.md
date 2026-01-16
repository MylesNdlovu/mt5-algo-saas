# Deployment & Testing Guide

## 🚀 Quick Start - Test Locally NOW

Your multi-account trading system is **ready to test right now** on http://localhost:5173!

### Immediate Testing (Local)

1. **Dev server is already running** at http://localhost:5173

2. **Login with demo trader account:**
   ```
   Email: trader@scalperium.com
   Password: trader123
   ```

3. **Test Multi-Account Trading:**
   - Click **Settings** (gear icon) in the header
   - Scroll to **"Trading Accounts"** section
   - You'll see 4 MT5 accounts:
     - ✅ Exness - 50099101 (ENABLED, $5,234.50)
     - ✅ Exness - 50099102 (ENABLED, $3,145.75)
     - ⭕ PrimeXBT - 50099103 (DISABLED, $4,678.20) - toggle to enable
     - ⏳ Exness - 50099104 (PENDING - not selectable)

4. **Toggle accounts on/off:**
   - Click the toggle switch next to any active account
   - Watch the visual feedback (green highlight for enabled)
   - See the counter update (e.g., "2 / 4")

5. **Test Algo Execution:**
   - Click **"Start Algo"** button in the main header
   - See the response: "⚠️ No enabled accounts found..." OR "✅ Algo started on X account(s)"
   - Note: Without a C# agent running, you'll get a "no agent found" message - this is expected!

---

## 📦 Deploy to Vercel (5 Minutes)

### Step 1: Configure Environment Variables

Go to: https://vercel.com/myles-projects-dd515697/web-app/settings/environment-variables

Add these **required** variables:

```env
# Database (REQUIRED)
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Session Security (REQUIRED)
SESSION_SECRET=your-random-string-min-32-chars-abcdefg123456
JWT_SECRET=your-jwt-secret-key-xyz789
```

Optional variables (for production features):
```env
# Email notifications
MAILGUN_API_KEY=key-xxx
MAILGUN_DOMAIN=mg.yourdomain.com

# SMS notifications
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890
```

### Step 2: Redeploy

```bash
vercel --prod
```

Or push to GitHub (if connected) for auto-deployment.

---

## 🧪 Testing Checklist

### ✅ Test Locally RIGHT NOW

Open http://localhost:5173 and test:

- [ ] Login: trader@scalperium.com / trader123
- [ ] Dashboard loads
- [ ] Click Settings → See "Trading Accounts" section
- [ ] See 4 MT5 accounts listed
- [ ] Toggle account switches work
- [ ] Counter updates (X / 4)
- [ ] Try enabling more than 5 accounts (should block)
- [ ] Click "Start Algo" button
- [ ] See feedback message

### 🚀 Test Production (After Deploy)

- [ ] All local tests pass on production URL
- [ ] Database persists account selections
- [ ] WebSocket connects (if C# agent running)
- [ ] EA commands execute (with agent)

---

## 🐛 Troubleshooting

### "Build failed" on Vercel
**Problem:** Missing DATABASE_URL

**Fix:** Add environment variable in Vercel settings

### "No agent found for account"
**Problem:** C# agent not running

**Fix:** Deploy C# Pool Agent (see POOL-AGENT-DEPLOYMENT.md)

### GitHub push failed
**Problem:** Auth token expired

**Fix:**
```bash
git remote remove origin
git remote add origin git@github.com:MylesNdlovu/mt5-algo-saas.git
git push -u origin main
```

---

## 📊 What You Just Built

- ✅ Multi-account selector (up to 5 accounts)
- ✅ Toggle switches with visual feedback
- ✅ Start/Stop/Pause across all enabled accounts
- ✅ Fault-tolerant (one failure doesn't affect others)
- ✅ Pool agent architecture support
- ✅ Complete API layer with validation
- ✅ Comprehensive documentation

**Next:** Deploy C# agent to VPS for full functionality
