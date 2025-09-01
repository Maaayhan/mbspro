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
    ls -la dist/main*
else
    echo "❌ Dist directory not found!"
fi

echo "✅ Simple build completed!"
