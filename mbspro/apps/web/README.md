# @mbspro/web

Next.js 14 frontend for MBSPro - Medical Billing Suggestions Platform.

## Features

- **Next.js 14** with App Router and TypeScript
- **Tailwind CSS** for styling
- **API Integration** with the NestJS backend
- **Shared Types** via @mbspro/shared package
- **Real-time Suggestions** via fetch to /suggest endpoint

## Setup

1. **Copy environment file:**
```bash
cp env.local.example .env.local
```

2. **Install dependencies (from root):**
```bash
pnpm install
```

3. **Start development server:**
```bash
pnpm --filter @mbspro/web dev
```

The app will be available at http://localhost:3000

## Usage

1. **Enter Clinical Notes**: Type or paste clinical notes/SOAP documentation in the large textarea
2. **Select Suggestions Count**: Choose how many suggestions you want (3, 5, or 10)
3. **Get Suggestions**: Click the "Get Suggestions" button to call the API
4. **View Results**: See the JSON response from the /suggest endpoint

## Environment Variables

- `NEXT_PUBLIC_API_BASE`: Base URL for the API (default: http://localhost:4000)

## Development

- **Dev Server**: `pnpm dev` - Runs on port 3000 with hot reload
- **Build**: `pnpm build` - Creates production build
- **Start**: `pnpm start` - Runs production server
- **Lint**: `pnpm lint` - Runs ESLint
- **Type Check**: `pnpm type-check` - Runs TypeScript compiler

## API Integration

The frontend calls the backend API at:
- **Endpoint**: `POST /api/suggest`
- **Request**: `{ note: string, topN?: number }`
- **Response**: `{ candidates: SuggestCandidate[], signals?: Signals }`

## Day-1 Status

This is a minimal working prototype that:
- ✅ Accepts clinical notes input
- ✅ Calls the /suggest API endpoint
- ✅ Displays the JSON response
- ✅ Shows loading and error states
- ✅ Returns placeholder empty candidates array (Day-1 implementation)

Future iterations will implement actual AI-powered suggestion logic.
