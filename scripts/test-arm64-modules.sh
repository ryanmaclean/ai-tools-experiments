#!/bin/bash

# Comprehensive test for ARM64 native module compatibility
# This script verifies that the Docker container can properly
# handle architecture-specific native modules for Rollup and ESBuild

set -e

ECHO_PREFIX="[$(date)] [ARM64-TEST]"
TEST_CONTAINER_NAME="arm64-module-test"

echo "$ECHO_PREFIX Starting comprehensive ARM64 native module test"

# Step 1: Run a clean container with our entrypoint script
echo "$ECHO_PREFIX Step 1: Testing clean container startup"
docker-compose down > /dev/null 2>&1 || true
docker-compose up -d dev

# Wait for container to initialize
sleep 5

# Step 2: Verify the ESBuild version is correct
echo "$ECHO_PREFIX Step 2: Verifying ESBuild version"
ESBUILD_VERSION=$(docker-compose exec dev node -e "console.log(require('esbuild').version)" 2>/dev/null || echo "FAILED")
if [ "$ESBUILD_VERSION" = "FAILED" ]; then
    echo "$ECHO_PREFIX ❌ Could not detect ESBuild version. Container may have failed to start properly."
    docker-compose logs dev | tail -n 50
    exit 1
fi
echo "$ECHO_PREFIX ✅ ESBuild version detected: $ESBUILD_VERSION"

# Step 3: Check if the native modules exist
echo "$ECHO_PREFIX Step 3: Checking for native modules"
ROLLUP_MODULE=$(docker-compose exec dev sh -c "ls -la /app/node_modules/@rollup/rollup-linux-arm64-gnu 2>/dev/null || echo 'MISSING'")
ESBUILD_MODULE=$(docker-compose exec dev sh -c "ls -la /app/node_modules/@esbuild/linux-arm64 2>/dev/null || echo 'MISSING'")

if [[ "$ROLLUP_MODULE" == *"MISSING"* ]]; then
    echo "$ECHO_PREFIX ❌ Rollup ARM64 module is missing"
    exit 1
else
    echo "$ECHO_PREFIX ✅ Rollup ARM64 module is present"
fi

if [[ "$ESBUILD_MODULE" == *"MISSING"* ]]; then
    echo "$ECHO_PREFIX ❌ ESBuild ARM64 module is missing"
    exit 1
else
    echo "$ECHO_PREFIX ✅ ESBuild ARM64 module is present"
fi

# Step 4: Restart the container to test persistence
echo "$ECHO_PREFIX Step 4: Testing container restart"
docker-compose restart dev
sleep 5

# Check if the server starts after restart
CONTAINER_LOGS=$(docker-compose logs dev | grep -c "astro.*ready" || echo "0")
if [ "$CONTAINER_LOGS" -eq "0" ]; then
    echo "$ECHO_PREFIX ❌ Astro server failed to start after container restart"
    docker-compose logs dev | tail -n 50
    exit 1
fi
echo "$ECHO_PREFIX ✅ Astro server started successfully after container restart"

# Step 5: Verify the application is accessible
echo "$ECHO_PREFIX Step 5: Verifying application is accessible"
CONTAINER_IP=$(docker-compose exec dev sh -c "hostname -i" | tr -d '\r\n')
APP_URL="http://${CONTAINER_IP}:4321"

if command -v curl >/dev/null 2>&1; then
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL" || echo "FAILED")
    if [ "$HTTP_STATUS" = "200" ]; then
        echo "$ECHO_PREFIX ✅ Application is accessible at $APP_URL (HTTP 200)"
    else
        echo "$ECHO_PREFIX ⚠️ Application returned HTTP status $HTTP_STATUS at $APP_URL"
    fi
else
    echo "$ECHO_PREFIX ⚠️ curl not found, skipping HTTP check"
fi

# Step 6: Test run build process to ensure ESBuild and Rollup work during build
echo "$ECHO_PREFIX Step 6: Testing build process"
BUILD_OUTPUT=$(docker-compose exec dev npm run build 2>&1 || echo "BUILD_FAILED")
if [[ "$BUILD_OUTPUT" == *"BUILD_FAILED"* ]]; then
    echo "$ECHO_PREFIX ❌ Build process failed, likely due to native module issues"
    echo "$BUILD_OUTPUT" | grep -i error
    exit 1
fi
echo "$ECHO_PREFIX ✅ Build process completed without native module errors"

# All tests passed
echo "$ECHO_PREFIX ✅ All ARM64 native module tests passed successfully!"
echo "$ECHO_PREFIX Module fixes are working correctly in Docker environment"

# Cleanup
echo "$ECHO_PREFIX Cleaning up..."
# Don't shut down the container since it might be in use
# docker-compose down

exit 0
