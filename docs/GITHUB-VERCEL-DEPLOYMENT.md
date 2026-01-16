# GitHub & Vercel Deployment Guide

## Step 1: Fix GitHub Authentication

Your current GitHub token is expired. Here's how to fix it:

### 1.1 Create New Personal Access Token

1. **Go to GitHub:**
   - Visit: https://github.com/settings/tokens
   - Or: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)

2. **Generate New Token:**
   - Click "Generate new token (classic)"
   - Note: `MT5 Algo SaaS Deployment`
   - Expiration: `No expiration` (or 1 year)
   - Select scopes:
     - ✅ `repo` (Full control of private repositories)
     - ✅ `workflow` (Update GitHub Actions)
   - Click "Generate token"

3. **Copy the token** (starts with `ghp_...`)
   - ⚠️ You won't see it again!

### 1.2 Update Git Remote

```bash
# Remove old remote
cd /Users/dmd/mt5-algo-saas
git remote remove origin

# Add new remote with fresh token
git remote add origin https://ghp_YOUR_NEW_TOKEN_HERE@github.com/MylesNdlovu/mt5-algo-saas.git

# Verify
git remote -v

# Push
git push -u origin main
```

**Alternative - Use SSH (Recommended):**

```bash
# Remove HTTPS remote
git remote remove origin

# Add SSH remote (more secure)
git remote add origin git@github.com:MylesNdlovu/mt5-algo-saas.git

# Push (will use your SSH key)
git push -u origin main
```

---

## Step 2: Deploy to Vercel

### 2.1 Install Vercel CLI (if not installed)

```bash
npm install -g vercel
```

### 2.2 Login to Vercel

```bash
vercel login
# Follow the prompts - opens browser
```

### 2.3 Deploy from Web App Directory

```bash
cd /Users/dmd/mt5-algo-saas/web-app

# First deployment (interactive)
vercel

# Answer prompts:
# ? Set up and deploy "~/mt5-algo-saas/web-app"? [Y/n] Y
# ? Which scope? [Your Vercel account]
# ? Link to existing project? [N]
# ? What's your project's name? scalperium-mt5-saas
# ? In which directory is your code located? ./
# ? Want to override settings? [N]

# Deploy to production
vercel --prod
```

### 2.4 Or Deploy via Vercel Dashboard (Easier)

1. **Go to Vercel:**
   - Visit: https://vercel.com/new

2. **Import Git Repository:**
   - Click "Import Project"
   - Select "Import Git Repository"
   - Paste: `https://github.com/MylesNdlovu/mt5-algo-saas`
   - Click "Import"

3. **Configure Project:**
   ```
   Project Name: scalperium-mt5-saas
   Framework Preset: SvelteKit
   Root Directory: web-app
   Build Command: npm run build
   Output Directory: .svelte-kit
   Install Command: npm install
   ```

4. **Environment Variables:**
   Click "Environment Variables" and add:
   ```
   DATABASE_URL=your_postgres_connection_string
   AUTH_SECRET=your_random_secret_key
   PUBLIC_APP_URL=https://scalperium-mt5-saas.vercel.app
   ```

   **Generate AUTH_SECRET:**
   ```bash
   openssl rand -base64 32
   ```

5. **Deploy:**
   - Click "Deploy"
   - Wait 2-3 minutes for build
   - You'll get: `https://scalperium-mt5-saas.vercel.app`

---

## Step 3: Configure Database for Vercel

### 3.1 Get Your Database Connection String

If you don't have a Postgres database yet:

**Option A - Vercel Postgres (Recommended):**
1. In Vercel project dashboard → Storage → Create Database
2. Select "Postgres"
3. Name: `scalperium-db`
4. Region: Select closest to your users
5. Copy connection string

**Option B - Supabase (Free tier):**
1. Go to: https://supabase.com
2. Create new project: `scalperium-mt5`
3. Get connection string from Settings → Database
4. Format: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`

**Option C - Neon (Generous free tier):**
1. Go to: https://neon.tech
2. Create project: `scalperium-mt5`
3. Copy connection string

### 3.2 Add to Vercel Environment Variables

```bash
# Via CLI
vercel env add DATABASE_URL
# Paste your connection string

# Or via dashboard
# Vercel Project → Settings → Environment Variables
# Add: DATABASE_URL = your_connection_string
```

### 3.3 Run Database Migrations

```bash
cd /Users/dmd/mt5-algo-saas/web-app

# Set DATABASE_URL locally
export DATABASE_URL="your_connection_string"

# Run migrations
npx prisma migrate deploy

