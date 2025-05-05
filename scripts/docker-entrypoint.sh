#!/bin/bash
set -e

# Detect architecture and OS
ARCH=$(uname -m)
OS=$(uname)
echo "Detected OS: $OS, Architecture: $ARCH"

# Function to install architecture-specific binaries
install_arch_specific_packages() {
    local os=$1
    local arch=$2
    
    echo "Installing $os-$arch specific packages..."
    
    # Get the exact esbuild version from package.json
    ESBUILD_VERSION=$(node -e "console.log(require('./package.json').dependencies.esbuild || require('./package.json').devDependencies.esbuild || '')")
    
    if [ -n "$ESBUILD_VERSION" ]; then
        echo "Installing @esbuild/$os-$arch version $ESBUILD_VERSION"
        npm install --no-save "@esbuild/$os-$arch@$ESBUILD_VERSION"
    fi
    
    # Install rollup for specific architecture
    echo "Installing @rollup/rollup-$os-$arch-gnu"
    npm install --no-save @rollup/rollup-$os-$arch-gnu || true
    


fi

# Call the function with detected OS and architecture
if [ "$ARCH" = "arm64" ] || [ "$ARCH" = "aarch64" ]; then
    if [ "$OS" = "Darwin" ]; then
        install_arch_specific_packages "darwin" "arm64"
    else
        install_arch_specific_packages "linux" "arm64"
    fi
fi

# Execute the command passed to the entrypoint
exec "$@"
