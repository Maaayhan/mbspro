# @mbspro/api

NestJS Backend API for MBSPro application.

## Setup

1. Copy environment file:
```bash
cp env.example .env
```

2. Install dependencies (from root):
```bash
pnpm install
```

3. Start database:
```bash
pnpm db:up
```

4. Run database migrations/seed:
```bash
pnpm --filter @mbspro/api seed
```

5. Start development server:
```bash
pnpm --filter @mbspro/api dev
```

## API Endpoints

- **Health Check**: `GET /api/health` - Returns service health status
- **API Info**: `GET /api/` - Returns application information
- **Swagger Docs**: `GET /docs` - API documentation

## Development

- **Dev Server**: `pnpm dev` - Starts with hot reload
- **Build**: `pnpm build` - Builds for production
- **Test**: `pnpm test` - Runs unit tests
- **Seed**: `pnpm seed` - Seeds database with sample data

## Database

Uses TypeORM with PostgreSQL. The MbsItem entity is configured with:
- Auto-generated UUID primary key
- Code, title, description fields
- Score field for relevance scoring
- Active status flag
- Timestamps for created/updated dates

## Environment Variables

See `env.example` for required environment variables.
