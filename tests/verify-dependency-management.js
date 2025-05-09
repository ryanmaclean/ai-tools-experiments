#!/usr/bin/env node

/**
 * Dependency Management Verification Test
 * 
 * This test verifies proper dependency management practices:
 * 1. Verifies pre-commit hooks for npm audit
 * 2. Checks package.json for appropriate security configurations
 * 3. Validates that there are no current vulnerabilities
 *
 * Run with: node tests/verify-dependency-management.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Configuration
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
  
  const reportFile = path.join(REPORT_DIR, `dependency-mgmt-test-${Date.now()}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));
  console.log(`\n📊 Test results saved to: ${reportFile}`);
  console.log(`\n📋 Summary: ${testResults.summary}`);
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
  
  if (!preCommitContent.includes('if [ $? -ne 0 ]')) {
    throw new Error('Exit code check for npm audit not found in pre-commit hook');
  }
  
  return true;
}

/**
 * Verify current project has no npm vulnerabilities
 */
function verifyNoNpmVulnerabilities() {
  try {
    // Run npm audit and capture output
    const output = execSync('npm audit --json').toString();
    
    // Parse the JSON output
    const auditResult = JSON.parse(output);
    
    // Check for vulnerabilities
    const vulnerabilityCount = auditResult.metadata?.vulnerabilities?.total || 0;
    
    if (vulnerabilityCount > 0) {
      throw new Error(`Found ${vulnerabilityCount} vulnerabilities in npm packages`);
    }
    
    return true;
  } catch (err) {
    // If the error is from JSON parsing, it might be because there's no vulnerabilities
    // and npm audit didn't return valid JSON
    if (err.message.includes('JSON')) {
      // Check if the original output indicates no vulnerabilities
      try {
        const simpleOutput = execSync('npm audit').toString();
        if (simpleOutput.includes('found 0 vulnerabilities')) {
          return true;
        }
      } catch (innerErr) {
        throw new Error(`Failed to verify vulnerabilities: ${innerErr.message}`);
      }
    }
    
    // Re-throw the original error
    throw err;
  }
}

/**
 * Check package.json for security configurations
 */
function verifyPackageJsonSecurityConfig() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJsonExists = fs.existsSync(packageJsonPath);
  
  if (!packageJsonExists) {
    throw new Error('package.json not found');
  }
  
  // Read and parse package.json
  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageJsonContent);
  
  // Check for appropriate dependency versions
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  // Verify updated dependencies from TODO list
  const requiredDependencies = [
    { name: 'glob', minVersion: '9.3.0' },
    { name: 'rimraf', minVersion: '6.0.0' },
  ];
  
  for (const dep of requiredDependencies) {
    if (dependencies[dep.name]) {
      const version = dependencies[dep.name].replace('^', '').replace('~', '');
      const isValidVersion = compareVersions(version, dep.minVersion) >= 0;
      
      if (!isValidVersion) {
        throw new Error(`${dep.name} version ${version} is below required minimum ${dep.minVersion}`);
      }
    }
  }
  
  return true;
}

/**
 * Simple semver comparison (returns -1, 0, or 1)
 */
function compareVersions(a, b) {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const valueA = partsA[i] || 0;
    const valueB = partsB[i] || 0;
    
    if (valueA > valueB) return 1;
    if (valueA < valueB) return -1;
  }
  
  return 0;
}

/**
 * Run all verification tests
 */
function runAllTests() {
  console.log('🔒 Starting Dependency Management Verification Tests');
  
  runTest('npm audit is included in pre-commit hook', () => {
    assert.strictEqual(verifyNpmAuditInPreCommit(), true, 'npm audit in pre-commit validation failed');
  });
  
  runTest('Current project has no npm vulnerabilities', () => {
    assert.strictEqual(verifyNoNpmVulnerabilities(), true, 'Vulnerability check failed');
  });
  
  runTest('package.json has proper security configurations', () => {
    assert.strictEqual(verifyPackageJsonSecurityConfig(), true, 'package.json security configuration validation failed');
  });
  
  saveTestResults();
  
  // Exit with error code if any tests failed
  if (testResults.failed > 0) {
    process.exit(1);
  }
}

// Run the tests
runAllTests();
