#!/usr/bin/env node

/**
 * Dependency Alerts Verification Test
 * 
 * This test verifies that the Datadog monitors for native module dependency
 * failures in Netlify deployments are properly configured.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

// Import the monitor generator module
const monitorGenerator = require('../scripts/create-dependency-alerts');

// Configuration
const REPORT_DIR = path.join(__dirname, 'test-reports');
const CONFIG_DIR = path.join(__dirname, '..', 'datadog-config');

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
  
  const reportFile = path.join(REPORT_DIR, `dependency-alerts-verification-${Date.now()}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));
  console.log(`\nud83dudcca Test results saved to: ${reportFile}`);
  console.log(`\nud83dudccb Summary: ${testResults.summary}`);
}

/**
 * Verify required files exist
 */
function verifyFilesExist() {
  const requiredFiles = [
    { path: 'scripts/create-dependency-alerts.js', description: 'Dependency monitor creation script' }
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
 * Verify monitor generator implementation
 */
function verifyMonitorGeneratorImplementation() {
  // The file was imported at the top, so this will throw if there's a syntax error
  
  // Check exported functions
  assert.ok(
    typeof monitorGenerator.generateMonitorDefinitions === 'function',
    'generateMonitorDefinitions function should be exported'
  );
  
  assert.ok(
    typeof monitorGenerator.getExistingMonitors === 'function',
    'getExistingMonitors function should be exported'
  );
  
  assert.ok(
    typeof monitorGenerator.createOrUpdateMonitors === 'function',
    'createOrUpdateMonitors function should be exported'
  );
  
  return true;
}

/**
 * Verify monitor definitions
 */
function verifyMonitorDefinitions() {
  // Test the monitor generation function
  const monitors = monitorGenerator.generateMonitorDefinitions();
  
  // Verify monitor structure and content
  assert.ok(Array.isArray(monitors), 'Monitor definitions should be an array');
  assert.ok(monitors.length >= 2, 'There should be at least 2 monitor definitions');
  
  // Check that we have a generic native module monitor
  const genericMonitor = monitors.find(m => 
    m.name.includes('Native Module Dependency Failures')
  );
  assert.ok(genericMonitor, 'Generic native module dependency monitor should be defined');
  assert.strictEqual(genericMonitor.type, 'log alert', 'Monitor should be a log alert');
  assert.ok(genericMonitor.query.includes('native module'), 'Query should look for native module failures');
  assert.ok(genericMonitor.message.includes('@'), 'Monitor should include notification targets');
  
  // Check that we have at least one specific module monitor
  const specificMonitors = monitors.filter(m => 
    m.tags.some(tag => tag.startsWith('module:'))
  );
  assert.ok(specificMonitors.length > 0, 'Should have at least one specific module monitor');
  
  // Check we have a slow dependency installation monitor
  const slowInstallMonitor = monitors.find(m => 
    m.name.includes('Slow Dependency Installation')
  );
  assert.ok(slowInstallMonitor, 'Slow dependency installation monitor should be defined');
  assert.strictEqual(slowInstallMonitor.type, 'metric alert', 'Slow install monitor should be a metric alert');
  
  return true;
}

/**
 * Test monitor generation
 */
async function testMonitorGeneration() {
  // Only run if we have API keys (don't actually create monitors in CI environment)
  if (!process.env.DD_API_KEY || !process.env.DD_APP_KEY || process.env.SKIP_MONITOR_TEST === 'true') {
    console.log('Skipping monitor generation (no API keys or SKIP_MONITOR_TEST=true)');
    return true;
  }
  
  // Create config directory if it doesn't exist
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  
  // Generate monitor definitions and save to file for inspection
  const monitors = monitorGenerator.generateMonitorDefinitions();
  const monitorsJsonPath = path.join(CONFIG_DIR, 'test-dependency-monitors.json');
  fs.writeFileSync(monitorsJsonPath, JSON.stringify(monitors, null, 2));
  
  console.log(`Monitor definitions written to ${monitorsJsonPath} for inspection`);
  console.log('Not attempting to create actual monitors to avoid API calls');
  
  return true;
}

/**
 * Verify Datadog CLI usage
 */
function verifyDatadogCliUsage() {
  const scriptPath = path.join(__dirname, '..', 'scripts/create-dependency-alerts.js');
  const content = fs.readFileSync(scriptPath, 'utf8');
  
  // Check for key CLI usage patterns
  const cliPatterns = [
    { pattern: /datadog -v/, description: 'CLI version check' },
    { pattern: /datadog config set/, description: 'CLI configuration' },
    { pattern: /datadog monitors (create|update)/, description: 'CLI monitor creation/update' },
    { pattern: /datadog monitors list/, description: 'CLI monitor listing' }
  ];
  
  cliPatterns.forEach(pattern => {
    assert.ok(
      pattern.pattern.test(content),
      `Script should use Datadog CLI for ${pattern.description}`
    );
  });
  
  return true;
}

/**
 * Run all verification tests
 */
async function runAllTests() {
  console.log('ud83dudccb Starting Dependency Alerts Verification Tests');
  
  // Run synchronous tests first
  runTest('Required files exist', verifyFilesExist);
  runTest('Monitor generator implementation check', verifyMonitorGeneratorImplementation);
  runTest('Monitor definitions check', verifyMonitorDefinitions);
  runTest('Datadog CLI usage check', verifyDatadogCliUsage);
  
  // Run async tests
  await runAsyncTest('Monitor generation test', testMonitorGeneration);
  
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
