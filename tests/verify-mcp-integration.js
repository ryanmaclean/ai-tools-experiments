/**
 * MCP Integration Verification Test
 *
 * This test verifies that the Model Context Protocol (MCP) integration
 * is properly configured and working with the Astro development server.
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Configuration
const MCP_ENDPOINT = 'http://localhost:4321/__mcp/sse';
const CONFIG_FILES = [
  path.join(__dirname, '../.vscode/mcp.json'),
  path.join(__dirname, '../.cursor/mcp.json')
];

/**
 * Test if an HTTP endpoint is available
 * @param {string} url The URL to test
 * @returns {Promise<boolean>} True if endpoint is available
 */
async function isEndpointAvailable(url) {
  return new Promise((resolve) => {
    const req = http.get(url, {
      headers: {
        'Accept': 'text/event-stream'
      }
    }, (res) => {
      // Check if we got a 200 OK response and the correct content type for SSE
      const success = res.statusCode >= 200 && res.statusCode < 300 && 
                    res.headers['content-type'] === 'text/event-stream';
      
      // For SSE endpoints, we don't wait for the connection to close
      // since they're designed to stay open for streaming events
      if (success) {
        // Abort the request since we just needed to check if it's available
        req.destroy();
        resolve(true);
        return;
      }
      
      // For non-SSE endpoints, we consume the response as before
      res.resume();
      res.on('end', () => {
        resolve(success);
      });
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    // Set a timeout of 5 seconds
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Check if the server is running and if not, try to start it
 * @returns {Promise<boolean>} True if server is running
 */
async function ensureServerRunning() {
  console.log('Checking if Astro server is running...');
  
  // First check if we can access the home page
  try {
    const isHomeAvailable = await new Promise((resolve) => {
      const req = http.get('http://localhost:4321/', (res) => {
        const success = res.statusCode >= 200 && res.statusCode < 300;
        res.resume();
        req.destroy();
        resolve(success);
      });
      
      req.on('error', () => {
        resolve(false);
      });
      
      req.setTimeout(3000, () => {
        req.destroy();
        resolve(false);
      });
    });
    
    if (isHomeAvailable) {
      console.log('u2705 Astro server is running (homepage accessible)');
      return true;
    }
  } catch (error) {
    console.log('Error checking homepage:', error.message);
  }
  
  // Next, try to check the MCP endpoint directly
  try {
    // Special case for MCP endpoint test - minimal check just to see if server responds
    const testMcpDirectly = await new Promise((resolve) => {
      const req = http.get('http://localhost:4321/__mcp/sse', {
        headers: { 'Accept': 'text/event-stream' }
      }, (res) => {
        const success = res.statusCode === 200;
        // Immediately end the request
        req.destroy();
        resolve(success);
      });
      
      req.on('error', () => {
        resolve(false);
      });
      
      req.setTimeout(3000, () => {
        req.destroy();
        resolve(false);
      });
    });
    
    if (testMcpDirectly) {
      console.log('u2705 Astro server is running (MCP endpoint accessible)');
      return true;
    }
  } catch (error) {
    console.log('Error checking MCP endpoint:', error.message);
  }
  
  console.log('Astro server not detected. Please start the server with npm run dev');
  return false;
}

/**
 * Check if the MCP endpoint is available
 * @returns {Promise<boolean>} True if MCP endpoint is available
 */
async function testMcpEndpoint() {
  console.log(`Testing MCP endpoint: ${MCP_ENDPOINT}`);
  
  const isAvailable = await isEndpointAvailable(MCP_ENDPOINT);
  
  if (isAvailable) {
    console.log('✅ MCP endpoint is accessible');
    return true;
  } else {
    console.error('❌ MCP endpoint is not accessible');
    return false;
  }
}

/**
 * Check if MCP configuration files exist and are properly set up
 * @returns {boolean} True if configuration files are correctly set up
 */
function testMcpConfigFiles() {
  console.log('Checking MCP configuration files...');
  
  let allValid = true;
  
  for (const configFile of CONFIG_FILES) {
    if (!fs.existsSync(configFile)) {
      console.error(`❌ Configuration file not found: ${configFile}`);
      allValid = false;
      continue;
    }
    
    try {
      // Read the config file
      const configContent = fs.readFileSync(configFile, 'utf8');
      let config;
      
      try {
        config = JSON.parse(configContent);
      } catch (e) {
        console.error(`❌ Invalid JSON in ${configFile}:`, e.message);
        allValid = false;
        continue;
      }
      
      // Check for properly formatted config
      // Either empty object (to be auto-filled) or proper MCP config
      const isEmpty = Object.keys(config).length === 0;
      const hasServerConfig = config.mcpServers && config.mcpServers.astro;
      
      if (isEmpty || hasServerConfig) {
        console.log(`✅ Configuration file valid: ${configFile}`);
      } else {
        console.error(`❌ Configuration file has invalid structure: ${configFile}`);
        allValid = false;
      }
    } catch (error) {
      console.error(`❌ Error reading configuration file ${configFile}:`, error.message);
      allValid = false;
    }
  }
  
  return allValid;
}

/**
 * Verify the integration is properly configured in astro.config.mjs
 * @returns {boolean} True if integration is properly configured
 */
function testAstroConfig() {
  console.log('Verifying Astro configuration...');
  
  const configPath = path.join(__dirname, '../astro.config.mjs');
  
  if (!fs.existsSync(configPath)) {
    console.error('❌ astro.config.mjs not found');
    return false;
  }
  
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Check for astro-mcp import
    const hasImport = configContent.includes("import mcp from 'astro-mcp'") || 
                     configContent.includes("from \"astro-mcp\"");
    
    // Check for mcp integration in the integrations array
    const hasIntegration = configContent.includes('mcp()') || 
                         configContent.includes('mcp()');
    
    if (hasImport && hasIntegration) {
      console.log('✅ astro-mcp integration correctly configured in astro.config.mjs');
      return true;
    } else {
      if (!hasImport) console.error('❌ Missing import for astro-mcp in astro.config.mjs');
      if (!hasIntegration) console.error('❌ Missing mcp() in integrations array in astro.config.mjs');
      return false;
    }
  } catch (error) {
    console.error('❌ Error reading astro.config.mjs:', error.message);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('==== TESTING MCP INTEGRATION ====\n');
  
  // Step 1: Check if server is running or start it
  const serverRunning = await ensureServerRunning();
  if (!serverRunning) {
    console.error('❌ Cannot proceed with tests without a running server');
    process.exit(1);
  }
  
  // Step 2: Check MCP endpoint
  const mcpEndpointAvailable = await testMcpEndpoint();
  
  // Step 3: Check MCP configuration files
  const configFilesValid = testMcpConfigFiles();
  
  // Step 4: Verify Astro configuration
  const astroConfigValid = testAstroConfig();
  
  console.log('\n==== TEST RESULTS ====');
  console.log(`Server Running: ${serverRunning ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`MCP Endpoint Available: ${mcpEndpointAvailable ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Config Files Valid: ${configFilesValid ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Astro Config Valid: ${astroConfigValid ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = serverRunning && mcpEndpointAvailable && configFilesValid && astroConfigValid;
  
  console.log('\n==== OVERALL RESULT ====');
  if (allPassed) {
    console.log('✅ MCP integration is correctly configured and working');
    console.log('\n📝 You can access the MCP documentation at:');
    console.log('  http://localhost:4321/mcp-tools');
    process.exit(0);
  } else {
    console.error('❌ MCP integration has issues that need to be addressed');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Unexpected error during tests:', error);
  process.exit(1);
});
