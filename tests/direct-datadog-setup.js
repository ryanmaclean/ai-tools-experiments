#!/usr/bin/env node

/**
 * Direct Datadog Synthetics Setup
 * 
 * This script directly creates and verifies Datadog synthetic tests without dependencies.
 * It's designed to work as a pre-commit check to ensure URLs are properly monitored.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// API credentials from environment
const DD_API_KEY = process.env.DD_API_KEY || process.env.TF_VAR_datadog_api_key;
const DD_APP_KEY = process.env.DD_APP_KEY || process.env.TF_VAR_datadog_app_key;

// External URL test targets
const PRODUCTION_URL = 'https://ai-tools-lab.com';
const STAGING_URL = 'https://ai-tools-lab-tst.netlify.app';

// URL path prefix settings (based on environment validation)
const PRODUCTION_PATH_PREFIX = '/pages';
const STAGING_PATH_PREFIX = '/pages';  // Found that test env also uses /pages/ prefix

// Readable names
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test configuration
const STANDARD_TESTS = [
  { name: 'Homepage Test', route: '', productionPath: '/', stagingPath: '/' },
  { name: 'About Page Test', route: 'about', productionPath: '/pages/about', stagingPath: '/pages/about' },
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
    stagingPath: `/pages/ep${epNum}`  // Updated to match actual test environment
  };
});

// Combine all tests
const ALL_TESTS = [...STANDARD_TESTS, ...EPISODE_TESTS];

/**
 * Main function
 */