# Seed initial data (optional)
npx prisma db seed
```

---

## Step 4: Add Custom Domain

### 4.1 Buy Domain (if you don't have one)

**Recommended Registrars:**
- **Namecheap:** https://namecheap.com (~$10/year for .com)
- **Cloudflare:** https://cloudflare.com (~$10/year, includes DDoS protection)
- **Google Domains:** https://domains.google (~$12/year)
- **GoDaddy:** https://godaddy.com (~$15/year)

**Suggested Domain Names:**
- `scalperium.com`
- `scalperium.io`
- `scalperium.app`
- `scalptrading.com`
- `mt5scalper.com`

### 4.2 Add Domain to Vercel

1. **Go to Vercel Project:**
   - Dashboard → Your Project → Settings → Domains

2. **Add Domain:**
   - Click "Add Domain"
   - Enter your domain: `scalperium.com`
   - Click "Add"

3. **Vercel will show DNS records to add:**
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

### 4.3 Configure DNS at Your Registrar

**Example - Namecheap:**
1. Login to Namecheap
2. Domain List → Manage → Advanced DNS
3. Add records:
   ```
   A Record     @      76.76.21.21
   CNAME Record www    cname.vercel-dns.com
   ```
4. Save changes
5. Wait 10-30 minutes for DNS propagation

**Example - Cloudflare:**
1. Login to Cloudflare
2. Select your domain → DNS → Records
3. Add records:
   ```
   Type: A      Name: @    Content: 76.76.21.21    Proxy: ON
   Type: CNAME  Name: www  Content: cname.vercel-dns.com  Proxy: ON
   ```
4. Save
5. DNS propagates in 2-5 minutes with Cloudflare

### 4.4 Verify Domain

1. **Back in Vercel:**
   - Wait for "Valid Configuration" status
   - Usually 5-30 minutes

2. **Test:**
   ```bash
   # Check DNS propagation
   dig scalperium.com
   dig www.scalperium.com

   # Should show Vercel IPs
   ```

3. **Visit your domain:**
   - `https://scalperium.com` (redirects to www)
   - `https://www.scalperium.com` (main site)

### 4.5 Enable HTTPS (Automatic)

Vercel automatically provisions SSL certificates via Let's Encrypt:
- Takes 1-5 minutes after DNS verification
- Auto-renews every 90 days
- Forces HTTPS redirect

---

## Step 5: Update Environment Variables

### 5.1 Update PUBLIC_APP_URL

```bash
# Via CLI
vercel env add PUBLIC_APP_URL production
# Enter: https://scalperium.com

# Or via dashboard
# Settings → Environment Variables
# Edit PUBLIC_APP_URL → https://scalperium.com
```

### 5.2 Redeploy

```bash
# Trigger new deployment with updated env vars
vercel --prod
```

---

## Step 6: Configure Vercel for SvelteKit

Create `vercel.json` in `/web-app/` directory:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "sveltekit",
  "outputDirectory": ".svelte-kit",
  "regions": ["lhr1"],
  "env": {
    "DATABASE_URL": "@database_url",
    "AUTH_SECRET": "@auth_secret"
  }
}
```

**Region Codes:**
- `lhr1` - London (closest to your broker)
- `fra1` - Frankfurt
- `iad1` - Washington DC (US East)
- `sfo1` - San Francisco

---

## Step 7: Continuous Deployment

Once set up, every push to `main` branch automatically deploys:

```bash
# Make changes locally
git add .
git commit -m "Update feature"
git push origin main

