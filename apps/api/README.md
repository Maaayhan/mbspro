# @mbspro/api

NestJS Backend API for MBSPro application (Supabase-backed).

## Setup

1. Copy environment file and fill credentials:
```bash
cp env.example .env
```
Edit `.env` with your Supabase values:
```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require
PGSSLMODE=require
```

2. Install dependencies (from repo root):
```bash
pnpm install
```

3. Apply schema in Supabase (SQL Editor):
```sql
-- Open supabase/schema.sql and run all statements in your project
```

4. Seed sample data into Supabase:
```bash
pnpm --filter @mbspro/api seed
```

5. (Optional) Connectivity checks:
```bash
pnpm --filter @mbspro/api test:connection   # Checks env + Supabase client
pnpm --filter @mbspro/api test:examples     # Runs example searches against mbs_items
```

6. Start development server:
```bash
pnpm --filter @mbspro/api dev
```

## Verify Connection

- Health endpoint (with global prefix `api`): `GET http://localhost:4000/api/health`
  - Expected JSON: `{ "ok": true, "database": true, "ts": "..." }`
- Swagger Docs: `http://localhost:4000/docs`

## API Endpoints

- **Health Check**: `GET /api/health`
- **Suggest**: `POST /api/suggest`
- **Swagger Docs**: `GET /docs`

## Development

- **Dev Server**: `pnpm --filter @mbspro/api dev`
- **Build**: `pnpm --filter @mbspro/api build`
- **Tests**: `pnpm --filter @mbspro/api test`
- **Seed**: `pnpm --filter @mbspro/api seed`
- **Connection Check**: `pnpm --filter @mbspro/api test:connection`
- **Example Searches**: `pnpm --filter @mbspro/api test:examples`

## Database Access

This API uses the Supabase JavaScript client for all database operations by default.

- Schema location: `supabase/schema.sql`
- Seed script: `apps/api/src/seed/supabase-seed.ts`
- Service: `apps/api/src/services/supabase.service.ts`

> Note: Direct TypeORM Postgres connection is not required for the API runtime. The provided `DATABASE_URL` and config are primarily for tooling/tests.

## Environment Variables

See `env.example` for all required variables and descriptions.
