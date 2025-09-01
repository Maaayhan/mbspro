#!/bin/bash

# MBSPro API Debug Build Script for Render
set -e

echo "🚀 Starting MBSPro API debug build process..."

# Show environment info
echo "📋 Environment Info:"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Current directory: $(pwd)"
echo "Current user: $(whoami)"

# Show current directory contents
echo "📁 Current directory contents:"
ls -la

# Install pnpm globally
echo "📦 Installing pnpm..."
npm install -g pnpm
echo "PNPM version: $(pnpm --version)"

# Go to root directory
echo "📦 Going to root directory..."
cd ../../
echo "📁 Root directory: $(pwd)"
echo "📁 Root contents:"
ls -la

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build shared package
echo "🔨 Building shared package..."
cd packages/shared
echo "📁 Shared package directory: $(pwd)"
echo "📁 Shared package contents:"
ls -la

echo "📦 Installing shared dependencies..."
pnpm install

echo "🔨 Building shared package..."
pnpm run build

echo "📁 Checking shared build output:"
ls -la
if [ -d "dist" ]; then
    echo "📁 Shared dist contents:"
    ls -la dist/
    echo "📁 Shared index.js content (first 10 lines):"
    head -10 dist/index.js
else
    echo "❌ Shared dist directory not found!"
fi

# Go back to API directory
echo "🔨 Building API..."
cd ../../apps/api
echo "📁 API directory: $(pwd)"

echo "📦 Installing API dependencies..."
pnpm install

echo "🔨 Building API..."
pnpm run build

# Verify build output
echo "🔍 Checking API build output..."
ls -la
if [ -d "dist" ]; then
    echo "📁 API dist directory contents:"
    ls -la dist/
    
    # Look for main.js
    echo "🔍 Looking for main.js..."
    if [ -f "dist/apps/api/src/main.js" ]; then
        echo "✅ Main file found at: dist/apps/api/src/main.js"
        ls -la dist/apps/api/src/main.js
        echo "📁 Main.js content (first 10 lines):"
        head -10 dist/apps/api/src/main.js
    else
        echo "❌ Main file not found in expected location"
        echo "🔍 Searching for main.js files..."
        find dist -name "main.js" -type f
    fi
    
    # Check for shared package references
    echo "🔍 Checking for shared package references in main.js..."
    if [ -f "dist/apps/api/src/main.js" ]; then
        grep -n "shared" dist/apps/api/src/main.js || echo "No shared references found"
    fi
else
    echo "❌ API dist directory not found!"
fi

echo "✅ Debug build process completed!"
