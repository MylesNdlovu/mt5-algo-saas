# MT5 Algorithmic Trading SaaS Platform

## 🚀 Overview

A complete SaaS solution for offering **free MT5 algorithmic trading** with VPS, Expert Advisor (EA), and Local Trade Copier (LTC) service. Users can trade gold (XAUUSD) using our automated Gold Scalper EA with intelligent safety monitoring.

### Key Features

✅ **Automated Trading** - Gold Scalper EA with proven strategy  
✅ **Free VPS** - Dedicated VPS for each user  
✅ **Trade Copying** - LTC copier from master to slave accounts  
✅ **Safety Monitoring** - Red/Orange/Green indicator system  
✅ **One-Click Control** - Simple Start/Stop EA interface  
✅ **Real-Time Dashboard** - Live P&L and trade history  
✅ **Admin Panel** - Complete user and system management  
✅ **IB Support** - Two user types: Direct and IB Clients  
✅ **Multi-Broker** - Supports Exness and PrimeXBT  

## 📋 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                           │
│  (SvelteKit Dashboard - Start/Stop EA, View Trades, Monitor P&L) │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SvelteKit Web Application                     │
│  • Authentication (JWT)      • User Dashboard                    │
│  • Admin Panel              • API Gateway                        │
│  • PostgreSQL + Prisma      • Subscription Management            │
└────────────────┬────────────────────────────┬───────────────────┘
                 │                            │
                 ▼                            ▼
        ┌────────────────┐         ┌──────────────────────┐
        │   PostgreSQL   │         │   C# API Agent       │
        │    Database    │         │  (Windows Server)    │
        └────────────────┘         └──────────┬───────────┘
                                              │
                                              ▼
                                   ┌──────────────────────┐
                                   │  Master MT5 Server   │
                                   │  Gold Scalper EA     │
                                   │  LTC Master          │
                                   └──────────┬───────────┘
                                              │
                        ┌─────────────────────┼─────────────────────┐
                        │                     │                     │
                        ▼                     ▼                     ▼
                  ┌──────────┐         ┌──────────┐         ┌──────────┐
                  │ User VPS │         │ User VPS │         │ User VPS │
                  │  + MT5   │         │  + MT5   │         │  + MT5   │
                  │ Slave EA │         │ Slave EA │         │ Slave EA │
                  └──────────┘         └──────────┘         └──────────┘
```

## 🛠️ Technology Stack

### Frontend & Backend
- **SvelteKit** - Modern web framework
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first styling
- **PostgreSQL** - Robust database
- **Prisma ORM** - Type-safe database access

### Automation & Trading
- **C# .NET 8.0** - High-performance agent
- **MetaTrader 5** - Trading platform
- **Gold Scalper EA** - Trading algorithm
- **LTC** - Trade copying system

### Infrastructure
- **VPS** - Dedicated servers per user
- **REST API** - Inter-service communication
- **JWT** - Secure authentication

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- .NET 8.0 SDK
- PostgreSQL 14+
- MetaTrader 5
- Windows Server (for MT5/C# agent)

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd mt5-algo-saas
```

### 2. Setup Web Application

```bash
cd web-app
npm install
cp .env.example .env
# Edit .env with your configuration
npm run db:push
node scripts/seed-admin.js
npm run dev
```

**Default Admin:** admin@mt5algo.com / Admin@123456

### 3. Setup C# Agent

```bash
cd csharp-agent/MT5AgentAPI
dotnet restore
dotnet build
# Edit appsettings.json
dotnet run
```

### 4. Configure MT5

1. Install MT5 on master server
2. Copy Gold Scalper EA to Experts folder
3. Install LTC Master copier
4. Configure EA on XAUUSD chart
5. Enable auto-trading

## 📚 Documentation

Comprehensive guides available:

- **[Web App Setup](docs/web-app-setup.md)** - SvelteKit installation and configuration
- **[C# Agent Setup](docs/csharp-agent-setup.md)** - Windows service and MT5 integration
- **[Deployment Guide](docs/deployment-guide.md)** - Production deployment steps
- **[User Guide](docs/user-guide.md)** - End-user onboarding and usage
- **[API Documentation](docs/api-documentation.md)** - Complete API reference

## 🎯 Core Features

### User Dashboard

**Safety Indicator System**
- 🟢 **GREEN**: Safe market conditions - EA enabled
- 🟠 **ORANGE**: Proceed with caution - monitoring required
- 🔴 **RED**: Unsafe conditions - EA automatically disabled

**EA Control**
- One-click Start/Stop buttons
- Real-time status monitoring
- Safety-based restrictions

**Trading Overview**
- Live balance and equity
- Total P&L with breakdown
- Open positions table
- Closed trade history

### Admin Panel

- User management (activate/deactivate)
- Account monitoring
- System statistics
- EA status overview
- IB management

## 👥 User Types

### 1. Direct Users
- Register with our IB link
- Open Pro account (Exness/PrimeXBT)
- Free EA and VPS access
- Revenue from broker spread/commission

### 2. IB Client Users
- Access granted by partnered IBs
- Subscription-based model
- 30-day free trial
- Monthly billing

## 🔒 Security Features

- JWT-based authentication
- HTTP-only cookies
- Password hashing (bcrypt)
- API key authentication
- Role-based access control (RBAC)
- SQL injection prevention (Prisma)

## ⚠️ Risk Disclaimer

Trading involves substantial risk of loss. This software is provided "as is" without warranties. Users are responsible for their own trading decisions. Past performance does not guarantee future results.

---

**Built with ❤️ for algorithmic traders**

For detailed setup instructions, see the documentation in the `/docs` folder.
# Environment variables configured
