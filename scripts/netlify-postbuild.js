#!/usr/bin/env node

/**
 * Netlify Post-Build Verification Script
 * 
 * This script runs after the build to verify that all dependencies were installed correctly
 * and helps diagnose issues with the dependency_installation step.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const NETLIFY_BUILD_DIR = process.env.NETLIFY_BUILD_DIR || './';
const NODE_MODULES_DIR = path.join(NETLIFY_BUILD_DIR, 'node_modules');
const PACKAGE_JSON_PATH = path.join(NETLIFY_BUILD_DIR, 'package.json');

// ANSI colors for console output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
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
  }
  
  console.log(`${color}[${timestamp}] [NETLIFY-POSTBUILD] ${message}${COLORS.reset}`);
}

// Check if node_modules directory exists and has expected structure
function checkNodeModules() {
  log('Checking node_modules directory structure...');
  
  if (!fs.existsSync(NODE_MODULES_DIR)) {
    log(`node_modules directory not found at ${NODE_MODULES_DIR}`, 'error');
    return false;
  }

  // Count number of packages in node_modules
  const entries = fs.readdirSync(NODE_MODULES_DIR);
  log(`Found ${entries.length} entries in node_modules directory`);
  
  // Check for ARM64 modules that might cause issues
  const hasRollupArm64 = fs.existsSync(path.join(NODE_MODULES_DIR, '@rollup/rollup-linux-arm64-gnu'));
  const hasEsbuildArm64 = fs.existsSync(path.join(NODE_MODULES_DIR, '@esbuild/linux-arm64'));
  
  if (!hasRollupArm64) {
    log('Missing @rollup/rollup-linux-arm64-gnu module', 'warning');
  }
  
  if (!hasEsbuildArm64) {
    log('Missing @esbuild/linux-arm64 module', 'warning');
  }
  
  return entries.length > 10; // Basic check that we have a reasonable number of packages
}

// Check for native modules that might have platform-specific binaries
function checkNativeModules() {
  log('Checking native modules...');
  
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  const allDependencies = {
    ...packageJson.dependencies || {},
    ...packageJson.devDependencies || {}
  };
  
  const nativeModules = ['esbuild', 'node-sass', 'sharp', 'canvas', 'bcrypt', 'fsevents'];
  const installedNativeModules = nativeModules.filter(mod => allDependencies[mod]);
  
  if (installedNativeModules.length > 0) {
    log(`Found native modules: ${installedNativeModules.join(', ')}`, 'warning');
    log('Verifying native modules installation...');
    
    installedNativeModules.forEach(mod => {
      try {
        const modPath = path.join(NODE_MODULES_DIR, mod);
        if (fs.existsSync(modPath)) {
          log(`✅ ${mod} is installed correctly`, 'success');
        } else {
          log(`❌ ${mod} directory not found`, 'error');
        }
      } catch (error) {
        log(`Error checking ${mod}: ${error.message}`, 'error');
      }
    });
  } else {
    log('No known native modules found in dependencies', 'success');
  }
  
  return true;
}

// Run a diagnostic npm command to check dependency status
function runNpmDiagnostics() {
  log('Running npm diagnostics...');
  
  try {
    // Run npm ls --depth=0 to check top-level dependencies
    const npmLsOutput = execSync('npm ls --depth=0 --json', { encoding: 'utf8' });
    const npmLsResult = JSON.parse(npmLsOutput);
    
    // Check for problems
    const problems = npmLsResult.problems || [];
    if (problems.length > 0) {
      log(`Found ${problems.length} problems with dependencies`, 'warning');
      problems.forEach((problem, index) => {
        log(`Problem ${index + 1}: ${problem}`, 'warning');
      });
    } else {
      log('No dependency problems reported by npm', 'success');
    }
    
    return problems.length === 0;
  } catch (error) {
    log(`Error running npm diagnostics: ${error.message}`, 'error');
    return false;
  }
}

// Trigger Datadog synthetic tests using the Datadog CLI
async function triggerDatadogTests(success = true) {
  try {
    // Only run in production to avoid triggering tests in development
    if (process.env.CONTEXT !== 'production' && process.env.TRIGGER_TESTS_IN_DEV !== 'true') {
      log('Skipping Datadog test trigger in non-production environment', 'info');
      return true;
    }
    
    // Set environment variables needed by the trigger script
    process.env.DEPLOY_ID = process.env.DEPLOY_ID || `manual-${Date.now()}`;
    process.env.SITE_NAME = process.env.SITE_NAME || 'ai-tools-experiments';
    process.env.COMMIT_REF = process.env.COMMIT_REF || 'unknown';
    process.env.DEPLOY_SUCCESS = success ? 'true' : 'false';
    process.env.DEPLOY_TYPE = 'netlify';
    
    log('Triggering Datadog synthetic tests via CLI...', 'info');
    
    // Run the dedicated trigger script which uses Datadog CLI
    const triggerScriptPath = path.join(__dirname, 'trigger-datadog-tests.js');
    log(`Running trigger script: ${triggerScriptPath}`, 'info');
    
    // Execute the trigger script and inherit stdio to see real-time output
    execSync(`node ${triggerScriptPath}`, { stdio: 'inherit' });
    
    log('Datadog tests triggered successfully', 'success');
    return true;
  } catch (error) {
    log(`Error triggering Datadog tests: ${error.message}`, 'error');
    // If error contains specific pattern, it might be successful even with non-zero exit code
    if (error.message && error.message.includes('successfully triggered')) {
      log('Considering test triggered successfully despite error', 'warning');
      return true;
    }
    return false;
  }
}

// Main function
async function main() {
  log('Starting post-build verification...');
  
  try {
    // Write build info for debugging
    log(`Build environment: ${process.env.NODE_ENV || 'unknown'}`);
    log(`Netlify context: ${process.env.CONTEXT || 'unknown'}`);
    log(`Branch: ${process.env.BRANCH || 'unknown'}`);
    log(`Deploy ID: ${process.env.DEPLOY_ID || 'unknown'}`);
    
    // Run checks
    const nodeModulesOk = checkNodeModules();
    const nativeModulesOk = checkNativeModules();
    const npmDiagnosticsOk = runNpmDiagnostics();
    
    // Determine overall build success
    const buildSuccess = nodeModulesOk && npmDiagnosticsOk;
    
    // Trigger Datadog tests based on build success
    await triggerDatadogTests(buildSuccess);
    
    // Final report
    if (buildSuccess) {
      log('Post-build verification completed successfully', 'success');
      process.exit(0);
    } else {
      log('Post-build verification found issues', 'error');
      log('This might cause problems with the dependency_installation step in future builds', 'warning');
      // Exit with non-zero code to indicate problems, but won't fail the build at this stage
      process.exit(1);
    }
  } catch (error) {
    log(`Unexpected error during post-build verification: ${error.message}`, 'error');
    // Try to trigger Datadog tests with failure status
    await triggerDatadogTests(false);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});
