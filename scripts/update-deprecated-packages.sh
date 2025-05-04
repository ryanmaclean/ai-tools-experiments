#!/bin/bash

# Update Deprecated Packages Script
# This script updates packages with known deprecation warnings in Docker builds

set -e
cd "$(dirname "$0")/.." # Move to project root

echo "Starting package updates to fix Docker build warnings..."

# Update npm to latest version (11.3.0 as of May 2025)
echo "Updating npm to v11.3.0..."
npm install -g npm@11.3.0

# Update rimraf to v6+ (latest as of May 2025)
echo "Updating rimraf to v6.0.1..."
npm install --save-dev rimraf@6.0.1

# Update glob to v9+ (compatible version as of May 2025)
echo "Updating glob to v9.3.5..."
npm install --save-dev glob@9.3.5

# Let's fix the prebuild-install warning by ensuring proper dependencies for ARM64
echo "Installing specific dependencies for ARM64 compatibility..."
npm install --save-dev --force canvas@latest  # Force rebuild for ARM64

echo "Package updates complete!"
echo "\nRunning npm dedup to eliminate duplicates..."
npm dedup

echo "\nRunning npm audit fix to address any security issues..."
npm audit fix

echo "\nUpdates complete. Please rebuild your Docker containers."
