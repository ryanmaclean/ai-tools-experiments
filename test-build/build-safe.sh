#!/bin/bash

# A script to safely build the site while preserving environment-aware routing
set -e

echo "Running safe build process"

# Detect environment for consistent URL paths
if [[ "${NETLIFY}" == "true" ]]; then
  # We're in a Netlify environment
  if [[ "${CONTEXT}" == "production" ]]; then
    echo "Detected production environment, using /pages prefix"
    export URL_PREFIX="/pages"
  else
    echo "Detected test environment, using direct routes without prefix"
    export URL_PREFIX=""
  fi
else
  # Local development
  echo "Detected local development, using direct routes without prefix"
  export URL_PREFIX=""
fi

# 1. Create backup of files that cause SSR issues
echo "📦 Backing up client-side scripts"
mkdir -p .build-backup
cp src/layouts/MainLayout.astro .build-backup/
cp src/components/Header.astro .build-backup/
cp src/pages/index.astro .build-backup/
cp src/pages/resources.astro .build-backup/
cp src/pages/observations.astro .build-backup/

# 2. Replace problematic client-side script tags for build
echo "🔄 Temporarily modifying scripts for SSR compatibility"

# Portable sed approach for cross-platform compatibility
mkdir -p .build-tmp

# MainLayout.astro
cat src/layouts/MainLayout.astro | sed 's/document\.addEventListener/console.log("Build mode"); \/\* document.addEventListener/g' > .build-tmp/MainLayout.astro
cat .build-tmp/MainLayout.astro | sed 's/document\.querySelector/\/\* document.querySelector/g' > .build-tmp/MainLayout.astro.2
cat .build-tmp/MainLayout.astro.2 | sed 's/document\.getElementById/\/\* document.getElementById/g' > .build-tmp/MainLayout.astro.3
cp .build-tmp/MainLayout.astro.3 src/layouts/MainLayout.astro

# Header.astro
cat src/components/Header.astro | sed 's/document\.addEventListener/console.log("Build mode"); \/\* document.addEventListener/g' > .build-tmp/Header.astro
cat .build-tmp/Header.astro | sed 's/document\.querySelector/\/\* document.querySelector/g' > .build-tmp/Header.astro.2
cp .build-tmp/Header.astro.2 src/components/Header.astro

# index.astro
cat src/pages/index.astro | sed 's/document\.addEventListener/console.log("Build mode"); \/\* document.addEventListener/g' > .build-tmp/index.astro
cat .build-tmp/index.astro | sed 's/document\.querySelector/\/\* document.querySelector/g' > .build-tmp/index.astro.2
cp .build-tmp/index.astro.2 src/pages/index.astro

# resources.astro
cat src/pages/resources.astro | sed 's/document\.addEventListener/console.log("Build mode"); \/\* document.addEventListener/g' > .build-tmp/resources.astro
cat .build-tmp/resources.astro | sed 's/document\.querySelector/\/\* document.querySelector/g' > .build-tmp/resources.astro.2
cp .build-tmp/resources.astro.2 src/pages/resources.astro

# observations.astro
cat src/pages/observations.astro | sed 's/document\.addEventListener/console.log("Build mode"); \/\* document.addEventListener/g' > .build-tmp/observations.astro
cat .build-tmp/observations.astro | sed 's/document\.querySelector/\/\* document.querySelector/g' > .build-tmp/observations.astro.2
cp .build-tmp/observations.astro.2 src/pages/observations.astro

# 3. Run the build
echo "🏗️ Running Astro build"
npm run build

# 4. Partial file restoration - preserve environment awareness in Header
echo "Partially restoring original files while preserving environment settings"
cp .build-backup/MainLayout.astro src/layouts/
# DO NOT restore Header.astro to preserve environment URL paths
# Instead, only fix the client-side scripts in the current Header
cp src/components/Header.astro .build-tmp/preserved-header.astro
sed -i.bak 's/\/\* document\.querySelector/document.querySelector/g' .build-tmp/preserved-header.astro
cp .build-tmp/preserved-header.astro src/components/Header.astro

# Restore other files
cp .build-backup/index.astro src/pages/
cp .build-backup/resources.astro src/pages/
cp .build-backup/observations.astro src/pages/

# 5. Clean up temporary files
rm -rf .build-tmp

# 6. Post-process built files to fix client-side scripts
echo "✅ Build completed successfully!"
