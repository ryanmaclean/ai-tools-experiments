/**
 * Datadog Synthetic Test Runner
 * 
 * This script runs Datadog synthetic tests for API, browser, visual regression,
 * performance, and security tests, reporting results to Datadog.
 */

const { execSync } = require('child_process');
const path = require('path');
const config = require('../tests/datadog-synthetic/config');

// Helper function to run tests
function runTests(type, env) {
  console.log(`Running ${type} tests for ${env} environment...`);
  
  try {
    const envUrl = config.locations[env].url;
    
    // Run tests with environment variables
    execSync(`DD_ENV=${env} DD_SITE=${envUrl} npm run test:${type}`, {
      stdio: 'inherit',
      env: {
        ...process.env,
        DD_ENV: env,
        DD_SITE: envUrl,
        NODE_ENV: env
      }
    });
    
    console.log(`✅ ${type} tests completed successfully for ${env}`);
    return true;
  } catch (error) {
    console.error(`❌ ${type} tests failed for ${env}:`, error);
    return false;
  }
}

// Helper function to report results to Datadog
function reportResults(type, env, success) {
  try {
    const metrics = {
      'synthetics.test.success': success ? 1 : 0,
      'synthetics.test.failure': success ? 0 : 1
    };
    
    // Report metrics to Datadog
    Object.entries(metrics).forEach(([metric, value]) => {
      execSync(`echo "${metric} ${value} #env:${env},type:${type}" | nc -u -w0 localhost 8125`);
    });
    
    console.log(`✅ Results reported to Datadog for ${type} tests in ${env}`);
  } catch (error) {
    console.error(`❌ Failed to report results to Datadog:`, error);
  }
}

// Main function
async function main() {
  const environments = ['test', 'production'];
  const testTypes = ['api', 'browser', 'visual', 'performance', 'security'];
  
  let allTestsPassed = true;
  
  // Run tests for each environment and type
  for (const env of environments) {
    for (const type of testTypes) {
      const success = runTests(type, env);
      reportResults(type, env, success);
      
      if (!success) {
        allTestsPassed = false;
      }
    }
  }
  
  // Exit with appropriate status code
  process.exit(allTestsPassed ? 0 : 1);
}

// Run the script
main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
}); 