#!/bin/bash

# Script to fix Rollup native modules issue across different environments
# This addresses npm bug #4828 (https://github.com/npm/cli/issues/4828)

set -e

# Text colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Detect platform and architecture
PLATFORM=$(node -e "console.log(process.platform)")
ARCH=$(node -e "console.log(process.arch)")
NODE_VERSION=$(node -e "console.log(process.version)")

# Display environment info
echo -e "${BLUE}=== Environment Detection ===${NC}"
echo -e "Platform: ${YELLOW}$PLATFORM${NC}"
echo -e "Architecture: ${YELLOW}$ARCH${NC}"
echo -e "Node Version: ${YELLOW}$NODE_VERSION${NC}"

# Check if running in Netlify
if [ -n "$NETLIFY" ] && [ "$NETLIFY" = "true" ]; then
  echo -e "${BLUE}Running in Netlify environment${NC}"
  IS_NETLIFY=true
else
  IS_NETLIFY=false
fi

# Check if running in Docker
if [ -f /.dockerenv ] || grep -q docker /proc/1/cgroup 2>/dev/null; then
  echo -e "${BLUE}Running in Docker container${NC}"
  IS_DOCKER=true
else
  IS_DOCKER=false
fi

# Determine the correct Rollup and ESBuild native modules for this platform
if [ "$PLATFORM" = "linux" ]; then
  if [ "$ARCH" = "x64" ]; then
    ROLLUP_MODULE="@rollup/rollup-linux-x64-gnu"
    ESBUILD_MODULE="@esbuild/linux-x64"
  elif [ "$ARCH" = "arm64" ]; then
    ROLLUP_MODULE="@rollup/rollup-linux-arm64-gnu"
    ESBUILD_MODULE="@esbuild/linux-arm64"
  fi
elif [ "$PLATFORM" = "darwin" ]; then
  if [ "$ARCH" = "x64" ]; then
    ROLLUP_MODULE="@rollup/rollup-darwin-x64"
    ESBUILD_MODULE="@esbuild/darwin-x64"
  elif [ "$ARCH" = "arm64" ]; then
    ROLLUP_MODULE="@rollup/rollup-darwin-arm64"
    ESBUILD_MODULE="@esbuild/darwin-arm64"
  fi
elif [ "$PLATFORM" = "win32" ]; then
  if [ "$ARCH" = "x64" ]; then
    ROLLUP_MODULE="@rollup/rollup-win32-x64-msvc"
    ESBUILD_MODULE="@esbuild/win32-x64"
  elif [ "$ARCH" = "arm64" ]; then
    ROLLUP_MODULE="@rollup/rollup-win32-arm64-msvc"
    ESBUILD_MODULE="@esbuild/win32-arm64"
  fi
fi

echo -e "${BLUE}Required native modules for this environment:${NC}"
echo -e "Rollup: ${YELLOW}$ROLLUP_MODULE${NC}"
echo -e "ESBuild: ${YELLOW}$ESBUILD_MODULE${NC}"

# Check if the modules are installed
ROLLUP_INSTALLED=false
ESBUILD_INSTALLED=false

if [ -d "node_modules/$ROLLUP_MODULE" ]; then
  echo -e "${GREEN}✓ $ROLLUP_MODULE is already installed${NC}"
  ROLLUP_INSTALLED=true
else
  echo -e "${RED}✗ $ROLLUP_MODULE is NOT installed${NC}"
fi

if [ -d "node_modules/$ESBUILD_MODULE" ]; then
  echo -e "${GREEN}✓ $ESBUILD_MODULE is already installed${NC}"
  ESBUILD_INSTALLED=true
else
  echo -e "${RED}✗ $ESBUILD_MODULE is NOT installed${NC}"
fi

# Get esbuild version to ensure exact match
if [ -f "package.json" ]; then
  ESBUILD_VERSION=$(node -e "const pkg = require('./package.json'); console.log(pkg.dependencies?.esbuild || pkg.devDependencies?.esbuild || '')")
  echo -e "ESBuild version from package.json: ${YELLOW}$ESBUILD_VERSION${NC}"
fi

# Fix missing modules
echo -e "\n${BLUE}=== Fixing Native Modules ===${NC}"

# Only install missing modules
MODULES_TO_INSTALL=""

