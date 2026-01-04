# Complete Project Structure

## Root Directory Layout

```
mt5-algo-saas/
├── web-app/                    # SvelteKit Web Application
├── csharp-agent/              # C# .NET API Agent
├── docs/                      # Documentation
├── .gitignore                 # Git ignore rules
├── README.md                  # Main project documentation
├── PROJECT-SUMMARY.md         # Implementation summary
└── QUICK-REFERENCE.md         # Command cheat sheet
```

## Web Application (`/web-app/`)

```
web-app/
├── prisma/
│   └── schema.prisma              # Database schema with all tables
│
├── scripts/
│   └── seed-admin.js              # Create initial admin user
│
├── src/
│   ├── lib/
│   │   ├── components/            # Reusable UI components
│   │   │   ├── SafetyIndicator.svelte
│   │   │   ├── EAControl.svelte
│   │   │   ├── PLDisplay.svelte
│   │   │   ├── TradeHistory.svelte
│   │   │   └── index.ts           # Component barrel export
│   │   │
│   │   ├── server/                # Server-only code
│   │   │   ├── db.ts              # Prisma client
│   │   │   ├── auth.ts            # JWT auth utilities
│   │   │   ├── agent-client.ts    # C# Agent API client
│   │   │   └── index.ts           # Server barrel export
│   │   │
│   │   ├── types.ts               # Shared TypeScript types
│   │   └── utils.ts               # Utility functions
│   │
│   ├── routes/
│   │   ├── api/                   # API Routes
│   │   │   ├── auth/
│   │   │   │   ├── register/+server.ts
│   │   │   │   ├── login/+server.ts
│   │   │   │   └── logout/+server.ts
│   │   │   ├── ea/
│   │   │   │   └── control/+server.ts
│   │   │   ├── account/
│   │   │   │   └── [accountId]/+server.ts
│   │   │   ├── user/
│   │   │   │   └── accounts/+server.ts
│   │   │   └── admin/
│   │   │       ├── stats/+server.ts
│   │   │       ├── users/+server.ts
│   │   │       ├── accounts/+server.ts
│   │   │       └── users/[userId]/toggle/+server.ts
│   │   │
│   │   ├── dashboard/             # User Dashboard
│   │   │   └── +page.svelte
│   │   │
│   │   ├── admin/                 # Admin Panel
│   │   │   └── +page.svelte
│   │   │
│   │   ├── +layout.svelte         # Root layout
│   │   └── +layout.ts             # Layout load function
│   │
│   ├── app.css                    # Global Tailwind styles
│   ├── app.d.ts                   # App type definitions
│   └── hooks.server.ts            # Auth middleware
│
├── .env                           # Environment variables (git-ignored)
├── .env.example                   # Environment template
├── .gitignore
├── package.json
├── postcss.config.js
├── svelte.config.js
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── STRUCTURE.md                   # This file
```

## C# Agent (`/csharp-agent/`)

```
csharp-agent/
├── .gitignore
├── STRUCTURE.md                   # Agent structure documentation
└── MT5AgentAPI/
    ├── Controllers/               # HTTP endpoints
    │   ├── EAController.cs
    │   ├── AccountController.cs
    │   ├── MarketController.cs
    │   └── TradesController.cs
    │
    ├── Services/                  # Business logic
    │   ├── MT5ConnectionService.cs
    │   ├── EAControlService.cs
    │   ├── VPSManagementService.cs
    │   ├── LTCCopierService.cs
    │   ├── MarketAnalysisService.cs
    │   └── WebhookService.cs
    │
    ├── Models/                    # Data models
    │   └── DTOs.cs
    │
    ├── Middleware/                # Custom middleware
    │   └── ApiKeyAuthMiddleware.cs
    │
    ├── Program.cs                 # App entry point
    ├── appsettings.json           # Configuration
    └── MT5AgentAPI.csproj         # Project file
```

