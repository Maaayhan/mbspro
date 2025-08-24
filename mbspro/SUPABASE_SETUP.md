# Supabase Setup Guide

This guide will help you set up Supabase for your MBSPro application.

## Prerequisites

- A Supabase account (sign up at [supabase.com](https://supabase.com))
- Node.js 18+ and pnpm installed

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `mbspro` (or your preferred name)
   - Database Password: Choose a strong password
   - Region: Select the region closest to your users
5. Click "Create new project"
6. Wait for the project to be created (this may take a few minutes)

## Step 2: Get Your Project Credentials

1. In your Supabase project dashboard, go to Settings > API
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project-id.supabase.co`)
   - **anon public** key
   - **service_role** key (keep this secret!)

## Step 3: Set Up Environment Variables

1. Copy `mbspro/apps/api/env.example` to `mbspro/apps/api/.env`
2. Update the `.env` file with your Supabase credentials:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Application Configuration
API_PREFIX=api
SWAGGER_ENABLED=true
```

## Step 4: Set Up the Database Schema

1. In your Supabase dashboard, go to SQL Editor
2. Copy the contents of `mbspro/supabase/schema.sql`
3. Paste it into the SQL Editor and click "Run"
4. This will create the `mbs_items` table with proper indexes and RLS policies

## Step 5: Install Dependencies

```bash
# From the root directory
pnpm install
```

## Step 6: Seed the Database

```bash
# From the root directory
pnpm seed
```

This will populate your database with sample MBS items.

## Step 7: Test the Setup

1. Start the API server:
   ```bash
   pnpm dev
   ```

2. Test the health endpoint:
   ```bash
   curl http://localhost:4000/health
   ```

3. Test the suggest endpoint:
   ```bash
   curl -X POST http://localhost:4000/suggest \
     -H "Content-Type: application/json" \
     -d '{"note": "general practitioner consultation"}'
   ```

## Database Schema

The `mbs_items` table has the following structure:

- `code`: Primary key, MBS item code (VARCHAR)
- `title`: Item title (VARCHAR)
- `desc`: Item description (TEXT)
- `fee`: Fee amount (DECIMAL)
- `time_threshold`: Time threshold in minutes (INTEGER, nullable)
- `flags`: JSON object for special conditions (JSONB)
- `mutually_exclusive_with`: Array of mutually exclusive item codes (TEXT[])
- `reference_materials`: Array of reference materials (TEXT[])
- `created_at`: Creation timestamp (TIMESTAMP)
- `updated_at`: Last update timestamp (TIMESTAMP)

## Row Level Security (RLS)

The table has RLS enabled with the following policies:
- Anonymous users can read all items
- Authenticated users can perform all operations
- The `updated_at` field is automatically updated on row modifications

## Troubleshooting

### Common Issues

1. **Connection Error**: Verify your `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
2. **Permission Denied**: Ensure RLS policies are properly set up
3. **Table Not Found**: Run the schema.sql script in the SQL Editor

### Getting Help

- Check the Supabase documentation: [docs.supabase.com](https://docs.supabase.com)
- Review the API logs for detailed error messages
- Verify your environment variables are correctly set

## Next Steps

- Set up authentication if needed
- Configure additional RLS policies for production
- Set up database backups
- Monitor your database usage in the Supabase dashboard
