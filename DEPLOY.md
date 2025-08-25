# MBSPro Frontend Deployment Guide

This guide explains how to deploy the MBSPro frontend to Render.

## Deployment Options

### Option 1: Using render.yaml (Recommended)

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Use the `render.yaml` configuration file
4. The service will automatically build and deploy

### Option 2: Manual Configuration

1. **Build Command**: `./build.sh`
2. **Start Command**: `cd apps/web && npm start`
3. **Environment Variables**:
   - `NODE_ENV=production`
   - `NEXT_PUBLIC_API_BASE=https://bedrock-rag-api.onrender.com`

### Option 3: Docker Deployment

Use the provided `Dockerfile` for container-based deployment.

## Build Process

The build script (`build.sh`) will:
1. Install shared package dependencies
2. Install frontend dependencies
3. Build the Next.js application

## Environment Variables

- `NEXT_PUBLIC_API_BASE`: The RAG API endpoint (already configured for external API)
- `NODE_ENV`: Set to `production` for optimized builds

## Port Configuration

The application runs on port 3000 by default.

## Health Check

The application provides a health check at the root path `/`.

## Notes

- The frontend is configured to use the external RAG API
- No backend deployment is required for this setup
- The shared package is built as part of the deployment process
