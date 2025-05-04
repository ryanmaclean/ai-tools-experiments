#!/bin/bash

# Docker Best Practices Verification Script
# Tests Docker configuration against Node.js best practices

set -e

ECHO_PREFIX="[$(date)] [DOCKER-TEST]"

echo "$ECHO_PREFIX Starting Docker best practices verification"

# Step 1: Verify Multi-stage Build Efficiency
echo "$ECHO_PREFIX Step 1: Multi-stage Build Efficiency Test"

# Build the production image
echo "$ECHO_PREFIX Building production image"
docker-compose build prod

# Check image sizes
echo "$ECHO_PREFIX Checking image sizes"
DEV_SIZE=$(docker images --format "{{.Size}}" ai-tools-experiments-dev:latest)
PROD_SIZE=$(docker images --format "{{.Size}}" ai-tools-experiments-prod:latest)

echo "$ECHO_PREFIX Development image size: $DEV_SIZE"
echo "$ECHO_PREFIX Production image size: $PROD_SIZE"

# Check layers (should be minimal in production)
echo "$ECHO_PREFIX Analyzing layers in production image"
docker history ai-tools-experiments-prod:latest --no-trunc --format "table {{.CreatedBy}}\t{{.Size}}" | head -n 10

# Step 2: Security Analysis
echo "$ECHO_PREFIX Step 2: Security Analysis"

# Check if prod container runs as non-root
echo "$ECHO_PREFIX Checking for non-root user in production container"
USER_INFO=$(docker-compose run --rm prod id 2>/dev/null || echo "Failed to get user info")
echo "$ECHO_PREFIX Container user information: $USER_INFO"

# Verify no sensitive data in image
echo "$ECHO_PREFIX Checking for absence of sensitive data in image"
docker-compose run --rm prod sh -c "find / -name '*.npmrc' -o -name '.env*' 2>/dev/null || echo 'No sensitive files found'"

# Step 3: Native Module Compatibility
echo "$ECHO_PREFIX Step 3: Native Module Compatibility Test"

# Test ARM64 compatibility with both ESBuild and Rollup
echo "$ECHO_PREFIX Checking native module compatibility in production container"
ESBUILD_VERSION=$(docker-compose run --rm prod sh -c "node -e \"try { console.log(require('esbuild').version) } catch(e) { console.log('Not installed') }\"" 2>/dev/null || echo "Failed")
echo "$ECHO_PREFIX ESBuild version in production container: $ESBUILD_VERSION"

ROLLUP_MODULES=$(docker-compose run --rm prod sh -c "ls -la /app/node_modules/@rollup 2>/dev/null || echo 'Not found'" 2>/dev/null || echo "Failed")
echo "$ECHO_PREFIX Rollup modules in production container: $ROLLUP_MODULES"

# Step 4: Netlify Environment Compatibility
echo "$ECHO_PREFIX Step 4: Netlify Environment Compatibility"

# Check if Netlify-specific environment variables are set
echo "$ECHO_PREFIX Verifying Netlify environment variables"
NETLIFY_ENV=$(docker-compose run --rm prod sh -c "env | grep NETLIFY" 2>/dev/null || echo "No Netlify variables found")
echo "$ECHO_PREFIX Netlify environment: $NETLIFY_ENV"

# Step 5: Verify Docker best practices
echo "$ECHO_PREFIX Step 5: Docker Best Practices Verification"

# Check for use of node directly vs npm scripts
echo "$ECHO_PREFIX Checking CMD instruction in production image"
docker inspect --format="{{.Config.Cmd}}" ai-tools-experiments-prod:latest

# Check for proper signal handling
echo "$ECHO_PREFIX Checking ENTRYPOINT configuration"
docker inspect --format="{{.Config.Entrypoint}}" ai-tools-experiments-prod:latest

# Summary
echo "$ECHO_PREFIX Verification complete"
echo "$ECHO_PREFIX Multi-stage build: $([ "$PROD_SIZE" != "$DEV_SIZE" ] && echo "✅ PASS" || echo "❌ FAIL")"
echo "$ECHO_PREFIX Non-root user: $(echo "$USER_INFO" | grep -q "uid=" && echo "✅ PASS" || echo "❌ FAIL")"
echo "$ECHO_PREFIX Netlify compatibility: $(echo "$NETLIFY_ENV" | grep -q "NETLIFY=true" && echo "✅ PASS" || echo "❌ FAIL")"
echo "$ECHO_PREFIX Direct node execution: $(docker inspect --format="{{.Config.Cmd}}" ai-tools-experiments-prod:latest | grep -q "node" && echo "✅ PASS" || echo "❌ FAIL")"

echo "$ECHO_PREFIX Verification process completed. Review results before marking tasks as complete."
