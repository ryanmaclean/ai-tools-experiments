/**
 * Simple test script to check if the MCP endpoint is accessible
 */

const http = require('http');

const MCP_ENDPOINT = 'http://localhost:4321/__mcp/sse';

function testEndpoint() {
  console.log(`Testing MCP endpoint: ${MCP_ENDPOINT}`);
  
  const req = http.get(MCP_ENDPOINT, {
    headers: {
      'Accept': 'text/event-stream'
    }
  }, (res) => {
    console.log(`Response status code: ${res.statusCode}`);
    console.log('Response headers:', res.headers);
    
    // Print the first chunk of data
    let data = '';
    res.on('data', (chunk) => {
      data += chunk.toString();
      if (data.length > 200) {
        console.log('First 200 characters of response:', data.substring(0, 200));
        req.destroy(); // End the request after we get some data
      }
    });
    
    res.on('end', () => {
      if (data.length <= 200) {
        console.log('Complete response:', data);
      }
      console.log('Connection ended normally');
    });
  });
  
  req.on('error', (err) => {
    console.error('Error connecting to MCP endpoint:', err.message);
  });
  
  // Set a timeout of 10 seconds
  req.setTimeout(10000, () => {
    console.log('Request timed out after 10 seconds');
    req.destroy();
  });
}

testEndpoint();
