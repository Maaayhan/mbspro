#!/bin/bash

# MBSPro API Simple Build Script for Render
set -e

echo "🚀 Starting simple build process..."

# Show current directory
echo "📁 Current directory: $(pwd)"
echo "📁 Contents:"
ls -la

# Install dependencies locally
echo "📦 Installing dependencies..."
pnpm install

# Build the API
echo "🔨 Building API..."
pnpm run build

# Verify build output
echo "🔍 Checking build output..."
ls -la
if [ -d "dist" ]; then
    echo "📁 Dist directory contents:"
    ls -la dist/
    echo "📁 Main file exists:"
    find dist -name "main.js" -type f
    echo "📁 All JS files:"
    find dist -name "*.js" | head -5
else
    echo "❌ Dist directory not found!"
    echo "📁 Current directory contents:"
    ls -la
fi

echo "✅ Simple build completed!"
