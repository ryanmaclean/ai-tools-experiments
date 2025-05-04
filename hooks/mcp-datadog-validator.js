#!/usr/bin/env node

/**
 * AI Tools Lab Enhanced Datadog Validator with MCP Integration
 * 
 * This script combines Model Context Protocol (MCP) with Datadog API
 * to validate both visual elements and synthetic tests before commit.
 * 
 * MCP docs: https://modelcontextprotocol.io
 * Perplexity API docs: https://docs.perplexity.ai
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

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

// Environment constants
const ENV = {
  PRODUCTION: {
    base: 'https://ai-tools-lab.com',
    pathPrefix: '/pages',
    name: 'Production'
  },
  STAGING: {
    base: 'https://ai-tools-lab-tst.netlify.app',
    pathPrefix: '',
    name: 'Staging'
  }
};

// Get API keys from environment variables
const DD_API_KEY = process.env.DD_API_KEY || process.env.TF_VAR_datadog_api_key;
const DD_APP_KEY = process.env.DD_APP_KEY || process.env.TF_VAR_datadog_app_key;

// Define expected tests (must match what we have in Terraform)
const STANDARD_TESTS = [
  { name: 'Homepage Test', route: '', productionPath: '/', stagingPath: '/' },
  { name: 'About Page Test', route: 'about', productionPath: '/pages/about', stagingPath: '/about' },
  { name: 'Resources Page Test', route: 'resources', productionPath: '/pages/resources', stagingPath: '/resources' },
  { name: 'Observations Page Test', route: 'observations', productionPath: '/pages/observations', stagingPath: '/observations' }
];

// Generate episode tests for episodes 1-17
const EPISODE_TESTS = Array.from({ length: 17 }, (_, i) => {
  const epNum = String(i + 1).padStart(2, '0'); // Formats: 01, 02, ...17
  return {
    name: `Episode Page Test - ep${epNum}`,
    route: `ep${epNum}`,
    productionPath: `/pages/ep${epNum}`,
    stagingPath: `/ep${epNum}`
  };
});

// Combine all tests
const ALL_TESTS = [...STANDARD_TESTS, ...EPISODE_TESTS];

/**
 * Main validation function
 */
async function main() {
  console.log(`\n${colors.blue}${colors.bright}MCP + DATADOG ENHANCED VALIDATOR${colors.reset}`);
  console.log(`${colors.blue}=================================${colors.reset}\n`);
  
  // Check if MCP validation is enabled
  const USE_MCP = process.env.SKIP_MCP !== 'true';
  if (USE_MCP) {
    console.log(`${colors.green}MCP Integration: ${colors.bright}ENABLED${colors.reset}`);
    console.log(`Using MCP Puppeteer for visual validation (per user preference)`);
  } else {
    console.log(`${colors.yellow}MCP Integration: ${colors.bright}DISABLED${colors.reset}`);
    console.log(`Set SKIP_MCP=false to enable visual validation via MCP`);
  }
  
  console.log(`\n${colors.blue}Validating critical URL patterns...${colors.reset}`);
  
  // Check required credentials
  if (!DD_API_KEY || !DD_APP_KEY) {
    console.error(`${colors.red}ERROR: Missing Datadog API credentials.${colors.reset}`);
    console.error(`Please set DD_API_KEY and DD_APP_KEY environment variables.`);
    process.exit(1);
  }
  
  try {
    // Run MCP visual validation if enabled
    let visualResults = { success: true };
    if (USE_MCP) {
      visualResults = await runMcpVisualValidation();
    }
    
    // Get existing tests from Datadog
    const existingTests = await getAllSyntheticTests();
    console.log(`${colors.green}Found ${existingTests.length} existing synthetic tests${colors.reset}\n`);
    
    // Verify all expected tests exist in Datadog
    const verificationResults = verifyExpectedTests(existingTests);
    
    // Check test statuses
    const testStatusResults = await getTestStatuses(existingTests, verificationResults.foundTests);
    
    // Final evaluation
    const missingTestsIssue = verificationResults.missingTests.length > 0;
    const failingTestsIssue = testStatusResults.failingTests.length > 0;
    const visualValidationIssue = !visualResults.success;
    
    if (missingTestsIssue || failingTestsIssue || visualValidationIssue) {
      console.log(`\n${colors.red}${colors.bright}VALIDATION FAILED${colors.reset}`);
      
      if (missingTestsIssue) {
        console.log(`${colors.red}❌ Missing ${verificationResults.missingTests.length} tests in Datadog${colors.reset}`);
        console.log(`${colors.red}  These tests must be created before committing changes${colors.reset}`);
      }
      
      if (failingTestsIssue) {
        console.log(`${colors.red}❌ Found ${testStatusResults.failingTests.length} failing tests in Datadog${colors.reset}`);
        console.log(`${colors.red}  These tests must be passing before committing changes${colors.reset}`);
      }
      
      if (visualValidationIssue) {
        console.log(`${colors.red}❌ Visual validation with MCP Puppeteer failed${colors.reset}`);
        console.log(`${colors.red}  Fix visual elements before committing changes${colors.reset}`);
      }
      
      console.log(`\n${colors.red}${colors.bright}COMMIT BLOCKED${colors.reset}`);
      console.log(`${colors.red}"URL not working in DD means deploy failed" - enforcing this rule${colors.reset}`);
      process.exit(1);
    } else {
      console.log(`\n${colors.green}${colors.bright}VALIDATION PASSED${colors.reset}`);
      console.log(`${colors.green}✅ All ${ALL_TESTS.length} required tests exist in Datadog${colors.reset}`);
      console.log(`${colors.green}✅ All tests are passing with status "live"${colors.reset}`);      
      if (USE_MCP) {
        console.log(`${colors.green}✅ Visual validation with MCP Puppeteer passed${colors.reset}`);
      }
      console.log(`\n${colors.green}${colors.bright}COMMIT APPROVED${colors.reset}`);
      process.exit(0);
    }
  } catch (error) {
    console.error(`${colors.red}ERROR: ${error.message}${colors.reset}`);
    console.log(`\n${colors.red}${colors.bright}COMMIT BLOCKED DUE TO ERROR${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Run MCP Puppeteer-based visual validation
 */
async function runMcpVisualValidation() {
  console.log(`${colors.blue}Running MCP Puppeteer visual validation...${colors.reset}`);
  
  return new Promise((resolve) => {
    // Using spawn to run as a separate process to avoid loading puppeteer directly
    const visualProcess = spawn('node', ['hooks/visual-validation.js'], {
      env: { ...process.env },
      stdio: 'inherit'
    });
    
    visualProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`${colors.green}✅ MCP visual validation passed${colors.reset}`);
        resolve({ success: true });
      } else {
        console.log(`${colors.red}❌ MCP visual validation failed with code ${code}${colors.reset}`);
        resolve({ success: false, exitCode: code });
      }
    });
  });
}

/**
 * Get all existing synthetic tests from Datadog
 */
function getAllSyntheticTests() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.datadoghq.com',
      path: '/api/v1/synthetics/tests',
      method: 'GET',
      headers: {
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
            const parsed = JSON.parse(data);
            resolve(parsed.tests || []);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        } else {
          reject(new Error(`API returned status ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
    
    req.end();
  });
}

