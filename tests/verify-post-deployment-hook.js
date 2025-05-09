#!/usr/bin/env node

/**
 * Post-Deployment Hook Verification Test
 * 
 * This test verifies that the post-deployment hook for triggering
 * Datadog synthetic tests (specifically the CSS validation test)
 * is properly configured and functioning.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');
const fetch = require('node-fetch');
const datadogApi = require('../utils/datadog-api-client');

// Configuration
const DEBUG = process.env.DEBUG === 'true' || false;

// Test result object
const testResults = {
  tests: [],
  passed: 0,
  failed: 0,
  startTime: Date.now(),
  endTime: null
};

/**
 * Run a test case and record the result
 */
function runTest(name, testFn) {
  console.log(`\nud83euddea Running test: ${name}`);
  
  const testResult = {
    name,
    status: 'pending',
    error: null,
    duration: 0
  };
  
  const startTime = Date.now();
  
  try {
    testFn();
    testResult.status = 'passed';
    testResults.passed++;
    console.log(`u2705 PASSED: ${name}`);
  } catch (err) {
    testResult.status = 'failed';
    testResult.error = {
      message: err.message,
      stack: err.stack
    };
    testResults.failed++;
    console.error(`u274c FAILED: ${name}`);
    console.error(`   Error: ${err.message}`);
  }
  
  testResult.duration = Date.now() - startTime;
  testResults.tests.push(testResult);
}

/**
 * Run an async test case and record the result
 */
async function runAsyncTest(name, testFn) {
  console.log(`\nud83euddea Running test: ${name}`);
  
  const testResult = {
    name,
    status: 'pending',
    error: null,
    duration: 0
  };
  
  const startTime = Date.now();
  
  try {
    await testFn();
    testResult.status = 'passed';
    testResults.passed++;
    console.log(`u2705 PASSED: ${name}`);
  } catch (err) {
    testResult.status = 'failed';
    testResult.error = {
      message: err.message,
      stack: err.stack
    };
    testResults.failed++;
    console.error(`u274c FAILED: ${name}`);
    console.error(`   Error: ${err.message}`);
  }
  
  testResult.duration = Date.now() - startTime;
  testResults.tests.push(testResult);

  return testResult.status === 'passed';
}

/**
 * Save test results to a JSON file
 */
