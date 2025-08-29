#!/bin/bash
set -e

echo "Installing dependencies..."
npm install

echo "Installing shared package..."
cd ../../packages/shared && npm install && npm run build
cd ../../apps/web

echo "Building web app..."
npm run build

echo "Build completed successfully!"