if [ "$ROLLUP_INSTALLED" = false ]; then
  MODULES_TO_INSTALL="$MODULES_TO_INSTALL $ROLLUP_MODULE"
fi

if [ "$ESBUILD_INSTALLED" = false ] && [ -n "$ESBUILD_VERSION" ]; then
  # Make sure ESBuild module matches the version in package.json
  MODULES_TO_INSTALL="$MODULES_TO_INSTALL $ESBUILD_MODULE@$ESBUILD_VERSION"
fi

if [ -n "$MODULES_TO_INSTALL" ]; then
  echo -e "Installing missing native modules: ${YELLOW}$MODULES_TO_INSTALL${NC}"
  npm install $MODULES_TO_INSTALL --no-save
  
  # Verify installation was successful
  VERIFICATION_FAILED=false
  
  if [ "$ROLLUP_INSTALLED" = false ] && [ ! -d "node_modules/$ROLLUP_MODULE" ]; then
    echo -e "${RED}✗ Failed to install $ROLLUP_MODULE${NC}"
    VERIFICATION_FAILED=true
  fi
  
  if [ "$ESBUILD_INSTALLED" = false ] && [ -n "$ESBUILD_VERSION" ] && [ ! -d "node_modules/$ESBUILD_MODULE" ]; then
    echo -e "${RED}✗ Failed to install $ESBUILD_MODULE${NC}"
    VERIFICATION_FAILED=true
  fi
  
  if [ "$VERIFICATION_FAILED" = true ]; then
    echo -e "${RED}Module installation verification failed${NC}"
    echo -e "${YELLOW}Advanced fix: Trying with explicit platform and architecture flags...${NC}"
    
    npm install $MODULES_TO_INSTALL --no-save --platform=$PLATFORM --arch=$ARCH
  fi
else
  echo -e "${GREEN}All required native modules are already installed${NC}"
fi

# Verify modules can be loaded
echo -e "\n${BLUE}=== Testing Module Loading ===${NC}"

# Test Rollup
echo -e "Testing Rollup..." 
if node -e "try { require('rollup'); console.log('Rollup loaded successfully'); } catch(e) { console.error('Rollup failed to load:', e.message); process.exit(1); }"; then
  echo -e "${GREEN}✓ Rollup loads correctly${NC}"
else
  echo -e "${RED}✗ Rollup failed to load${NC}"
  
  # Create symlink as a last resort
  if [ -d "node_modules/@rollup" ]; then
    echo -e "${YELLOW}Creating symlink for Rollup module as last resort...${NC}"
    cd node_modules/@rollup
    ln -sf "rollup-$PLATFORM-$ARCH" "rollup-$PLATFORM-$ARCH-gnu" 2>/dev/null || true
    ln -sf "rollup-$PLATFORM-$ARCH-gnu" "rollup-$PLATFORM-$ARCH" 2>/dev/null || true
    cd ../..
    
    # Test again
    if node -e "try { require('rollup'); console.log('Rollup loaded successfully with symlink'); } catch(e) { console.error('Rollup still failed to load:', e.message); process.exit(1); }"; then
      echo -e "${GREEN}✓ Rollup loads correctly with symlink${NC}"
    else
      echo -e "${RED}✗ Rollup still fails to load after symlink attempt${NC}"
      echo -e "${RED}Please try removing node_modules and package-lock.json, then run npm ci${NC}"
    fi
  fi
fi

# Test ESBuild
echo -e "\nTesting ESBuild..."
if node -e "try { const esbuild = require('esbuild'); console.log('ESBuild loaded successfully, version:', esbuild.version); } catch(e) { console.error('ESBuild failed to load:', e.message); process.exit(1); }"; then
  echo -e "${GREEN}✓ ESBuild loads correctly${NC}"
else
  echo -e "${RED}✗ ESBuild failed to load${NC}"
fi

# Summary
echo -e "\n${BLUE}=== Summary ===${NC}"
echo -e "Environment: ${YELLOW}$PLATFORM-$ARCH${NC}"
if [ "$IS_NETLIFY" = true ]; then
  echo -e "Running in: ${YELLOW}Netlify${NC}"
elif [ "$IS_DOCKER" = true ]; then
  echo -e "Running in: ${YELLOW}Docker${NC}"
else
  echo -e "Running in: ${YELLOW}Local Environment${NC}"
fi

echo -e "\n${GREEN}Fix script completed${NC}"
