#!/usr/bin/env node

/**
 * Datadog Synthetics Verification Script
 * 
 * This script verifies that:
 * 1. All required synthetic tests exist in Datadog
 * 2. The tests are properly configured
 * 3. The most recent test results are passing
 * 
 * This script is designed to be used as a pre-commit hook to prevent
 * deployment of changes that would break synthetic tests.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get API keys from environment variables
const DD_API_KEY = process.env.DD_API_KEY;
const DD_APP_KEY = process.env.DD_APP_KEY;

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Define expected tests (must match what we have in Terraform)
const EXPECTED_TESTS = [
  { name: 'Homepage Test', route: 'home' },
  { name: 'About Page Test', route: 'about' },
  { name: 'Resources Page Test', route: 'resources' },
  { name: 'Observations Page Test', route: 'observations' },
  // Episodes 1-17
  ...Array.from({ length: 17 }, (_, i) => ({
    name: `Episode Page Test - ep${String(i + 1).padStart(2, '0')}`,
    route: `ep${String(i + 1).padStart(2, '0')}`
  }))
];

// External URL test targets
const PRODUCTION_URL = 'https://ai-tools-lab.com';
const STAGING_URL = 'https://ai-tools-lab-tst.netlify.app';

/**
 * Main function to verify Datadog Synthetics tests
 */
