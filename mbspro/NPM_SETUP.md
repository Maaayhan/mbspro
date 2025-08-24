# 🚀 MBSPro NPM Setup Guide

This guide explains how to set up and use MBSPro with npm instead of pnpm.

## 📋 Prerequisites

- **Node.js**: 20.x LTS or higher
- **npm**: 9.x or higher
- **Docker**: For database services

## 🔧 Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
```bash
# Backend environment
cp apps/api/env.example apps/api/.env

# Frontend environment  
cp apps/web/env.local.example apps/web/.env.local
```

### 3. Start Database
```bash
# Option A: Local PostgreSQL
npm run db:up

# Option B: Local Supabase
npm run db:supabase
```

### 4. Seed Database
```bash
# For local PostgreSQL
npm run seed

# For Supabase
npm run seed:supabase
```

### 5. Start Development Servers
```bash
npm run dev
```

## 🎯 Available Scripts

### Root Level Commands
- `npm run dev` - Start all applications in development mode
- `npm run build` - Build all applications for production
- `npm run lint` - Run linting across all packages
- `npm run test` - Run tests across all packages
- `npm run db:up` - Start local PostgreSQL database
- `npm run db:down` - Stop local database
- `npm run db:supabase` - Start local Supabase
- `npm run seed` - Seed local PostgreSQL database
- `npm run seed:supabase` - Seed Supabase database

### Package-Specific Commands
```bash
# Run commands for specific workspace
npm run dev --workspace=@mbspro/api
npm run test --workspace=@mbspro/web
npm run build --workspace=@mbspro/api

# Run commands with additional arguments
npm run test --workspace=@mbspro/api -- --verbose
npm run lint --workspace=@mbspro/web -- --fix
```

## 🔍 Workspace Management

### List Workspaces
```bash
npm run list
```

### Install Package in Specific Workspace
```bash
npm install lodash --workspace=@mbspro/api
npm install @types/lodash --workspace=@mbspro/api --save-dev
```

### Run Scripts in All Workspaces
```bash
npm run test --workspaces --if-present
npm run build --workspaces --if-present
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Workspace Protocol Errors
**Problem**: `workspace:*` protocol not supported
**Solution**: Use `file:../../packages/shared` instead

#### 2. Missing Dependencies
**Problem**: Shared package not found
**Solution**: Ensure `packages/shared` exists and has proper package.json

#### 3. Script Execution Issues
**Problem**: Scripts not running in correct workspace
**Solution**: Use `--workspace=@mbspro/api` flag

#### 4. Version Conflicts
**Problem**: Multiple versions of same package
**Solution**: Use `npm ls` to check for duplicates

### Debug Commands
```bash
# Check workspace configuration
npm run list

# View dependency tree
npm ls

# Check for duplicate packages
npm dedupe

# Clear npm cache
npm cache clean --force
```

## 📁 Project Structure

```
mbspro/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # NestJS backend
├── packages/
│   └── shared/       # Shared utilities
├── package.json      # Root package.json with workspaces
└── docker-compose.yml
```

## 🔄 Migration from pnpm

If you're migrating from pnpm:

1. **Remove pnpm files**:
   ```bash
   rm pnpm-lock.yaml
   rm pnpm-workspace.yaml
   ```

2. **Update package.json**:
   - Replace `workspace:*` with `file:../../packages/shared`
   - Update scripts to use npm commands
   - Add `workspaces` field

3. **Clean and reinstall**:
   ```bash
   rm -rf node_modules
   rm -rf apps/*/node_modules
   rm -rf packages/*/node_modules
   npm install
   ```

## 🎉 Success Indicators

You'll know everything is working when:
- ✅ `npm install` completes without errors
- ✅ `npm run dev` starts both frontend and backend
- ✅ Frontend accessible at http://localhost:3000
- ✅ Backend accessible at http://localhost:4000
- ✅ Database connection successful
- ✅ Tests pass: `npm run test --workspaces`

## 📚 Additional Resources

- [npm Workspaces Documentation](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
- [npm CLI Commands](https://docs.npmjs.com/cli/v7/commands)
- [MBSPro Main README](./README.md)
