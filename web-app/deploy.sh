#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  🚀 DEPLOY TO GITHUB & VERCEL                             ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Step 1: Check if changes are committed
echo -e "${BLUE}Step 1: Checking git status...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Uncommitted changes found${NC}"
    echo ""
    git status --short
    echo ""
    read -p "Commit these changes? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add -A
        echo "Enter commit message (or press Enter for default):"
        read commit_msg
        if [ -z "$commit_msg" ]; then
            commit_msg="Update multi-account trading system"
        fi
        git commit -m "$commit_msg"
        echo -e "${GREEN}✅ Changes committed${NC}"
    else
        echo -e "${RED}❌ Deployment cancelled${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ No uncommitted changes${NC}"
fi

# Step 2: Fix GitHub remote (if needed)
echo ""
echo -e "${BLUE}Step 2: Checking GitHub remote...${NC}"
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null)

if [[ $CURRENT_REMOTE == *"ghp_"* ]]; then
    echo -e "${YELLOW}⚠️  Detected expired token in remote URL${NC}"
    echo "Fixing remote URL..."
    git remote remove origin
    git remote add origin git@github.com:MylesNdlovu/mt5-algo-saas.git
    echo -e "${GREEN}✅ Remote updated to use SSH${NC}"
else
    echo -e "${GREEN}✅ Remote URL looks good${NC}"
fi

# Step 3: Push to GitHub
echo ""
echo -e "${BLUE}Step 3: Pushing to GitHub...${NC}"
if git push origin main 2>&1; then
    echo -e "${GREEN}✅ Pushed to GitHub successfully${NC}"
else
    echo -e "${RED}❌ GitHub push failed${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Ensure SSH key is set up: https://github.com/settings/keys"
    echo "2. Or use HTTPS: git remote set-url origin https://github.com/MylesNdlovu/mt5-algo-saas.git"
    echo ""
    read -p "Continue with Vercel deployment anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 4: Check Vercel CLI
echo ""
echo -e "${BLUE}Step 4: Checking Vercel CLI...${NC}"
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI not installed${NC}"
    echo "Install: npm install -g vercel"
    exit 1
fi
echo -e "${GREEN}✅ Vercel CLI installed${NC}"

# Step 5: Check environment variables
echo ""
echo -e "${BLUE}Step 5: Environment Variables Check${NC}"
echo ""
echo "⚠️  IMPORTANT: Ensure these are set in Vercel Dashboard:"
echo "   https://vercel.com/myles-projects-dd515697/web-app/settings/environment-variables"
echo ""
echo "Required:"
echo "  • DATABASE_URL"
echo "  • SESSION_SECRET"
echo "  • JWT_SECRET"
echo ""
echo "Optional:"
echo "  • MAILGUN_API_KEY"
echo "  • MAILGUN_DOMAIN"
echo "  • TWILIO_ACCOUNT_SID"
echo "  • TWILIO_AUTH_TOKEN"
echo ""
read -p "Have you configured these in Vercel? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${YELLOW}Please configure environment variables first:${NC}"
    echo "1. Go to: https://vercel.com/myles-projects-dd515697/web-app/settings/environment-variables"
    echo "2. Add required variables"
    echo "3. Run this script again"
    echo ""
    exit 1
fi

# Step 6: Deploy to Vercel
echo ""
echo -e "${BLUE}Step 6: Deploying to Vercel...${NC}"
echo ""
vercel --prod

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  ✅ DEPLOYMENT COMPLETE                                   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "🎉 Your multi-account trading system is live!"
echo ""
echo "Next steps:"
echo "1. Test on production URL"
echo "2. Deploy C# Pool Agent to VPS"
echo "3. Connect agent to production WebSocket"
echo ""
