#!/usr/bin/env bash

# Script to detect and install architecture-specific native modules
# Focuses on fixing esbuild and rollup which are common issues in cross-architecture development

set -e

# Color output
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
NC="\033[0m" # No Color

# Detect the current platform
PLATFORM="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

# Map architecture to Node.js conventions
if [[ "$ARCH" == "x86_64" ]]; then
  ARCH_NODE="x64"
elif [[ "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]]; then
  ARCH_NODE="arm64"
else
  ARCH_NODE="$ARCH"
fi

# Define target esbuild module
if [[ "$PLATFORM" == "darwin" ]]; then
  ESBUILD_MODULE="@esbuild/darwin-$ARCH_NODE"
elif [[ "$PLATFORM" == "linux" ]]; then
  ESBUILD_MODULE="@esbuild/linux-$ARCH_NODE"
else
  echo -e "${RED}Unsupported platform: $PLATFORM${NC}"
  exit 1
fi

# Define target rollup module (only exists for linux currently)
if [[ "$PLATFORM" == "linux" && "$ARCH_NODE" == "arm64" ]]; then
  ROLLUP_MODULE="@rollup/rollup-linux-arm64-gnu"
fi

echo -e "${GREEN}Detected platform: $PLATFORM-$ARCH_NODE${NC}"

# Check if Datadog error logger is available for metrics
if [ -f "./utils/datadog-error-logger.js" ]; then
  echo -e "${GREEN}Datadog error logger found, will track metrics${NC}"
  # Preload it before checking modules so we can track errors
  export USE_ERROR_LOGGER=true
fi

# Function to check and install the correct esbuild module
fix_esbuild() {
  # Check if esbuild is installed
  if [ -d "./node_modules/esbuild" ]; then
    echo -e "${YELLOW}Checking esbuild installation...${NC}"
    
    # Get installed esbuild version
    ESBUILD_VERSION=$(node -e "console.log(require('./node_modules/esbuild/package.json').version)")
    
    # Check if the target module is installed
    if [ ! -d "./node_modules/$ESBUILD_MODULE" ]; then
      echo -e "${YELLOW}Installing $ESBUILD_MODULE@$ESBUILD_VERSION...${NC}"
      npm install --no-save "$ESBUILD_MODULE@$ESBUILD_VERSION"
      echo -e "${GREEN}Successfully installed $ESBUILD_MODULE${NC}"
    else
      echo -e "${GREEN}$ESBUILD_MODULE is already installed${NC}"
    fi
  else
    echo -e "${YELLOW}esbuild not found in node_modules${NC}"
  fi
}

# Function to check and install the correct rollup module
fix_rollup() {
  # Only fix rollup for Linux ARM64
  if [[ "$PLATFORM" == "linux" && "$ARCH_NODE" == "arm64" ]]; then
    if [ -d "./node_modules/rollup" ]; then
      echo -e "${YELLOW}Checking rollup installation...${NC}"
      
      # Check if the target module is installed
      if [ ! -d "./node_modules/$ROLLUP_MODULE" ]; then
        echo -e "${YELLOW}Installing $ROLLUP_MODULE...${NC}"
        npm install --no-save "$ROLLUP_MODULE"
        echo -e "${GREEN}Successfully installed $ROLLUP_MODULE${NC}"
      else
        echo -e "${GREEN}$ROLLUP_MODULE is already installed${NC}"
      fi
    else
      echo -e "${YELLOW}rollup not found in node_modules${NC}"
    fi
  fi
}

# Function to fix Rspack binaries
fix_rspack() {
  if [ -d "./node_modules/@rspack" ]; then
    echo -e "${YELLOW}Checking rspack installation...${NC}"
    # Ensure rspack core has proper binaries
    if [ -d "./node_modules/@rspack/core" ]; then
      RSPACK_PLATFORM_DIR="./node_modules/@rspack/core/bin/$PLATFORM-$ARCH_NODE"
      if [ ! -d "$RSPACK_PLATFORM_DIR" ]; then
        echo -e "${RED}Warning: Rspack may not have binaries for $PLATFORM-$ARCH_NODE${NC}"
        echo -e "${YELLOW}Checking if we need to rebuild rspack...${NC}"
        # If running in Docker on ARM64 Linux, we need special handling
        if [[ "$PLATFORM" == "linux" && "$ARCH_NODE" == "arm64" ]]; then
          echo -e "${YELLOW}Rebuilding rspack for Linux ARM64...${NC}"
          # Ensure we have the build tools
          apt-get update && apt-get install -y build-essential python3
          # Rebuild rspack
          cd ./node_modules/@rspack/core
          npm run build
          cd ../../..
          echo -e "${GREEN}Rspack rebuild complete${NC}"
        fi
      else
        echo -e "${GREEN}Rspack binaries for $PLATFORM-$ARCH_NODE exist${NC}"
      fi
    fi
  else
    echo -e "${YELLOW}rspack not found in node_modules${NC}"
  fi
}

# Main execution
echo -e "${GREEN}Starting architecture-specific module fixes...${NC}"

# Fix esbuild
fix_esbuild

# Fix rollup
fix_rollup

# Fix rspack
fix_rspack

echo -e "${GREEN}All architecture-specific modules have been checked and fixed!${NC}"

# Execute the original command if provided
if [ $# -gt 0 ]; then
  echo -e "${GREEN}Executing the provided command: $@${NC}"
  exec "$@"
fi
