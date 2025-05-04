/**
 * Datadog Synthetics Tests Setup Script
 * 
 * This script programmatically creates browser-based synthetic tests in Datadog
 * for all routes defined in the synthetics-config.js file.
 * 
 * It uses the Datadog API to create and manage the tests, and provides
 * reporting on test creation/update status.
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { generateRouteTests, getUrl } = require('./synthetics-config');

// Get Datadog API credentials from environment variables
const DD_API_KEY = process.env.DD_API_KEY;
const DD_APP_KEY = process.env.DD_APP_KEY;

// Configuration
const API_URL = 'https://api.datadoghq.com/api/v1/synthetics/tests';
const TEMPLATES_DIR = path.join(__dirname, 'synthetics-templates');
const DEFAULT_ENVIRONMENT = 'production'; // or 'staging'

// Validate required environment variables
if (!DD_API_KEY || !DD_APP_KEY) {
  console.error('\n❌ ERROR: Datadog API or Application Key is missing');
  console.log('Please ensure your .env file contains DD_API_KEY and DD_APP_KEY');
  process.exit(1);
}

// Generate test script from template
async function generateTestScript(route, type, env) {
  try {
    // Load the appropriate template based on the route type
    const templatePath = path.join(TEMPLATES_DIR, `${type}.js`);
    const templateExists = await fs.access(templatePath).then(() => true).catch(() => false);
    
    // Use default template if specific one doesn't exist
    const actualTemplatePath = templateExists 
      ? templatePath 
      : path.join(TEMPLATES_DIR, 'default.js');
    
    // Read the template
    let scriptTemplate = await fs.readFile(actualTemplatePath, 'utf8');
    
    // Replace placeholders with actual values
    scriptTemplate = scriptTemplate
      .replace(/\{\{ROUTE\}\}/g, route)
      .replace(/\{\{URL\}\}/g, getUrl(route, env));
    
    return scriptTemplate;
  } catch (error) {
    console.error(`Error generating test script for ${route}:`, error.message);
    throw error;
  }
}

// Create a synthetic test in Datadog
async function createSyntheticTest(testConfig, env = DEFAULT_ENVIRONMENT) {
  try {
    // Generate the browser test script
    const script = await generateTestScript(testConfig.route, testConfig.type, env);
    
    // Build request payload
    const payload = {
      name: testConfig.name,
      type: 'browser',
      config: {
        request: {
          method: 'GET',
          url: getUrl(testConfig.route, env)
        },
        assertions: [],
        variables: [],
        locations: testConfig.locations,
        options: {
          tick_every: testConfig.frequency * 60, // Convert minutes to seconds
          min_failure_duration: 300, // 5 minutes
          min_location_failed: 1,
          retry: {
            count: 2,
            interval: 300 // 5 minutes
          },
          monitor_options: {
            renotify_interval: 120 // 2 hours
          }
        },
        set_cookie: '',
        browser_type: 'chrome',
        device_ids: ['laptop_large'],
        steps: [{
          name: `Visit ${testConfig.name}`,
          type: 'javascript',
          code: script,
          params: {}
        }]
      },
      message: `Synthetic test for ${testConfig.route} failed. Please check the site availability and functionality.`,
      status: 'live',
      tags: ['ai-tools-lab', `route:${testConfig.route}`, `env:${env}`],
      step_count: 1
    };

    // Add assertions from test config to step params
    if (testConfig.assertions && testConfig.assertions.length > 0) {
      payload.config.steps[0].params.assertions = testConfig.assertions;
    }

    // Make API request to create the test
    const response = await axios.post(API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': DD_API_KEY,
        'DD-APPLICATION-KEY': DD_APP_KEY
      }
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`Error creating test for ${testConfig.route}:`, error.response.data);
    } else {
      console.error(`Error creating test for ${testConfig.route}:`, error.message);
    }
    return null;
  }
}

// List existing synthetic tests
async function listSyntheticTests() {
  try {
    const response = await axios.get(API_URL, {
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': DD_API_KEY,
        'DD-APPLICATION-KEY': DD_APP_KEY
      }
    });

    return response.data.tests || [];
  } catch (error) {
    console.error('Error listing synthetic tests:', error.message);
    return [];
  }
}

// Update an existing test
async function updateSyntheticTest(testId, testConfig, env = DEFAULT_ENVIRONMENT) {
  try {
    // Generate the browser test script
    const script = await generateTestScript(testConfig.route, testConfig.type, env);
    
    // Build request payload (similar to create but with updated values)
    const payload = {
      name: testConfig.name,
      config: {
        request: {
          method: 'GET',
          url: getUrl(testConfig.route, env)
        },
        assertions: [],
        variables: [],
        locations: testConfig.locations,
        options: {
          tick_every: testConfig.frequency * 60, // Convert minutes to seconds
          min_failure_duration: 300, // 5 minutes
          min_location_failed: 1,
        },
        browser_type: 'chrome',
        device_ids: ['laptop_large'],
        steps: [{
          name: `Visit ${testConfig.name}`,
          type: 'javascript',
          code: script,
          params: {}
        }]
      },
      message: `Synthetic test for ${testConfig.route} failed. Please check the site availability and functionality.`,
      status: 'live',
      tags: ['ai-tools-lab', `route:${testConfig.route}`, `env:${env}`],
    };

    // Add assertions from test config to step params
    if (testConfig.assertions && testConfig.assertions.length > 0) {
      payload.config.steps[0].params.assertions = testConfig.assertions;
    }

    // Make API request to update the test
    const response = await axios.put(`${API_URL}/${testId}`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': DD_API_KEY,
        'DD-APPLICATION-KEY': DD_APP_KEY
      }
    });

    return response.data;
  } catch (error) {
    console.error(`Error updating test for ${testConfig.route}:`, error.message);
    return null;
  }
}

// Main function to set up all synthetic tests
async function setupSyntheticTests() {
  console.log('🔄 Setting up Datadog Synthetic Tests...');
  console.log('========================================');

  try {
    // Get all the route tests from config
    const routeTests = generateRouteTests();
    console.log(`Found ${routeTests.length} routes to test`);

    // Get existing tests to avoid duplicates
    const existingTests = await listSyntheticTests();
    console.log(`Found ${existingTests.length} existing synthetic tests in Datadog`);

    // Keep track of created/updated tests
    const createdTests = [];
    const updatedTests = [];
    const failedTests = [];
    
    // Create or update tests for each route
    for (const testConfig of routeTests) {
      // Check if test already exists by matching tags
      const existingTest = existingTests.find(test => {
        const routeTag = test.tags.find(tag => tag.startsWith('route:'));
        return routeTag && routeTag === `route:${testConfig.route}`;
      });

      if (existingTest) {
        // Update existing test
        console.log(`Updating test for ${testConfig.route}...`);
        const result = await updateSyntheticTest(existingTest.public_id, testConfig);
        if (result) {
          updatedTests.push({ route: testConfig.route, id: existingTest.public_id });
        } else {
          failedTests.push({ route: testConfig.route, action: 'update' });
        }
      } else {
        // Create new test
        console.log(`Creating test for ${testConfig.route}...`);
        const result = await createSyntheticTest(testConfig);
        if (result) {
          createdTests.push({ route: testConfig.route, id: result.public_id });
        } else {
          failedTests.push({ route: testConfig.route, action: 'create' });
        }
      }
    }

    // Print summary
    console.log('\n📊 Synthetic Tests Setup Summary');
    console.log('========================================');
    console.log(`Created: ${createdTests.length} tests`);
    console.log(`Updated: ${updatedTests.length} tests`);
    console.log(`Failed: ${failedTests.length} tests`);

    if (createdTests.length > 0) {
      console.log('\nCreated Tests:');
      createdTests.forEach(test => console.log(`- ${test.route} (ID: ${test.id})`));
    }

    if (updatedTests.length > 0) {
      console.log('\nUpdated Tests:');
      updatedTests.forEach(test => console.log(`- ${test.route} (ID: ${test.id})`));
    }

    if (failedTests.length > 0) {
      console.log('\nFailed Tests:');
      failedTests.forEach(test => console.log(`- ${test.route} (action: ${test.action})`));
    }

    console.log('\n✅ Synthetic tests setup complete');
    console.log('View your tests at: https://app.datadoghq.com/synthetics/tests');

  } catch (error) {
    console.error('Error setting up synthetic tests:', error.message);
  }
}

// Run the script if called directly
if (require.main === module) {
  setupSyntheticTests();
}

// Export functions for use in other scripts
module.exports = {
  setupSyntheticTests,
  createSyntheticTest,
  updateSyntheticTest,
  listSyntheticTests
};
