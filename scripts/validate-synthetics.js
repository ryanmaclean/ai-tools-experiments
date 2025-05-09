/**
 * Datadog Synthetic Tests Validator
 * 
 * This script validates and runs the synthetic tests defined in Terraform,
 * ensuring they are properly configured and working as expected across all environments.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const TERRAFORM_DIR = path.join(__dirname, '..', 'terraform');
const TEST_RESULTS_DIR = path.join(__dirname, '..', 'test-results', 'synthetics');
const ENVIRONMENTS = ['dev', 'tst', 'prd'];

// Helper function to run Terraform command
function runTerraform(command) {
  try {
    execSync(`cd ${TERRAFORM_DIR} && ${command}`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Terraform command failed: ${error.message}`);
    return false;
  }
}

// Helper function to validate test configuration
function validateTestConfig() {
  console.log('🔍 Validating synthetic test configuration...');
  
  // Check if Terraform files exist
  const syntheticsFile = path.join(TERRAFORM_DIR, 'datadog', 'synthetics.tf');
  if (!fs.existsSync(syntheticsFile)) {
    console.error('❌ synthetics.tf not found');
    return false;
  }
  
  // Validate Terraform configuration
  if (!runTerraform('terraform validate')) {
    return false;
  }
  
  console.log('✅ Test configuration is valid');
  return true;
}

// Helper function to run synthetic tests for an environment
function runSyntheticTestsForEnv(env) {
  console.log(`\n🚀 Running synthetic tests for ${env.toUpperCase()} environment...`);
  
  // Create environment-specific results directory
  const envResultsDir = path.join(TEST_RESULTS_DIR, env);
  if (!fs.existsSync(envResultsDir)) {
    fs.mkdirSync(envResultsDir, { recursive: true });
  }
  
  // Run tests for each type
  const testTypes = ['api', 'browser', 'visual', 'performance', 'security'];
  let allTestsPassed = true;
  
  for (const type of testTypes) {
    console.log(`\nRunning ${type} tests for ${env}...`);
    
    try {
      execSync(`DD_ENV=${env} DD_TEST_TYPE=${type} npm run test:synthetics`, {
        stdio: 'inherit',
        env: {
          ...process.env,
          DD_ENV: env,
          DD_TEST_TYPE: type,
          DD_TEST_RESULTS_DIR: envResultsDir
        }
      });
      
      console.log(`✅ ${type} tests completed successfully for ${env}`);
    } catch (error) {
      console.error(`❌ ${type} tests failed for ${env}:`, error.message);
      allTestsPassed = false;
    }
  }
  
  return allTestsPassed;
}

// Helper function to generate test report
function generateTestReport() {
  console.log('\n📊 Generating test report...');
  
  const reportFile = path.join(TEST_RESULTS_DIR, 'synthetic-test-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    results: {}
  };
  
  // Read test results for each environment and type
  for (const env of ENVIRONMENTS) {
    report.results[env] = {};
    const envResultsDir = path.join(TEST_RESULTS_DIR, env);
    
    if (fs.existsSync(envResultsDir)) {
      const testTypes = ['api', 'browser', 'visual', 'performance', 'security'];
      
      for (const type of testTypes) {
        const resultFile = path.join(envResultsDir, `${type}-results.json`);
        if (fs.existsSync(resultFile)) {
          report.results[env][type] = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
        }
      }
    }
  }
  
  // Write report
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`✅ Test report generated: ${reportFile}`);
}

// Main function
async function main() {
  console.log('🚀 Starting synthetic test validation...');
  
  // Validate configuration
  if (!validateTestConfig()) {
    console.error('❌ Test configuration validation failed');
    process.exit(1);
  }
  
  // Run tests for each environment
  let allEnvironmentsPassed = true;
  for (const env of ENVIRONMENTS) {
    const envPassed = runSyntheticTestsForEnv(env);
    if (!envPassed) {
      allEnvironmentsPassed = false;
    }
  }
  
  // Generate report
  generateTestReport();
  
  // Exit with appropriate status code
  process.exit(allEnvironmentsPassed ? 0 : 1);
}

// Run the script
main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
}); 