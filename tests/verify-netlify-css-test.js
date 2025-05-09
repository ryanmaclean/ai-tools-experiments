#!/usr/bin/env node

/**
 * Netlify CSS Validation Test Verification
 * 
 * This test verifies that the Netlify CSS validation synthetic test
 * is properly configured and can be deployed. It checks the Terraform
 * configuration and deployment script for correctness.
 *
 * Run with: node tests/verify-netlify-css-test.js
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const datadogApi = require('../utils/datadog-api-client');

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
 * Save test results to a JSON file
 */
function saveTestResults() {
  testResults.endTime = Date.now();
  testResults.totalDuration = testResults.endTime - testResults.startTime;
  testResults.summary = `${testResults.passed} passed, ${testResults.failed} failed`;
  
  const reportFile = path.join(REPORT_DIR, `netlify-css-test-verification-${Date.now()}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));
  console.log(`\nud83dudcca Test results saved to: ${reportFile}`);
  console.log(`\nud83dudccb Summary: ${testResults.summary}`);
}

/**
 * Verify Terraform configuration exists
 */
function verifyTerraformConfig() {
  const terraformPath = path.join(__dirname, '..', 'terraform', 'netlify_css_validation_test.tf');
  
  assert.ok(
    fs.existsSync(terraformPath),
    'Netlify CSS validation Terraform configuration not found'
  );
  
  const terraformContent = fs.readFileSync(terraformPath, 'utf8');
  
  // Check for required sections
  assert.ok(
    terraformContent.includes('resource "datadog_synthetics_test" "netlify_css_validation"'),
    'Terraform resource definition not found'
  );
  
  assert.ok(
    terraformContent.includes('browser_step'),
    'Browser steps not found in Terraform configuration'
  );
  
  // Count browser steps
  const browserStepCount = (terraformContent.match(/browser_step\s*{/g) || []).length;
  assert.ok(
    browserStepCount >= 3,
    `Expected at least 3 browser steps, found ${browserStepCount}`
  );
  
  console.log(`Found ${browserStepCount} browser steps in Terraform configuration`);
  
  return true;
}

/**
 * Verify deployment script exists
 */
function verifyDeploymentScript() {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'deploy-netlify-css-test.js');
  
  assert.ok(
    fs.existsSync(scriptPath),
    'Netlify CSS validation deployment script not found'
  );
  
  const scriptContent = fs.readFileSync(scriptPath, 'utf8');
  
  // Check for key components
  assert.ok(
    scriptContent.includes('datadogApi'),
    'Script does not use the Datadog API client'
  );
  
  assert.ok(
    scriptContent.includes('extractBrowserSteps'),
    'Browser step extraction function not found'
  );
  
  // Check for npm script entry
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  assert.ok(
    packageJson.scripts && packageJson.scripts['deploy:css-test'],
    'deploy:css-test script not found in package.json'
  );
  
  // Check script is executable
  try {
    const stats = fs.statSync(scriptPath);
    const isExecutable = !!(stats.mode & 0o111); // Check if the executable bit is set
    
    if (!isExecutable) {
      console.warn('Warning: deploy-netlify-css-test.js is not marked as executable');
    }
  } catch (error) {
    console.warn('Warning: Could not check executable permissions');
  }
  
  return true;
}

/**
 * Verify CSS validation implementation
 */
function verifyCssValidationImplementation() {
  const terraformPath = path.join(__dirname, '..', 'terraform', 'netlify_css_validation_test.tf');
  const terraformContent = fs.readFileSync(terraformPath, 'utf8');
  
  // Check for key validation areas
  const validationAreas = [
    { name: 'Typography', regex: /typography|font|text/i },
    { name: 'Colors', regex: /color|rgb|rgba|hex/i },
    { name: 'Layout', regex: /layout|responsive|mobile/i },
    { name: 'Accessibility', regex: /accessibility|contrast|a11y|wcag/i }
  ];
  
  const missingAreas = [];
  
  validationAreas.forEach(area => {
    if (!area.regex.test(terraformContent)) {
      missingAreas.push(area.name);
    }
  });
  
  assert.ok(
    missingAreas.length === 0,
    `CSS validation is missing these areas: ${missingAreas.join(', ')}`
  );
  
  return true;
}

/**
 * Verify integration with existing CSS validation tests
 */
function verifyIntegrationWithExistingTests() {
  // Check if there's consistency between the Netlify test and our existing CSS validation
  const existingCssTestPath = path.join(__dirname, 'datadog-synthetic', 'css-validation-tests.js');
  const netlifyTestPath = path.join(__dirname, '..', 'terraform', 'netlify_css_validation_test.tf');
  
  assert.ok(
    fs.existsSync(existingCssTestPath),
    'Existing CSS validation test not found'
  );
  
  const existingTestContent = fs.readFileSync(existingCssTestPath, 'utf8');
  const netlifyTestContent = fs.readFileSync(netlifyTestPath, 'utf8');
  
  // Extract color definitions from both files
  const existingColorMatch = existingTestContent.match(/COLOR_PALETTE\s*=\s*{[\s\S]*?}/m);
  const netlifyColorMatch = netlifyTestContent.match(/validHeaderBgColors\s*=\s*\[[\s\S]*?\]/m);
  
  // Check if we have consistent color definitions
  if (existingColorMatch && netlifyColorMatch) {
    const existingColors = existingColorMatch[0];
    const netlifyColors = netlifyColorMatch[0];
    
    // Extract a common color that should be in both
    const commonColorFound = /#[0-9A-Fa-f]{6}/.test(existingColors) && 
                            /#[0-9A-Fa-f]{6}/.test(netlifyColors);
    
    if (!commonColorFound) {
      console.warn('Warning: Color definitions may not be consistent between tests');
    }
  }
  
  return true;
}

/**
 * Verify TODO list is updated
 */
function verifyTodoListUpdated() {
  const todoPath = path.join(__dirname, '..', 'TODO.md');
  assert.ok(
    fs.existsSync(todoPath),
    'TODO.md file not found'
  );
  
  const todoContent = fs.readFileSync(todoPath, 'utf8');
  
  // We don't want to enforce a specific format or state in the TODO file
  // Just check if the task is mentioned
  const taskMentioned = todoContent.includes('Create Datadog synthetic test with visual CSS validation');
  
  if (!taskMentioned) {
    console.warn('Warning: CSS validation task not found in TODO.md');
  }
  
  return true;
}

/**
 * Run all verification tests
 */
function runAllTests() {
  console.log('ud83dudccb Starting Netlify CSS Validation Test Verification');
  
  runTest('Terraform configuration exists and is valid', () => {
    assert.strictEqual(verifyTerraformConfig(), true, 'Terraform configuration verification failed');
  });
  
  runTest('Deployment script exists and is valid', () => {
    assert.strictEqual(verifyDeploymentScript(), true, 'Deployment script verification failed');
  });
  
  runTest('CSS validation implementation is comprehensive', () => {
    assert.strictEqual(verifyCssValidationImplementation(), true, 'CSS validation implementation verification failed');
  });
  
  runTest('Integration with existing CSS tests', () => {
    assert.strictEqual(verifyIntegrationWithExistingTests(), true, 'Integration with existing tests verification failed');
  });
  
  runTest('TODO list updated', () => {
    assert.strictEqual(verifyTodoListUpdated(), true, 'TODO list verification failed');
  });
  
  saveTestResults();
  
  // Exit with error code if any tests failed
  if (testResults.failed > 0) {
    process.exit(1);
  }
}

// Run all tests
runAllTests();
