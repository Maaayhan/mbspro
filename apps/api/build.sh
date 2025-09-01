#!/bin/bash

# MBSPro API Build Script for Render
set -e

echo "🚀 Starting MBSPro API build process..."

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

# Build API
echo "🔨 Building API..."
cd ../../apps/api
pnpm run build

echo "✅ Build completed successfully!"
