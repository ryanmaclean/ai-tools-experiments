#!/bin/bash
set -e

# Detect architecture
ARCH=$(uname -m)
echo "Detected architecture: $ARCH"

# Install architecture-specific binaries if needed
if [ "$ARCH" = "arm64" ] || [ "$ARCH" = "aarch64" ]; then
    echo "Installing ARM64-specific packages..."
    # Get the exact esbuild version from package.json
    ESBUILD_VERSION=$(node -e "console.log(require('./package.json').dependencies.esbuild || require('./package.json').devDependencies.esbuild || '')")
    
    # Install the corresponding architecture-specific packages
    if [ -n "$ESBUILD_VERSION" ]; then
        echo "Installing @esbuild/linux-arm64 version $ESBUILD_VERSION"
        npm install --no-save "@esbuild/linux-arm64@$ESBUILD_VERSION"
    fi
    
    # Install rollup for ARM64
    echo "Installing @rollup/rollup-linux-arm64-gnu"
    npm install --no-save @rollup/rollup-linux-arm64-gnu
fi

# For local MacOS development with ARM64
if [ "$ARCH" = "arm64" ] && [ "$(uname)" = "Darwin" ]; then
    echo "Installing Darwin ARM64-specific packages..."
    # Get the exact esbuild version from package.json
    ESBUILD_VERSION=$(node -e "console.log(require('./package.json').dependencies.esbuild || require('./package.json').devDependencies.esbuild || '')")
    
    # Install the corresponding architecture-specific packages
    if [ -n "$ESBUILD_VERSION" ]; then
        echo "Installing @esbuild/darwin-arm64 version $ESBUILD_VERSION"
        npm install --no-save "@esbuild/darwin-arm64@$ESBUILD_VERSION"
    fi
    
    # Install rollup for Darwin ARM64
    echo "Installing @rollup/rollup-darwin-arm64"
    npm install --no-save @rollup/rollup-darwin-arm64
fi

# Execute the command passed to the entrypoint
exec "$@"
