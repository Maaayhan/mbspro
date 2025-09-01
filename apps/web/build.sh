#!/bin/bash

# MBSPro Web Build Script for Render
set -e

echo "🚀 Starting MBSPro Web build process..."

# Install pnpm globally
echo "📦 Installing pnpm..."
npm install -g pnpm

# Install dependencies from root
echo "📦 Installing dependencies..."
cd ../../
pnpm install

# Build shared package first
echo "🔨 Building shared package..."
cd packages/shared
pnpm run build

# Build Web
echo "🔨 Building Web..."
cd ../../apps/web
pnpm run build

echo "✅ Build completed successfully!"
