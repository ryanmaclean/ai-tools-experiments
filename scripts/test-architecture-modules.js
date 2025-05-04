#!/usr/bin/env node

/**
 * Native Module Architecture Test Script
 * 
 * This script tests various environments to detect architecture differences and
 * identify potential issues with Rollup and ESBuild modules across architectures.
 * It verifies assumptions about Netlify environment vs local Docker development.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Configuration
const OUTPUT_FILE = 'architecture-test-results.json';
const NODE_MODULES_DIR = path.join(process.cwd(), 'node_modules');

// ANSI colors for console output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Test results storage
const results = {
  environment: {},
  modules: {
    rollup: {},
    esbuild: {}
  },
  tests: [],
  assumptions: [],
  summary: ''
};

// Logging utility
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
    case 'assumption':
      color = COLORS.magenta;
      break;
    case 'test':
      color = COLORS.cyan;
      break;
  }
  
  console.log(`${color}[${timestamp}] ${message}${COLORS.reset}`);
  
  // For assumption logs, store them to results
  if (type === 'assumption') {
    results.assumptions.push(message);
  }
  
  // For test logs, store them to results
  if (type === 'test') {
    results.tests.push(message);
  }
}

// Detect environment
function detectEnvironment() {
  log('Detecting environment...', 'info');
  
  // Get basic system info
  results.environment = {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    hostname: os.hostname(),
    cpus: os.cpus().length,
    totalMemory: Math.round(os.totalmem() / (1024 * 1024)) + ' MB',
    netlify: process.env.NETLIFY === 'true',
    docker: checkIfRunningInDocker(),
    date: new Date().toISOString()
  };
  
  // Log environment details
  log(`Platform: ${results.environment.platform}`, 'info');
  log(`Architecture: ${results.environment.arch}`, 'info');
  log(`Node Version: ${results.environment.nodeVersion}`, 'info');
  log(`Running in Netlify: ${results.environment.netlify}`, 'info');
  log(`Running in Docker: ${results.environment.docker}`, 'info');
  
  // Record assumptions about environment
  if (results.environment.netlify) {
    log('Assumption: Netlify builds run on x64 Ubuntu servers', 'assumption');
  } else if (results.environment.docker) {
    log(`Assumption: Docker images take on the host architecture unless explicitly set with --platform`, 'assumption');
  } else if (results.environment.platform === 'darwin' && results.environment.arch === 'arm64') {
    log('Assumption: Development on Apple Silicon requires native ARM64 modules', 'assumption');
  }
  
  // Run a detailed uname if on Linux to confirm architecture
  if (results.environment.platform === 'linux') {
    try {
      const unameDetails = execSync('uname -a').toString().trim();
      results.environment.unameDetails = unameDetails;
      log(`System details: ${unameDetails}`, 'info');
    } catch (error) {
      log('Could not get uname details', 'error');
    }
  }
}

// Check if running in Docker
function checkIfRunningInDocker() {
  // A common way to check if running in Docker is to check for .dockerenv file
  if (fs.existsSync('/.dockerenv')) {
    return true;
  }
  
  // Another way is to check if 'docker' appears in the cgroup file
  try {
    if (process.platform === 'linux') {
      const cgroupContent = fs.readFileSync('/proc/1/cgroup', 'utf8');
      return cgroupContent.includes('docker');
    }
  } catch (error) {
    // Ignore errors as this file might not exist
  }
  
  return false;
}

// Test native module installations
function testNativeModules() {
  log('Testing native module installations...', 'info');
  
  // List of native modules to check
  const NATIVE_MODULES = [
    // Rollup modules
    '@rollup/rollup-linux-x64-gnu',
    '@rollup/rollup-linux-arm64-gnu',
    '@rollup/rollup-darwin-x64',
    '@rollup/rollup-darwin-arm64',
    // ESBuild modules
    '@esbuild/linux-x64',
    '@esbuild/linux-arm64',
    '@esbuild/darwin-x64',
    '@esbuild/darwin-arm64'
  ];
  
  // Check each module existence
  const installedModules = {};
  
  NATIVE_MODULES.forEach(moduleName => {
    const modulePath = path.join(NODE_MODULES_DIR, moduleName);
    const isInstalled = fs.existsSync(modulePath);
    
    installedModules[moduleName] = isInstalled;
    
    if (isInstalled) {
      log(`Module ${moduleName} is installed`, 'success');
    } else {
      log(`Module ${moduleName} is NOT installed`, 'warning');
    }
  });
  
  // Store the results
  results.modules.installed = installedModules;
  
  // Check if the expected module for our architecture is installed
  const currentPlatform = process.platform;
  const currentArch = process.arch;
  
  const expectedRollupModule = `@rollup/rollup-${currentPlatform}-${currentArch}`;
  const expectedEsbuildModule = `@esbuild/${currentPlatform}-${currentArch}`;
  
  log(`Expected Rollup module for this architecture: ${expectedRollupModule}`, 'info');
  log(`Expected ESBuild module for this architecture: ${expectedEsbuildModule}`, 'info');
  
  // Check if the expected modules are installed
  if (installedModules[expectedRollupModule]) {
    log(`✅ Architecture-specific Rollup module is correctly installed`, 'test');
  } else {
    log(`❌ Architecture-specific Rollup module is MISSING`, 'test');
  }
  
  if (installedModules[expectedEsbuildModule]) {
    log(`✅ Architecture-specific ESBuild module is correctly installed`, 'test');
  } else {
    log(`❌ Architecture-specific ESBuild module is MISSING`, 'test');
  }
}

// Test module loading
function testModuleLoading() {
  log('Testing module loading...', 'info');
  
  // Test loading ESBuild
  try {
    const esbuild = require('esbuild');
    log(`✅ ESBuild loaded successfully (version ${esbuild.version})`, 'test');
    results.modules.esbuild.loaded = true;
    results.modules.esbuild.version = esbuild.version;
  } catch (error) {
    log(`❌ ESBuild failed to load: ${error.message}`, 'test');
    results.modules.esbuild.loaded = false;
    results.modules.esbuild.error = error.message;
  }
  
  // Test loading Rollup
  try {
    const rollup = require('rollup');
    log(`✅ Rollup loaded successfully`, 'test');
    results.modules.rollup.loaded = true;
  } catch (error) {
    log(`❌ Rollup failed to load: ${error.message}`, 'test');
    results.modules.rollup.loaded = false;
    results.modules.rollup.error = error.message;
    
    // Special handling for the npm bug #4828
    if (error.message.includes('Cannot find module @rollup/rollup-') && 
        error.message.includes('npm has a bug related to optional dependencies')) {
      log(`🔍 DETECTED npm bug #4828 with Rollup native modules`, 'test');
      results.modules.rollup.npmBug4828 = true;
    }
  }
}

// Test npm package lock
function testPackageLock() {
  log('Testing package-lock.json for platform dependencies...', 'info');
  
  try {
    const packageLockPath = path.join(process.cwd(), 'package-lock.json');
    
    if (!fs.existsSync(packageLockPath)) {
      log('package-lock.json does not exist', 'warning');
      return;
    }
    
    const packageLockContent = fs.readFileSync(packageLockPath, 'utf8');
    const packageLock = JSON.parse(packageLockContent);
    
    // Store simplified package lock info
    results.packageLock = {
      version: packageLock.lockfileVersion,
      hasPlatformDeps: false,
      platformDeps: []
    };
    
    // Look for platform-specific modules in dependencies
    const platformModuleRegex = /@(rollup|esbuild)\/(rollup|[a-z]+-[a-z0-9]+-[a-z]+)/;
    let foundPlatformDeps = false;
    const platformDeps = [];
    
    // Search for platform dependencies in the lockfile
    if (packageLock.packages) {
      Object.keys(packageLock.packages).forEach(pkgName => {
        if (platformModuleRegex.test(pkgName)) {
          foundPlatformDeps = true;
          platformDeps.push(pkgName);
        }
      });
    } else if (packageLock.dependencies) {
      // Older lockfile format
      const checkDepsRecursive = (deps, prefix = '') => {
        Object.keys(deps).forEach(depName => {
          const fullName = prefix ? `${prefix}/${depName}` : depName;
          if (platformModuleRegex.test(fullName)) {
            foundPlatformDeps = true;
            platformDeps.push(fullName);
          }
          
          if (deps[depName].dependencies) {
            checkDepsRecursive(deps[depName].dependencies, fullName);
          }
        });
      };
      
      checkDepsRecursive(packageLock.dependencies);
    }
    
    results.packageLock.hasPlatformDeps = foundPlatformDeps;
    results.packageLock.platformDeps = platformDeps;
    
    if (foundPlatformDeps) {
      log(`✅ package-lock.json contains platform-specific dependencies: ${platformDeps.join(', ')}`, 'test');
    } else {
      log(`❌ package-lock.json does NOT contain platform-specific dependencies`, 'test');
      log(`This could indicate npm bug #4828 is affecting your lockfile`, 'warning');
    }
    
    // Check if all architectures are represented
    const hasLinuxX64 = platformDeps.some(dep => dep.includes('linux-x64'));
    const hasLinuxArm64 = platformDeps.some(dep => dep.includes('linux-arm64'));
    const hasDarwinX64 = platformDeps.some(dep => dep.includes('darwin-x64'));
    const hasDarwinArm64 = platformDeps.some(dep => dep.includes('darwin-arm64'));
    
    results.packageLock.hasAllArchs = hasLinuxX64 && hasLinuxArm64 && hasDarwinX64 && hasDarwinArm64;
    
    if (results.packageLock.hasAllArchs) {
      log(`✅ package-lock.json contains dependencies for all major architectures`, 'test');
    } else {
      log(`❌ package-lock.json is missing dependencies for some architectures`, 'test');
      
      if (!hasLinuxX64) log('  - Missing linux-x64 modules', 'warning');
      if (!hasLinuxArm64) log('  - Missing linux-arm64 modules', 'warning');
      if (!hasDarwinX64) log('  - Missing darwin-x64 modules', 'warning');
      if (!hasDarwinArm64) log('  - Missing darwin-arm64 modules', 'warning');
    }
    
  } catch (error) {
    log(`Error analyzing package-lock.json: ${error.message}`, 'error');
  }
}

// Summarize findings
function summarizeFindings() {
  log('Summarizing findings...', 'info');
  
  // Check for architecture mismatches
  const isNetlify = results.environment.netlify;
  const isDocker = results.environment.docker;
  const platform = results.environment.platform;
  const arch = results.environment.arch;
  
  let summary = '';
  
  // Environment-specific conclusions
  if (isNetlify) {
    summary += '🔵 Running in Netlify environment:\n';
    summary += `   - Architecture: ${platform}-${arch}\n`;
    summary += '   - Netlify uses Ubuntu 24.04 server environment\n';
    
    if (results.modules.rollup.loaded && results.modules.esbuild.loaded) {
      summary += '   - ✅ Both Rollup and ESBuild modules loaded successfully\n';
    } else {
      summary += '   - ❌ Native module loading issues detected in Netlify\n';
    }
  } else if (isDocker) {
    summary += '🔵 Running in Docker environment:\n';
    summary += `   - Architecture: ${platform}-${arch}\n`;
    
    if (results.modules.rollup.loaded && results.modules.esbuild.loaded) {
      summary += '   - ✅ Both Rollup and ESBuild modules loaded successfully\n';
      summary += '   - Docker container has correct architecture modules\n';
    } else {
      summary += '   - ❌ Native module loading issues detected in Docker\n';
      summary += '   - Docker may need platform-specific build arguments\n';
    }
  } else {
    summary += '🔵 Running in local development environment:\n';
    summary += `   - Architecture: ${platform}-${arch}\n`;
    
    if (platform === 'darwin' && arch === 'arm64') {
      summary += '   - Running on Apple Silicon (M1/M2/M3)\n';
    }
    
    if (results.modules.rollup.loaded && results.modules.esbuild.loaded) {
      summary += '   - ✅ Both Rollup and ESBuild modules loaded successfully\n';
    } else {
      summary += '   - ❌ Native module loading issues detected locally\n';
    }
  }
  
  // Package lock analysis
  if (results.packageLock) {
    summary += '\n🔵 Package Lock Analysis:\n';
    
    if (results.packageLock.hasPlatformDeps) {
      summary += '   - ✅ package-lock.json contains platform-specific dependencies\n';
      
      if (results.packageLock.hasAllArchs) {
        summary += '   - ✅ All major architectures are represented in package-lock.json\n';
      } else {
        summary += '   - ❌ Some architectures are missing from package-lock.json\n';
        summary += '   - This indicates potential npm bug #4828 issues\n';
      }
    } else {
      summary += '   - ❌ No platform-specific dependencies found in package-lock.json\n';
      summary += '   - This strongly indicates npm bug #4828 is affecting your project\n';
    }
  }
  
  // Recommendations
  summary += '\n🔵 Recommendations:\n';
  
  if (!results.modules.rollup.loaded || !results.modules.esbuild.loaded) {
    summary += '   1. Run npm ci with platform-specific flags:\n';
    summary += '      npm ci --platform=<platform> --arch=<arch>\n';
    
    if (results.modules.rollup.npmBug4828) {
      summary += '   2. Explicitly install the missing native modules:\n';
      summary += `      npm install @rollup/rollup-${platform}-${arch} --no-save\n`;
      summary += '   3. Consider using a multi-stage build in Docker to fix this issue\n';
    }
  }
  
  if (!results.packageLock?.hasAllArchs) {
    summary += '   4. Regenerate package-lock.json with all architectures:\n';
    summary += '      - Delete node_modules and package-lock.json\n';
    summary += '      - Run npm install\n';
    summary += '      - Check if package-lock.json now contains all architectures\n';
  }
  
  if (isNetlify) {
    summary += '   5. For Netlify, add explicit dependency override in netlify.toml:\n';
    summary += '      [build.lifecycle]\n';
    summary += '      onPreDependencies = "npm install @rollup/rollup-linux-x64-gnu @esbuild/linux-x64 --no-save"\n';
  }
  
  // Record summary
  results.summary = summary;
  
  // Display the summary
  console.log('\n' + summary);
}

// Save results to file
function saveResults() {
  try {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
    log(`Results saved to ${OUTPUT_FILE}`, 'success');
  } catch (error) {
    log(`Error saving results: ${error.message}`, 'error');
  }
}

// Main function
async function main() {
  log('Starting architecture and native module test', 'info');
  
  // Run all tests
  detectEnvironment();
  testNativeModules();
  testModuleLoading();
  testPackageLock();
  summarizeFindings();
  saveResults();
  
  log('Test completed', 'success');
}

// Run the main function
main().catch(error => {
  log(`Unexpected error: ${error.message}`, 'error');
  process.exit(1);
});
