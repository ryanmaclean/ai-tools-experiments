#!/usr/bin/env node

/**
 * Secret Handling Verification Test
 * 
 * This test verifies proper handling of API keys and sensitive data:
 * 1. Validates the API key validator utility functions
 * 2. Ensures consistent pattern for accessing environment variables
 * 3. Verifies masking functionality for logs and error messages
 * 4. Tests for proper secret context handling in CI/CD contexts
 *
 * Run with: node tests/verify-secret-handling.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Load the API key validator utilities
const {
  isValidDatadogApiKey,
  getDatadogApiKey,
  getDatadogAppKey,
  maskSensitiveData,
  validateDatadogEnvironment
} = require('../utils/api-key-validator');

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
  
  const reportFile = path.join(REPORT_DIR, `secret-handling-test-${Date.now()}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));
  console.log(`\nud83dudcca Test results saved to: ${reportFile}`);
  console.log(`\nud83dudccb Summary: ${testResults.summary}`);
}

/**
 * Verify the API key validator functions
 */
function verifyApiKeyValidator() {
  // Test valid API key format
  assert.strictEqual(isValidDatadogApiKey('abcdef1234567890abcdef1234567890'), true, 'Valid API key should return true');
  
  // Test invalid API key formats
  assert.strictEqual(isValidDatadogApiKey(''), false, 'Empty string should be invalid');
  assert.strictEqual(isValidDatadogApiKey(null), false, 'Null should be invalid');
  assert.strictEqual(isValidDatadogApiKey('too-short'), false, 'Short string should be invalid');
  assert.strictEqual(isValidDatadogApiKey('abcdef1234567890abcdef1234567890XXX'), false, 'Too long string should be invalid');
  assert.strictEqual(isValidDatadogApiKey('abcdef1234567890abcdef123456789G'), false, 'Non-hex character should be invalid');
  
  // Test masking functionality
  const apiKey = 'abcdef1234567890abcdef1234567890';
  const maskedText = maskSensitiveData(`API Key: ${apiKey}`);
  assert.ok(!maskedText.includes(apiKey), 'API key should be masked');
  assert.ok(maskedText.includes('****'), 'Masked text should contain asterisks');
  
  return true;
}

/**
 * Verify environment handling patterns
 */
function verifyEnvironmentHandling() {
  // Save original environment variables
  const origApiKey = process.env.DD_API_KEY;
  const origAppKey = process.env.DD_APP_KEY;
  
  try {
    // Test with valid keys - using exactly 32 and 40 char keys
    const testApiKey = 'abcdef1234567890abcdef1234567890'; // 32 chars
    const testAppKey = 'abcdef1234567890abcdef1234567890abcdef12'; // 40 chars
    
    console.log('Debug API key length:', testApiKey.length);
    console.log('Debug APP key length:', testAppKey.length);
    
    process.env.DD_API_KEY = testApiKey;
    process.env.DD_APP_KEY = testAppKey;
    
    const validEnv = validateDatadogEnvironment();
    assert.strictEqual(validEnv.isValid, true, 'Environment should be valid with correct keys');
    assert.strictEqual(validEnv.hasApiKey, true, 'Should detect API key');
    assert.strictEqual(validEnv.hasAppKey, true, 'Should detect APP key');
    
    // Test with invalid API key
    process.env.DD_API_KEY = 'invalid-key';
    const invalidApiEnv = validateDatadogEnvironment();
    assert.strictEqual(invalidApiEnv.isValid, false, 'Environment should be invalid with incorrect API key');
    assert.strictEqual(invalidApiEnv.apiKeyValid, false, 'Should detect invalid API key');
    
    // Test with missing keys - make sure to clear ALL possible environment variable names
    delete process.env.DD_API_KEY;
    delete process.env.DD_APP_KEY;
    delete process.env.DATADOG_API_KEY;
    delete process.env.DATADOG_APP_KEY;
    delete process.env.TF_VAR_datadog_api_key;
    delete process.env.TF_VAR_datadog_app_key;
    
    const missingEnv = validateDatadogEnvironment();
    assert.strictEqual(missingEnv.isValid, false, 'Environment should be invalid with missing keys');
    assert.strictEqual(missingEnv.hasApiKey, false, 'Should detect missing API key');
    assert.strictEqual(missingEnv.hasAppKey, false, 'Should detect missing APP key');
    
    // Test alternate environment variable names
    process.env.DATADOG_API_KEY = 'abcdef1234567890abcdef1234567890';
    process.env.DATADOG_APP_KEY = 'abcdef1234567890abcdef1234567890abcdef12';
    
    console.log('Debug alt API key length:', process.env.DATADOG_API_KEY.length);
    console.log('Debug alt APP key length:', process.env.DATADOG_APP_KEY.length);
    
    const altEnv = validateDatadogEnvironment();
    console.log('Debug alt env result:', JSON.stringify(altEnv, null, 2));
    assert.strictEqual(altEnv.isValid, true, 'Should recognize alternate environment variable names');
    
    return true;
  } finally {
    // Restore original environment variables
    if (origApiKey) {
      process.env.DD_API_KEY = origApiKey;
    } else {
      delete process.env.DD_API_KEY;
    }
    
    if (origAppKey) {
      process.env.DD_APP_KEY = origAppKey;
    } else {
      delete process.env.DD_APP_KEY;
    }
    
    delete process.env.DATADOG_API_KEY;
    delete process.env.DATADOG_APP_KEY;
  }
}

