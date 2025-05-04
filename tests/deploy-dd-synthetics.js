#!/usr/bin/env node

/**
 * AI Tools Lab Datadog Synthetics Deployment Script
 * 
 * This script deploys Datadog Synthetics tests for both production and staging environments
 * based on validated URL patterns. It implements a "test twice, deploy once" approach
 * to ensure URLs are working before being monitored.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// Environment configuration - validated across both environments
const ENVIRONMENTS = {
  PRODUCTION: {
    name: 'Production',
    baseUrl: 'https://ai-tools-lab.com',
    pathPrefix: '/pages', // Confirmed via dual-environment validator
    apiTag: 'prod',
    locations: ['aws:us-east-1', 'aws:us-west-2', 'aws:eu-west-1'],
    frequency: 300, // 5 minutes in seconds
    device: 'chrome.laptop_large'
  },
  STAGING: {
    name: 'Staging',
    baseUrl: 'https://ai-tools-lab-tst.netlify.app',
    pathPrefix: '/pages', // Confirmed via dual-environment validator
    apiTag: 'staging',
    locations: ['aws:us-east-1'], // Single location for staging to reduce costs
    frequency: 900, // 15 minutes in seconds
    device: 'chrome.laptop_large'
  }
};

// Routes to test - configuration validated via dual-environment validator
const ROUTES = [
  { path: '/', name: 'Home', selectors: ['header', 'footer', 'main'], expectedStatusCode: 200 },
  { path: '/about', name: 'About', selectors: ['header', 'footer', '.about-content, article'], expectedStatusCode: 200 },
  { path: '/resources', name: 'Resources', selectors: ['header', 'footer', '.resource-cards, .resource-grid'], expectedStatusCode: 200 },
  { path: '/observations', name: 'Observations', selectors: ['header', 'footer', '.observations-content'], expectedStatusCode: 200 }
];

// Add episode routes 1-17
for (let i = 1; i <= 17; i++) {
  const epNum = String(i).padStart(2, '0');
  ROUTES.push({ 
    path: `/ep${epNum}`, 
    name: `Episode ${epNum}`, 
    selectors: ['header', 'footer', '.episode-content, article'], 
    expectedStatusCode: 200
  });
}

// API credentials
const DD_API_KEY = process.env.DD_API_KEY || process.env.TF_VAR_datadog_api_key;
const DD_APP_KEY = process.env.DD_APP_KEY || process.env.TF_VAR_datadog_app_key;

/**
 * Main function
 */
