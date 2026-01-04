# Web Application Structure

## Directory Organization

```
web-app/
├── prisma/
│   └── schema.prisma              # Database schema
│
├── scripts/
│   └── seed-admin.js              # Database seeding scripts
│
├── src/
│   ├── lib/
│   │   ├── components/            # Reusable Svelte components
│   │   │   ├── SafetyIndicator.svelte
│   │   │   ├── EAControl.svelte
│   │   │   ├── PLDisplay.svelte
│   │   │   ├── TradeHistory.svelte
│   │   │   └── index.ts           # Component exports
│   │   │
│   │   ├── server/                # Server-side utilities
│   │   │   ├── db.ts              # Prisma client
│   │   │   ├── auth.ts            # Authentication logic
│   │   │   ├── agent-client.ts    # C# Agent API client
│   │   │   └── index.ts           # Server exports
│   │   │
│   │   ├── types.ts               # TypeScript type definitions
│   │   └── utils.ts               # Utility functions
│   │
│   ├── routes/
│   │   ├── api/                   # API endpoints
│   │   │   ├── auth/              # Authentication
│   │   │   │   ├── register/+server.ts
│   │   │   │   ├── login/+server.ts
│   │   │   │   └── logout/+server.ts
│   │   │   │
│   │   │   ├── ea/                # EA Control
│   │   │   │   └── control/+server.ts
│   │   │   │
│   │   │   ├── account/           # Account management
│   │   │   │   └── [accountId]/+server.ts
│   │   │   │
│   │   │   ├── user/              # User endpoints
│   │   │   │   └── accounts/+server.ts
│   │   │   │
│   │   │   └── admin/             # Admin endpoints
│   │   │       ├── stats/+server.ts
│   │   │       ├── users/+server.ts
│   │   │       ├── accounts/+server.ts
│   │   │       └── users/[userId]/toggle/+server.ts
│   │   │
│   │   ├── dashboard/             # User dashboard
│   │   │   └── +page.svelte
│   │   │
│   │   ├── admin/                 # Admin panel
│   │   │   └── +page.svelte
│   │   │
│   │   ├── +layout.svelte         # Root layout
│   │   └── +layout.ts             # Layout data
│   │
│   ├── app.css                    # Global styles
│   ├── app.d.ts                   # TypeScript declarations
│   └── hooks.server.ts            # Server hooks (auth middleware)
│
├── static/                        # Static assets (future)
│
├── .env                           # Environment variables (git-ignored)
├── .env.example                   # Environment template
├── .gitignore                     # Git ignore rules
├── package.json                   # Dependencies
├── postcss.config.js              # PostCSS configuration
├── svelte.config.js               # SvelteKit configuration
├── tailwind.config.js             # Tailwind configuration
├── tsconfig.json                  # TypeScript configuration
└── vite.config.ts                 # Vite configuration
```

## Key Directories Explained

### `/src/lib/components/`
Reusable Svelte components:
- **SafetyIndicator.svelte** - Red/Orange/Green market indicator
- **EAControl.svelte** - Start/Stop EA buttons
- **PLDisplay.svelte** - Profit & Loss display
- **TradeHistory.svelte** - Open/closed trades table
- **index.ts** - Centralized component exports

### `/src/lib/server/`
Server-side only code (never sent to browser):
- **db.ts** - Prisma database client
- **auth.ts** - JWT token generation and validation
- **agent-client.ts** - C# Agent API communication
- **index.ts** - Centralized server exports

### `/src/lib/`
Shared utilities:
- **types.ts** - TypeScript interfaces and types
- **utils.ts** - Formatting, calculations, helper functions

### `/src/routes/api/`
API endpoints organized by domain:
- **auth/** - User authentication
- **ea/** - EA control operations
- **account/** - Account data and management
- **user/** - User-specific endpoints
- **admin/** - Admin-only endpoints

### `/src/routes/`
Page routes:
- **dashboard/** - User trading dashboard
- **admin/** - Admin management panel
- **+layout.svelte** - Global layout wrapper

### `/prisma/`
Database:
- **schema.prisma** - Complete database schema

### `/scripts/`
Utility scripts:
- **seed-admin.js** - Create initial admin user

## Import Conventions

### Components
```typescript
import { SafetyIndicator, EAControl } from '$lib/components';
```

### Server Utilities
```typescript
import { db, generateToken, agentClient } from '$lib/server';
```

### Types
```typescript
import type { User, MT5Account, Trade } from '$lib/types';
```

### Utils
```typescript
import { formatCurrency, calculatePnL } from '$lib/utils';
```

## File Naming Conventions

- **Components**: PascalCase (SafetyIndicator.svelte)
- **Routes**: +page.svelte, +server.ts, +layout.svelte
- **Utilities**: camelCase (auth.ts, agent-client.ts)
- **Types**: camelCase (types.ts)
- **Config**: kebab-case (svelte.config.js)

## Environment Variables

Located in `.env` (git-ignored):
```env
DATABASE_URL=
JWT_SECRET=
CSHARP_AGENT_URL=
CSHARP_AGENT_API_KEY=
PUBLIC_APP_URL=
```

## Best Practices

1. **Server-side code** goes in `/src/lib/server/` or `+server.ts` files
2. **Client-side components** go in `/src/lib/components/`
3. **Shared utilities** go in `/src/lib/`
4. **API routes** follow REST conventions in `/src/routes/api/`
5. **Types** are centralized in `/src/lib/types.ts`
6. Use **barrel exports** (index.ts) for cleaner imports
