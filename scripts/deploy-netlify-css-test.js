#!/usr/bin/env node

/**
 * Deploy Netlify CSS Validation Synthetic Test
 * 
 * This script deploys the Datadog synthetic test for Netlify CSS validation
 * using the Datadog API client. It creates or updates the test programmatically
 * rather than requiring Terraform to be run.
 *
 * Run with: node scripts/deploy-netlify-css-test.js
 */

'use strict';

const datadogApi = require('../utils/datadog-api-client');
const fs = require('fs');
const path = require('path');

// Configuration
const NETLIFY_URL = process.env.NETLIFY_URL || 'https://ai-tools-lab.com';
const TEST_NAME = 'Netlify Site CSS Validation';
const TEST_LOCATIONS = ['aws:us-west-1', 'aws:us-east-2'];

/**
 * Extract browser steps from Terraform file
 * @returns {Array} Array of browser step objects
 */
function extractBrowserSteps() {
  const terraformPath = path.join(__dirname, '..', 'terraform', 'netlify_css_validation_test.tf');
  const terraformContent = fs.readFileSync(terraformPath, 'utf8');
  
  // Extract browser step blocks
  const browserStepBlocks = [];
  const stepMatches = terraformContent.matchAll(/browser_step\s*{([\s\S]*?)}/g);
  
  for (const match of stepMatches) {
    const stepBlock = match[1];
    
    // Extract name
    const nameMatch = stepBlock.match(/name\s*=\s*"([^"]*)"/); 
    const name = nameMatch ? nameMatch[1] : 'Unnamed step';
    
    // Extract type
    const typeMatch = stepBlock.match(/type\s*=\s*"([^"]*)"/); 
    const type = typeMatch ? typeMatch[1] : 'assertFromJavascript';
    
    // Extract code
    const codeMatch = stepBlock.match(/code\s*=\s*<<-EOF([\s\S]*?)EOF/); 
    const code = codeMatch ? codeMatch[1].trim() : '';
    
    // Extract timeout
    const timeoutMatch = stepBlock.match(/timeout\s*=\s*([0-9]+)/); 
    const timeout = timeoutMatch ? parseInt(timeoutMatch[1]) : 10;
    
    // Extract allow_failure
    const allowFailureMatch = stepBlock.match(/allow_failure\s*=\s*(true|false)/); 
    const allowFailure = allowFailureMatch ? allowFailureMatch[1] === 'true' : false;
    
    browserStepBlocks.push({
      name,
      type,
      code,
      timeout,
      allowFailure
    });
  }
  
  return browserStepBlocks;
}

/**
 * Create the synthetic test configuration
 * @returns {Object} Test configuration object
 */
function createTestConfig() {
  const browserSteps = extractBrowserSteps();
  
  return {
    name: TEST_NAME,
    type: 'browser',
    request: { 
      method: 'GET',
      url: NETLIFY_URL
    },
    locations: TEST_LOCATIONS,
    message: 'The CSS validation test for the Netlify site has failed. Please check the visual styling and CSS properties.',
    tags: ['env:production', 'app:ai-tools-lab', 'service:frontend', 'team:frontend'],
    config: {
      assertions: [
        {
          type: 'statusCode',
          operator: 'is',
          target: 200
        }
      ],
      variables: [],
      browserSteps: browserSteps.map(step => ({
        name: step.name,
        type: step.type,
        allowFailure: step.allowFailure,
        timeout: step.timeout,
        params: {
          code: step.code
        }
      })),
      request: {
        method: 'GET',
        url: NETLIFY_URL
      }
    },
    options: {
      ci: {
        executionRule: 'blocking'
      },
      device: {
        id: 'chrome.laptop_large',
        type: 'chrome'
      },
      retry: {
        count: 2,
        interval: 300
      },
      minLocationFailed: 1,
      minFailureDuration: 300,
      scheduling: {
        timezone: 'America/Los_Angeles',
        timeframes: [
          {
            day: 1,
            from: '9:00',
            to: '19:00'
          },
          {
            day: 2,
            from: '9:00',
            to: '19:00'
          },
          {
            day: 3,
            from: '9:00',
            to: '19:00'
          },
          {
            day: 4,
            from: '9:00',
            to: '19:00'
          },
          {
            day: 5,
            from: '9:00',
            to: '19:00'
          }
        ]
      },
      tickEvery: 900
    }
  };
}

/**
 * Check if the test already exists and get its ID
 * @returns {Promise<string|null>} Test ID if found, null otherwise
 */
async function getExistingTestId() {
  try {
    const response = await datadogApi.synthetics.getAllTests();
    
    if (!response.success || !response.data) {
      console.error('Failed to fetch existing tests:', response.error);
      return null;
    }
    
    const tests = response.data.tests || [];
    const match = tests.find(test => test.name === TEST_NAME);
    
    return match ? match.public_id : null;
  } catch (error) {
    console.error('Error finding existing test:', error);
    return null;
  }
}

/**
 * Create a new synthetic test
 * @param {Object} config - Test configuration
 * @returns {Promise<Object>} Creation result
 */
async function createTest(config) {
  // TODO: Use the Datadog API client to create the test
  // This is a placeholder since our current API client doesn't have a direct method for this
  console.log('Creating new test with config:', JSON.stringify(config, null, 2));
  
  // For now we'll log the config and recommend using the Datadog UI
  console.log('\nTo create this test in Datadog:');
  console.log('1. Go to Datadog > UX Monitoring > Synthetic Tests');
  console.log('2. Click "New Test" > "Browser Test"');
  console.log(`3. Set the URL to: ${NETLIFY_URL}`);
  console.log('4. Add the browser steps defined in the test config');
  console.log('5. Set the name, locations, and scheduling options');
  
  return {
    success: false,
    message: 'Manual creation required. API method not implemented yet.'
  };
}

/**
 * Deploy the synthetic test
 */
async function deployTest() {
  console.log(`Deploying Netlify CSS Validation Synthetic Test for ${NETLIFY_URL}...`);
  
  // Check if we have a valid Datadog API client
  if (!datadogApi.isReady()) {
    console.error('Datadog API client is not initialized. Check your API keys.');
    process.exit(1);
  }
  
  // Extract browser steps from Terraform file
  const browserSteps = extractBrowserSteps();
  console.log(`Extracted ${browserSteps.length} browser steps from Terraform config`);
  
  // Create the test configuration
  const config = createTestConfig();
  
  // Check if the test already exists
  const existingTestId = await getExistingTestId();
  
  if (existingTestId) {
    console.log(`Test already exists with ID: ${existingTestId}`);
    console.log('To update the test, use the Datadog UI or extend this script to support updates.');
  } else {
    // Create the test
    const result = await createTest(config);
    console.log('Test creation result:', result);
  }
}

// Run the script
deployTest().catch(error => {
  console.error('Error deploying test:', error);
  process.exit(1);
});