async function main() {
  console.log(`\n${colors.blue}${colors.bright}DATADOG SYNTHETICS DIRECT SETUP${colors.reset}`);
  console.log(`${colors.blue}=================================${colors.reset}\n`);
  
  if (!DD_API_KEY || !DD_APP_KEY) {
    console.error(`${colors.red}ERROR: Missing Datadog API credentials.${colors.reset}`);
    console.error(`Please set DD_API_KEY and DD_APP_KEY environment variables.`);
    process.exit(1);
  }
  
  try {
    // Get existing tests from Datadog
    const existingTests = await getAllSyntheticTests();
    console.log(`${colors.green}Found ${existingTests.length} existing synthetic tests${colors.reset}\n`);
    
    // Map test names to test objects for easy lookup
    const existingTestMap = existingTests.reduce((map, test) => {
      map[test.name] = test;
      return map;
    }, {});
    
    // Check which tests we need to create
    const testsToCreate = [];
    const testsToUpdate = [];
    const testsAlreadyExist = [];
    
    ALL_TESTS.forEach(test => {
      // Check if a test with this name or a similar name exists
      const exists = existingTests.some(existingTest => 
        existingTest.name.includes(test.name) || 
        existingTest.name.includes(test.route));
      
      if (exists) {
        // Test exists but might need updates
        const matchingTest = existingTests.find(existingTest => 
          existingTest.name.includes(test.name) || 
          existingTest.name.includes(test.route));
          
        if (matchingTest && matchingTest.status !== 'live') {
          testsToUpdate.push({ ...test, existingId: matchingTest.public_id });
        } else {
          testsAlreadyExist.push({ ...test, existingId: matchingTest?.public_id });
        }
      } else {
        // New test to create
        testsToCreate.push(test);
      }
    });
    
    // Summary of what we're going to do
    console.log(`${colors.blue}Tests Setup Status:${colors.reset}`);
    console.log(`${colors.green}✅ Already exists and active: ${testsAlreadyExist.length}${colors.reset}`);
    console.log(`${colors.yellow}⚠️ Needs update or paused: ${testsToUpdate.length}${colors.reset}`);
    console.log(`${colors.red}❌ Missing and needs creation: ${testsToCreate.length}${colors.reset}\n`);
    
    // Create missing tests
    if (testsToCreate.length > 0) {
      console.log(`${colors.blue}Creating ${testsToCreate.length} missing tests...${colors.reset}`);
      
      let createdCount = 0;
      for (const test of testsToCreate) {
        try {
          const result = await createBrowserTest(test);
          console.log(`${colors.green}✅ Created: ${test.name}${colors.reset}`);
          createdCount++;
        } catch (error) {
          console.error(`${colors.red}❌ Failed to create ${test.name}: ${error.message}${colors.reset}`);
        }
      }
      
      console.log(`${colors.green}Created ${createdCount}/${testsToCreate.length} tests${colors.reset}\n`);
    }
    
    // Update existing tests that need it
    if (testsToUpdate.length > 0) {
      console.log(`${colors.blue}Updating ${testsToUpdate.length} tests...${colors.reset}`);
      
      let updatedCount = 0;
      for (const test of testsToUpdate) {
        try {
          const result = await updateBrowserTest(test);
          console.log(`${colors.green}✅ Updated: ${test.name}${colors.reset}`);
          updatedCount++;
        } catch (error) {
          console.error(`${colors.red}❌ Failed to update ${test.name}: ${error.message}${colors.reset}`);
        }
      }
      
      console.log(`${colors.green}Updated ${updatedCount}/${testsToUpdate.length} tests${colors.reset}\n`);
    }
    
    // Final verification after changes
    await verifyAllTests();
    
  } catch (error) {
    console.error(`${colors.red}ERROR: ${error.message}${colors.reset}`);
    process.exit(1);
  }
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
 * Create a browser test in Datadog
 */
function createBrowserTest(test) {
  return new Promise((resolve, reject) => {
    // Determine which environment to test against (default to production)
    const useProduction = process.env.DD_ENV !== 'staging';
    const baseUrl = useProduction ? PRODUCTION_URL : STAGING_URL;
    const path = useProduction ? test.productionPath : test.stagingPath;
    const url = baseUrl + path;
    
    // Generate location IDs (test from 3 AWS regions)
    const locations = ['aws:us-east-1', 'aws:us-west-2', 'aws:eu-west-1'];
    
    // Prepare the test payload
    const testConfig = {
      name: test.name,
      type: 'browser',
      status: 'live',
      locations,
      message: `${test.name} failed! Check ${url}`,
      tags: ['env:production', 'service:ai-tools-lab', 'managed-by:pre-commit-hook'],
      config: {
        configType: 'browser',
        assertions: [
          { type: 'statusCode', operator: 'is', target: 200 },
          { type: 'responseTime', operator: 'lessThan', target: 10000 }
        ],
        request: {
          method: 'GET',
          url: url,
          timeout: 30,
          headers: {}
        },
        variables: [],
        set_cookie: '',
        device: {
          id: 'chrome.laptop_large',
          width: 1440,
          height: 900
        },
        steps: [
          {
            name: 'Navigate to page',
            type: 'go',
            url: url,
            timeout: 30000,
            allow_failure: false
          },
          {
            name: 'Check header exists',
            type: 'assertElementPresent',
            element: { css: 'header' },
            timeout: 10000,
            allow_failure: false
          },
          {
            name: 'Check footer exists',
            type: 'assertElementPresent',
            element: { css: 'footer' },
            timeout: 10000,
            allow_failure: false
          }
        ]
      },
      options: {
        tick_every: 900,  // 15 minutes
        min_location_failed: 1,
        retry: { count: 1, interval: 300 },
        monitor_options: {
          renotify_interval: 120,
          notify_audit: true,
          timeout_h: 1
        },
        scheduling: {
          timezone: 'America/Los_Angeles',
          timeframes: [
            { day: 1, from: '07:00', to: '21:00' }, // Monday
            { day: 2, from: '07:00', to: '21:00' }, // Tuesday
            { day: 3, from: '07:00', to: '21:00' }, // Wednesday
            { day: 4, from: '07:00', to: '21:00' }, // Thursday
            { day: 5, from: '07:00', to: '21:00' }  // Friday
          ]
        }
      }
    };
    
    // Add route-specific assertions to ensure proper page content
    switch (test.route) {
      case '':
        // Homepage: Check for the episode grid
        testConfig.config.steps.push({
          name: 'Check episode grid exists',
          type: 'assertElementPresent',
          element: { css: '.episode-grid, .episode-list' },
          timeout: 10000,
          allow_failure: false
        });
        break;
        
      case 'about':
        // About page: Check for about content
        testConfig.config.steps.push({
          name: 'Check about content exists',
          type: 'assertElementPresent',
          element: { css: '.about-content' },
          timeout: 10000,
          allow_failure: false
        });
        break;
        
      case 'resources':
        // Resources page: Check for resource cards
        testConfig.config.steps.push({
          name: 'Check resource cards exist',
          type: 'assertElementPresent',
          element: { css: '.resource-grid, .resource-cards' },
          timeout: 10000,
          allow_failure: false
        });
        break;
        
      case 'observations':
        // Observations page: Check for observations content
        testConfig.config.steps.push({
          name: 'Check observations content exists',
          type: 'assertElementPresent',
          element: { css: '.observations-content' },
          timeout: 10000,
          allow_failure: false
        });
        break;
        
      default:
        // Episode page: Check for episode content
        if (test.route.startsWith('ep')) {
          testConfig.config.steps.push({
            name: 'Check episode content exists',
            type: 'assertElementPresent',
            element: { css: '.episode-content' },
            timeout: 10000,
            allow_failure: false
          });
        }
        break;
    }
    
    // Convert to JSON
    const payload = JSON.stringify(testConfig);
    
    // Make the API request
    const options = {
      hostname: 'api.datadoghq.com',
      path: '/api/v1/synthetics/tests/browser',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
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
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const response = JSON.parse(data);
            resolve(response);
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
    
    req.write(payload);
    req.end();
  });
}

/**
 * Update an existing browser test in Datadog
 */
function updateBrowserTest(test) {
  return new Promise((resolve, reject) => {
    // First, trigger a run of the test
    const options = {
      hostname: 'api.datadoghq.com',
      path: `/api/v1/synthetics/tests/${test.existingId}/trigger`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': DD_API_KEY,
        'DD-APPLICATION-KEY': DD_APP_KEY
      }
    };
    
    const payload = JSON.stringify({
      tests: [{ public_id: test.existingId }]
    });
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            resolve(response);
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
    
    req.write(payload);
    req.end();
  });
}

/**
 * Final verification of all tests
 */
async function verifyAllTests() {
  console.log(`${colors.blue}${colors.bright}FINAL VERIFICATION${colors.reset}`);
  console.log(`${colors.blue}=================${colors.reset}\n`);
  
  try {
    // Get all tests again to see current state
    const tests = await getAllSyntheticTests();
    
    // Check which of our required tests exist
    const foundTests = [];
    const missingTests = [];
    
    ALL_TESTS.forEach(expectedTest => {
      const found = tests.some(test => 
        test.name.includes(expectedTest.name) || 
        test.name.includes(expectedTest.route));
      
      if (found) {
        foundTests.push(expectedTest);
      } else {
        missingTests.push(expectedTest);
      }
    });
    
    // Check test status
    const activeTests = [];
    const inactiveTests = [];
    
    for (const test of tests) {
      // Only check tests that match our expected tests
      const isOurTest = ALL_TESTS.some(expectedTest => 
        test.name.includes(expectedTest.name) || 
        test.name.includes(expectedTest.route)
      );
      
      if (isOurTest) {
        if (test.status === 'live') {
          activeTests.push(test);
        } else {
          inactiveTests.push(test);
        }
      }
    }
    
    // Report results
    console.log(`${colors.blue}Test Coverage:${colors.reset}`);
    console.log(`${colors.green}✅ Found: ${foundTests.length}/${ALL_TESTS.length} required tests${colors.reset}`);
    
    if (missingTests.length > 0) {
      console.log(`${colors.red}❌ Missing: ${missingTests.length} tests${colors.reset}`);
      missingTests.forEach(test => {
        console.log(`  - ${test.name}`);
      });
    }
    
    console.log(`\n${colors.blue}Test Status:${colors.reset}`);
    console.log(`${colors.green}✅ Active: ${activeTests.length} tests${colors.reset}`);
    
    if (inactiveTests.length > 0) {
      console.log(`${colors.yellow}⚠️ Inactive: ${inactiveTests.length} tests${colors.reset}`);
      inactiveTests.forEach(test => {
        console.log(`  - ${test.name}: ${test.status}`);
      });
    }
    
    // Summary message based on test coverage
    console.log(`\n${colors.blue}${colors.bright}VERIFICATION RESULT${colors.reset}`);
    
    const showMap = {
      production: PRODUCTION_URL,
      staging: STAGING_URL
    };
    
    if (missingTests.length === 0 && inactiveTests.length === 0) {
      console.log(`${colors.green}${colors.bright}✅ SUCCESS: All ${ALL_TESTS.length} required tests are active!${colors.reset}`);
      console.log(`${colors.green}URLs are being monitored properly in Datadog.${colors.reset}\n`);
      console.log(`${colors.blue}Test Environment: ${process.env.DD_ENV || 'production'}${colors.reset}`);
      console.log(`${colors.blue}Base URL: ${showMap[process.env.DD_ENV || 'production']}${colors.reset}\n`);
      return true;
    } else {
      const totalIssues = missingTests.length + inactiveTests.length;
      console.log(`${colors.red}${colors.bright}❌ FAILURE: Found ${totalIssues} test issues${colors.reset}`);
      console.log(`${colors.red}Some URLs are not being monitored properly in Datadog.${colors.reset}\n`);
      console.log(`${colors.blue}Test Environment: ${process.env.DD_ENV || 'production'}${colors.reset}`);
      console.log(`${colors.blue}Base URL: ${showMap[process.env.DD_ENV || 'production']}${colors.reset}\n`);
      
      console.log(`${colors.yellow}If committing a change, your commit will be blocked.${colors.reset}`);
      console.log(`${colors.yellow}Run this script again after fixing the issues.${colors.reset}\n`);
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}ERROR during verification: ${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * Helper to format a route for display
 */
function formatRouteURL(route, isProduction) {
  const baseUrl = isProduction ? PRODUCTION_URL : STAGING_URL;
  const path = isProduction ? 
    (route ? `/pages/${route}` : '/') : 
    (route ? `/${route}` : '/');
  return baseUrl + path;
}

// Execute main function
main().catch(error => {
  console.error(`${colors.red}${colors.bright}FATAL ERROR: ${error.message}${colors.reset}`);
  process.exit(1);
});
