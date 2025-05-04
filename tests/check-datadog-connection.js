/**
 * Datadog Connection Verification
 * 
 * This script verifies the Datadog API connection using environment variables
 * in the .env file. It will not expose any credentials in the code.
 */

require('dotenv').config();
const axios = require('axios');

// Get credentials from environment variables
const DD_API_KEY = process.env.DD_API_KEY;
const DD_APP_KEY = process.env.DD_APP_KEY;

async function validateDatadogConnection() {
  console.log('Verifying Datadog API connection...');
  
  // Check if environment variables are set
  if (!DD_API_KEY || !DD_APP_KEY) {
    console.error('\n❌ ERROR: Datadog API keys are not set in environment variables');
    console.log('Please ensure your .env file contains DD_API_KEY and DD_APP_KEY');
    return false;
  }
  
  try {
    // Basic validation call
    const response = await axios.get('https://api.datadoghq.com/api/v1/validate', {
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': DD_API_KEY
      }
    });
    
    console.log('\nAPI validation response:', response.data);
    
    if (response.data && response.data.valid) {
      console.log('✅ API key is valid!');
    } else {
      console.log('❌ API key validation failed.');
    }
    
    // Check if RUM is configured
    const rumResponse = await axios.get('https://api.datadoghq.com/api/v2/rum/applications', {
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': DD_API_KEY,
        'DD-APPLICATION-KEY': DD_APP_KEY
      }
    });
    
    console.log('\n📱 RUM Applications:');
    if (rumResponse.data && rumResponse.data.data) {
      for (const app of rumResponse.data.data) {
        console.log(`- ${app.attributes.name} (${app.id})`);
        
        // Check if this matches our configured RUM app ID
        if (app.id === 'db2aad17-02cf-4e95-bee7-09293dd29f1a') {
          console.log('  ✅ Matches our configured RUM application ID!');
        }
      }
    }
    
    // Check for test results
    console.log('\n🧪 Checking for test results...');
    const testResponse = await axios.get('https://api.datadoghq.com/api/v2/ci/tests/runs', {
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': DD_API_KEY,
        'DD-APPLICATION-KEY': DD_APP_KEY
      },
      params: {
        from: Math.floor(Date.now() / 1000) - 86400, // 24 hours ago
        to: Math.floor(Date.now() / 1000)
      }
    });
    
    if (testResponse.data && testResponse.data.data && testResponse.data.data.length > 0) {
      console.log(`✅ Found ${testResponse.data.data.length} test runs in the last 24 hours`);
      testResponse.data.data.slice(0, 5).forEach((test, i) => {
        console.log(`- Test ${i+1}: ${test.attributes?.name || 'Unknown'} (${test.attributes?.status || 'unknown'})`);
      });
    } else {
      console.log('ℹ️ No test runs found in the last 24 hours.');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error validating Datadog connection:', error.response?.data || error.message);
    return false;
  }
}

validateDatadogConnection();
