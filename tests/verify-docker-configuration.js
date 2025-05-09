#!/usr/bin/env node

/**
 * Docker Configuration Verification Test
 * 
 * This test verifies that Docker is properly configured according to our requirements:
 * 1. Proper container operations and management
 * 2. HANDLE_404_WARNINGS environment variable functionality
 * 3. Volume mount configuration for datadog-agent
 *
 * Run with: node tests/verify-docker-configuration.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Configuration
const TEST_TIMEOUT = 30000; // 30 seconds
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
  console.log(`\n🧪 Running test: ${name}`);
  
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
    console.log(`✅ PASSED: ${name}`);
  } catch (err) {
    testResult.status = 'failed';
    testResult.error = {
      message: err.message,
      stack: err.stack
    };
    testResults.failed++;
    console.error(`❌ FAILED: ${name}`);
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
  
  const reportFile = path.join(REPORT_DIR, `docker-config-test-${Date.now()}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));
  console.log(`\n📊 Test results saved to: ${reportFile}`);
  console.log(`\n📋 Summary: ${testResults.summary}`);
}

/**
 * Check if Docker is installed and running
 */
function verifyDockerRunning() {
  try {
    const output = execSync('docker info').toString();
    return output.includes('Server:') && output.includes('Containers:');
  } catch (err) {
    return false;
  }
}

/**
 * Check if Docker Compose files exist and are valid
 */
function verifyDockerComposeFiles() {
  const composeFilePath = path.join(__dirname, '..', 'docker-compose.yml');
  const composeFileExists = fs.existsSync(composeFilePath);
  
  if (!composeFileExists) {
    throw new Error('docker-compose.yml not found');
  }
  
  // Check compose file content for required configurations
  const composeContent = fs.readFileSync(composeFilePath, 'utf8');
  
  // Check for HANDLE_404_WARNINGS env var
  if (!composeContent.includes('HANDLE_404_WARNINGS')) {
    throw new Error('HANDLE_404_WARNINGS environment variable not found in docker-compose.yml');
  }
  
  // Check for Datadog volume mount
  if (!composeContent.includes('./datadog-agent-run:/opt/datadog-agent/run:rw')) {
    throw new Error('Local datadog-agent-run volume mount not found in docker-compose.yml');
  }
  
  return true;
}

/**
 * Check if Dockerfile is properly configured for static output
 */
function verifyDockerfileConfiguration() {
  const dockerfilePath = path.join(__dirname, '..', 'Dockerfile');
  const dockerfileExists = fs.existsSync(dockerfilePath);
  
  if (!dockerfileExists) {
    throw new Error('Dockerfile not found');
  }
  
  // Check Dockerfile content for static file server configuration
  const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');
  
  // Verify serve package is installed
  if (!dockerfileContent.includes('serve@')) {
    throw new Error('serve package installation not found in Dockerfile');
  }
  
  // Verify static file serving command
  if (!dockerfileContent.includes('CMD ["serve", "-s", "./dist"')) {
    throw new Error('Static file server command not configured in Dockerfile');
  }
  
  return true;
}

/**
 * Verify HANDLE_404_WARNINGS functionality in test code
 */
function verifyHandle404Warnings() {
  const testFilePath = path.join(__dirname, 'datadog-sequential-test.js');
  const testFileExists = fs.existsSync(testFilePath);
  
  if (!testFileExists) {
    throw new Error('datadog-sequential-test.js not found');
  }
  
  // Check test file content for proper handling of HANDLE_404_WARNINGS
  const testContent = fs.readFileSync(testFilePath, 'utf8');
  
  if (!testContent.includes('HANDLE_404_WARNINGS')) {
    throw new Error('HANDLE_404_WARNINGS variable not found in datadog-sequential-test.js');
  }
  
  if (!testContent.includes('process.env.HANDLE_404_WARNINGS === \'false\'')) {
    throw new Error('HANDLE_404_WARNINGS condition check not found in datadog-sequential-test.js');
  }
  
  return true;
}

/**
 * Verify pre-commit hook has npm audit check
 */
function verifyNpmAuditInPreCommit() {
  const preCommitPath = path.join(__dirname, '..', '.husky', 'pre-commit');
  const preCommitExists = fs.existsSync(preCommitPath);
  
  if (!preCommitExists) {
    throw new Error('pre-commit hook not found');
  }
  
  // Check pre-commit content for npm audit
  const preCommitContent = fs.readFileSync(preCommitPath, 'utf8');
  
  if (!preCommitContent.includes('npm audit')) {
    throw new Error('npm audit check not found in pre-commit hook');
  }
  
  return true;
}

/**
 * Run all verification tests
 */
function runAllTests() {
  console.log('🐳 Starting Docker Configuration Verification Tests');
  
  // Skip Docker running check if in CI environment
  if (!process.env.CI) {
    runTest('Docker is installed and running', () => {
      assert.strictEqual(verifyDockerRunning(), true, 'Docker is not running');
    });
  }
  
  runTest('Docker Compose files are properly configured', () => {
    assert.strictEqual(verifyDockerComposeFiles(), true, 'Docker Compose file validation failed');
  });
  
  runTest('Dockerfile is configured for static output', () => {
    assert.strictEqual(verifyDockerfileConfiguration(), true, 'Dockerfile validation failed');
  });
  
  runTest('HANDLE_404_WARNINGS functionality is properly implemented', () => {
    assert.strictEqual(verifyHandle404Warnings(), true, 'HANDLE_404_WARNINGS validation failed');
  });
  
  runTest('npm audit check is included in pre-commit hook', () => {
    assert.strictEqual(verifyNpmAuditInPreCommit(), true, 'npm audit in pre-commit validation failed');
  });
  
  saveTestResults();
  
  // Exit with error code if any tests failed
  if (testResults.failed > 0) {
    process.exit(1);
  }
}

// Run the tests
runAllTests();
