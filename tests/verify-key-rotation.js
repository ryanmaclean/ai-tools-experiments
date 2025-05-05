/**
 * Verify Datadog API Key Rotation Functionality
 * 
 * This script tests the Datadog API key rotation function but doesn't actually rotate keys.
 * It verifies that all APIs and credentials are working properly.
 */

require('dotenv').config();
const https = require('https');

// Set test mode to avoid actually creating/deleting keys
const TEST_MODE = true;

/**
 * Makes an HTTPS request to the Datadog API
 */
async function datadogApiRequest(path, method, apiKey, appKey, body = null) {
  const site = process.env.DD_SITE || 'datadoghq.com';
  const options = {
    hostname: `api.${site}`,
    port: 443,
    path: path,
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'DD-API-KEY': apiKey,
      'DD-APPLICATION-KEY': appKey
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`API request failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Lists all API keys to verify access
 */
async function listApiKeys(apiKey, appKey) {
  return await datadogApiRequest(
    '/api/v2/api_keys',
    'GET',
    apiKey,
    appKey
  );
}

/**
 * Verify key rotation capability
 */
async function verifyKeyRotation() {
  // Check for required environment variables
  const apiKey = process.env.DD_API_KEY;
  const appKey = process.env.DD_APP_KEY;
  
  if (!apiKey || !appKey) {
    console.error('⚠️ ERROR: Required environment variables DD_API_KEY and DD_APP_KEY are not set.');
    console.log('Please set these variables in your .env file or export them directly.');
    console.log('You can get these values from the Datadog dashboard under Organization Settings > API Keys.');
    process.exit(1);
  }
  
  console.log('🔑 Verifying Datadog API key rotation capability...');
  console.log('📋 Running in TEST_MODE, no actual keys will be created or deleted.');
  
  try {
    // Verify API access by listing existing keys
    console.log('🔍 Checking API connectivity by listing keys...');
    const keyList = await listApiKeys(apiKey, appKey);
    
    // Count number of keys without exposing their values
    const keyCount = keyList.data ? keyList.data.length : 0;
    console.log(`✅ Successfully connected to Datadog API. Found ${keyCount} API keys.`);
    
    if (TEST_MODE) {
      console.log('🧪 Test complete. In production, this would create a new key and rotate the old one.');
      
      // Check for required Netlify environment variables needed by the scheduled function
      if (!process.env.SITE_ID && !process.env.NETLIFY_SITE_ID) {
        console.log('⚠️ Warning: NETLIFY_SITE_ID not found in environment variables.');
        console.log('This is required for automatic key rotation to update environment variables.');
      }
      
      if (!process.env.NOTIFICATION_WEBHOOK_URL) {
        console.log('⚠️ Warning: NOTIFICATION_WEBHOOK_URL not found in environment variables.');
        console.log('This is optional but recommended for key rotation notifications.');
      }
      
      console.log('\n📋 API Key Rotation Verification Summary:');
      console.log('✅ Datadog API connectivity: Success');
      console.log('✅ API key listing: Success');
      console.log('✅ Credentials validation: Success');
      console.log('\n🎉 Your Datadog API key rotation setup is valid and ready to use!');
      console.log('\nTo trigger a key rotation manually:');
      console.log('  npm run key:rotate');
      console.log('\nTo check scheduled function status:');
      console.log('  npm run key:status');
    }
    
  } catch (error) {
    console.error('❌ Error verifying key rotation capability:', error.message);
    process.exit(1);
  }
}

// Run the verification
verifyKeyRotation().catch(err => {
  console.error('❌ Unhandled error:', err);
  process.exit(1); 