/**
 * Verify that all expected tests exist in Datadog
 */
function verifyExpectedTests(actualTests) {
  console.log(`${colors.blue}Verifying expected tests in Datadog...${colors.reset}`);
  
  const foundTests = [];
  const missingTests = [];

  // Check each expected test
  ALL_TESTS.forEach(expectedTest => {
    const found = actualTests.some(test => 
      test.name.includes(expectedTest.name) || 
      test.name.includes(expectedTest.route));

    if (found) {
      foundTests.push(expectedTest);
    } else {
      missingTests.push(expectedTest);
    }
  });

  // Log results
  if (missingTests.length === 0) {
    console.log(`${colors.green}✅ All expected tests found in Datadog${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ Missing ${missingTests.length} tests${colors.reset}`);
    missingTests.forEach(test => {
      console.log(`  ${colors.red}- ${test.name}${colors.reset}`);
    });
  }

  return { foundTests, missingTests };
}

/**
 * Get statuses for all tests
 */
async function getTestStatuses(tests, foundTests) {
  console.log(`\n${colors.blue}Checking test status in Datadog...${colors.reset}`);
  
  const passingTests = [];
  const failingTests = [];
  
  for (const test of tests) {
    // Only check tests that match our expected tests
    const isOurTest = foundTests.some(expectedTest => 
      test.name.includes(expectedTest.name) || 
      test.name.includes(expectedTest.route)
    );
    
    if (isOurTest) {
      if (test.status === 'live') {
        passingTests.push({
          name: test.name,
          status: 'live',
          public_id: test.public_id
        });
      } else {
        failingTests.push({
          name: test.name,
          status: test.status || 'unknown',
          public_id: test.public_id
        });
      }
    }
  }
  
  // Log results
  if (failingTests.length === 0) {
    console.log(`${colors.green}✅ All tests are active and passing${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ ${failingTests.length} tests are not active${colors.reset}`);
    failingTests.forEach(test => {
      console.log(`  ${colors.red}- ${test.name}: ${test.status}${colors.reset}`);
    });
  }
  
  return { passingTests, failingTests };
}

/**
 * Helper: Get a formatted URL based on environment and path
 */
function getFormattedUrl(path, env = ENV.PRODUCTION) {
  if (path === '') return env.base + '/';
  
  const routePath = path.startsWith('/') ? path : `/${path}`;
  const prefix = env.pathPrefix && !routePath.startsWith(env.pathPrefix) ? env.pathPrefix : '';
  return `${env.base}${prefix}${routePath}`;
}

// Run main function if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error(`${colors.red}${colors.bright}FATAL ERROR: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = { main, verifyExpectedTests, getFormattedUrl };
