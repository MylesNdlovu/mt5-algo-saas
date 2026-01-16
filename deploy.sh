#!/bin/bash

# ============================================================================
# Automated Deployment Script
# Updates: Local → GitHub → Vercel in one command
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}  SCALPERIUM AUTOMATED DEPLOYMENT${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get commit message from argument or use default
COMMIT_MSG="${1:-Update Scalperium app}"

# Step 1: Check for changes
echo -e "${BLUE}[1/5]${NC} Checking for changes..."
if [[ -z $(git status -s) ]]; then
    echo -e "${YELLOW}⚠ No changes detected. Nothing to deploy.${NC}"
    exit 0
fi

git status -s
echo ""

# Step 2: Stage all changes
echo -e "${BLUE}[2/5]${NC} Staging all changes..."
git add -A
echo -e "${GREEN}✓${NC} All changes staged"
echo ""

# Step 3: Commit changes
echo -e "${BLUE}[3/5]${NC} Committing changes..."
git commit -m "$COMMIT_MSG"
echo -e "${GREEN}✓${NC} Changes committed locally"
echo ""

# Step 4: Push to GitHub
echo -e "${BLUE}[4/5]${NC} Pushing to GitHub..."
if git push origin main; then
    echo -e "${GREEN}✓${NC} Pushed to GitHub successfully"
else
    echo -e "${RED}✗${NC} Failed to push to GitHub"
    echo ""
    echo "This is likely because you need to authenticate with GitHub."
    echo "Please run: git push origin main"
    echo "And enter your GitHub username and token when prompted."
    exit 1
fi
echo ""

# Step 5: Deploy to Vercel
echo -e "${BLUE}[5/5]${NC} Deploying to Vercel..."
cd web-app

if vercel --prod --yes; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}✓ DEPLOYMENT COMPLETE!${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Changes are now live on:"
    echo "  • Local: ✓ Committed"
    echo "  • GitHub: ✓ Pushed"
    echo "  • Vercel: ✓ Deployed"
    echo ""
    echo "View deployment: https://vercel.com/dashboard"
    echo ""
else
    echo -e "${RED}✗${NC} Vercel deployment failed"
    echo ""
    echo "The code was pushed to GitHub but Vercel deployment failed."
    echo "Please check Vercel dashboard for errors."
    exit 1
fi
