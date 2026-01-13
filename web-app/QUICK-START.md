# 🚀 Quick Start - Test Your Multi-Account Trading System

## ✅ Server Running

Your dev server is **running in the background** on your Mac.

---

## 🧪 Test on Mac (Now)

### Step 1: Open Web App
```
http://localhost:5173
```

### Step 2: Login
```
Email: trader@scalperium.com
Password: trader123
```

### Step 3: Test Features

1. **Dashboard** - See account overview
2. **Settings (⚙️)** - Click gear icon
3. **Scroll to "Trading Accounts"** section
4. **You'll see:**
   - ✅ Exness - 50099101 (ENABLED)
   - ✅ Exness - 50099102 (ENABLED)
   - ⭕ PrimeXBT - 50099103 (DISABLED)
   - ⏳ Exness - 50099104 (PENDING)

5. **Test Toggles:**
   - Click toggle on PrimeXBT account
   - Watch it turn green
   - Counter updates: "3 / 4 enabled"
   - Toggle another OFF
   - Counter updates: "2 / 4 enabled"

6. **Test Start Algo:**
   - Click "Start Algo" button (in header)
   - Expected: "⚠️ No online agent found..."
   - **This is normal!** (No C# agent running yet)

7. **Test Persistence:**
   - Refresh page
   - Login again
   - Check Settings
   - Toggles should be saved!

---

## 🖥️ Test with Windows MT5 (Later)

When you're ready to test with your real MT5:

### On Windows:

**Option 1: Test from Browser First**
```
http://192.168.1.109:5173
```
Login and verify web app works from Windows.

**Option 2: Connect C# Agent**

1. Open PowerShell
2. Create agent project:
   ```powershell
   cd C:\Projects
   mkdir MT5Agent
   cd MT5Agent
   dotnet new console
   dotnet add package System.Net.WebSockets.Client
   ```

3. Follow guide: `/docs/LOCAL-MT5-TESTING.md`

4. Connect to Mac WebSocket:
   ```
   ws://192.168.1.109:3001/ws
   ```

5. Test commands from Mac web app → Windows agent!

---

## 🔧 Useful Commands

### Check Server Status
```bash
lsof -i :5173    # Web app
lsof -i :3001    # WebSocket
```

### Stop Server
```bash
pkill -f "vite dev"
```

### Restart Server
```bash
npm run dev
```

### Check Mac IP (for Windows connection)
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### Run Network Test
```bash
./local-network-test.sh
```

---

## 📖 Documentation

- **Multi-Account System:** `/docs/MULTI-ACCOUNT-TRADING-ARCHITECTURE.md`
- **Local MT5 Testing:** `/docs/LOCAL-MT5-TESTING.md`
- **Deployment:** `/docs/DEPLOYMENT-GUIDE.md`
- **Testing Workflow:** `TESTING-WORKFLOW.md`

---

## ✅ Success Checklist

### Mac Testing
- [ ] Open http://localhost:5173
- [ ] Login as trader@scalperium.com
- [ ] Dashboard loads
- [ ] Settings modal opens
- [ ] See 4 MT5 accounts
- [ ] Toggles work
- [ ] Counter updates
- [ ] "Start Algo" button responds
- [ ] Settings persist after refresh

### Windows Testing (Optional)
- [ ] Open http://192.168.1.109:5173 from Windows
- [ ] Web app loads on Windows
- [ ] Create C# agent project
- [ ] Agent connects to Mac WebSocket
- [ ] Agent appears "online" in /agents page
- [ ] "Start Algo" sends command to Windows
- [ ] Windows agent receives command

---

## 🎯 What You're Testing

✅ **Frontend:** Multi-account selector UI
✅ **Backend:** API endpoints for account management
✅ **Database:** Account toggles persist
✅ **WebSocket:** Real-time communication (when agent connected)
✅ **Multi-Account:** Commands sent to all enabled accounts

---

## 🆘 Need Help?

**Server not loading?**
```bash
npm run dev
# Wait for "Local: http://localhost:5173/"
```

**Can't login?**
Check demo credentials are correct:
- trader@scalperium.com / trader123

**Toggles not working?**
Check browser console (F12) for errors.

**Windows can't connect?**
- Check firewall on Mac
- Verify both devices on same Wi-Fi
- Try: `ping 192.168.1.109` from Windows

---

**Ready?** Open http://localhost:5173 and start testing! 🚀
