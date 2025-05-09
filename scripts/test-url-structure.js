#!/usr/bin/env node

/**
 * Test URL Structure Script
 *
 * This script tests the URL structure of the test site against production
 * to ensure they match exactly. It performs actual HTTP requests and verifies
 * correct redirects and status codes.
 */

const https = require('https');
const util = require('util');

// Configuration
const config = {
  production: 'ai-tools-lab.com',
  test: 'ai-tools-lab-tst.netlify.app',
  // URLs to test (relative paths)
  paths: [
    '/',                  // Root
    '/pages/',            // Pages directory
    '/pages/resources',   // Resources
    '/pages/observations', // Observations
    '/pages/about',       // About
    '/pages/ep01',        // Episode 1
    '/pages/ep17',        // Episode 17 sequential until here
    '/pages/ep20',        // Episode 20
    '/pages/ep28',        // Latest Episode
  ],
  timeout: 10000, // 10 seconds timeout
};

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

/**
 * Make an HTTP request with redirect handling
 */
function request(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Return redirect info
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          redirectUrl: res.headers.location,
          isRedirect: true
        });
        return;
      }
      
      // Non-redirect response
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          isRedirect: false
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    // Handle timeout
    req.setTimeout(config.timeout, () => {
      req.abort();
      reject(new Error(`Request to ${options.hostname}${options.path} timed out`));
    });
    
    req.end();
  });
}

/**
 * Test a specific URL path on both environments
 */
async function testPath(path) {
  console.log(`${colors.blue}Testing: ${path}${colors.reset}`);
  
  try {
    // Test production
    const prodOptions = {
      hostname: config.production,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      }
    };
    
    console.log(`  Production: ${config.production}${path}`);
    const prodResult = await request(prodOptions);
    
    // Test site
    const testOptions = {
      hostname: config.test,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      }
    };
    
    console.log(`  Test: ${config.test}${path}`);
    const testResult = await request(testOptions);
    
    // Compare results
    let testPassed = true;
    if (prodResult.statusCode === testResult.statusCode) {
      console.log(`  ${colors.green}✓ Status codes match: ${prodResult.statusCode}${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ Status codes don't match:${colors.reset}`);
      console.log(`    Production: ${prodResult.statusCode}`);
      console.log(`    Test: ${testResult.statusCode}`);
      testPassed = false;
    }
    
    // If both are redirects, compare redirect targets
    if (prodResult.isRedirect && testResult.isRedirect) {
      // Normalize URLs for comparison (handle absolute vs relative URLs)
      const normalizeUrl = (url, host) => {
        if (url.startsWith('http')) return url;
        if (url.startsWith('/')) return `https://${host}${url}`;
        return `https://${host}/${url}`;
      };
      
      const normalizedProdRedirect = normalizeUrl(prodResult.redirectUrl, config.production);
      const normalizedTestRedirect = normalizeUrl(testResult.redirectUrl, config.test);
      
      // Extract paths without host for comparison
      const prodRedirectPath = new URL(normalizedProdRedirect).pathname;
      const testRedirectPath = new URL(normalizedTestRedirect).pathname;
      
      if (prodRedirectPath === testRedirectPath) {
        console.log(`  ${colors.green}✓ Redirect paths match: ${prodRedirectPath}${colors.reset}`);
      } else {
        console.log(`  ${colors.red}✗ Redirect paths don't match:${colors.reset}`);
        console.log(`    Production: ${prodRedirectPath}`);
        console.log(`    Test: ${testRedirectPath}`);
        testPassed = false;
      }
    }
    
    console.log('');
    return testPassed;
  } catch (error) {
    console.log(`  ${colors.red}✗ Error: ${error.message}${colors.reset}`);
    console.log('');
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log(`${colors.blue}=== URL Structure Test ====${colors.reset}`);
  console.log(`Production: ${config.production}`);
  console.log(`Test: ${config.test}`);
  console.log('');
  
  let results = [];
  
  for (const path of config.paths) {
    results.push(await testPath(path));
  }
  
  // Print summary
  const passed = results.filter(result => result).length;
  const failed = results.length - passed;
  
  console.log(`${colors.blue}=== Test Summary ====${colors.reset}`);
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${colors.green}${passed}${colors.reset}`);
  console.log(`Failed: ${colors.red}${failed}${colors.reset}`);
  
  if (failed > 0) {
    console.log(`${colors.red}Some tests failed. The environments don't match exactly.${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`${colors.green}All tests passed! The environments match exactly.${colors.reset}`);
    process.exit(0);
  }
}

// Run the tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