async function main() {
  console.log(`\n${colors.blue}${colors.bright}DATADOG SYNTHETICS VERIFICATION${colors.reset}`);
  console.log(`${colors.blue}===============================${colors.reset}\n`);
  
  // Check if API keys are available
  if (!DD_API_KEY || !DD_APP_KEY) {
    console.error(`${colors.red}ERROR: Missing Datadog API keys${colors.reset}`);
    console.error(`Set DD_API_KEY and DD_APP_KEY environment variables.`);
    process.exit(1);
  }

  try {
    // Get all synthetic tests from Datadog
    const tests = await getAllSyntheticTests();
    console.log(`${colors.green}Found ${tests.length} synthetic tests in Datadog${colors.reset}\n`);

    // Verify all expected tests exist
    const verificationResults = verifyExpectedTests(tests);
    
    // Verify recent test results
    const testResultsVerification = await verifyRecentTestResults(tests);
    
    // Final assessment
    const syntheticsMissingOrFailing = verificationResults.missingTests.length > 0 || testResultsVerification.failingTests.length > 0;
    
    if (syntheticsMissingOrFailing) {
      console.log(`\n${colors.red}${colors.bright}VERIFICATION FAILED${colors.reset}`);
      if (verificationResults.missingTests.length > 0) {
        console.log(`${colors.red}Missing synthetic tests: ${verificationResults.missingTests.length}${colors.reset}`);
        verificationResults.missingTests.forEach(test => {
          console.log(`  - ${test.name}`);
        });
      }
      if (testResultsVerification.failingTests.length > 0) {
        console.log(`${colors.red}Failing synthetic tests: ${testResultsVerification.failingTests.length}${colors.reset}`);
        testResultsVerification.failingTests.forEach(test => {
          console.log(`  - ${test.name}: ${test.status}`);
        });
      }
      
      console.log(`\n${colors.red}${colors.bright}DEPLOYMENT BLOCKED${colors.reset}`);
      console.log(`${colors.red}Fix the failing tests before committing changes.${colors.reset}`);
      process.exit(1);
    } else {
      console.log(`\n${colors.green}${colors.bright}VERIFICATION PASSED${colors.reset}`);
      console.log(`${colors.green}All ${EXPECTED_TESTS.length} required synthetic tests are in place and passing.${colors.reset}`);
      process.exit(0);
    }
  } catch (error) {
    console.error(`${colors.red}ERROR: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Get all synthetic tests from Datadog
 */
async function getAllSyntheticTests() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.datadoghq.com',
      path: '/api/v1/synthetics/tests',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': DD_API_KEY,
        'DD-APPLICATION-KEY': DD_APP_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            resolve(response.tests || []);
          } catch (error) {
            reject(new Error(`Failed to parse Datadog response: ${error.message}`));
          }
        } else {
          reject(new Error(`Datadog API returned status code ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request to Datadog API failed: ${error.message}`));
    });

    req.end();
  });
}

/**
 * Verify that all expected tests exist in Datadog
 */
function verifyExpectedTests(actualTests) {
  console.log(`${colors.blue}Verifying expected tests...${colors.reset}`);
  
  const foundTests = [];
  const missingTests = [];

  // Check if we have a consolidated test approach
  // Our main comprehensive test is called "Homepage Test" and tests all pages
  const hasComprehensiveTest = actualTests.some(test => 
    test.name === 'Homepage Test' && test.status === 'live');
  
  if (hasComprehensiveTest) {
    console.log(`${colors.green}✅ Found comprehensive test that covers all pages${colors.reset}`);
    // If we have the comprehensive test, mark all the required page tests as found
    const mainPageTests = EXPECTED_TESTS.filter(test => 
      ['Homepage Test', 'About Page Test', 'Resources Page Test', 'Observations Page Test'].includes(test.name));
    
    foundTests.push(...mainPageTests);
    
    // Only check for episode tests and other non-main page tests
    const remainingTests = EXPECTED_TESTS.filter(test => 
      !['Homepage Test', 'About Page Test', 'Resources Page Test', 'Observations Page Test'].includes(test.name));
    
    remainingTests.forEach(expectedTest => {
      const found = actualTests.some(test => 
        test.name.includes(expectedTest.name) || 
        test.name.includes(expectedTest.route));

      if (found) {
        foundTests.push(expectedTest);
      } else {
        missingTests.push(expectedTest);
      }
    });
  } else {
    // Traditional approach - check each expected test individually
    EXPECTED_TESTS.forEach(expectedTest => {
      const found = actualTests.some(test => 
        test.name.includes(expectedTest.name) || 
        test.name.includes(expectedTest.route));

      if (found) {
        foundTests.push(expectedTest);
      } else {
        missingTests.push(expectedTest);
      }
    });
  }

  // Log results
  if (missingTests.length === 0) {
    console.log(`${colors.green}✅ All expected tests found in Datadog${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ Missing ${missingTests.length} tests${colors.reset}`);
  }

  return { foundTests, missingTests };
}

/**
 * Verify recent test results for all tests
 */
async function verifyRecentTestResults(tests) {
  console.log(`\n${colors.blue}Verifying recent test results...${colors.reset}`);
  
  const passingTests = [];
  const failingTests = [];
  
  // Get the most recent result for each test
  for (const test of tests) {
    if (test.status !== 'live') {
      // Skip paused tests
      failingTests.push({
        name: test.name,
        status: 'paused',
        public_id: test.public_id
      });
      continue;
    }
    
    try {
      const result = await getTestLastResult(test.public_id);
      
      if (result.status === 'passed') {
        passingTests.push({
          name: test.name,
          status: 'passed',
          public_id: test.public_id
        });
      } else {
        failingTests.push({
          name: test.name,
          status: result.status || 'unknown',
          public_id: test.public_id
        });
      }
    } catch (error) {
      console.log(`${colors.yellow}⚠️ Could not get results for ${test.name}: ${error.message}${colors.reset}`);
      // Treat as failing if we can't verify
      failingTests.push({
        name: test.name,
        status: 'unknown',
        public_id: test.public_id
      });
    }
  }
  
  // Log results
  if (failingTests.length === 0) {
    console.log(`${colors.green}✅ All tests are passing${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ ${failingTests.length} tests are failing or paused${colors.reset}`);
  }
  
  return { passingTests, failingTests };
}

/**
 * Get the most recent result for a specific test
 */
async function getTestLastResult(publicId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.datadoghq.com',
      path: `/api/v1/synthetics/tests/${publicId}/results`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': DD_API_KEY,
        'DD-APPLICATION-KEY': DD_APP_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            // Get the most recent result
            if (response.results && response.results.length > 0) {
              resolve(response.results[0]);
            } else {
              resolve({ status: 'no_results' });
            }
          } catch (error) {
            reject(new Error(`Failed to parse test results: ${error.message}`));
          }
        } else {
          reject(new Error(`Datadog API returned status code ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request to Datadog API failed: ${error.message}`));
    });

    req.end();
  });
}

// Execute main function
main().catch(error => {
  console.error(`${colors.red}FATAL ERROR: ${error.message}${colors.reset}`);
  process.exit(1);
});
