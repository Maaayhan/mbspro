# MBSPro

A modern monorepo application built with Next.js frontend, NestJS backend, and PostgreSQL database.

## Architecture

- **Frontend**: Next.js with App Router (TypeScript)
- **Backend**: NestJS with Swagger documentation
- **Database**: PostgreSQL with TypeORM
- **Monorepo**: pnpm workspaces
- **Testing**: Jest
- **Containerization**: Docker Compose

## Project Structure

```
mbspro/
├── apps/
│   ├── web/          # Next.js frontend (port 3000)
│   └── api/          # NestJS backend (port 4000)
├── packages/
│   └── shared/       # Shared utilities and types
├── package.json      # Root package.json with workspace scripts
├── pnpm-workspace.yaml
├── docker-compose.yml
└── README.md
```

## Ports

- **Frontend (Web)**: http://localhost:3000
- **Backend (API)**: http://localhost:4000
- **API Documentation**: http://localhost:4000/api (Swagger)
- **PostgreSQL**: localhost:5432

## Requirements

- **Node.js** 18+ 
- **pnpm** 8+
- **Docker** and Docker Compose

## Quick Start

### 1. Install Dependencies
```bash
pnpm i
```

### 2. Start Database
```bash
pnpm db:up
```

### 3. Copy Environment Files
```bash
# Backend environment
cp apps/api/env.example apps/api/.env

# Frontend environment  
cp apps/web/env.local.example apps/web/.env.local
```

### 4. Seed Database
```bash
pnpm seed
```

### 5. Start Development Servers
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
- `pnpm db:up` - Start PostgreSQL database with Docker Compose
- `pnpm db:down` - Stop and remove database containers
- `pnpm seed` - Seed the database with initial data

### Database Management
```bash
# Start database
pnpm db:up

# Stop database
pnpm db:down

# View database logs
docker compose logs postgres

# Connect to database
docker exec -it mbspro-postgres psql -U mbspro -d mbspro
```

## Day-1 Definition of Done ✅

All Day-1 requirements have been successfully implemented:

### ✅ Backend API Health
- **GET /health** returns `200` status with `{ ok: true, ts: "timestamp" }`
- **POST /api/suggest** returns `201` status with `{ candidates: [] }`
- Swagger documentation accessible at http://localhost:4000/docs

### ✅ Database
- **mbs_items table** exists with ≥ 3 rows of synthetic MBS data
- Database seeded with 10 comprehensive MBS items covering:
  - Standard consultations (Items 23, 36, 44)
  - Telehealth services (Item 91800)
  - After-hours care (Items 597, 598)
  - Specialist services (Item 104)
  - Health assessments (Item 703)
  - Mental health (Item 2712)
  - Procedures (Item 30192)

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
- Single command setup: `pnpm i → pnpm db:up → copy envs → pnpm seed → pnpm dev`
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

### 🔧 Database Not Running
```bash
# Start PostgreSQL
pnpm db:up

# Check if running
docker ps | grep postgres

# View logs if issues
docker compose logs postgres
```

### 🔧 CORS Errors
- Frontend → Backend: Ensure `NEXT_PUBLIC_API_BASE=http://localhost:4000` in `.env.local`
- Backend allows `http://localhost:3000` by default
- Check browser console for specific CORS errors

### 🔧 Database Connection Failed
```bash
# Verify database is running
pnpm db:up

# Check environment variables
cat apps/api/.env

# Test connection manually
docker exec -it mbspro-postgres psql -U mbspro -d mbspro
```

### 🔧 Seed Script Fails
```bash
# Ensure database is running first
pnpm db:up

# Run seed with verbose output
pnpm --filter @mbspro/api seed

# Check database has tables
docker exec -it mbspro-postgres psql -U mbspro -d mbspro -c "\dt"
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
- **Backend**: NestJS, TypeScript, TypeORM
- **Database**: PostgreSQL 15
- **Testing**: Jest
- **Package Manager**: pnpm
- **Containerization**: Docker Compose
