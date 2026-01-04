# Complete Deployment Guide

## System Requirements

### Master Server
- Windows Server 2019/2022
- 8GB RAM minimum
- 100GB SSD storage
- .NET 8.0 Runtime
- MT5 Terminal
- Gold Scalper EA
- LTC Master Copier

### Web Application Server
- Linux (Ubuntu 20.04+) or Windows
- Node.js 18+
- 4GB RAM minimum
- PostgreSQL 14+

### User VPS (per user)
- Windows Server 2019/2022
- 2GB RAM
- 20GB SSD
- MT5 Terminal
- LTC Slave Copier

## Architecture Overview

```
                                    ┌──────────────────┐
                                    │   User Browser   │
                                    └────────┬─────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    SvelteKit Web App                         │
│  (Authentication, Dashboard, Admin, API Gateway)             │
└────────────┬────────────────────────────┬───────────────────┘
             │                            │
             ▼                            ▼
    ┌────────────────┐          ┌─────────────────┐
    │   PostgreSQL   │          │  C# API Agent   │
    │    Database    │          │  (Windows)      │
    └────────────────┘          └────────┬────────┘
                                         │
                                         ▼
                              ┌────────────────────────┐
                              │  Master MT5 Server     │
                              │  (Gold Scalper EA)     │
                              └───────────┬────────────┘
                                          │
                        ┌─────────────────┼─────────────────┐
                        │                 │                 │
                        ▼                 ▼                 ▼
                  ┌──────────┐      ┌──────────┐    ┌──────────┐
                  │ User VPS │      │ User VPS │    │ User VPS │
                  │  + MT5   │      │  + MT5   │    │  + MT5   │
                  └──────────┘      └──────────┘    └──────────┘
```

## Step-by-Step Deployment

### Phase 1: Database Setup

1. **Install PostgreSQL**
   ```bash
   # Ubuntu
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   
   # Start service
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

2. **Create Database**
   ```bash
   sudo -u postgres psql
   CREATE DATABASE mt5_algo_saas;
   CREATE USER mt5admin WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE mt5_algo_saas TO mt5admin;
   \q
   ```

3. **Configure Remote Access** (if needed)
   Edit `/etc/postgresql/14/main/postgresql.conf`:
   ```
   listen_addresses = '*'
   ```
   
   Edit `/etc/postgresql/14/main/pg_hba.conf`:
   ```
   host    all             all             0.0.0.0/0            md5
   ```

### Phase 2: Master MT5 Server Setup

1. **Install Windows Server 2019/2022**

2. **Install MT5**
   - Download from MetaQuotes
   - Install to default location
   - Login to master account

3. **Install Gold Scalper EA**
   ```
   Copy EA files to:
   C:\Users\Administrator\AppData\Roaming\MetaQuotes\Terminal\[TERMINAL_ID]\MQL5\Experts\
   ```

4. **Install LTC Master Copier**
   - Install copier software
   - Configure as master
   - Note copier settings

5. **Configure EA**
   - Open XAUUSD chart
   - Attach Gold Scalper EA
   - Set parameters:
     - Lot Size: 0.01
     - Risk: Low
     - Magic Number: 12345
   - Enable auto-trading

### Phase 3: C# Agent Deployment

1. **Install .NET 8.0 Runtime**
   ```bash
   winget install Microsoft.DotNet.Runtime.8
   ```

2. **Deploy Application**
   ```bash
   # Build on development machine
   dotnet publish -c Release --self-contained true -r win-x64
   
   # Copy to server
   xcopy /E /I bin\Release\net8.0\win-x64\publish\ C:\MT5Agent\
   ```

3. **Configure appsettings.json**
   ```json
   {
     "ApiKey": "CHANGE_THIS_TO_SECURE_KEY",
     "WebAppUrl": "https://your-domain.com",
     "MT5": {
       "ServerPath": "C:\\Program Files\\MetaTrader 5\\terminal64.exe",
       "MasterAccountLogin": "your_master_login",
       "MasterAccountPassword": "your_master_password",
       "MasterAccountServer": "Exness-MT5Real"
     }
   }
   ```

4. **Install as Windows Service**
   ```bash
   sc create MT5AgentAPI binPath="C:\MT5Agent\MT5AgentAPI.exe" start=auto
   sc description MT5AgentAPI "MT5 Algo Trading API Agent"
   sc start MT5AgentAPI
   ```

5. **Configure Firewall**
   ```bash
   netsh advfirewall firewall add rule name="MT5 Agent API" dir=in action=allow protocol=TCP localport=5000
   ```

### Phase 4: Web Application Deployment

1. **Install Node.js**
   ```bash
   # Ubuntu
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Deploy Application**
   ```bash
   # Clone repository
   git clone your-repo-url /var/www/mt5-algo-saas
   cd /var/www/mt5-algo-saas/web-app
   
   # Install dependencies
   npm install
   
   # Configure environment
   cp .env.example .env
   nano .env
   ```

