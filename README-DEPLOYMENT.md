# Scalperium - Automated Deployment

## ⚡ Quick Deploy (One Command)

Every time you make changes, just run:

```bash
./deploy.sh "Your commit message here"
```

**Or with default message:**
```bash
./deploy.sh
```

This automatically:
1. ✅ Stages all changes locally
2. ✅ Commits to git
3. ✅ Pushes to GitHub
4. ✅ Deploys to Vercel production

---

## 🔧 First Time Setup

### Step 1: Authenticate with GitHub (One-time)

1. **Generate GitHub token:**
   ```bash
   # Opens token creation page
   open "https://github.com/settings/tokens/new"
   ```

2. **On GitHub page:**
   - Note: "MT5 SaaS Deployment"
   - Expiration: No expiration
   - Scopes: ✅ `repo`
   - Click "Generate token"
   - Copy the token (starts with `ghp_...`)

3. **Push once manually:**
   ```bash
   git push origin main
   ```
   - Username: `MylesNdlovu`
   - Password: `<paste your token>`
   - Mac Keychain will save it automatically

### Step 2: Link Vercel Project (One-time)

```bash
cd web-app
vercel link
```

Follow prompts to link to your existing Vercel project.

### Step 3: Set Environment Variables

Add these in Vercel dashboard (Settings → Environment Variables):

```bash
DATABASE_URL=your_postgres_connection_string
AUTH_SECRET=<run: openssl rand -base64 32>
PUBLIC_APP_URL=https://your-domain.vercel.app
```

---

## 📝 Daily Workflow

### Scenario 1: Quick Changes

```bash
# Make your changes in code
vim web-app/src/routes/dashboard/+page.svelte

# Deploy everything
./deploy.sh "Update dashboard UI"

# Done! Live in 2-3 minutes
```

### Scenario 2: Multiple Changes

```bash
# Edit multiple files
# When ready to deploy:
./deploy.sh "Add IB partner features and fix navigation"
```

### Scenario 3: Just Push to GitHub (No Vercel Deploy)

```bash
git add .
git commit -m "Work in progress"
git push origin main
```

---

## 🎯 Deployment Script Features

**What it does:**
- ✅ Checks for changes (exits if nothing to deploy)
- ✅ Shows what will be committed
- ✅ Commits with your message
- ✅ Pushes to GitHub
- ✅ Deploys to Vercel production
- ✅ Shows deployment URL
- ✅ Handles errors gracefully

**What it doesn't do:**
- ❌ Force push (safe by default)
- ❌ Deploy if tests fail (add tests later)
- ❌ Auto-merge conflicts (you resolve manually)

---

## 🔄 Rollback a Deployment

If something breaks:

```bash
# Via Vercel dashboard
# Deployments → Find working version → Promote to Production

# Or via CLI
cd web-app
vercel rollback
```

---

## 🛠️ Advanced: Custom Git Aliases

Add to `~/.gitconfig` for even faster deploys:

```bash
git config --global alias.deploy '!f() { git add -A && git commit -m "${1:-Update}" && git push origin main; }; f'
```

Then use:
```bash
git deploy "Your message"
```

---

## 📊 Deployment Checklist

Before deploying major changes:

- [ ] Test locally: `npm run dev`
- [ ] Build succeeds: `npm run build`
- [ ] No TypeScript errors: `npm run check`
- [ ] Database migrations ready: `npx prisma migrate dev`
- [ ] Environment variables set in Vercel
- [ ] Backup database (if schema changes)

---

## 🚨 Troubleshooting

### "Permission denied to GitHub"

**Fix:**
```bash
# Clear cached credentials
git credential-osxkeychain erase
host=github.com
protocol=https

# Then push again (will prompt for new token)
git push origin main
```

### "Vercel deployment failed"

**Fix:**
```bash
# Check logs
cd web-app
vercel logs

# Common issues:
# 1. Missing environment variables
# 2. Build errors (test with: npm run build)
# 3. Database connection issues
```

### "No changes detected"

**Fix:**
```bash
# Check what's changed
git status

# If files are ignored, check .gitignore
cat .gitignore
```

---

## 📈 Monitoring Deployments

**View deployment status:**
```bash
cd web-app
vercel ls
```

**View logs:**
```bash
vercel logs --follow
```

**View production URL:**
```bash
vercel inspect
```

---

## 🎉 Success Indicators

After running `./deploy.sh`, you should see:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ DEPLOYMENT COMPLETE!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Changes are now live on:
  • Local: ✓ Committed
  • GitHub: ✓ Pushed
  • Vercel: ✓ Deployed
```

---

## 💡 Pro Tips

1. **Commit often:** Small, frequent deploys are safer than large ones
2. **Use descriptive messages:** Future you will thank you
3. **Test locally first:** Run `npm run dev` before deploying
4. **Monitor first deploy:** Watch Vercel dashboard for first 5 minutes
5. **Keep .env.local:** Never commit secrets to GitHub

---

## 📞 Need Help?

- **Vercel Issues:** https://vercel.com/support
- **GitHub Issues:** https://github.com/MylesNdlovu/mt5-algo-saas/issues
- **Deployment Logs:** `vercel logs`
- **Build Logs:** Check Vercel dashboard → Deployments

---

Happy Deploying! 🚀