async function main() {
  console.log(`\n${colors.blue}${colors.bright}DATADOG SYNTHETICS DEPLOYMENT${colors.reset}`);
  console.log(`${colors.blue}==============================${colors.reset}\n`);
  
  // Validate Credentials
  if (!DD_API_KEY || !DD_APP_KEY) {
    console.error(`${colors.red}ERROR: Missing Datadog API credentials${colors.reset}`);
    console.error(`Set DD_API_KEY and DD_APP_KEY environment variables`);
    process.exit(1);
  }
  
  // Determine target environment
  const env = process.env.DD_ENV === 'staging' ? ENVIRONMENTS.STAGING : ENVIRONMENTS.PRODUCTION;
  console.log(`${colors.bright}Target Environment: ${env.name}${colors.reset}`);
  console.log(`Base URL: ${env.baseUrl}`);
  console.log(`Path Prefix: ${env.pathPrefix || 'none'}\n`);
  
  try {
    // Validate URLs before creating tests
    console.log(`${colors.blue}Validating all URLs before deployment...${colors.reset}`);
    const validationResults = await validateUrls(ROUTES, env);
    
    if (validationResults.failed > 0) {
      console.error(`${colors.red}ERROR: URL validation failed for ${validationResults.failed} routes${colors.reset}`);
      console.error(`${colors.red}Fix the failing URLs before deploying Datadog synthetics${colors.reset}`);
      process.exit(1);
    }
    
    console.log(`${colors.green}✅ All ${validationResults.success} URLs validated successfully${colors.reset}\n`);
    
    // Get existing tests from Datadog
    console.log(`${colors.blue}Checking existing Datadog synthetics tests...${colors.reset}`);
    const existingTests = await getAllSyntheticTests();
    console.log(`${colors.green}Found ${existingTests.length} existing synthetics tests${colors.reset}\n`);
    
    // Map test names to test objects for easy lookup
    const existingTestMap = existingTests.reduce((map, test) => {
      map[test.name] = test;
      return map;
    }, {});
    
    // Prepare test deployment
    const testsToCreate = [];
    const testsToUpdate = [];
    const testsAlreadyOK = [];
    
    ROUTES.forEach(route => {
      const testName = `${env.name} - ${route.name}`;
      
      if (existingTestMap[testName]) {
        const existingTest = existingTestMap[testName];
        if (existingTest.status !== 'live') {
          testsToUpdate.push({
            ...route,
            testName,
            existingId: existingTest.public_id,
            status: existingTest.status
          });
        } else {
          testsAlreadyOK.push({
            ...route,
            testName,
            existingId: existingTest.public_id
          });
        }
      } else {
        testsToCreate.push({
          ...route,
          testName
        });
      }
    });
    
    // Display deployment plan
    console.log(`${colors.blue}${colors.bright}Deployment Plan:${colors.reset}`);
    console.log(`${colors.green}✅ Already configured and active: ${testsAlreadyOK.length}${colors.reset}`);
    console.log(`${colors.yellow}⚠️ Needs update: ${testsToUpdate.length}${colors.reset}`);
    console.log(`${colors.cyan}🔍 Will be created: ${testsToCreate.length}${colors.reset}\n`);
    
    // Create missing tests
    let createdCount = 0;
    if (testsToCreate.length > 0) {
      console.log(`${colors.blue}Creating ${testsToCreate.length} new tests...${colors.reset}`);
      
      for (const test of testsToCreate) {
        try {
          const result = await createBrowserTest(test, env);
          console.log(`${colors.green}✅ Created: ${test.testName}${colors.reset}`);
          createdCount++;
        } catch (error) {
          console.error(`${colors.red}❌ Failed to create ${test.testName}: ${error.message}${colors.reset}`);
        }
      }
    }
    
    // Update existing tests that need it
    let updatedCount = 0;
    if (testsToUpdate.length > 0) {
      console.log(`\n${colors.blue}Updating ${testsToUpdate.length} existing tests...${colors.reset}`);
      
      for (const test of testsToUpdate) {
        try {
          await updateTestStatus(test.existingId, 'live');
          console.log(`${colors.green}✅ Updated: ${test.testName} (now live)${colors.reset}`);
          updatedCount++;
        } catch (error) {
          console.error(`${colors.red}❌ Failed to update ${test.testName}: ${error.message}${colors.reset}`);
        }
      }
    }
    
    // Display final summary
    console.log(`\n${colors.blue}${colors.bright}Deployment Summary:${colors.reset}`);
    console.log(`${colors.green}✅ ${createdCount} tests created${colors.reset}`);
    console.log(`${colors.green}✅ ${updatedCount} tests updated${colors.reset}`);
    console.log(`${colors.green}✅ ${testsAlreadyOK.length} tests already active${colors.reset}`);
    console.log(`${colors.green}✅ Total: ${createdCount + updatedCount + testsAlreadyOK.length}/${ROUTES.length} tests configured${colors.reset}\n`);
    
    // Verify test status after deployment
    console.log(`${colors.blue}Verifying test status after deployment...${colors.reset}`);
    await verifyTestStatus();
  } catch (error) {
    console.error(`${colors.red}ERROR: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Validate URLs before creating Datadog synthetics tests
 */
async function validateUrls(routes, env) {
  const results = {
    success: 0,
    failed: 0,
    details: []
  };
  
  for (const route of routes) {
    const url = getFormattedUrl(route.path, env);
    console.log(`Testing ${route.name}: ${url}`);
    
    try {
      const isValid = await checkUrl(url);
      
      if (isValid) {
        console.log(`  ${colors.green}✅ Available${colors.reset}`);
        results.success++;
        results.details.push({ url, route, success: true });
      } else {
        console.log(`  ${colors.red}❌ Failed${colors.reset}`);
        results.failed++;
        results.details.push({ url, route, success: false });
      }
    } catch (error) {
      console.log(`  ${colors.red}❌ Error: ${error.message}${colors.reset}`);
      results.failed++;
      results.details.push({ url, route, success: false, error: error.message });
    }
  }
  
  return results;
}

/**
 * Check if a URL is accessible
 */
async function checkUrl(url) {
  return new Promise((resolve) => {
    const isHttps = url.startsWith('https');
    const requestLib = isHttps ? https : require('http');
    
    const req = requestLib.get(url, (res) => {
      resolve(res.statusCode === 200);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.setTimeout(10000, () => {
      req.abort();
      resolve(false);
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
 * Create a browser test in Datadog
 */
function createBrowserTest(test, env) {
  return new Promise((resolve, reject) => {
    // Get full URL
    const url = getFormattedUrl(test.path, env);
    
    // Configure test steps based on route type
    const steps = [
      {
        name: 'Navigate to page',
        type: 'go',
        url: url,
        timeout: 30000,
        allow_failure: false
      }
    ];
    
    // Add step to check each required selector
    if (test.selectors && test.selectors.length > 0) {
      test.selectors.forEach(selector => {
        // Handle alternative selectors with commas
        const alternativeSelectors = selector.split(/\s*,\s*/);
        let cssSelector = alternativeSelectors[0]; // Use first as default
        
        steps.push({
          name: `Check ${selector} exists`,
          type: 'assertElementPresent',
          element: { css: cssSelector },
          timeout: 10000,
          allow_failure: false
        });
      });
    }
    
    // Prepare the test payload
    const testConfig = {
      name: test.testName,
      type: 'browser',
      status: 'live',
      locations: env.locations,
      message: `${test.testName} failed! Check ${url}`,
      tags: [`env:${env.apiTag}`, 'service:ai-tools-lab', 'managed-by:test-twice-deploy-once'],
      config: {
        configType: 'browser',
        assertions: [
          { type: 'statusCode', operator: 'is', target: test.expectedStatusCode || 200 },
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
        device_ids: [env.device],
        steps: steps
      },
      options: {
        tick_every: env.frequency,
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
 * Update the status of an existing test
 */
function updateTestStatus(testId, status) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      status: status
    });
    
    const options = {
      hostname: 'api.datadoghq.com',
      path: `/api/v1/synthetics/tests/${testId}`,
      method: 'PUT',
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
 * Verify test status after deployment
 */
async function verifyTestStatus() {
  try {
    const tests = await getAllSyntheticTests();
    const liveTests = tests.filter(test => test.status === 'live');
    const pausedTests = tests.filter(test => test.status === 'paused');
    
    console.log(`${colors.green}✅ ${liveTests.length} tests are live${colors.reset}`);
    
    if (pausedTests.length > 0) {
      console.log(`${colors.yellow}⚠️ ${pausedTests.length} tests are paused${colors.reset}`);
      pausedTests.forEach(test => {
        console.log(`  - ${test.name}`);
      });
    }
    
    // Trigger a run of each test
    console.log(`\n${colors.blue}Triggering a run of all live tests...${colors.reset}`);
    if (liveTests.length > 0) {
      await triggerTests(liveTests.map(test => test.public_id));
      console.log(`${colors.green}✅ Successfully triggered ${liveTests.length} tests${colors.reset}`);
    }
    
    console.log(`\n${colors.green}${colors.bright}Deployment complete!${colors.reset}`);
    console.log(`${colors.green}Datadog Synthetics tests are now monitoring your application${colors.reset}`);
    return { liveTests, pausedTests };
  } catch (error) {
    console.error(`${colors.red}Error verifying test status: ${error.message}${colors.reset}`);
    throw error;
  }
}

/**
 * Trigger a run of multiple tests
 */
function triggerTests(testIds) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      tests: testIds.map(id => ({ public_id: id }))
    });
    
    const options = {
      hostname: 'api.datadoghq.com',
      path: '/api/v1/synthetics/tests/trigger',
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
 * Helper function to get formatted URL
 */
function getFormattedUrl(path, env) {
  // Special case for home page
  if (path === '/') {
    return env.baseUrl + path;
  }
  
  // For all other pages, apply path prefix unless it's already included
  if (env.pathPrefix && !path.startsWith(env.pathPrefix)) {
    return `${env.baseUrl}${env.pathPrefix}${path}`;
  } else {
    return `${env.baseUrl}${path}`;
  }
}

// Run main function if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error(`${colors.red}${colors.bright}FATAL ERROR: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = { main, getFormattedUrl, validateUrls };
