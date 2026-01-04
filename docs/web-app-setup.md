# SvelteKit Web Application Setup

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Git

## Installation

### 1. Install Dependencies

```bash
cd web-app
npm install
```

### 2. Database Setup

Create a PostgreSQL database:

```bash
createdb mt5_algo_saas
```

### 3. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/mt5_algo_saas?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this"
CSHARP_AGENT_URL="http://localhost:5000"
CSHARP_AGENT_API_KEY="your-csharp-agent-api-key"
PUBLIC_APP_URL="http://localhost:5173"
EXNESS_IB_LINK="https://one.exness-track.com/a/your-ib-code"
PRIMEXBT_IB_LINK="https://primexbt.com/?signup=your-ib-code"
```

### 4. Database Migration

Generate Prisma client and push schema:

```bash
npm run db:generate
npm run db:push
```

### 5. Create Admin User

Run the seed script to create an initial admin user:

```bash
node scripts/seed-admin.js
```

Default admin credentials:
- Email: admin@mt5algo.com
- Password: Admin@123456

**IMPORTANT: Change this password immediately after first login!**

### 6. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Create migration
- `npm run db:studio` - Open Prisma Studio

## Project Structure

```
web-app/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── lib/
│   │   ├── components/        # Svelte components
│   │   └── server/            # Server-side utilities
│   │       ├── db.ts          # Prisma client
│   │       ├── auth.ts        # Authentication
│   │       └── agent-client.ts # C# Agent API client
│   ├── routes/
│   │   ├── api/               # API endpoints
│   │   ├── dashboard/         # User dashboard
│   │   └── admin/             # Admin panel
│   ├── app.css                # Global styles
│   └── hooks.server.ts        # Server hooks
├── package.json
└── svelte.config.js
```

## Key Features

### User Dashboard
- Real-time EA status monitoring
- Safety indicator (Red/Orange/Green)
- One-click Start/Stop EA control
- P&L display
- Trade history

### Admin Panel
- User management
- Account monitoring
- System statistics
- EA status overview

## Security

- JWT-based authentication
- HTTP-only cookies
- Password hashing with bcrypt
- API key authentication for C# agent
- Role-based access control

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Ensure database exists

### Authentication Issues
- Clear browser cookies
- Verify JWT_SECRET is set
- Check token expiration

### C# Agent Connection
- Verify CSHARP_AGENT_URL is correct
- Ensure API key matches
- Check C# agent is running
