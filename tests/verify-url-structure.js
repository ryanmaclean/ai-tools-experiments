/**
 * URL Structure Verification Test
 *
 * This test script verifies that the URL structure in the test environment
 * correctly matches the production environment.
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const assert = require('assert');

// Configuration
const config = {
  production: 'https://ai-tools-lab.com',
  test: process.env.TEST_URL || 'https://ai-tools-lab-tst.netlify.app',
  // Important URLs to check in both environments
  urlsToCheck: [
    '/',                // Should redirect to /pages/ in both environments
    '/pages/',          // Main page with /pages/ prefix
    '/pages/resources', // Resources page
    '/pages/about',     // About page 
    '/pages/ep01',      // Episode 1
    '/pages/ep20',      // Episode 20
    '/pages/ep28',      // Episode 28 (latest)
  ]
};

// ANSI colors for console output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Fetch a URL and return response details
 */
async function fetchUrl(url) {
  try {
    console.log(`Fetching: ${url}`);
    const response = await fetch(url, {
      redirect: 'follow',   // Follow redirects
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 10000 // 10 second timeout
    });
    
    // Get the redirected URL
    const finalUrl = response.url || url;
    console.log(`  → ${response.status} ${finalUrl}`);
    
    return {
      success: response.ok,
      status: response.status,
      url: finalUrl,    // Final URL after redirects
      redirected: response.redirected,
      originalUrl: url
    };
  } catch (error) {
    console.log(`  → ERROR: ${error.message}`);
    return {
      success: false,
      status: 0,
      url: url, // Keep the original URL so we don't get undefined
      error: error.message,
      originalUrl: url
    };
  }
}

/**
 * Run verification test for all URLs
 */
async function verifyUrlStructure() {
  console.log(`${COLORS.blue}Verifying URL structure between environments:${COLORS.reset}`);
  console.log(`- Production: ${config.production}`);
  console.log(`- Test: ${config.test}`);
  console.log('\n');
  
  let passCount = 0;
  let failCount = 0;
  
  for (const path of config.urlsToCheck) {
    // Test both environments
    const productionUrl = `${config.production}${path}`;
    const testUrl = `${config.test}${path}`;
    
    const prodResult = await fetchUrl(productionUrl);
    const testResult = await fetchUrl(testUrl);
    
    // Compare results
    console.log(`${COLORS.cyan}Testing path: ${path}${COLORS.reset}`);
    
    // Check if both environments return success status codes
    const statusMatch = (prodResult.success === testResult.success);
    
    // For redirected URLs, check if they redirect to similar paths
    const getPrefixFreePath = (url) => {
      try {
        if (!url) return 'error-no-url';
        const u = new URL(url);
        return u.pathname.replace('/pages/', '/').replace(/\/{2,}/g, '/');
      } catch (error) {
        console.log(`  → Error processing URL: ${url} - ${error.message}`);
        return 'error-invalid-url';
      }
    };
    
    // Compare paths after removing /pages/ prefix - with robust error handling
    const prodFinalPath = getPrefixFreePath(prodResult.url);
    const testFinalPath = getPrefixFreePath(testResult.url);
    const pathMatch = (prodFinalPath === testFinalPath);
    
    if (statusMatch && pathMatch) {
      console.log(`${COLORS.green}✓ PASS: ${COLORS.reset}`);
      console.log(`  Production: ${prodResult.status} → ${prodResult.url}`);
      console.log(`  Test:       ${testResult.status} → ${testResult.url}`);
      passCount++;
    } else {
      console.log(`${COLORS.red}✗ FAIL: ${COLORS.reset}`);
      console.log(`  Production: ${prodResult.status} → ${prodResult.url}`);
      console.log(`  Test:       ${testResult.status} → ${testResult.url}`);
      
      if (!statusMatch) {
        console.log(`  ${COLORS.red}Status codes do not match${COLORS.reset}`);
      }
      if (!pathMatch) {
        console.log(`  ${COLORS.red}Path structures do not match${COLORS.reset}`);
        console.log(`  Production path: ${prodFinalPath}`);
        console.log(`  Test path: ${testFinalPath}`);
      }
      failCount++;
    }
    console.log('\n');
  }
  
  // Print summary
  console.log(`${COLORS.blue}Test Summary:${COLORS.reset}`);
  console.log(`- Total tests: ${passCount + failCount}`);
  console.log(`- ${COLORS.green}Passed: ${passCount}${COLORS.reset}`);
  console.log(`- ${COLORS.red}Failed: ${failCount}${COLORS.reset}`);
  
  return failCount === 0;
}

// Run the test
verifyUrlStructure().then(success => {
  if (!success) {
    console.log(`${COLORS.red}Test failed${COLORS.reset}`);
    process.exit(1);
  } else {
    console.log(`${COLORS.green}All tests passed${COLORS.reset}`);
    process.exit(0);
  }
}).catch(error => {
  console.error(`${COLORS.red}Error executing tests:${COLORS.reset}`, error);
  process.exit(1);
});
