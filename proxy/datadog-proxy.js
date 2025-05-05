// A secure Netlify serverless function to proxy requests to Datadog
// This handles API keys securely, without exposing them in client-side code
// Deployed to /.netlify/functions/datadog-proxy

const fetch = require('node-fetch');

// Main handler function
exports.handler = async function(event, context) {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
      headers: {
        'Allow': 'POST',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  }

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    // Parse the incoming body
    const payload = JSON.parse(event.body);
    
    // Get API keys securely from environment variables (set in Netlify dashboard)
    // These are never exposed to the client
    const DD_API_KEY = process.env.DD_API_KEY;
    const DD_APP_KEY = process.env.DD_APP_KEY;
    
    // Validate API keys without logging them
    if (!DD_API_KEY) {
      console.error('Datadog API key not configured');
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          error: 'Server configuration error', 
          details: 'Missing API key configuration'
        })
      };
    }
    
    // Add additional context to the payload
    const enhancedPayload = payload.map(item => ({
      ...item,
      timestamp: item.timestamp || new Date().toISOString(),
      env: process.env.CONTEXT || 'development',
      netlify: true,
      host: event.headers.host,
      user_agent: event.headers['user-agent'],
      source_ip: event.headers['x-forwarded-for'] || event.headers['client-ip'],
      path: event.path
    }));
    
    // Send the request to Datadog without logging the payload or API keys
    // https://docs.datadoghq.com/api/latest/logs/
    const response = await fetch('https://http-intake.logs.datadoghq.com/api/v2/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': DD_API_KEY,
        // Only add APP_KEY if available
        ...(DD_APP_KEY ? { 'DD-APPLICATION-KEY': DD_APP_KEY } : {})
      },
      body: JSON.stringify(enhancedPayload)
    });
    
    // Handle response
    if (!response.ok) {
      console.error(`Datadog API error: ${response.status}`);
      return {
        statusCode: response.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          error: 'Datadog API error', 
          status: response.status
        })
      };
    }
    
    // Get the response text - don't parse as JSON to avoid errors 
    // if Datadog returns an empty body or non-JSON response
    const responseText = await response.text();
    
    // Return success, masking any sensitive data in the response
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    // Log the error type but not details that might contain sensitive data
    console.error(`Error in Datadog proxy: ${error.name}`);
    
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        error: 'Internal Server Error',
        type: error.name
      })
    };
  }
};