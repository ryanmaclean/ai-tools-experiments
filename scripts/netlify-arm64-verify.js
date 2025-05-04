#!/usr/bin/env node

/**
 * Netlify ARM64 Module Verification Script
 * 
 * This script specifically verifies that ARM64 native modules for Rollup and ESBuild
 * are properly installed in the Netlify environment. It runs before the build
 * to ensure all dependencies are correctly resolved.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const NODE_MODULES_DIR = path.join(process.cwd(), 'node_modules');
const TEMP_LOG_FILE = path.join(process.cwd(), '.arm64-verify.log');

// ANSI colors for console output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

// Create a log that will be both displayed and saved to a file for debugging
const logs = [];
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  let color = COLORS.reset;
  
  switch (type) {
    case 'error':
      color = COLORS.red;
      break;
    case 'success':
      color = COLORS.green;
      break;
    case 'warning':
      color = COLORS.yellow;
      break;
    case 'info':
      color = COLORS.blue;
      break;
  }
  
  const consoleMessage = `${color}[${timestamp}] [ARM64-VERIFY] ${message}${COLORS.reset}`;
  const fileMessage = `[${timestamp}] [ARM64-VERIFY] ${message}`;
  
  console.log(consoleMessage);
  logs.push(fileMessage);
}

// Verify ARM64 modules
function verifyArm64Modules() {
  log('Verifying ARM64 native modules...');
  
  // Verify environment
  log(`Node.js version: ${process.version}`);
  log(`Platform: ${process.platform}`);
  log(`Architecture: ${process.arch}`);
  log(`Netlify: ${process.env.NETLIFY === 'true' ? 'Yes' : 'No'}`);
  log(`Context: ${process.env.CONTEXT || 'unknown'}`);

  // Define modules needed for each platform
  const platformModules = {
    'linux-arm64': [
      '@rollup/rollup-linux-arm64-gnu',
      '@esbuild/linux-arm64'
    ],
    'linux-x64': [
      '@rollup/rollup-linux-x64-gnu',
      '@esbuild/linux-x64'
    ],
    'darwin-arm64': [
      '@rollup/rollup-darwin-arm64',
      '@esbuild/darwin-arm64'
    ],
    'darwin-x64': [
      '@rollup/rollup-darwin-x64',
      '@esbuild/darwin-x64'
    ]
  };
  
  // Detect current platform and modules we need
  const currentPlatformKey = `${process.platform}-${process.arch}`;
  log(`Current platform key: ${currentPlatformKey}`);
  
  // In Netlify we're on Linux (typically x64), but we need to ensure ARM64 modules too
  const isNetlify = process.env.NETLIFY === 'true';
  
  // For Netlify, we need both the current platform and linux-arm64 modules
  const requiredModules = [];
  
  if (isNetlify) {
    // On Netlify, ensure we have modules for the current platform AND arm64
    if (platformModules[currentPlatformKey]) {
      requiredModules.push(...platformModules[currentPlatformKey].map(name => ({ name, platform: process.platform, arch: process.arch })));
    }
    // Always add Linux ARM64 modules for Netlify
    requiredModules.push(...platformModules['linux-arm64'].map(name => ({ name, platform: 'linux', arch: 'arm64' })));
  } else {
    // Local development - just get modules for the current platform
    if (platformModules[currentPlatformKey]) {
      requiredModules.push(...platformModules[currentPlatformKey].map(name => ({ name, platform: process.platform, arch: process.arch })));
    } else {
      log(`Warning: Unknown platform ${currentPlatformKey}, can't determine required modules`, 'warning');
    }
  }
  
  const missingModules = [];
  const successModules = [];
  
  requiredModules.forEach(module => {
    const modulePath = path.join(NODE_MODULES_DIR, module.name);
    if (fs.existsSync(modulePath)) {
      successModules.push(module.name);
    } else {
      missingModules.push(module.name);
    }
  });
  
  if (successModules.length > 0) {
    log(`Found modules: ${successModules.join(', ')}`, 'success');
  }
  
  if (missingModules.length > 0) {
    log(`Missing modules: ${missingModules.join(', ')}`, 'error');
    log('Installing missing ARM64 modules...', 'info');
    
    missingModules.forEach(moduleName => {
      try {
        log(`Installing ${moduleName}...`);
        execSync(`npm install ${moduleName} --no-save`, { stdio: 'pipe' });
        
        if (fs.existsSync(path.join(NODE_MODULES_DIR, moduleName))) {
          log(`Successfully installed ${moduleName}`, 'success');
        } else {
          log(`Failed to install ${moduleName} - not found after installation`, 'error');
        }
      } catch (error) {
        log(`Error installing ${moduleName}: ${error.message}`, 'error');
      }
    });
  }
  
  // Apply workaround for npm bug #4828 with Rollup
  try {
    log('Applying Rollup module workaround...');
    
    // Check if rollup is installed
    const rollupMainPath = path.join(NODE_MODULES_DIR, 'rollup', 'dist', 'es', 'rollup.js');
    if (fs.existsSync(rollupMainPath)) {
      // Create or update the package.json to explicitly require the correct native module
      const rollupPkgPath = path.join(NODE_MODULES_DIR, 'rollup', 'package.json');
      if (fs.existsSync(rollupPkgPath)) {
        const rollupPkg = JSON.parse(fs.readFileSync(rollupPkgPath, 'utf8'));
        
        // Make a backup of the original package.json
        fs.writeFileSync(`${rollupPkgPath}.backup`, JSON.stringify(rollupPkg, null, 2));
        
        // For each platform, check and fix the optionalDependencies
        if (process.platform === 'darwin' && process.arch === 'arm64') {
          log('Setting up macOS ARM64 optimized Rollup configuration');
          rollupPkg.optionalDependencies = {
            '@rollup/rollup-darwin-arm64': '*'
          };
        } else if (process.platform === 'darwin' && process.arch === 'x64') {
          log('Setting up macOS x64 optimized Rollup configuration');
          rollupPkg.optionalDependencies = {
            '@rollup/rollup-darwin-x64': '*'
          };
        } else if (process.platform === 'linux' && process.arch === 'arm64') {
          log('Setting up Linux ARM64 optimized Rollup configuration');
          rollupPkg.optionalDependencies = {
            '@rollup/rollup-linux-arm64-gnu': '*'
          };
        } else if (process.platform === 'linux' && process.arch === 'x64') {
          log('Setting up Linux x64 optimized Rollup configuration');
          rollupPkg.optionalDependencies = {
            '@rollup/rollup-linux-x64-gnu': '*'
          };
        }
        
        // Write the updated package.json
        fs.writeFileSync(rollupPkgPath, JSON.stringify(rollupPkg, null, 2));
        log('Updated Rollup package.json with platform-specific dependencies', 'success');
      } else {
        log('Rollup package.json not found', 'error');
      }
    } else {
      log('Rollup not found in node_modules', 'error');
    }
  } catch (error) {
    log(`Error applying Rollup workaround: ${error.message}`, 'error');
  }
  
  // Verify binaries can be loaded
  try {
    log('Attempting to load esbuild...');
    require('esbuild');
    log('ESBuild loaded successfully', 'success');
  } catch (error) {
    log(`Error loading esbuild: ${error.message}`, 'error');
  }
  
  try {
    log('Attempting to load rollup...');
    // Force a fresh require after our workaround
    delete require.cache[require.resolve('rollup')];
    require('rollup');
    log('Rollup loaded successfully', 'success');
  } catch (error) {
    log(`Error loading rollup: ${error.message}`, 'error');
    // If this is a module not found error for the platform-specific module, try the manual approach
    if (error.message.includes('Cannot find module @rollup/rollup-')) {
      try {
        log('Attempting manual Rollup native module registration...');
        // For Netlify (linux) environment, we need to handle the specific platform
        const pathToRollup = require.resolve('rollup');
        const rollupDir = path.dirname(pathToRollup);
        const loadNativeModule = fs.existsSync(path.join(rollupDir, 'loadNative.js')) ?
          require(path.join(rollupDir, 'loadNative.js')) : null;
        
        if (loadNativeModule) {
          // Try to manually load and register the native module
          log('Found loadNative.js, attempting to manually register native module');
          const nativeModulePath = path.join(NODE_MODULES_DIR, `@rollup/rollup-${process.platform}-${process.arch}`);
          if (fs.existsSync(nativeModulePath)) {
            loadNativeModule.register(nativeModulePath);
            log('Successfully registered native Rollup module manually', 'success');
          } else {
            log(`Native module directory not found at ${nativeModulePath}`, 'error');
          }
        } else {
          log('Could not find Rollup loadNative.js module', 'error');
        }
      } catch (manualError) {
        log(`Error during manual Rollup module registration: ${manualError.message}`, 'error');
      }
    }
  }
  
  // Final status
  const actuallyMissing = missingModules.filter(moduleName => 
    !fs.existsSync(path.join(NODE_MODULES_DIR, moduleName)));
  
  if (actuallyMissing.length === 0) {
    log('All required ARM64 native modules are installed!', 'success');
    return true;
  } else {
    log(`Still missing ${actuallyMissing.length} modules after installation attempt`, 'error');
    log(`Missing: ${actuallyMissing.join(', ')}`, 'error');
    return false;
  }
}

// Save logs to file for later inspection (useful for Netlify logs)
function saveLogs() {
  try {
    fs.writeFileSync(TEMP_LOG_FILE, logs.join('\n'), 'utf8');
    console.log(`Log saved to ${TEMP_LOG_FILE}`);
  } catch (err) {
    console.error(`Failed to save log: ${err.message}`);
  }
}

// Main function
function main() {
  log('Starting ARM64 module verification...');
  
  try {
    const success = verifyArm64Modules();
    saveLogs();
    
    if (!success) {
      log('ARM64 module verification failed', 'error');
      process.exit(1);
    } else {
      log('ARM64 module verification completed successfully', 'success');
      process.exit(0);
    }
  } catch (error) {
    log(`Unexpected error: ${error.message}`, 'error');
    saveLogs();
    process.exit(1);
  }
}

// Run the main function
main();
