# MT5 ALGO SAAS - Vercel Deployment Guide

## One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fmt5-algo-saas&project-name=mt5-algo-saas&repository-name=mt5-algo-saas&env=DATABASE_URL,CSHARP_AGENT_URL,CSHARP_AGENT_API_KEY&envDescription=Set%20your%20environment%20variables&envLink=https%3A%2F%2Fvercel.com%2Fdocs%2Fconcept%2Fenvironment-variables)

## Manual Deployment Steps

### 1. Push to GitHub
```bash
cd /Users/dmd/mt5-algo-saas
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/mt5-algo-saas.git
git push -u origin main
```

### 2. Import on Vercel
1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Paste: `https://github.com/YOUR-USERNAME/mt5-algo-saas.git`
4. Select `web-app` as root directory
5. Add environment variables:
   - `DATABASE_URL` - PostgreSQL connection string
   - `CSHARP_AGENT_URL` - Your C# agent endpoint
   - `CSHARP_AGENT_API_KEY` - Your API key
6. Click Deploy!

### 3. Environment Variables

Create a `.env.production` file:
```
DATABASE_URL=postgresql://user:password@host:5432/mt5_algo_db
CSHARP_AGENT_URL=https://your-agent.com
CSHARP_AGENT_API_KEY=your_api_key_here
```

### 4. Database Setup (First Deploy)
After deployment, run in Vercel terminal:
```bash
npm run db:push
```

## Features Deployed
- ✅ Admin Dashboard
- ✅ Bot Settings Management
- ✅ Risk Management (Max Loss, Lot Sizing)
- ✅ Leaderboard & Analytics
- ✅ IB Partner Management
- ✅ User Authentication
- ✅ C# Agent Integration

## Need Help?
- Check logs: `vercel logs mt5-algo-saas`
- Redeploy: `vercel deploy --prod`
- Set env vars: `vercel env add KEY VALUE`

---

**Created:** 4 January 2026  
**Status:** Ready for Vercel deployment
