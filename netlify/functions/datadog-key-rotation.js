/**
 * Datadog API Key Rotation Netlify Function
 * 
 * This function handles automatic rotation of Datadog API keys.
 * It leverages Netlify's scheduled function capability and environment variables.
 */

const https = require('https');
const { schedule } = require('@netlify/functions');

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
 * Creates a new Datadog API key
 */
async function createNewApiKey(currentApiKey, currentAppKey) {
  const response = await datadogApiRequest(
    '/api/v2/api_keys', 
    'POST', 
    currentApiKey, 
    currentAppKey, 
    {
      data: {
        type: 'api_keys',
        attributes: {
          name: `Rotated Key ${new Date().toISOString()}`,
          scopes: ['logs_read', 'logs_write', 'rum_write', 'metrics_write', 'synthetics_read', 'synthetics_write']
        }
      }
    }
  );
  
  return response.data.attributes.key;
}

/**
 * Lists all API keys to find the one we want to delete
 */
async function getApiKeyId(apiKey, appKey, targetKey) {
  const response = await datadogApiRequest(
    '/api/v2/api_keys',
    'GET',
    apiKey,
    appKey
  );
  
  // Find the key with the matching value
  const keys = response.data || [];
  const matchingKey = keys.find(k => k.attributes && k.attributes.key === targetKey);
  return matchingKey ? matchingKey.id : null;
}

/**
 * Deletes an old Datadog API key
 */
async function deleteOldApiKey(keyId, apiKey, appKey) {
  await datadogApiRequest(
    `/api/v2/api_keys/${keyId}`,
    'DELETE',
    apiKey,
    appKey
  );
}

/**
 * Updates Netlify environment variables with the new API key
 */
async function updateNetlifyEnvironment(siteId, newApiKey) {
  // This requires the netlify-cli or Netlify API access
  // For a more complete implementation, you could use Netlify's API:
  // https://open-api.netlify.com/#operation/updateEnvVar
  
  console.log('Would update Netlify environment variable with new API key');
  
  // In practice, this would update the NETLIFY_ENV_DD_API_KEY
  // This might require manual approval or an additional step
  return true;
}

/**
 * Notifies team of key rotation via a webhook
 */
async function notifyTeam(message) {
  // Send to Slack, Teams, or email
  if (process.env.NOTIFICATION_WEBHOOK_URL) {
    try {
      const payload = { text: message };
      await fetch(process.env.NOTIFICATION_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }
}

/**
 * Main handler for the Netlify Function
 * This uses Netlify's scheduled functions feature
 * See: https://docs.netlify.com/functions/scheduled-functions/
 */
const handler = async (event) => {
  try {
    console.log('Starting Datadog API key rotation');
    
    // Get API keys from environment variables
    const currentApiKey = process.env.DD_API_KEY;
    const currentAppKey = process.env.DD_APP_KEY;
    
    if (!currentApiKey || !currentAppKey) {
      throw new Error('Missing required Datadog API credentials');
    }
    
    // Create new API key
    const newApiKey = await createNewApiKey(currentApiKey, currentAppKey);
    console.log('New API key created successfully');
    
    // Store rotation metadata with the new key
    // Using Netlify's environment variable API would be ideal here
    // Alternatively, you could store this in Datadog as a metric/event
    const rotationTimestamp = new Date().toISOString();
    
    // Notify site administrators about the new key
    await notifyTeam(`Datadog API key rotated successfully at ${rotationTimestamp}. Please update CI/CD systems.`);
    
    // Find and delete the old key
    const oldKeyId = await getApiKeyId(newApiKey, currentAppKey, currentApiKey);
    if (oldKeyId) {
      await deleteOldApiKey(oldKeyId, newApiKey, currentAppKey);
      console.log('Old API key deleted successfully');
    } else {
      console.log('Could not find old API key ID, manual cleanup may be required');
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Datadog API key rotation completed successfully',
        timestamp: rotationTimestamp,
        // Never return the actual API key in response
      })
    };
  } catch (error) {
    console.error('Error during key rotation:', error);
    
    await notifyTeam(`⚠️ ERROR: Datadog API key rotation failed: ${error.message}`);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error during Datadog API key rotation',
        error: error.message
      })
    };
  }
};

// Schedule the function to run monthly
// This uses Netlify's scheduled functions feature
exports.handler = schedule('0 0 1 * *', handler); // Run at midnight on the 1st of every month 