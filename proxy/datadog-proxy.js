// A simple Netlify serverless function to proxy requests to Datadog
// This will be deployed to /.netlify/functions/datadog-proxy

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
    
    // Get API keys from environment variables (set in Netlify dashboard)
    const DD_API_KEY = process.env.DD_API_KEY;
    const DD_APP_KEY = process.env.DD_APP_KEY;
    
    if (!DD_API_KEY || !DD_APP_KEY) {
      console.error('Datadog API keys not configured');
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Server misconfiguration - Datadog API keys not set' })
      };
    }
    
    // Send the request to Datadog
    const fetch = require('node-fetch');
    const response = await fetch('https://http-intake.logs.datadoghq.com/api/v2/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': DD_API_KEY,
        'DD-APPLICATION-KEY': DD_APP_KEY
      },
      body: JSON.stringify(payload)
    });
    
    // Get the response text
    const responseText = await response.text();
    
    // Return the response
    return {
      statusCode: response.status,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: responseText
    };
  } catch (error) {
    console.error('Error in Datadog proxy:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message })
    };
  }
};