## Documentation (`/docs/`)

```
docs/
├── api-documentation.md           # Complete API reference
├── csharp-agent-setup.md          # C# agent installation
├── deployment-guide.md            # Production deployment
├── system-flows.md                # Visual flow diagrams
├── user-guide.md                  # End-user documentation
└── web-app-setup.md               # Web app installation
```

## Root Files

```
mt5-algo-saas/
├── .gitignore                     # Root git ignore
├── README.md                      # Project overview & quick start
├── PROJECT-SUMMARY.md             # Complete implementation summary
└── QUICK-REFERENCE.md             # Command cheat sheet
```

## Directory Purposes

### `/web-app/src/lib/`
Reusable code shared across the application:
- **components/** - UI components used across pages
- **server/** - Server-only utilities (auth, database, API clients)
- **types.ts** - Shared TypeScript interfaces
- **utils.ts** - Helper functions (formatting, calculations)

### `/web-app/src/routes/`
File-system based routing:
- **api/** - API endpoints (+server.ts files)
- **dashboard/** - User pages (+page.svelte files)
- **admin/** - Admin pages
- **+layout.svelte** - Shared layout wrapper

### `/csharp-agent/MT5AgentAPI/`
C# .NET application:
- **Controllers/** - HTTP request handlers
- **Services/** - Business logic and integrations
- **Models/** - Data structures
- **Middleware/** - Request pipeline components

### `/docs/`
Comprehensive documentation:
- Setup guides for each component
- Deployment instructions
- API reference
- User guides

## Key Design Patterns

### Web App
- **File-based routing** - Routes mirror directory structure
- **Server/client separation** - Server code in `$lib/server/`
- **Component composition** - Reusable Svelte components
- **API routes** - RESTful endpoints in `/routes/api/`

### C# Agent
- **Dependency injection** - Services registered in Program.cs
- **Middleware pipeline** - Authentication via middleware
- **Service layer** - Business logic separated from controllers
- **Configuration** - Settings from appsettings.json

## Import Paths

### SvelteKit Aliases
- `$lib` → `/src/lib`
- `$lib/server` → `/src/lib/server`
- `$lib/components` → `/src/lib/components`

### Example Imports
```typescript
// Components
import { SafetyIndicator } from '$lib/components';

// Server utilities
import { db, generateToken } from '$lib/server';

// Types
import type { User } from '$lib/types';

// Utils
import { formatCurrency } from '$lib/utils';
```

## File Naming Rules

### SvelteKit
- Routes: `+page.svelte`, `+server.ts`, `+layout.svelte`
- Components: `PascalCase.svelte`
- Utilities: `camelCase.ts`
- Types: `camelCase.ts`

### C#
- Controllers: `PascalCase` + `Controller.cs`
- Services: `PascalCase` + `Service.cs`
- Models: `PascalCase.cs`

## Environment Configuration

### Web App (.env)
```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
CSHARP_AGENT_URL=http://localhost:5000
CSHARP_AGENT_API_KEY=...
```

### C# Agent (appsettings.json)
```json
{
  "ApiKey": "...",
  "WebAppUrl": "http://localhost:5173",
  "MT5": { ... },
  "VPS": { ... }
}
```

## Git Ignored Files

- `.env` files (except `.env.example`)
- `node_modules/`
- `.svelte-kit/`
- `build/`
- `bin/` and `obj/` (C#)
- `*.user` (Visual Studio)

## Best Practices

1. **Server code** stays in `$lib/server/` or `+server.ts`
2. **Client components** in `$lib/components/`
3. **Types** are shared in `$lib/types.ts`
4. **Utils** are pure functions in `$lib/utils.ts`
5. **API routes** follow REST conventions
6. **Services** handle all business logic
7. **Controllers** are thin routing layers

---

See individual STRUCTURE.md files in `/web-app/` and `/csharp-agent/` for detailed documentation.
