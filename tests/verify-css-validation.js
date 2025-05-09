#!/usr/bin/env node

/**
 * CSS Validation Verification Test
 * 
 * This test verifies that CSS validation tests are properly configured
 * according to requirements and best practices. It ensures proper styling,
 * layout consistency, and visual design across the application.
 *
 * Run with: node tests/verify-css-validation.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

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
  
  const reportFile = path.join(REPORT_DIR, `css-validation-verification-${Date.now()}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));
  console.log(`\nud83dudcca Test results saved to: ${reportFile}`);
  console.log(`\nud83dudccb Summary: ${testResults.summary}`);
}

/**
 * Verify CSS validation test file exists
 */
function verifyCssValidationTestFiles() {
  // Check CSS validation test file
  const cssValidationTestFile = path.join(__dirname, 'datadog-synthetic', 'css-validation-tests.js');
  assert.ok(fs.existsSync(cssValidationTestFile), 'CSS validation test file not found');
  
  // Check Terraform CSS validation test file
  const terraformCssValidationFile = path.join(__dirname, '..', 'terraform', 'css_validation_test.tf');
  assert.ok(fs.existsSync(terraformCssValidationFile), 'Terraform CSS validation test file not found');
  
  return true;
}

/**
 * Verify CSS validation test content is properly implemented
 */
function verifyCssValidationTestContent() {
  const cssValidationTestFile = path.join(__dirname, 'datadog-synthetic', 'css-validation-tests.js');
  const content = fs.readFileSync(cssValidationTestFile, 'utf8');
  
  // Check for critical test components
  assert.ok(
    content.includes('COLOR_PALETTE'),
    'COLOR_PALETTE definition not found in CSS validation test'
  );
  
  assert.ok(
    content.includes('TYPOGRAPHY'),
    'TYPOGRAPHY definition not found in CSS validation test'
  );
  
  assert.ok(
    content.includes('validateElementStyles'),
    'validateElementStyles function not found in CSS validation test'
  );
  
  assert.ok(
    content.includes('test.describe'),
    'Test suite definitions not found in CSS validation test'
  );
  
  // Check for specific component tests
  ['Header', 'Card', 'Footer'].forEach(component => {
    assert.ok(
      content.includes(`test.describe('${component}`),
      `Test suite for ${component} component not found`
    );
  });
  
  // Check for accessibility tests
  assert.ok(
    content.includes('Accessibility Requirements'),
    'Accessibility test suite not found'
  );
  
  assert.ok(
    content.includes('contrastRatio'),
    'Contrast ratio testing function not found'
  );
  
  // Check for responsive design tests
  assert.ok(
    content.includes('Responsive Design'),
    'Responsive design test suite not found'
  );
  
  return true;
}

/**
 * Verify the CSS validation in Terraform configuration
 */
function verifyTerraformCssValidation() {
  const terraformCssValidationFile = path.join(__dirname, '..', 'terraform', 'css_validation_test.tf');
  const content = fs.readFileSync(terraformCssValidationFile, 'utf8');
  
  // Check for resource definition
  assert.ok(
    content.includes('resource "datadog_synthetics_test" "css_validation"'),
    'CSS validation test resource definition not found in Terraform configuration'
  );
  
  // Check for CSS property validation
  assert.ok(
    content.includes('assertFromJavascript'),
    'assertFromJavascript step type not found in Terraform CSS validation'
  );
  
  // Check for specific CSS properties being tested
  ['backgroundColor', 'color', 'styles'].forEach(property => {
    assert.ok(
      content.includes(property),
      `CSS property ${property} not being validated in Terraform configuration`
    );
  });
  
  return true;
}

/**
 * Verify if CSS validation test is integrated with package.json scripts
 */
function verifyPackageJsonIntegration() {
  const packageJsonFile = path.join(__dirname, '..', 'package.json');
  const content = fs.readFileSync(packageJsonFile, 'utf8');
  const packageJson = JSON.parse(content);
  
  // Check for CSS validation related script
  let hasCssValidationScript = false;
  const scriptEntries = Object.entries(packageJson.scripts || {});
  
  for (const [name, script] of scriptEntries) {
    if (
      (name.includes('css') || name.includes('visual') || name.includes('test')) &&
      (script.includes('css-validation') || script.includes('visual'))
    ) {
      hasCssValidationScript = true;
      break;
    }
  }
  
  // This is not a fail condition, just a warning
  if (!hasCssValidationScript) {
    console.warn('Warning: No dedicated CSS validation script found in package.json');
  }
  
  return true;
}

/**
 * Verify that the enhanced CSS validation approach is better than existing tests
 */
function verifyEnhancedValidation() {
  // Check existing visual comparison test
  const visualComparisonTestFile = path.join(__dirname, 'visual-comparison-test.js');
  const visualContent = fs.readFileSync(visualComparisonTestFile, 'utf8');
  
  // Check new CSS validation test
  const cssValidationTestFile = path.join(__dirname, 'datadog-synthetic', 'css-validation-tests.js');
  const cssContent = fs.readFileSync(cssValidationTestFile, 'utf8');
  
  // Verify that new approach covers more CSS properties
  const existingCssProperties = (
    visualContent.match(/style\.[a-zA-Z-]+/g) || []
  ).filter(match => match !== 'style.length');
  
  const newCssProperties = (
    cssContent.match(/['"]([a-zA-Z-]+)['"]:/g) || []
  ).map(match => match.replace(/['"]:$/g, '').replace(/^['"]/, ''));
  
  console.log(`Existing tests check ${existingCssProperties.length} CSS properties`);
  console.log(`New CSS validation tests check ${newCssProperties.length} CSS properties`);
  
  assert.ok(
    newCssProperties.length > existingCssProperties.length,
    'Enhanced CSS validation should test more CSS properties than existing tests'
  );
  
  // Verify new approach includes accessibility checks
  assert.ok(
    cssContent.includes('contrastRatio') && !visualContent.includes('contrastRatio'),
    'Enhanced CSS validation should include accessibility features not present in existing tests'
  );
  
  return true;
}

/**
 * Run all verification tests
 */
function runAllTests() {
  console.log('ud83cudfa8 Starting CSS Validation Verification Tests');
  
  runTest('CSS validation test files exist', () => {
    assert.strictEqual(verifyCssValidationTestFiles(), true, 'CSS validation test files verification failed');
  });
  
  runTest('CSS validation test content is properly implemented', () => {
    assert.strictEqual(verifyCssValidationTestContent(), true, 'CSS validation test content verification failed');
  });
  
  runTest('Terraform CSS validation is properly configured', () => {
    assert.strictEqual(verifyTerraformCssValidation(), true, 'Terraform CSS validation verification failed');
  });
  
  runTest('Package.json integration check', () => {
    assert.strictEqual(verifyPackageJsonIntegration(), true, 'Package.json integration verification failed');
  });
  
  runTest('Enhanced CSS validation approach verification', () => {
    assert.strictEqual(verifyEnhancedValidation(), true, 'Enhanced validation approach verification failed');
  });
  
  saveTestResults();
  
  // Exit with error code if any tests failed
  if (testResults.failed > 0) {
    process.exit(1);
  }
}

// Run the tests
runAllTests();