# Vercel automatically:
# 1. Detects push
# 2. Runs build
# 3. Deploys to production
# 4. Available at your domain in 2-3 minutes
```

### Preview Deployments

Every pull request gets a preview URL:
```bash
# Create feature branch
git checkout -b feature/new-dashboard
# Make changes
git push origin feature/new-dashboard
# Create PR on GitHub
# Vercel creates: https://scalperium-mt5-saas-git-feature-new-dash-username.vercel.app
```

---

## Step 8: Post-Deployment Checklist

### 8.1 Test Core Features

- [ ] Visit https://scalperium.com
- [ ] Register new user account
- [ ] Login successfully
- [ ] Connect MT5 account (test credentials)
- [ ] View dashboard with account data
- [ ] Check admin panel (super admin login)
- [ ] Test IB dashboard (IB partner login)

### 8.2 Configure Production Settings

**In your code:**
```typescript
// src/lib/config.ts
export const config = {
  appUrl: import.meta.env.PUBLIC_APP_URL || 'https://scalperium.com',
  wsUrl: import.meta.env.PUBLIC_WS_URL || 'wss://scalperium.com/ws',
  environment: import.meta.env.MODE || 'production'
}
```

**Update WebSocket endpoints** in C# Pool Agent:
```json
{
  "WebSocketUrl": "wss://scalperium.com/ws/agent",
  "AppUrl": "https://scalperium.com"
}
```

### 8.3 Monitor Performance

**Vercel Dashboard:**
- Analytics → Track page views, performance
- Logs → View server logs and errors
- Deployments → See deployment history

**Key Metrics to Watch:**
- Build time: Should be <3 minutes
- Cold start time: Should be <1 second
- Page load time: Should be <2 seconds
- Error rate: Should be <0.1%

---

## Step 9: Scaling Considerations

### When You Need to Scale

**Signs you need more capacity:**
- 100+ concurrent users
- 1000+ MT5 accounts
- Slow database queries (>500ms)
- Frequent timeout errors

**Vercel Pro Plan ($20/month):**
- Priority support
- Advanced analytics
- Password protection for previews
- Custom deployment roles

**Database Scaling:**
- **Supabase Pro:** $25/month - 8GB database
- **Vercel Postgres Pro:** $20/month - 256MB (good for 50k users)
- **Neon Scale:** $19/month - 200GB

### CDN and Edge

Vercel automatically uses CDN for static assets:
- Assets cached at 100+ global edge locations
- Automatic image optimization
- Instant cache invalidation

---

## Step 10: Backup & Disaster Recovery

### 10.1 Database Backups

**Automatic (if using Vercel Postgres):**
- Daily automatic backups (retained 7 days)
- Point-in-time recovery

**Manual Backup:**
```bash
# Export database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Store in S3/Google Cloud/Dropbox
```

### 10.2 Code Backups

**GitHub is your backup:**
- Every commit is a restore point
- Can rollback to any previous deployment in Vercel

**Rollback Deployment:**
```bash
# Via CLI
vercel rollback

# Or via dashboard
# Deployments → Find working deployment → "⋯" → Promote to Production
```

---

## Troubleshooting

### Build Fails on Vercel

**Error:** `Build failed`

**Check:**
1. View build logs in Vercel dashboard
2. Common issues:
   - Missing environment variables
   - TypeScript errors
   - Package.json scripts

**Fix:**
```bash
# Test build locally first
npm run build

# If successful, push
git push origin main
```

### Database Connection Fails

**Error:** `Can't connect to database`

**Check:**
1. DATABASE_URL is correct in Vercel env vars
2. Database allows connections from Vercel IPs
3. Connection string includes `?sslmode=require`

**Fix:**
```bash
# Test connection locally
npx prisma db push

# Check Vercel logs
vercel logs
```

### Domain Not Working

**Error:** `DNS_PROBE_FINISHED_NXDOMAIN`

**Check:**
1. DNS records are correct at registrar
2. Wait 30+ minutes for DNS propagation
3. Check: https://dnschecker.org

**Fix:**
```bash
# Verify DNS
dig scalperium.com

# Should show:
# scalperium.com. 300 IN A 76.76.21.21
```

### SSL Certificate Error

**Error:** `NET::ERR_CERT_INVALID`

**Fix:**
- Wait 5-10 minutes after DNS verification
- Vercel auto-provisions SSL
- If stuck, contact Vercel support

---

## Quick Reference Commands

```bash
# Push to GitHub
git add .
git commit -m "Update"
git push origin main

# Deploy to Vercel
vercel --prod

# Check deployment logs
vercel logs

# Set environment variable
vercel env add VARIABLE_NAME

# View project info
vercel inspect

# Rollback
vercel rollback

# Test database connection
npx prisma db push

# Run migrations on production
npx prisma migrate deploy
```

---

## Costs Summary

| Service | Cost | Purpose |
|---------|------|---------|
| **GitHub** | FREE | Code hosting |
| **Vercel Hobby** | FREE | Web hosting (100GB bandwidth) |
| **Vercel Postgres** | FREE | Database (256MB) |
| **Domain (.com)** | $10-15/year | Custom domain |
| **SSL Certificate** | FREE | Automatic via Vercel |
| **CDN** | FREE | Included with Vercel |
| **TOTAL** | **~$1/month** | After domain purchase |

---

## Next Steps After Deployment

1. ✅ Test thoroughly at https://scalperium.com
2. ✅ Update C# Pool Agent with production WebSocket URL
3. ✅ Monitor Vercel analytics for first 48 hours
4. ✅ Set up alerts for errors (Sentry or similar)
5. ✅ Create backup schedule for database
6. ✅ Document API endpoints for future reference
7. ✅ Plan v2.0 features based on user feedback

---

**You're Live!** 🚀

Your MT5 Scalperium SaaS is now deployed and accessible worldwide at your custom domain.
