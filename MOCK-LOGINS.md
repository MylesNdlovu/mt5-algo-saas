# 🔐 Gold Deal Locks - Mock Login Credentials

## Production Login Details

### 👨‍💼 Admin Account
- **Email:** `admin@scalperium.com`
- **Password:** `Admin123!`
- **Access:** Full system control, user management, analytics, automations
- **URL:** http://localhost:5173/login (then redirects to /admin)

---

### 👤 Demo Trader Accounts

#### Trader Demo - Exness
- **Email:** `trader@gdl.com`
- **Password:** `Trader123!`
- **Broker:** Exness
- **Role:** Standard Trader
- **Features:** Full trading access, real-time P&L, trade history
- **URL:** http://localhost:5173/login

#### VIP Trader - PrimeXBT
- **Email:** `vip@gdl.com`
- **Password:** `VIP123!`
- **Broker:** PrimeXBT
- **Role:** VIP Trader
- **Features:** Premium features, priority support, advanced analytics
- **URL:** http://localhost:5173/login
- **URL:** http://localhost:5173/login

---

## Mock MT5 Connection Details (for testing)

Use these details when testing the MT5 connection form:

### Example 1 - XM Broker
- **Broker:** XM
- **Server:** XM-Real 23
- **Account Number:** 12345678
- **Password:** TestPass123!

### Example 2 - FXTM
- **Broker:** FXTM
- **Server:** FXTM-Server-02
- **Account Number:** 87654321
- **Password:** SecurePass456!

### Example 3 - IC Markets
- **Broker:** IC Markets
- **Server:** ICMarkets-Live08
- **Account Number:** 55667788
- **Password:** IcPass789!

---

## Application URLs

- **Landing Page:** http://localhost:5173/
- **Login:** http://localhost:5173/login
- **Register:** http://localhost:5173/register
- **MT5 Connection:** http://localhost:5173/connect
- **Dashboard:** http://localhost:5173/dashboard
- **Admin Panel:** http://localhost:5173/admin

---

## Setup Instructions

1. **Start the dev server:**
   ```bash
   cd /Users/dmd/mt5-algo-saas/web-app
   npm run dev
   ```

2. **Seed the database (if configured):**
   ```bash
   node scripts/seed-admin.js
   ```

3. **Access the app:**
   - Open http://localhost:5173/
   - Click "Sign In"
   - Use any credentials above

---

## Testing Flow

1. **New User Registration:**
   - Go to http://localhost:5173/register
   - Create new account
   - Auto-redirect to MT5 connection

2. **Existing User Login:**
   - Go to http://localhost:5173/login
   - Use demo credentials above
   - Access dashboard

3. **MT5 Connection:**
   - After login, go to /connect
   - Fill in broker details
   - Watch for green glowing dot on success
   - Auto-redirect to dashboard

4. **Admin Access:**
   - Login with admin credentials
   - Navigate to /admin
   - Manage users and system

---

## Security Notes

⚠️ **IMPORTANT:** 
- These are DEMO credentials for development only
- Change all passwords in production
- Enable proper authentication middleware
- Set up database before production use
- Use environment variables for sensitive data

---

## Connection Status Indicators

- 🔴 **Red Dot** - Disconnected/Error
- 🟡 **Yellow Pulse** - Connecting...
- 🟢 **Green Glow** - Connected ✓

---

**Last Updated:** December 1, 2025
**System:** Gold Deal Locks (GDL) - Mobile Gold Trading Bot