3. **Configure .env**
   ```env
   DATABASE_URL="postgresql://mt5admin:password@db-server:5432/mt5_algo_saas"
   JWT_SECRET="your-super-secure-jwt-secret-min-32-chars"
   CSHARP_AGENT_URL="http://master-server-ip:5000"
   CSHARP_AGENT_API_KEY="same-as-csharp-agent-apikey"
   PUBLIC_APP_URL="https://your-domain.com"
   ```

4. **Setup Database**
   ```bash
   npm run db:push
   node scripts/seed-admin.js
   ```

5. **Build Application**
   ```bash
   npm run build
   ```

6. **Install PM2**
   ```bash
   sudo npm install -g pm2
   pm2 start npm --name "mt5-algo-saas" -- start
   pm2 save
   pm2 startup
   ```

7. **Configure Nginx Reverse Proxy**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:5173;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

8. **Install SSL Certificate**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### Phase 5: User VPS Template

1. **Create Base VPS Image**
   - Install Windows Server
   - Install MT5
   - Install LTC Slave Copier
   - Configure auto-start
   - Save as template

2. **Automate VPS Provisioning**
   - Use cloud provider API
   - Deploy from template
   - Configure MT5 credentials
   - Link slave copier to master

## Environment Variables Reference

### Web Application
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=minimum-32-character-secret
CSHARP_AGENT_URL=http://agent-server:5000
CSHARP_AGENT_API_KEY=secure-api-key
PUBLIC_APP_URL=https://your-domain.com
EXNESS_IB_LINK=https://one.exness-track.com/a/YOUR_CODE
PRIMEXBT_IB_LINK=https://primexbt.com/?signup=YOUR_CODE
```

### C# Agent
```json
{
  "ApiKey": "same-as-web-app-api-key",
  "WebAppUrl": "https://your-domain.com",
  "MT5": {
    "ServerPath": "C:\\Program Files\\MetaTrader 5\\terminal64.exe",
    "MasterAccountLogin": "master_login",
    "MasterAccountPassword": "master_password",
    "MasterAccountServer": "Exness-MT5Real"
  },
  "VPS": {
    "Provider": "AWS|Azure|DigitalOcean",
    "DefaultRegion": "us-east-1"
  }
}
```

## Security Checklist

- [ ] Change default admin password
- [ ] Generate strong JWT secret (32+ characters)
- [ ] Use unique API keys
- [ ] Enable firewall on all servers
- [ ] Configure SSL/TLS certificates
- [ ] Restrict database access to web app only
- [ ] Use VPN for VPS management
- [ ] Enable 2FA for admin accounts (future)
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity

## Monitoring & Maintenance

### Health Checks
```bash
# Web app
curl https://your-domain.com/health

# C# Agent
curl http://master-server:5000/health

# Database
psql -U mt5admin -h db-server -c "SELECT 1"
```

### Log Monitoring
```bash
# PM2 logs
pm2 logs mt5-algo-saas

# C# Agent logs (Windows Event Viewer or file)
Get-EventLog -LogName Application -Source MT5AgentAPI

# PostgreSQL logs
tail -f /var/log/postgresql/postgresql-14-main.log
```

### Backups

**Database Backup**
```bash
# Daily backup cron
0 2 * * * pg_dump -U mt5admin mt5_algo_saas > /backups/db_$(date +\%Y\%m\%d).sql
```

**Configuration Backup**
- Web app .env file
- C# agent appsettings.json
- Nginx configuration
- EA configuration files

## Scaling Considerations

### Horizontal Scaling
- Load balance web app with Nginx
- Deploy multiple C# agents
- Read replicas for database

### Performance Optimization
- Enable database connection pooling
- Implement Redis caching
- CDN for static assets
- Optimize Prisma queries

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check credentials
   - Verify firewall rules
   - Test with `psql` directly

2. **C# Agent Not Responding**
   - Check Windows Service status
   - Review Event Viewer logs
   - Verify MT5 is running

3. **EA Not Starting**
   - Check safety indicator
   - Verify MT5 auto-trading enabled
   - Review EA logs

4. **LTC Copier Not Syncing**
   - Verify network connectivity
   - Check copier configuration
   - Ensure master is trading
