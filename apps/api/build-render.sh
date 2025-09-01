#!/bin/bash

# MBSPro API Build Script for Render (Simplified)
set -e

echo "🚀 Starting MBSPro API build process for Render..."

# Show current directory
echo "📁 Current directory: $(pwd)"
echo "📁 Contents:"
ls -la

# Install pnpm globally
echo "📦 Installing pnpm..."
npm install -g pnpm

# Go to root and install dependencies
echo "📦 Installing dependencies..."
cd ../../
echo "📁 Root directory: $(pwd)"
pnpm install

# Build shared package
echo "🔨 Building shared package..."
cd packages/shared
pnpm run build
echo "✅ Shared package built"

# Go back to API directory and build
echo "🔨 Building API..."
cd ../../apps/api
echo "📁 API directory: $(pwd)"
pnpm run build

# Verify build output
echo "🔍 Checking build output..."
ls -la
if [ -d "dist" ]; then
    echo "📁 Dist directory contents:"
    ls -la dist/
else
    echo "❌ Dist directory not found!"
    echo "📁 Current directory contents:"
    ls -la
fi

echo "✅ Build completed successfully!"
