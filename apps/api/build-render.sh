#!/bin/bash

# MBSPro API Build Script for Render (Monorepo Optimized)
set -e

echo "🚀 Starting MBSPro API build process for Render..."

# Show current directory and contents
echo "📁 Current directory: $(pwd)"
echo "📁 Contents:"
ls -la

# Install pnpm globally
echo "📦 Installing pnpm..."
npm install -g pnpm

# Go to root directory and install dependencies
echo "📦 Installing dependencies from root..."
cd ../../
echo "📁 Root directory: $(pwd)"
pnpm install

# Build shared package first
echo "🔨 Building shared package..."
cd packages/shared
pnpm run build
echo "✅ Shared package built successfully"

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
    
    # Look for main.js in the expected location
    echo "🔍 Looking for main.js..."
    if [ -f "dist/apps/api/src/main.js" ]; then
        echo "✅ Main file found at: dist/apps/api/src/main.js"
        ls -la dist/apps/api/src/main.js
    elif [ -f "dist/main.js" ]; then
        echo "✅ Main file found at: dist/main.js"
        ls -la dist/main.js
    else
        echo "❌ Main file not found in expected locations"
        echo "🔍 Searching for main.js files..."
        find dist -name "main.js" -type f
    fi
    
    echo "📁 All JS files in dist:"
    find dist -name "*.js" | head -10
else
    echo "❌ Dist directory not found!"
    echo "📁 Current directory contents:"
    ls -la
fi

echo "✅ Build process completed!"
