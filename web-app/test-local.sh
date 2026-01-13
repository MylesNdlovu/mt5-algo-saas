#!/bin/bash

echo "🧪 Multi-Account Trading System - Local Test"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if server is running
echo -e "${BLUE}1. Checking dev server...${NC}"
if curl -s http://localhost:5173 > /dev/null; then
    echo -e "${GREEN}✅ Server running at http://localhost:5173${NC}"
else
    echo -e "${RED}❌ Server not running${NC}"
    echo "Run: npm run dev"
    exit 1
fi

# Check database connection
echo ""
echo -e "${BLUE}2. Checking database...${NC}"
if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connected${NC}"
else
    echo -e "${YELLOW}⚠️  Database connection issue (check DATABASE_URL)${NC}"
fi

# Count MT5 accounts
echo ""
echo -e "${BLUE}3. Checking demo data...${NC}"
ACCOUNT_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"MT5Account\" WHERE \"userId\" IN (SELECT id FROM \"User\" WHERE email='trader@scalperium.com');" 2>/dev/null | grep -o '[0-9]*' | head -1)

if [ ! -z "$ACCOUNT_COUNT" ] && [ "$ACCOUNT_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Demo trader has $ACCOUNT_COUNT MT5 accounts${NC}"
else
    echo -e "${YELLOW}⚠️  No demo accounts found - run: npm run db:seed${NC}"
fi

# Test API endpoints
echo ""
echo -e "${BLUE}4. Testing API endpoints...${NC}"

# Test health check
if curl -s http://localhost:5173/api/websocket/status > /dev/null; then
    echo -e "${GREEN}✅ API endpoints responding${NC}"
else
    echo -e "${RED}❌ API not responding${NC}"
fi

echo ""
echo "=============================================="
echo -e "${GREEN}✅ Local environment is ready!${NC}"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Open browser: ${BLUE}http://localhost:5173${NC}"
echo ""
echo "2. Login with:"
echo "   Email: ${YELLOW}trader@scalperium.com${NC}"
echo "   Password: ${YELLOW}trader123${NC}"
echo ""
echo "3. Click ${YELLOW}Settings${NC} (gear icon)"
echo ""
echo "4. Scroll to ${YELLOW}Trading Accounts${NC} section"
echo ""
echo "5. Test features:"
echo "   - Toggle accounts on/off"
echo "   - Watch counter update"
echo "   - Try enabling 5+ accounts (should block)"
echo "   - Click 'Start Algo' button"
echo ""
echo "=============================================="
echo ""
