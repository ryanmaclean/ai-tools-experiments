#!/bin/bash

# Docker entrypoint script to fix architecture-specific native modules
# Based on official documentation and community solutions for Node.js on ARM64

set -e

# Log for Datadog monitoring
echo "[$(date)] Starting Docker entrypoint script to fix dependencies"

# Ensure we're in the correct directory with the package.json file
if [ ! -f "/app/package.json" ]; then
  echo "[$(date)] ! ERROR: /app/package.json not found. Docker volume may not be mounted correctly."
  # List directories to help diagnose the issue
  echo "[$(date)] Contents of /app directory:"
  ls -la /app
  echo "[$(date)] Current working directory: $(pwd)"
  # If no package.json is found, we might still be able to continue with default versions
fi

# Determine installed esbuild version to ensure exact version match
cd /app
ESBUILD_VERSION=$(node -e "try { console.log(require('esbuild/package.json').version) } catch(e) { console.log('0.25.3') }")
echo "[$(date)] Detected esbuild version: ${ESBUILD_VERSION:-0.25.3}"

# Fix Rollup ARM64 module
if [ ! -d "/app/node_modules/@rollup/rollup-linux-arm64-gnu" ] || [ ! -f "/app/node_modules/@rollup/rollup-linux-arm64-gnu/rollup.linux-arm64-gnu.node" ]; then
  echo "[$(date)] Installing @rollup/rollup-linux-arm64-gnu module..."
  
  # Create a temporary directory for the fix
  mkdir -p /tmp/rollup-fix
  cd /tmp/rollup-fix
  
  # Create a package.json with the dependency
  echo '{"name":"rollup-fix","dependencies":{"@rollup/rollup-linux-arm64-gnu":"latest"}}' > package.json
  
  # Install the dependency
  npm install --no-save --no-package-lock --force
  
  # Ensure the @rollup directory exists
  mkdir -p /app/node_modules/@rollup/
  
  # Copy the module to the node_modules directory
  cp -r node_modules/@rollup/rollup-linux-arm64-gnu /app/node_modules/@rollup/
  
  echo "[$(date)] Successfully installed @rollup/rollup-linux-arm64-gnu module"
else
  echo "[$(date)] @rollup/rollup-linux-arm64-gnu module already present"
fi

# Fix ESBuild ARM64 module - completely reinstall to ensure version match
echo "[$(date)] Completely reinstalling esbuild to fix version mismatch..."

# Get exact version needed
cd /app
ESBUILD_VERSION=$(node -e "try { console.log(require('esbuild/package.json').version) } catch(e) { console.log('0.25.3') }")
ESBUILD_CURRENT_BINARY="unknown"
if [ -d "/app/node_modules/@esbuild/linux-arm64" ]; then
  # Check binary version if available
  if [ -f "/app/node_modules/@esbuild/linux-arm64/bin/esbuild" ]; then
    ESBUILD_CURRENT_BINARY=$(/app/node_modules/@esbuild/linux-arm64/bin/esbuild --version 2>/dev/null || echo "unknown")
    echo "[$(date)] Current esbuild binary version: ${ESBUILD_CURRENT_BINARY}"
  fi

  # Always completely remove existing esbuild to ensure clean install
  echo "[$(date)] Removing existing esbuild modules..."
  rm -rf /app/node_modules/esbuild
  rm -rf /app/node_modules/@esbuild
  echo "[$(date)] Existing esbuild modules removed"
fi

# Create clean installation directory
mkdir -p /tmp/clean-esbuild
cd /tmp/clean-esbuild

# Create minimal package.json with exact versions
cat > package.json << EOF
{
  "name": "esbuild-clean-install",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "esbuild": "${ESBUILD_VERSION:-0.25.3}"
  }
}
EOF

# Install esbuild with its correct native dependencies
echo "[$(date)] Installing esbuild ${ESBUILD_VERSION:-0.25.3} with native dependencies..."
npm install --no-fund --no-audit --no-package-lock

# Make sure directories exist
mkdir -p /app/node_modules/@esbuild

# Copy all esbuild modules to application
echo "[$(date)] Copying clean esbuild installation to app..."
cp -r node_modules/esbuild /app/node_modules/
cp -r node_modules/@esbuild/* /app/node_modules/@esbuild/

# Verify installation
if [ -f "/app/node_modules/@esbuild/linux-arm64/bin/esbuild" ]; then
  NEW_VERSION=$(/app/node_modules/@esbuild/linux-arm64/bin/esbuild --version 2>/dev/null || echo "unknown")
  echo "[$(date)] Successfully installed esbuild binary version: ${NEW_VERSION}"
  
  # Double check version match
  if [ "${NEW_VERSION}" = "${ESBUILD_VERSION:-0.25.3}" ]; then
    echo "[$(date)] ✓ ESBuild version match confirmed: ${NEW_VERSION}"
  else
    echo "[$(date)] ! Warning: ESBuild versions still don't match (${NEW_VERSION} vs ${ESBUILD_VERSION:-0.25.3})"
  fi
else
  echo "[$(date)] ! Warning: ESBuild binary installation may have failed"
fi

# Verify installations
if [ -d "/app/node_modules/@rollup/rollup-linux-arm64-gnu" ] && [ -d "/app/node_modules/@esbuild/linux-arm64" ]; then
  echo "[$(date)] ✓ All architecture-specific modules are installed correctly"
fi

# Log results to Datadog
echo "[$(date)] ARM64 dependency fixes completed, starting application"

# Execute the command passed to docker
exec "$@"
