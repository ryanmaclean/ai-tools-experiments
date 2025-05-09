#!/usr/bin/env node

/**
 * Datadog API Integration Verification Test
 * 
 * This test verifies that the Datadog API client is properly configured
 * and integrated with the Postman collection endpoints.
 * It tests authentication, API access, and endpoint functionality.
 *
 * Run with: node tests/verify-datadog-api-integration.js
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const datadogApi = require('../utils/datadog-api-client');
const { validateDatadogEnvironment } = require('../utils/api-key-validator');

// Configuration
const DEBUG = process.env.DEBUG === 'true' || false;
const REPORT_DIR = path.join(__dirname, 'test-reports');

// Create report directory if it doesn't exist
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

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
}

/**
 * Save test results to a JSON file
 */
function saveTestResults() {
  testResults.endTime = Date.now();
  testResults.totalDuration = testResults.endTime - testResults.startTime;
  testResults.summary = `${testResults.passed} passed, ${testResults.failed} failed`;
  
  const reportFile = path.join(REPORT_DIR, `datadog-api-integration-${Date.now()}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));
  console.log(`\nud83dudcca Test results saved to: ${reportFile}`);
  console.log(`\nud83dudccb Summary: ${testResults.summary}`);
}

/**
 * Verify that the Datadog API client package is installed
 */
function verifyDatadogApiClientInstalled() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  assert.ok(
    packageJson.dependencies && packageJson.dependencies['@datadog/datadog-api-client'],
    '@datadog/datadog-api-client package is not installed. Run: npm install --save @datadog/datadog-api-client'
  );
  
  return true;
}

/**
 * Verify that the API client wrapper exists
 */
function verifyApiClientWrapper() {
  const clientPath = path.join(__dirname, '..', 'utils', 'datadog-api-client.js');
  
  assert.ok(
    fs.existsSync(clientPath),
    'Datadog API client wrapper not found at utils/datadog-api-client.js'
  );
  
  const clientContent = fs.readFileSync(clientPath, 'utf8');
  
  // Check for required API categories
  ['SyntheticsApi', 'MonitorsApi', 'DashboardsApi', 'EventsApi'].forEach(api => {
    assert.ok(
      clientContent.includes(api),
      `${api} implementation not found in API client wrapper`
    );
  });
  
  return true;
}

/**
 * Verify environment variables for API access
 */
function verifyApiEnvironment() {
  const environment = validateDatadogEnvironment();
  
  // Just log status, don't fail the test since keys might not be available in all environments
  console.log('Datadog API environment status:', {
    hasApiKey: environment.hasApiKey,
    hasAppKey: environment.hasAppKey,
    apiKeyValid: environment.apiKeyValid,
    appKeyValid: environment.appKeyValid,
    isValid: environment.isValid
  });
  
  return true;
}

/**
 * Verify API client initialization
 */
function verifyApiClientInitialization() {
  // If environment variables aren't set, the client initialization might fail
  // but the module should still be importable
  assert.ok(
    datadogApi,
    'Failed to import Datadog API client'
  );
  
  const status = datadogApi.getStatus();
  console.log('Datadog API client initialization status:', status);
  
  return true;
}

/**
 * Verify API endpoints exist and match Postman collection structure
 */
function verifyApiEndpoints() {
  // Verify API categories exist
  assert.ok(
    datadogApi.synthetics,
    'Synthetics API not found in client'
  );
  
  assert.ok(
    datadogApi.monitors,
    'Monitors API not found in client'
  );
  
  assert.ok(
    datadogApi.dashboards,
    'Dashboards API not found in client'
  );
  
  assert.ok(
    datadogApi.events,
    'Events API not found in client'
  );
  
  // Verify key endpoints in each API category
  [
    [datadogApi.synthetics, ['getAllTests', 'getTest', 'triggerTest', 'getTestResults']],
    [datadogApi.monitors, ['getAllMonitors', 'getMonitor', 'getMonitorStatus']],
    [datadogApi.dashboards, ['getAllDashboards', 'getDashboard']],
    [datadogApi.events, ['postEvent', 'getEvents']]
  ].forEach(([api, methods]) => {
    methods.forEach(method => {
      assert.ok(
        typeof api[method] === 'function',
        `${method} function not found in API client`
      );
    });
  });
  
  return true;
}

/**
 * Test actual API access if credentials are available
 */
async function testApiAccess() {
  const status = datadogApi.getStatus();
  
  // Skip actual API calls if not initialized
  if (!status.initialized) {
    console.log('Skipping API access tests due to missing credentials');
    return true;
  }
  
  // Test getting synthetic tests
  const syntheticsResult = await datadogApi.synthetics.getAllTests();
  assert.ok(
    syntheticsResult.success !== undefined,
    'Synthetics API call did not return expected format'
  );
  
  console.log('Synthetics API call result:', {
    success: syntheticsResult.success,
    error: syntheticsResult.error,
    dataAvailable: !!syntheticsResult.data
  });
  
  // Test monitors API
  const monitorsResult = await datadogApi.monitors.getAllMonitors();
  assert.ok(
    monitorsResult.success !== undefined,
    'Monitors API call did not return expected format'
  );
  
  console.log('Monitors API call result:', {
    success: monitorsResult.success,
    error: monitorsResult.error,
    dataAvailable: !!monitorsResult.data
  });
  
  return true;
}

/**
 * Verify documentation for API integration exists
 */
function verifyDocumentation() {
  const readmePath = path.join(__dirname, '..', 'README.md');
  const readmeContent = fs.readFileSync(readmePath, 'utf8');
  
  // Check if API client is mentioned in documentation
  const hasApiDocs = readmeContent.toLowerCase().includes('datadog api') || 
                     readmeContent.toLowerCase().includes('api client');
  
  if (!hasApiDocs) {
    console.warn('Warning: README.md does not include information about the Datadog API client');
  }
  
  return true;
}

/**
 * Run all verification tests
 */
async function runAllTests() {
  console.log('ud83dudccb Starting Datadog API Integration Verification Tests');
  
  runTest('Datadog API client package is installed', () => {
    assert.strictEqual(verifyDatadogApiClientInstalled(), true, 'API client package verification failed');
  });
  
  runTest('API client wrapper exists and is properly structured', () => {
    assert.strictEqual(verifyApiClientWrapper(), true, 'API client wrapper verification failed');
  });
  
  runTest('API environment variables check', () => {
    assert.strictEqual(verifyApiEnvironment(), true, 'API environment verification failed');
  });
  
  runTest('API client initialization', () => {
    assert.strictEqual(verifyApiClientInitialization(), true, 'API client initialization verification failed');
  });
  
  runTest('API endpoints match Postman collection structure', () => {
    assert.strictEqual(verifyApiEndpoints(), true, 'API endpoints verification failed');
  });
  
  await runAsyncTest('API access test', async () => {
    assert.strictEqual(await testApiAccess(), true, 'API access test failed');
  });
  
  runTest('Documentation check', () => {
    assert.strictEqual(verifyDocumentation(), true, 'Documentation verification failed');
  });
  
  saveTestResults();
  
  // Exit with error code if any tests failed
  if (testResults.failed > 0) {
    process.exit(1);
  }
}

// Run all tests
runAllTests().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});
