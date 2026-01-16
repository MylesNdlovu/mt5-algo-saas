# ⚡ Setup Right Now - 5 Minutes

Follow these steps in order. Copy and paste each command.

---

## Step 1: Authenticate with GitHub (2 minutes)

**In your regular Mac Terminal:**

```bash
# 1. Go to project
cd /Users/dmd/mt5-algo-saas

# 2. Push to GitHub (will prompt for credentials)
git push origin main
```

**When prompted:**
- Username: `MylesNdlovu`
- Password: **Paste your GitHub token** (from the browser tab I opened)

✅ Mac saves it to keychain - only need to do this once!

---

## Step 2: Link Vercel Project (1 minute)

```bash
# Go to web app directory
cd /Users/dmd/mt5-algo-saas/web-app

# Link to your existing Vercel account
vercel link
```

**Answer the prompts:**
- Set up project? → `Y`
- Which scope? → Select your Vercel account
- Link to existing project? → `N` (create new) or `Y` (if you have one)
- Project name? → `scalperium` (or your choice)

---

## Step 3: Set Environment Variables (2 minutes)

### Option A: Via Vercel Dashboard (Easier)

1. Open: https://vercel.com/dashboard
2. Click your project → Settings → Environment Variables
3. Add these 3 variables:

```
Key: DATABASE_URL
Value: <your Postgres connection string>
Environment: Production, Preview, Development

Key: AUTH_SECRET
Value: <run in terminal: openssl rand -base64 32>
Environment: Production, Preview, Development

Key: PUBLIC_APP_URL
Value: https://scalperium.vercel.app (or your custom domain)
Environment: Production, Preview, Development
```

### Option B: Via CLI (Faster if you're already in terminal)

```bash
# Generate secret
openssl rand -base64 32

# Add environment variables
vercel env add DATABASE_URL production
# Paste your database URL

vercel env add AUTH_SECRET production
# Paste the secret from above

vercel env add PUBLIC_APP_URL production
# Enter: https://scalperium.vercel.app
```

---

## Step 4: First Deployment (1 minute)

```bash
# Make sure you're in web-app directory
cd /Users/dmd/mt5-algo-saas/web-app

# Deploy to production
vercel --prod
```

Wait 2-3 minutes for build and deployment.

You'll get a URL like: `https://scalperium-xxxx.vercel.app`

---

## Step 5: Test Automated Deployment (30 seconds)

```bash
# Go back to root
cd /Users/dmd/mt5-algo-saas

# Test the deployment script
./deploy.sh "Test automated deployment"
```

Should see:
```
✓ DEPLOYMENT COMPLETE!
Changes are now live on:
  • Local: ✓ Committed
  • GitHub: ✓ Pushed
  • Vercel: ✓ Deployed
```

---

## ✅ You're Done!

From now on, whenever you make changes:

```bash
# Option 1: Use deployment script (updates all 3)
./deploy.sh "Your commit message"

# Option 2: Manual steps
git add .
git commit -m "Your message"
git push origin main
cd web-app && vercel --prod
```

---

## 🎯 Next Steps

1. **Add Custom Domain:**
   - Vercel Dashboard → Domains → Add Domain
   - Follow DNS instructions
   - SSL auto-provisions in 5-10 min

2. **Set up Database:**
   - Recommended: Vercel Postgres (free tier)
   - Or: Supabase / Neon

3. **Run Migrations:**
   ```bash
   cd web-app
   npx prisma migrate deploy
   ```

4. **Test Your App:**
   - Visit your Vercel URL
   - Register account
   - Connect MT5 account
   - View dashboard

---

## 🚨 Troubleshooting

### GitHub push still fails

```bash
# Clear keychain and try again
security delete-internet-password -s github.com
git push origin main
```

### Vercel not linked

```bash
cd web-app
vercel link --confirm
```

### Environment variables not working

```bash
# Pull them locally to test
vercel env pull .env.production
```

---

## 📞 Quick Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **GitHub Repo:** https://github.com/MylesNdlovu/mt5-algo-saas
- **Deployment Guide:** [README-DEPLOYMENT.md](README-DEPLOYMENT.md)
- **Full Setup Guide:** [docs/GITHUB-VERCEL-DEPLOYMENT.md](docs/GITHUB-VERCEL-DEPLOYMENT.md)

---

**Ready?** Start with Step 1 above! 🚀
