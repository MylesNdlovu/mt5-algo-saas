#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  Local Network Testing Setup - Mac + Windows             ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get Mac IP
echo -e "${BLUE}1. Finding your Mac's IP address...${NC}"
MAC_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

if [ -z "$MAC_IP" ]; then
    echo "❌ Could not determine IP automatically"
    echo "Please run: ifconfig | grep 'inet '"
    exit 1
fi

echo -e "${GREEN}✅ Your Mac IP: $MAC_IP${NC}"
echo ""

# Check if web app is running
echo -e "${BLUE}2. Checking web app status...${NC}"
if curl -s http://localhost:5173 > /dev/null; then
    echo -e "${GREEN}✅ Web app running on http://localhost:5173${NC}"
else
    echo -e "${YELLOW}⚠️  Web app not running${NC}"
    echo "   Run: npm run dev"
fi
echo ""

# Check WebSocket server
echo -e "${BLUE}3. Checking WebSocket server...${NC}"
if lsof -i :3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ WebSocket server running on port 3001${NC}"
else
    echo -e "${YELLOW}⚠️  WebSocket server not detected${NC}"
    echo "   It should start with 'npm run dev'"
fi
echo ""

# Check firewall
echo -e "${BLUE}4. Firewall check...${NC}"
FIREWALL_STATUS=$(sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null)

if echo "$FIREWALL_STATUS" | grep -q "enabled"; then
    echo -e "${YELLOW}⚠️  Firewall is ON${NC}"
    echo "   You may need to allow connections on ports 3001 and 5173"
    echo ""
    echo "   To allow (choose one):"
    echo "   • System Preferences → Security → Firewall → Firewall Options"
    echo "   • Or temporarily disable for testing"
else
    echo -e "${GREEN}✅ Firewall is OFF (testing OK)${NC}"
fi
echo ""

# Summary
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  Configuration for Windows C# Agent                      ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Use these settings in your Windows agent:"
echo ""
echo -e "  ${GREEN}Mac IP Address:${NC} $MAC_IP"
echo -e "  ${GREEN}WebSocket URL:${NC}  ws://$MAC_IP:3001/ws"
echo -e "  ${GREEN}Web App URL:${NC}    http://$MAC_IP:5173"
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  Test Connection from Windows                            ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "1. On Windows, ping your Mac:"
echo "   ping $MAC_IP"
echo ""
echo "2. Test WebSocket connection:"
echo "   dotnet run"
echo "   Enter IP: $MAC_IP"
echo ""
echo "3. Open web app from Windows browser:"
echo "   http://$MAC_IP:5173"
echo ""
echo "4. Login and test:"
echo "   Email: trader@scalperium.com"
echo "   Password: trader123"
echo ""
echo "5. Go to /agents page to see your Windows agent online!"
echo ""
echo "📖 Full guide: /docs/LOCAL-MT5-TESTING.md"
echo ""