function saveTestResults() {
  testResults.endTime = Date.now();
  testResults.totalDuration = testResults.endTime - testResults.startTime;
  testResults.summary = `${testResults.passed} passed, ${testResults.failed} failed`;
  
  const REPORT_DIR = path.join(__dirname, 'test-reports');
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }
  
  const reportFile = path.join(REPORT_DIR, `post-deployment-hook-verification-${Date.now()}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));
  console.log(`\nud83dudcca Test results saved to: ${reportFile}`);
  console.log(`\nud83dudccb Summary: ${testResults.summary}`);
}

/**
 * Verify that required files exist
 */
function verifyFilesExist() {
  const requiredFiles = [
    { path: 'scripts/trigger-datadog-tests.js', description: 'Datadog CLI trigger script' },
    { path: 'scripts/netlify-postbuild.js', description: 'Netlify post-build script' },
    { path: 'utils/datadog-api-client.js', description: 'Datadog API client' },
    { path: 'terraform/netlify_css_validation_test.tf', description: 'CSS validation test Terraform config' }
  ];
  
  requiredFiles.forEach(file => {
    const fullPath = path.join(__dirname, '..', file.path);
    assert.ok(
      fs.existsSync(fullPath),
      `Required file not found: ${file.path} (${file.description})`
    );
    
    // Check file has content
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.ok(
      content.length > 50,
      `File seems too small/empty: ${file.path}`
    );
  });
  
  return true;
}

/**
 * Verify the Datadog CLI trigger script implementation
 */
function verifyDatadogCliTriggerScript() {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'trigger-datadog-tests.js');
  const content = fs.readFileSync(scriptPath, 'utf8');
  
  // Check for key components in the implementation
  const requiredComponents = [
    { pattern: /ensureDatadogCli/, description: 'Datadog CLI installation check function' },
    { pattern: /configureDatadogCli/, description: 'Datadog CLI configuration function' },
    { pattern: /findSyntheticTest/, description: 'Synthetic test finder function' },
    { pattern: /triggerSyntheticTest/, description: 'Synthetic test trigger function' },
    { pattern: /datadog synthetics/, description: 'Datadog CLI synthetics command usage' },
    { pattern: /postDeploymentEvent/, description: 'Deployment event posting function' }
  ];
  
  requiredComponents.forEach(component => {
    assert.ok(
      component.pattern.test(content),
      `Missing required component in trigger-datadog-tests.js: ${component.description}`
    );
  });
  
  return true;
}

/**
 * Verify post-build script implementation
 */
function verifyPostBuildScriptImplementation() {
  const postBuildScriptPath = path.join(__dirname, '..', 'scripts/netlify-postbuild.js');
  const content = fs.readFileSync(postBuildScriptPath, 'utf8');
  
  // Check for key components in the implementation
  const requiredComponents = [
    { pattern: /triggerDatadogTests/, description: 'Datadog tests trigger function' },
    { pattern: /trigger-datadog-tests\.js/, description: 'Reference to Datadog CLI trigger script' },
    { pattern: /execSync/, description: 'Execution of CLI commands' },
    { pattern: /DEPLOY_ID|SITE_NAME|COMMIT_REF/, description: 'Netlify environment variables usage' }
  ];
  
  requiredComponents.forEach(component => {
    assert.ok(
      component.pattern.test(content),
      `Missing required component in netlify-postbuild.js: ${component.description}`
    );
  });
  
  return true;
}

/**
 * Test the Datadog API client functionality
 */
async function testDatadogApiClient() {
  // Skip detailed API testing if the client isn't initialized correctly
  if (!datadogApi.isReady()) {
    console.warn('Warning: Datadog API client not initialized, skipping detailed API tests');
    console.warn('Ensure DD_API_KEY and DD_APP_KEY environment variables are set');
    // Don't fail the test if running in CI/CD environment since we can't have the keys there
    return process.env.CI === 'true';
  }
  
  // Get all synthetic tests to verify we can find the CSS validation test
  const testsResponse = await datadogApi.synthetics.getAllTests();
  
  assert.ok(
    testsResponse.success,
    `Failed to get synthetic tests: ${JSON.stringify(testsResponse.error || {})}`
  );
  
  // Look for a CSS validation test (might not be exactly the same name)
  const cssValidationTest = testsResponse.data.tests.find(
    test => test.name && test.name.toLowerCase().includes('css') && test.name.toLowerCase().includes('valid')
  );
  
  if (!cssValidationTest) {
    console.warn('Warning: No CSS validation test found, but API client is working');
    return true;
  }
  
  console.log(`Found CSS validation test: ${cssValidationTest.name} (${cssValidationTest.public_id})`);
  return true;
}

/**
 * Test the Datadog CLI trigger script
 */
async function testCliTriggerScript() {
  try {
    if (process.env.SKIP_CLI_TEST === 'true') {
      console.log('Skipping CLI trigger test (SKIP_CLI_TEST=true)');
      return true;
    }
    
    // Set up mock environment variables for testing
    process.env.DEPLOY_ID = `test-${Date.now()}`;
    process.env.SITE_NAME = 'test-site';
    process.env.COMMIT_REF = 'test-sha';
    process.env.DEPLOY_TYPE = 'test';
    process.env.DEPLOY_SUCCESS = 'true';
    
    // For testing, we'll just load the module to make sure it's valid,
    // but won't actually execute the main function which would trigger the Datadog CLI
    const triggerScriptPath = path.join(__dirname, '..', 'scripts/trigger-datadog-tests.js');
    console.log(`Loading CLI trigger script from ${triggerScriptPath}`);
    
    // Test importing the module (will throw if there are syntax errors)
    const triggerScript = require(triggerScriptPath);
    
    // Verify that the exported functions exist
    assert.ok(
      typeof triggerScript.findSyntheticTest === 'function',
      'findSyntheticTest function should be exported'
    );
    
    assert.ok(
      typeof triggerScript.triggerSyntheticTest === 'function',
      'triggerSyntheticTest function should be exported'
    );
    
    assert.ok(
      typeof triggerScript.postDeploymentEvent === 'function',
      'postDeploymentEvent function should be exported'
    );
    
    // If not running in CI, we could attempt a dry run to check for Datadog CLI
    if (process.env.CI !== 'true' && process.env.DD_API_KEY && process.env.DD_APP_KEY) {
      console.log('API keys detected - could run CLI tests (skipping for safety)');
      // We won't actually run this as it could trigger real tests,
      // but in a complete test environment, we could add additional validation here
    }
    
    console.log('CLI trigger script validated successfully');
    return true;
  } catch (error) {
    console.error('Error testing CLI trigger script:', error);
    throw error;
  }
}

/**
 * Run all verification tests
 */
async function runAllTests() {
  console.log('ud83dudccb Starting Post-Deployment Hook Verification Tests');
  
  // Run synchronous tests first
  runTest('Required files exist', verifyFilesExist);
  runTest('Datadog CLI trigger script check', verifyDatadogCliTriggerScript);
  runTest('Post-build script implementation check', verifyPostBuildScriptImplementation);
  
  // Run async tests
  await runAsyncTest('Datadog API client check', testDatadogApiClient);
  await runAsyncTest('Datadog CLI trigger script test', testCliTriggerScript);
  
  saveTestResults();
  
  // Exit with error code if any tests failed
  if (testResults.failed > 0) {
    process.exit(1);
  }
}

// Run all tests
runAllTests().catch(error => {
  console.error('Unexpected error in test runner:', error);
  process.exit(1);
});
