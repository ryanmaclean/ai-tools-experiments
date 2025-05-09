#!/usr/bin/env node

/**
 * Deployment Dashboard Verification Test
 * 
 * This test verifies that the Datadog deployment metrics dashboard
 * is properly configured and can be created/updated.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

// Import the dashboard generator module
const dashboardGenerator = require('../scripts/create-deployment-dashboard');

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
  
  const reportFile = path.join(REPORT_DIR, `deployment-dashboard-verification-${Date.now()}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));
  console.log(`\nud83dudcca Test results saved to: ${reportFile}`);
  console.log(`\nud83dudccb Summary: ${testResults.summary}`);
}

/**
 * Verify required files exist
 */
function verifyFilesExist() {
  const requiredFiles = [
    { path: 'scripts/create-deployment-dashboard.js', description: 'Dashboard creation script' },
    { path: 'terraform/deployment_dashboard.tf', description: 'Dashboard Terraform configuration' },
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
 * Verify dashboard generator implementation
 */
function verifyDashboardGeneratorImplementation() {
  // The file was imported at the top, so this will throw if there's a syntax error
  
  // Check exported functions
  assert.ok(
    typeof dashboardGenerator.generateDashboardJson === 'function',
    'generateDashboardJson function should be exported'
  );
  
  assert.ok(
    typeof dashboardGenerator.getExistingDashboard === 'function',
    'getExistingDashboard function should be exported'
  );
  
  assert.ok(
    typeof dashboardGenerator.createOrUpdateDashboard === 'function',
    'createOrUpdateDashboard function should be exported'
  );
  
  // Test the dashboard generation function
  const dashboard = dashboardGenerator.generateDashboardJson();
  
  // Verify dashboard structure
  assert.ok(dashboard.title, 'Dashboard should have a title');
  assert.ok(dashboard.description, 'Dashboard should have a description');
  assert.ok(Array.isArray(dashboard.widgets), 'Dashboard should have an array of widgets');
  assert.ok(dashboard.widgets.length >= 5, 'Dashboard should have at least 5 widgets');
  
  // Verify widget types
  const widgetTypes = dashboard.widgets.map(w => 
    w.definition.type || Object.keys(w.definition)[0]
  );
  
  assert.ok(
    widgetTypes.includes('note') || widgetTypes.includes('note_definition'),
    'Dashboard should include a title widget'
  );
  
  assert.ok(
    widgetTypes.includes('query_value') || widgetTypes.includes('query_value_definition'),
    'Dashboard should include a query value widget'
  );
  
  assert.ok(
    widgetTypes.includes('timeseries') || widgetTypes.includes('timeseries_definition'),
    'Dashboard should include a timeseries widget'
  );
  
  return true;
}

/**
 * Verify Terraform configuration
 */
function verifyTerraformConfiguration() {
  const terraformPath = path.join(__dirname, '..', 'terraform/deployment_dashboard.tf');
  const content = fs.readFileSync(terraformPath, 'utf8');
  
  // Check for required components in the Terraform file
  const requiredComponents = [
    { pattern: /resource\s+"datadog_dashboard"\s+"deployment_metrics"/, description: 'Dashboard resource definition' },
    { pattern: /title\s+=\s+"Netlify Deployment Metrics"/, description: 'Dashboard title' },
    { pattern: /widget\s+{/, description: 'Widget definitions' },
    { pattern: /timeseries_definition/, description: 'Timeseries widget' },
    { pattern: /query_value_definition/, description: 'Query value widget' },
    { pattern: /list_stream_definition/, description: 'List stream widget' },
    { pattern: /variable\s+"site_name"/, description: 'Site name variable' },
    { pattern: /variable\s+"environment"/, description: 'Environment variable' }
  ];
  
  requiredComponents.forEach(component => {
    assert.ok(
      component.pattern.test(content),
      `Missing required component in Terraform configuration: ${component.description}`
    );
  });
  
  return true;
}

/**
 * Test dashboard generation
 */
async function testDashboardGeneration() {
  // Only run if we have API keys (don't actually create dashboard in CI environment)
  if (!process.env.DD_API_KEY || !process.env.DD_APP_KEY || process.env.SKIP_DASHBOARD_TEST === 'true') {
    console.log('Skipping dashboard generation (no API keys or SKIP_DASHBOARD_TEST=true)');
    return true;
  }
  
  // Create config directory if it doesn't exist
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  
  // Generate dashboard JSON and save to file for inspection
  const dashboard = dashboardGenerator.generateDashboardJson();
  const dashboardJsonPath = path.join(CONFIG_DIR, 'test-dashboard.json');
  fs.writeFileSync(dashboardJsonPath, JSON.stringify(dashboard, null, 2));
  
  console.log(`Dashboard JSON written to ${dashboardJsonPath} for inspection`);
  console.log('Not attempting to create actual dashboard to avoid API calls');
  
  return true;
}

/**
 * Run all verification tests
 */
async function runAllTests() {
  console.log('ud83dudccb Starting Deployment Dashboard Verification Tests');
  
  // Run synchronous tests first
  runTest('Required files exist', verifyFilesExist);
  runTest('Dashboard generator implementation check', verifyDashboardGeneratorImplementation);
  runTest('Terraform configuration check', verifyTerraformConfiguration);
  
  // Run async tests
  await runAsyncTest('Dashboard generation test', testDashboardGeneration);
  
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
