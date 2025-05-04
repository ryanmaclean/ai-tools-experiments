#!/bin/bash

# Version Verification Script
# This script verifies that the expected versions of Node.js, npm, glob, and rimraf are installed

set -e
ECHO_PREFIX="[Version Verification]"

echo "$ECHO_PREFIX Starting version verification at $(date)"

# Define expected versions
EXPECTED_NODE_VERSION="v22"
EXPECTED_NPM_VERSION="11.3.0"
EXPECTED_GLOB_VERSION="9.3.5"
EXPECTED_RIMRAF_VERSION="6.0.1"

# Check Node.js version
NODE_VERSION=$(node -v)
if [[ "$NODE_VERSION" == "$EXPECTED_NODE_VERSION"* ]]; then
  echo "$ECHO_PREFIX Node.js version is correct: $NODE_VERSION"
else
  echo "$ECHO_PREFIX WARNING: Node.js version mismatch. Found $NODE_VERSION, expected $EXPECTED_NODE_VERSION.x"
fi

# Check npm version
NPM_VERSION=$(npm -v)
if [[ "$NPM_VERSION" == "$EXPECTED_NPM_VERSION"* ]]; then
  echo "$ECHO_PREFIX npm version is correct: $NPM_VERSION"
else
  echo "$ECHO_PREFIX WARNING: npm version mismatch. Found $NPM_VERSION, expected $EXPECTED_NPM_VERSION"
fi

# Create a temporary directory for package checks
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Check glob version
echo '{"name":"version-check","dependencies":{"glob":"^9.3.5"}}' > package.json
npm install --no-package-lock --silent
GLOB_VERSION=$(npm list glob | grep glob | sed 's/.*glob@//g')
if [[ "$GLOB_VERSION" == "$EXPECTED_GLOB_VERSION"* ]]; then
  echo "$ECHO_PREFIX glob version is correct: $GLOB_VERSION"
else
  echo "$ECHO_PREFIX WARNING: glob version mismatch. Found $GLOB_VERSION, expected $EXPECTED_GLOB_VERSION"
fi

# Check rimraf version
rm -f package.json
echo '{"name":"version-check","dependencies":{"rimraf":"^6.0.1"}}' > package.json
npm install --no-package-lock --silent
RIMRAF_VERSION=$(npm list rimraf | grep rimraf | sed 's/.*rimraf@//g')
if [[ "$RIMRAF_VERSION" == "$EXPECTED_RIMRAF_VERSION"* ]]; then
  echo "$ECHO_PREFIX rimraf version is correct: $RIMRAF_VERSION"
else
  echo "$ECHO_PREFIX WARNING: rimraf version mismatch. Found $RIMRAF_VERSION, expected $EXPECTED_RIMRAF_VERSION"
fi

# Clean up
cd - > /dev/null
rm -rf "$TEMP_DIR"

# Check Docker installed versions
if command -v docker &> /dev/null; then
  echo "$ECHO_PREFIX Checking versions in Docker container..."
  if docker ps -q --filter "name=ai-tools-experiments-dev" | grep -q .; then
    echo "$ECHO_PREFIX Docker container is running. Checking versions..."
    echo "$ECHO_PREFIX Node.js version in container:"
    docker exec ai-tools-experiments-dev-1 node -v
    echo "$ECHO_PREFIX npm version in container:"
    docker exec ai-tools-experiments-dev-1 npm -v
    echo "$ECHO_PREFIX glob version in container:"
    docker exec ai-tools-experiments-dev-1 npm list glob
    echo "$ECHO_PREFIX rimraf version in container:"
    docker exec ai-tools-experiments-dev-1 npm list rimraf
  else
    echo "$ECHO_PREFIX Docker container is not running. Start it with 'docker-compose up dev -d' to check versions."
  fi
else
  echo "$ECHO_PREFIX Docker is not installed or not in PATH. Skipping Docker checks."
fi

echo "$ECHO_PREFIX Verification complete at $(date)"
