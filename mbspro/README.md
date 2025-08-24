# MBSPro

A modern monorepo application built with Next.js frontend, NestJS backend, and Supabase database.

## Architecture

- **Frontend**: Next.js with App Router (TypeScript)
- **Backend**: NestJS with Swagger documentation
- **Database**: Supabase (PostgreSQL with real-time capabilities)
- **Monorepo**: pnpm workspaces
- **Testing**: Jest
- **Authentication**: Supabase Auth (ready to use)

## Project Structure

```
mbspro/
├── apps/
│   ├── web/          # Next.js frontend (port 3000)
│   └── api/          # NestJS backend (port 4000)
├── packages/
│   └── shared/       # Shared utilities and types
├── supabase/
│   └── schema.sql    # Database schema for Supabase
├── package.json      # Root package.json with workspace scripts
├── pnpm-workspace.yaml
└── README.md
```

## Ports

- **Frontend (Web)**: http://localhost:3000
- **Backend (API)**: http://localhost:4000
- **API Documentation**: http://localhost:4000/docs (Swagger)

## Requirements

- **Node.js** 18+ 
- **pnpm** 8+
- **Supabase account** (free tier available)

## Quick Start

### 1. Install Dependencies
```bash
pnpm i
```

### 2. Set Up Supabase
Follow the detailed setup guide in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md):

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and API keys
3. Copy environment files and configure credentials

### 3. Copy Environment Files
```bash
# Backend environment
cp apps/api/env.example apps/api/.env

# Frontend environment  
cp apps/web/env.local.example apps/web/.env.local
```

### 4. Configure Supabase Credentials
Edit `apps/api/.env` with your Supabase credentials:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 5. Set Up Database Schema
1. Go to your Supabase dashboard → SQL Editor
2. Copy and run the contents of `supabase/schema.sql`

### 6. Seed Database
```bash
pnpm seed
```

### 7. Start Development Servers
```bash
pnpm dev
```

**Your application is now running:**
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:4000  
- **API Docs**: http://localhost:4000/docs

## Available Scripts

### Root Level Scripts
- `pnpm dev` - Start all applications in development mode
- `pnpm build` - Build all applications for production
- `pnpm lint` - Run linting across all packages
- `pnpm test` - Run tests across all packages
- `pnpm seed` - Seed the Supabase database with initial data
- `pnpm clean` - Clean all build artifacts and node_modules
- `pnpm fresh` - Clean and reinstall all dependencies

### Database Management
```bash
# Seed the database
pnpm seed

# View Supabase dashboard
# Go to https://supabase.com/dashboard/project/[your-project-id]

# Access database directly
# Use Supabase SQL Editor or connect via connection string
```

## Day-1 Definition of Done ✅

All Day-1 requirements have been successfully implemented:

### ✅ Backend API Health
- **GET /health** returns `200` status with `{ ok: true, ts: "timestamp", database: true }`
- **POST /suggest** returns `201` status with `{ candidates: [] }`
- Swagger documentation accessible at http://localhost:4000/docs

### ✅ Database
- **mbs_items table** exists in Supabase with ≥ 5 rows of synthetic MBS data
- Database seeded with comprehensive MBS items covering:
  - Standard consultations (Items 23, 24, 25)
  - After-hours care (Items 24, 25)
  - Home visits (Item 36)
  - Emergency services (Item 44)
- Row Level Security (RLS) enabled for data protection

### ✅ Frontend Integration
- **Frontend calls /suggest** endpoint successfully
- **Shows JSON response** in formatted display panel
- Loading and error states implemented
- Form validation and user feedback

### ✅ Testing
- **`pnpm --filter @mbspro/api test`** passes all tests
- E2E tests verify API endpoints work correctly
- Unit tests for controllers and services

### ✅ Development Workflow
- Single command setup: `pnpm i → configure Supabase → pnpm seed → pnpm dev`
- Both frontend (port 3000) and backend (port 4000) start together
- Hot reload enabled for development

## Common Issues & Quick Fixes

### 🔧 Port Already in Use
```bash
# Kill processes on ports 3000/4000
npx kill-port 3000 4000
# Or find and kill manually
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### 🔧 Missing Environment Files
```bash
# Copy the templates
cp apps/api/env.example apps/api/.env
cp apps/web/env.local.example apps/web/.env.local
```

### 🔧 Supabase Connection Failed
```bash
# Check environment variables
cat apps/api/.env

# Verify Supabase project is active
# Go to https://supabase.com/dashboard

# Test connection with seed script
pnpm seed
```

### 🔧 Database Schema Issues
```bash
# Run the schema in Supabase SQL Editor
# Copy contents of supabase/schema.sql

# Check if table exists
# Go to Supabase Dashboard → Table Editor
```

### 🔧 Seed Script Fails
```bash
# Ensure Supabase credentials are correct
cat apps/api/.env

# Run seed with verbose output
pnpm --filter @mbspro/api seed

# Check Supabase logs in dashboard
```

### 🔧 TypeScript Errors
```bash
# Install dependencies if missing
pnpm install

# Check TypeScript compilation
pnpm --filter @mbspro/api type-check
pnpm --filter @mbspro/web type-check
```

### 🔧 Tests Failing
```bash
# Run tests with verbose output
pnpm --filter @mbspro/api test --verbose

# Run specific test file
pnpm --filter @mbspro/api test health.controller.spec.ts
```

## Technology Stack

- **Frontend**: Next.js 14, TypeScript, React
- **Backend**: NestJS, TypeScript, Supabase Client
- **Database**: Supabase (PostgreSQL with real-time, auth, and edge functions)
- **Testing**: Jest
- **Package Manager**: pnpm

## Supabase Features

- **Real-time subscriptions** for live data updates
- **Built-in authentication** and authorization
- **Row Level Security** for data protection
- **Automatic API generation** from database schema
- **Database backups** and monitoring
- **Edge functions** for serverless operations
- **Storage** for file uploads
- **Analytics** and usage metrics

## Next Steps

1. **Set up authentication** using Supabase Auth
2. **Add real-time subscriptions** for live updates
3. **Implement file uploads** with Supabase Storage
4. **Deploy to production** using Supabase hosting
5. **Set up monitoring** and alerts

For detailed Supabase setup instructions, see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).
