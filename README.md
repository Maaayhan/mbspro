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
│   ├── schema.sql                      # Database schema for Supabase
│   └── migrations/
│       └── 2025-01-01-extensions-and-indexes.sql  # Enable pg_trgm/unaccent and add indexes
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

### 2. Set Up Supabase (Required)
Follow the detailed setup guide in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md):

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL, anon key, and service role key
3. Apply schema: open `supabase/schema.sql` in Supabase SQL Editor and run

### 3. Copy Environment Files
```bash
# Backend environment
yarn dlx shx cp apps/api/env.example apps/api/.env || cp apps/api/env.example apps/api/.env

# Frontend environment  
yarn dlx shx cp apps/web/env.local.example apps/web/.env.local || cp apps/web/env.local.example apps/web/.env.local
```

### 4. Configure Supabase Credentials
Edit `apps/api/.env` with your Supabase credentials:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
# Direct Postgres (server only)
DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require
PGSSLMODE=require
```

### 5. Seed Database (Supabase)
```bash
pnpm --filter @mbspro/api seed
```

### 6. Apply Extensions & Indexes Migration (S3)
Choose one of the following:

- SQL Editor:
  - Open Supabase → SQL Editor, paste `supabase/migrations/2025-01-01-extensions-and-indexes.sql`
  - Run the script (enables `pg_trgm`, `unaccent`, creates trigram + FTS indexes)

- Supabase CLI (optional):
  - Install CLI: `npm i -g supabase`
  - Login and link: `supabase login` → `supabase link --project-ref <ref>`
  - Run: `supabase db query supabase/migrations/2025-01-01-extensions-and-indexes.sql`

Verification: Use `EXPLAIN` on similarity or FTS queries to confirm index usage (no need to paste plans).

### 7. Verify Connection
```bash
pnpm --filter @mbspro/api test:connection  # env + Supabase client check
pnpm --filter @mbspro/api test:examples    # example queries against mbs_items
```

### 8. Start Development Servers
```bash
pnpm dev
```

**Your application is now running:**
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:4000  
- **API Docs**: http://localhost:4000/docs

## Supabase Connectivity Notes

- The backend uses the Supabase JavaScript client for data access.
- `DATABASE_URL` is optional for tooling/tests and must include `sslmode=require`.
- Never expose server-side keys or `DATABASE_URL` to the frontend.

## Supabase Usage Guide

### Obtain DATABASE_URL

1. Open Supabase Dashboard → Project → Settings → Database → "Connection string" → URI (Node).
2. Copy the URI that includes `sslmode=require`.
3. Paste into `apps/api/.env` as `DATABASE_URL=...` (server-side only).

### Enable Extensions & Indexes (SQL Editor or CLI)

- SQL Editor (recommended):
  - Open Supabase → SQL Editor → paste `supabase/migrations/2025-01-01-extensions-and-indexes.sql` → Run.
  - This enables `pg_trgm` and `unaccent` and creates trigram and FTS indexes.

- Supabase CLI (optional):
  - `npm i -g supabase`
  - `supabase login` → `supabase link --project-ref <project-ref>`
  - `supabase db query supabase/migrations/2025-01-01-extensions-and-indexes.sql`

Verification: Use `EXPLAIN` on similarity or FTS queries in SQL Editor to confirm index usage (no need to paste plans).

### Seed Against Supabase (Idempotent)

1. Ensure schema is applied (run `supabase/schema.sql` in SQL Editor).
2. Set `SUPABASE_URL` and a server key (`SUPABASE_SERVICE_ROLE_KEY` preferred) in `apps/api/.env`.
3. Run: `pnpm seed`.
   - The seed uses UPSERT on primary key `code`, so it is safe and idempotent.

### Tuning Guide: Ranker Weights

The linear fusion ranker computes `score = α * bm25 + β * featureBoost`.

- Location: `apps/api/src/suggest/ranker.service.ts` (`DEFAULT_WEIGHTS`).
- Weights:
  - `alpha` (0–1): weight for lexical score (bm25-like similarity)
  - `beta`  (0–1): weight for feature rules sum
  - `w1`: telehealth match boost (signals.mode telehealth/video/phone + item.telehealth)
  - `w2`: telehealth mismatch penalty (mode telehealth but item not telehealth)
  - `w3`: after-hours match boost
  - `w4`: duration ≥ threshold boost
  - `w5`: duration < threshold penalty
  - `w6`: chronic/care-plan context boost

Tips:
- Increase `alpha` to favor pure lexical similarity; increase `beta`/`w*` to emphasize domain rules.
- For low recall in telehealth cases, increase `w1` or reduce `w2`.
- For time-based gating, increase `w4` and `w5` magnitude.

After changes, restart the API and re-run `pnpm eval` to check metrics.

### Troubleshooting

- Extension permissions:
  - If `CREATE EXTENSION` fails, ensure you run in SQL Editor for your project (public schema). Use `CREATE EXTENSION IF NOT EXISTS pg_trgm;` and `unaccent;`.
  - Some org policies can restrict extensions; check Settings → Database → Extensions.

- SSL connection issues:
  - Use `sslmode=require` in `DATABASE_URL`.
  - Our TypeORM config sets `ssl: { rejectUnauthorized: false }` when `PGSSLMODE=require` (see `apps/api/src/config/database.config.ts`).

- Zero hits / low recall:
  - Increase retrieval Top-K in `LexicalRetrieverService` (e.g., 50–100) or widen synonyms.
  - Expand synonyms in `packages/shared/src/index.ts` (SignalExtractor) and/or add keywords to items.
  - Verify indexes/migration applied; without `pg_trgm`/FTS indexes, similarity may be slow or less effective.

## Available Scripts

### Root Level Scripts
- `pnpm dev` - Start all applications in development mode
- `pnpm build` - Build all applications for production
- `pnpm lint` - Run linting across all packages
- `pnpm test` - Run tests across all packages
- `pnpm seed` - Seed the Supabase database from `data/mbs_seed.json`
- `pnpm clean` - Clean all build artifacts and node_modules
- `pnpm fresh` - Clean and reinstall all dependencies

### Database Management
```bash
# Apply schema and migrations via SQL Editor or Supabase CLI
# Then seed the database (idempotent)
pnpm seed

# View Supabase dashboard
# Go to https://supabase.com/dashboard/project/[your-project-id]

# Access database directly
# Use Supabase SQL Editor or connect via connection string
```

### Deprecated: Local Postgres via Docker (Day-1)

We previously used a local Postgres container for Day-1. The project now uses Supabase.

- Keep historical commands for reference only:
```bash
# (Deprecated) Start database
# pnpm db:up

# (Deprecated) Stop database
# pnpm db:down

# (Deprecated) Logs / psql access
# docker compose logs postgres
# docker exec -it mbspro-postgres psql -U mbspro -d mbspro
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
