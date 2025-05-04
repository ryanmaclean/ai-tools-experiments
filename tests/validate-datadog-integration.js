/**
 * Datadog Integration Validation Script
 * 
 * This script validates that our Datadog integration is working correctly
 * by making API calls to Datadog and checking for expected data.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file if present
try {
  const dotenvPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(dotenvPath)) {
    require('dotenv').config({ path: dotenvPath });
  }
} catch (error) {
  console.warn('Warning: Could not load .env file:', error.message);
}

// Datadog API Keys (from environment variables)
const DD_API_KEY = process.env.DD_API_KEY;
const DD_APP_KEY = process.env.DD_APP_KEY;

// Function to validate keys
function validateApiKeys() {
  if (!DD_API_KEY) {
    console.error('❌ ERROR: DD_API_KEY environment variable is not set');
    console.log('Please set the DD_API_KEY environment variable and try again.');
    process.exit(1);
  }
  
  if (!DD_APP_KEY) {
    console.error('❌ ERROR: DD_APP_KEY environment variable is not set');
    console.log('Please set the DD_APP_KEY environment variable and try again.');
    process.exit(1);
  }
  
  console.log('✅ API keys are set');
  return true;
}

// Check if RUM is reporting data
async function validateRumIntegration() {
  console.log('\n🔍 Validating RUM integration...');
  
  try {
    // Query RUM sessions from the last hour
    const response = await axios.get('https://api.datadoghq.com/api/v2/rum/sessions', {
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': DD_API_KEY,
        'DD-APPLICATION-KEY': DD_APP_KEY
      },
      params: {
        from: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        to: Math.floor(Date.now() / 1000),
        limit: 10
      }
    });
    
    const sessions = response.data.data || [];
    
    if (sessions.length > 0) {
      console.log(`✅ Found ${sessions.length} RUM sessions in the last hour.`);
      sessions.forEach((session, index) => {
        console.log(`  - Session ${index + 1}: ${session.id}`);
      });
      return true;
    } else {
      console.warn('⚠️ No RUM sessions found. RUM may not be correctly configured or there has been no traffic.');
      return false;
    }
  } catch (error) {
    console.error('❌ Error validating RUM integration:', error.response?.data || error.message);
    return false;
  }
}

// Check for test results in Datadog
async function validateTestIntegration() {
  console.log('\n🔍 Validating Continuous Testing integration...');
  
  try {
    // Query test runs from the last day
    const response = await axios.get('https://api.datadoghq.com/api/v2/ci/tests/runs', {
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': DD_API_KEY,
        'DD-APPLICATION-KEY': DD_APP_KEY
      },
      params: {
        from: Math.floor(Date.now() / 1000) - 86400, // 24 hours ago
        to: Math.floor(Date.now() / 1000),
        limit: 10
      }
    });
    
    const testRuns = response.data.data || [];
    
    if (testRuns.length > 0) {
      console.log(`✅ Found ${testRuns.length} test runs in the last 24 hours.`);
      testRuns.forEach((run, index) => {
        const testName = run.attributes?.name || 'Unknown test';
        const status = run.attributes?.status || 'unknown';
        console.log(`  - Test ${index + 1}: ${testName} (${status})`);
      });
      return true;
    } else {
      console.warn('⚠️ No test runs found. CI Visibility may not be correctly configured or no tests have been run.');
      return false;
    }
  } catch (error) {
    console.error('❌ Error validating test integration:', error.response?.data || error.message);
    return false;
  }
}

// Check Datadog metrics for our application
async function validateMetrics() {
  console.log('\n🔍 Validating metrics...');
  
  try {
    // Query custom metrics
    const response = await axios.get('https://api.datadoghq.com/api/v1/metrics', {
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': DD_API_KEY,
        'DD-APPLICATION-KEY': DD_APP_KEY
      }
    });
    
    const metrics = response.data.metrics || [];
    
    // Filter for our application's metrics
    const appMetrics = metrics.filter(metric => 
      metric.includes('test.') || 
      metric.includes('rum.') ||
      metric.includes('ai-tools-lab')
    );
    
    if (appMetrics.length > 0) {
      console.log(`✅ Found ${appMetrics.length} metrics related to our application.`);
      appMetrics.forEach((metric, index) => {
        if (index < 10) console.log(`  - ${metric}`);
      });
      if (appMetrics.length > 10) {
        console.log(`  - Plus ${appMetrics.length - 10} more...`);
      }
      return true;
    } else {
      console.warn('⚠️ No application-specific metrics found. Metrics may not be correctly configured.');
      return false;
    }
  } catch (error) {
    console.error('❌ Error validating metrics:', error.response?.data || error.message);
    return false;
  }
}

// Main validation function
async function validateDatadogIntegration() {
  console.log('🔄 Starting Datadog integration validation');
  console.log('========================================');
  
  // Check API keys
  if (!validateApiKeys()) return;
  
  // Results tracking
  const results = {
    rum: await validateRumIntegration(),
    tests: await validateTestIntegration(),
    metrics: await validateMetrics()
  };
  
  // Summary
  console.log('\n📊 Integration Validation Summary');
  console.log('========================================');
  console.log(`RUM Integration: ${results.rum ? '✅ Working' : '❌ Not detected'}`); 
  console.log(`Test Integration: ${results.tests ? '✅ Working' : '❌ Not detected'}`); 
  console.log(`Metrics: ${results.metrics ? '✅ Working' : '❌ Not detected'}`); 
  
  const overallStatus = Object.values(results).some(r => r) ? 
    '🟡 Partially Working' : 
    (Object.values(results).every(r => r) ? 
      '🟢 Fully Working' : 
      '🔴 Not Working');
  
  console.log(`\nOverall Status: ${overallStatus}`);
  
  // Recommendations
  console.log('\n📝 Recommendations:');
  if (!results.rum) {
    console.log('- Ensure Datadog RUM is properly initialized in MainLayout.astro');
    console.log('- Check that browser-rum package is correctly imported');
    console.log('- Generate some traffic on the site to create RUM events');
  }
  
  if (!results.tests) {
    console.log('- Run test:visual:dd command to generate test data');
    console.log('- Check that @datadog/datadog-ci package is installed');
    console.log('- Ensure DD_API_KEY is set when running tests');
  }
  
  if (!results.metrics) {
    console.log('- Check custom metrics implementation');
    console.log('- Ensure the application is sending metrics to Datadog');
  }
  
  console.log('\nRun this script again after addressing these issues to validate your integration.');
}

// Run the validation
validateDatadogIntegration().catch(error => {
  console.error('Error during validation:', error);
  process.exit(1);
});
