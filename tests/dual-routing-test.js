/**
 * Dual Routing Verification Script
 * 
 * Verifies that all episode pages can be loaded through both URL patterns:
 * 1. Direct routes: /epXX
 * 2. Prefixed routes: /pages/epXX
 * 
 * This ensures content synchronization and route handling work correctly across both patterns.
 */

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Test configuration
const config = {
  // Use the deployed test environment URL
  baseUrl: 'https://ai-tools-lab-tst.netlify.app',
  // The two URL patterns we need to test
  routes: {
    direct: {
      name: 'Direct Route',
      pattern: '/ep{num}'
    },
    prefixed: {
      name: 'Prefixed Route',
      pattern: '/pages/ep{num}'
    }
  },
  // Directory to save test results
  resultsDir: 'test-results/dual-routing'
};

// Find all available episodes from the transcripts directory
function getAvailableEpisodes() {
  const transcriptsDir = path.join(process.cwd(), 'src/content/transcripts');
  if (!fs.existsSync(transcriptsDir)) {
    return [];
  }
  
  return fs.readdirSync(transcriptsDir)
    .filter(file => file.match(/^ep\d+\.html$/))
    .map(file => {
      const match = file.match(/^ep(\d+)\.html$/);
      return match ? match[1] : null;
    })
    .filter(num => num !== null);
}

// Ensure the results directory exists
function ensureResultsDir() {
  if (!fs.existsSync(config.resultsDir)) {
    fs.mkdirSync(config.resultsDir, { recursive: true });
    console.log(`Created results directory: ${config.resultsDir}`);
  }
}

// Main test function
async function testDualRouting() {
  console.log('Starting dual routing verification test...');
  
  // Get list of episodes to test
  const episodeNumbers = getAvailableEpisodes();
  if (episodeNumbers.length === 0) {
    console.error('❌ No episodes found in transcripts directory.');
    return false;
  }
  
  console.log(`Found ${episodeNumbers.length} episodes to test`);
  console.log('Episodes:', episodeNumbers.join(', '));
  
  // Ensure results directory exists
  ensureResultsDir();
  
  // Track test results
  const results = {
    success: [],
    failure: []
  };
  
  // Launch browser
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Test each episode with both routing patterns
  for (const episodeNum of episodeNumbers) {
    console.log(`\nTesting episode ${episodeNum}:`);
    
    // Test each routing pattern
    for (const [routeKey, route] of Object.entries(config.routes)) {
      const url = `${config.baseUrl}${route.pattern.replace('{num}', episodeNum)}`;
      console.log(`  ${route.name}: ${url}`);
      
      try {
        // Navigate to the URL
        await page.goto(url);
        await page.waitForLoadState('networkidle');
        
        // Take screenshot
        const screenshotPath = path.join(config.resultsDir, `${routeKey}-ep${episodeNum}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        
        // Verify content with more robust checks for deployed site
        const title = await page.title();
        const content = await page.content();
        
        // Check for episode-specific content markers
        const hasEpisodeInTitle = title.toLowerCase().includes('episode') || title.toLowerCase().includes(`ep${episodeNum}`);
        const hasEpisodeInContent = content.toLowerCase().includes(`episode ${episodeNum}`) || 
                               content.toLowerCase().includes(`ep${episodeNum}`) || 
                               content.toLowerCase().includes(`episode-${episodeNum}`);
        
        if (hasEpisodeInTitle || hasEpisodeInContent) {
          console.log(`  ✅ ${route.name} successful`);
          results.success.push(`${route.name} - ep${episodeNum}`);
        } else {
          console.log(`  ❌ ${route.name} failed: Content verification failed`);
          results.failure.push(`${route.name} - ep${episodeNum}: Content verification failed`);
        }
      } catch (error) {
        console.log(`  ❌ ${route.name} failed: ${error.message}`);
        results.failure.push(`${route.name} - ep${episodeNum}: ${error.message}`);
      }
    }
  }
  
  // Close browser
  await browser.close();
  
  // Print summary
  console.log('\n--- Dual Routing Test Summary ---');
  console.log(`✅ Successful: ${results.success.length}`);
  console.log(`❌ Failed: ${results.failure.length}`);
  
  if (results.failure.length > 0) {
    console.log('\nFailures:');
    results.failure.forEach(failure => console.log(`- ${failure}`));
  }
  
  // Create results JSON file
  const resultsJson = {
    timestamp: new Date().toISOString(),
    totalTests: results.success.length + results.failure.length,
    successful: results.success.length,
    failed: results.failure.length,
    successList: results.success,
    failureList: results.failure
  };
  
  fs.writeFileSync(
    path.join(config.resultsDir, 'results.json'),
    JSON.stringify(resultsJson, null, 2)
  );
  
  console.log(`Results saved to ${path.join(config.resultsDir, 'results.json')}`);
  
  // Return true if all tests passed
  return results.failure.length === 0;
}

// Run the test
testDualRouting()
  .then(success => {
    console.log(`\nDual routing verification ${success ? 'PASSED ✅' : 'FAILED ❌'}.`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution error:', error);
    process.exit(1);
  });
