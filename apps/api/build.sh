#!/bin/bash
set -e

echo "Installing dependencies..."
npm install --production=false --ignore-scripts

echo "Building API..."
npm run build

echo "Build completed successfully!"
