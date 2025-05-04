#!/bin/bash

# Script to build the application without using native Rollup modules
# This helps avoid issues with ARM64 architecture

echo "Building application with ROLLUP_SKIP_NATIVES=true..."

# Set environment variable to skip native modules
export ROLLUP_SKIP_NATIVES=true

# Run the build command
npm run build