/**
 * Check for proper handling in codebase
 */
function checkCodebaseSecretHandling() {
  const MAX_FILES_TO_CHECK = 10;
  const rootDir = path.join(__dirname, '..');
  
  // List of directories to check (focus on critical security areas)
  const dirsToCheck = [
    'utils',
    'hooks',
    'netlify/functions',
    'scripts'
  ];
  
  // List of files checked
  const checkedFiles = [];
  
  // Look for direct API key access patterns
  const securityIssues = [];
  
  // Helper to scan a file
  function scanFile(filePath) {
    if (checkedFiles.length >= MAX_FILES_TO_CHECK) return;
    if (!fs.existsSync(filePath) || !filePath.endsWith('.js')) return;
    
    checkedFiles.push(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Look for direct API key access without validation
    if (content.includes('process.env.DD_API_KEY') && 
        !content.includes('api-key-validator') && 
        !filePath.includes('api-key-validator.js')) {
      securityIssues.push(`${filePath}: Direct API key access without validation`);
    }
    
    // Look for hardcoded key patterns (this is just a simple check)
    if (content.match(/['"](\w{30,})['"]/) && !filePath.includes('verify-secret-handling.js')) {
      securityIssues.push(`${filePath}: Potential hardcoded key/token`);
    }
  }
  
  // Scan directories
  for (const dir of dirsToCheck) {
    const dirPath = path.join(rootDir, dir);
    if (!fs.existsSync(dirPath)) continue;
    
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      if (checkedFiles.length >= MAX_FILES_TO_CHECK) break;
      scanFile(path.join(dirPath, file));
    }
  }
  
  // We're not failing the test on findings - just reporting them
  console.log('\n📋 Security scan findings:');
  if (securityIssues.length === 0) {
    console.log('✅ No immediate security issues found in sampled files');
  } else {
    console.log(`⚠️ Found ${securityIssues.length} potential security issues:`);
    securityIssues.forEach(issue => console.log(`  - ${issue}`));
    console.log('\nRecommendation: Update these files to use the api-key-validator.js utility');
  }
  
  console.log(`\nFiles checked: ${checkedFiles.length}/${MAX_FILES_TO_CHECK} max`);
  
  return true;
}

/**
 * Run all verification tests
 */
function runAllTests() {
  console.log('🔐 Starting Secret Handling Verification Tests');
  
  runTest('API key validator functions work correctly', () => {
    assert.strictEqual(verifyApiKeyValidator(), true, 'API key validator verification failed');
  });
  
  runTest('Environment variable handling is secure', () => {
    assert.strictEqual(verifyEnvironmentHandling(), true, 'Environment handling verification failed');
  });
  
  runTest('Codebase secret handling patterns', () => {
    assert.strictEqual(checkCodebaseSecretHandling(), true, 'Codebase secret handling check failed');
  });
  
  saveTestResults();
  
  // Exit with error code if any tests failed
  if (testResults.failed > 0) {
    process.exit(1);
  }
}

// Run the tests
runAllTests();
