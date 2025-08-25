#!/bin/bash

# Build script for Render deployment
echo "Starting MBSPro Frontend Build..."

# Install shared package dependencies first
echo "Installing shared package dependencies..."
cd packages/shared
npm install
cd ../..

# Install and build frontend
echo "Installing frontend dependencies..."
cd apps/web
npm install

echo "Building frontend application..."
npm run build

echo "Build completed successfully!"
