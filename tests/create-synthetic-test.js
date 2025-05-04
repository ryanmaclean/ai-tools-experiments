#!/usr/bin/env node

/**
 * Direct Datadog Synthetics Test Creator
 * 
 * This script creates a single Datadog synthetic test
 * using the exact API format required by Datadog's current API.
 * 
 * Based on the Datadog API docs: https://docs.datadoghq.com/api/latest/synthetics/
 */

const https = require('https');

// Get Datadog API credentials
const DD_API_KEY = process.env.DD_API_KEY || process.env.TF_VAR_datadog_api_key;
const DD_APP_KEY = process.env.DD_APP_KEY || process.env.TF_VAR_datadog_app_key;

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Configuration
const TEST_CONFIG = {
  name: 'Production - Homepage Test',
  type: 'browser',
  locations: ['aws:us-east-1'],
  message: 'Homepage synthetic test failed',
  tags: ['env:production', 'service:ai-tools-lab'],
  status: 'live',
  config: {
    request: {
      method: 'GET',
      url: 'https://ai-tools-lab.com/'
    },
    assertions: [
      { type: 'statusCode', operator: 'is', target: 200 }
    ],
    variables: [],
    device_ids: ['chrome.laptop_large'],
    steps: [
      {
        name: 'Navigate to homepage',
        type: 'goToUrl',
        url: 'https://ai-tools-lab.com/',
        timeout: 30000,
        allowFailure: false,
      }
    ]
  },
  options: {
    tick_every: 300,
    min_failure_duration: 0,
    min_location_failed: 1,
    retry: { count: 2, interval: 300 },
    monitor_options: {
      renotify_interval: 120,
      notify_audit: true
    }
  }
};

/**
 * Main function
 */
async function main() {
  console.log(`${colors.blue}${colors.bright}CREATING DATADOG SYNTHETIC TEST${colors.reset}`);
  console.log(`${colors.blue}=================================${colors.reset}\n`);
  
  if (!DD_API_KEY || !DD_APP_KEY) {
    console.error(`${colors.red}ERROR: Missing Datadog API credentials${colors.reset}`);
    process.exit(1);
  }
  
  try {
    console.log(`Creating test: ${TEST_CONFIG.name}`);
    const result = await createSyntheticTest(TEST_CONFIG);
    console.log(`${colors.green}✅ Test created successfully! ID: ${result.public_id}${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}ERROR: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Create a synthetic test in Datadog
 */
async function createSyntheticTest(config) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(config);
    
    const options = {
      hostname: 'api.datadoghq.com',
      path: '/api/v1/synthetics/tests',
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
          console.error(`Response data: ${data}`);
          reject(new Error(`API returned status ${res.statusCode}`));
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

// Run the main function
main().catch(error => {
  console.error(`${colors.red}FATAL ERROR: ${error.message}${colors.reset}`);
  process.exit(1);
});
