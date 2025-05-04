#!/bin/bash

# Comprehensive fix script for ARM64 native modules in Docker
# Based on official Node.js and Docker documentation for ARM64 compatibility

set -e

# Log for Datadog tracing
echo "[$(date)] Starting ARM64 native module fix script"

# Function to install a specific package and version
install_native_module() {
  local package=$1
  local version=$2
  local dest_dir=$3
  
  echo "[$(date)] Installing ${package}@${version} to ${dest_dir}"
  
  # Create a temporary directory
  local tmp_dir=$(mktemp -d)
  cd "${tmp_dir}"
  
  # Create a minimal package.json
  echo "{\"name\": \"native-fix\", \"dependencies\": {\"${package}\": \"${version}\"}}" > package.json
  
  # Install the package
  npm install --no-save --no-package-lock --force
  
  # Make sure the destination directory exists
  mkdir -p "${dest_dir}"
  
  # Copy the installed package to the destination
  if [ -d "node_modules/${package}" ]; then
    cp -r "node_modules/${package}" "${dest_dir}/"
    echo "[$(date)] Successfully installed ${package}@${version}"
    return 0
  else
    echo "[$(date)] Failed to install ${package}@${version}"
    return 1
  fi
}

# Fix ESBuild - ensure we install the exact version the app uses
if [ ! -d "/app/node_modules/@esbuild/linux-arm64" ] || [ ! -f "/app/node_modules/@esbuild/linux-arm64/bin/esbuild" ]; then
  # First try with npm reinstall
  echo "[$(date)] Fixing ESBuild native module..."
  cd /app
  npm rebuild esbuild --force
  
  # If that didn't work, install the specific version
  if [ ! -d "/app/node_modules/@esbuild/linux-arm64" ] || [ ! -f "/app/node_modules/@esbuild/linux-arm64/bin/esbuild" ]; then
    echo "[$(date)] npm rebuild didn't work, trying manual installation..."
    install_native_module "@esbuild/linux-arm64" "0.25.3" "/app/node_modules/@esbuild"
  fi
else
  echo "[$(date)] ESBuild native module is already installed"
fi

# Fix Rollup
if [ ! -d "/app/node_modules/@rollup/rollup-linux-arm64-gnu" ]; then
  echo "[$(date)] Fixing Rollup native module..."
  install_native_module "@rollup/rollup-linux-arm64-gnu" "latest" "/app/node_modules/@rollup"
else
  echo "[$(date)] Rollup native module is already installed"
fi

# Check if we need to clean up node_modules and reinstall completely
if [ "$1" = "--full-reinstall" ]; then
  echo "[$(date)] Performing a full dependency reinstall..."
  cd /app
  rm -rf node_modules
  npm install --force
  echo "[$(date)] Full reinstall completed"
fi

echo "[$(date)] ARM64 native module fixes completed"
