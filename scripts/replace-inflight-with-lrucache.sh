#!/bin/bash

# Script to replace the deprecated inflight package with lru-cache
# As per official recommendations: https://github.com/isaacs/inflight-DEPRECATED-DO-NOT-USE

echo "=== Replacing deprecated inflight package with lru-cache ==="
echo "Started at $(date)"

# First, install lru-cache explicitly to ensure we have the latest version
echo "Installing lru-cache v10.4.3 (latest)..."
npm install --save-dev lru-cache@10.4.3

# Check if inflight is a direct dependency
if grep -q '"inflight"' package.json; then
  echo "Found direct dependency on inflight, replacing..."
  # Use sed to replace the dependency in package.json (not typically needed as it's usually a transitive dependency)
  sed -i '' 's/"inflight":[[:space:]]*"\^.*"/"lru-cache": "^10.4.3"/' package.json
else
  echo "No direct dependency on inflight found (likely transitive)."
fi

# Add override in package.json resolutions section to prevent transitive dependencies from using inflight
echo "Adding resolution to force use of lru-cache instead of inflight..."

# Check if the resolutions section already contains an entry for inflight
if grep -q '"inflight"' package.json; then
  echo "Resolutions for inflight already exists, skipping."
else
  # Add inflight resolution if needed
  if grep -q '"resolutions"' package.json; then
    # Resolutions section exists, add inflight entry if not present
    if ! grep -q '"inflight"' package.json; then
      sed -i '' '/"resolutions"[[:space:]]*:[[:space:]]*{/a\
    "inflight": "npm:lru-cache@10.4.3",' package.json
    fi
  fi
fi

# Update package-lock.json
echo "Updating package-lock.json..."
npm install

echo "=== Replacement complete ==="
echo "Completed at $(date)"
echo "Note: You may still see warnings about inflight from transitive dependencies."
echo "The resolution in package.json should ensure lru-cache is used instead."
