/**
 * Netlify Deployment Verification Script
 * 
 * This script captures screenshots of both the test and production sites
 * to verify the deployment and identify any visual discrepancies.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Site URLs
const SITES = {
  test: {
    base: 'https://ai-tools-lab-tst.netlify.app',
    paths: {
      resources: '/resources',
      resourcesWithPrefix: '/pages/resources'
    }
  },
  production: {
    base: 'https://ai-tools-lab.com',
    paths: {
      resources: '/resources',
      resourcesWithPrefix: '/pages/resources'
    }
  }
};

// Setup screenshot directory
const SCREENSHOT_DIR = path.join(__dirname, 'deploy-verification');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

/**
 * Capture a screenshot of a URL
 */
async function captureScreenshot(browser, url, outputPath) {
  console.log(`Capturing screenshot of ${url}...`);
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate to the URL
    const response = await page.goto(url, { 
      waitUntil: 'networkidle0', 
      timeout: 30000 
    });
    
    if (!response || response.status() >= 400) {
      console.error(`Error accessing ${url}: ${response ? response.status() : 'No response'}`);
      return { success: false, status: response ? response.status() : 'Failed' };
    }
    
    // Wait for any resources to load
    await page.waitForSelector('body', { timeout: 5000 }).catch(() => {});
    
    // Take screenshot
    await page.screenshot({ path: outputPath, fullPage: true });
    console.log(`Screenshot saved to ${outputPath}`);
    
    // Check for specific elements
    const resourceCards = await page.$$eval('.resource-card', cards => cards.length).catch(() => 0);
    const images = await page.$$eval('.resource-card-image img', imgs => imgs.length).catch(() => 0);
    const pageTitle = await page.title().catch(() => 'Unknown title');
    
    // Close the page
    await page.close();
    
    return { 
      success: true, 
      resourceCards,
      images,
      pageTitle
    };
  } catch (error) {
    console.error(`Error capturing screenshot of ${url}:`, error.message);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Starting Netlify deployment verification...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Results object to store all verification data
    const results = {
      test: {},
      production: {},
      timestamp: new Date().toISOString(),
      comparisons: []
    };
    
    // Verify resources page on test site (both with and without /pages/ prefix)
    results.test.resources = await captureScreenshot(
      browser,
      `${SITES.test.base}${SITES.test.paths.resources}`,
      path.join(SCREENSHOT_DIR, 'test-resources.png')
    );
    
    results.test.resourcesWithPrefix = await captureScreenshot(
      browser,
      `${SITES.test.base}${SITES.test.paths.resourcesWithPrefix}`,
      path.join(SCREENSHOT_DIR, 'test-resources-with-prefix.png')
    );
    
    // Verify resources page on production site
    results.production.resources = await captureScreenshot(
      browser,
      `${SITES.production.base}${SITES.production.paths.resources}`,
      path.join(SCREENSHOT_DIR, 'prod-resources.png')
    );
    
    results.production.resourcesWithPrefix = await captureScreenshot(
      browser,
      `${SITES.production.base}${SITES.production.paths.resourcesWithPrefix}`,
      path.join(SCREENSHOT_DIR, 'prod-resources-with-prefix.png')
    );
    
    // Add comparison results
    // Compare resource card counts
    if (results.test.resources.success && results.production.resourcesWithPrefix.success) {
      results.comparisons.push({
        aspect: 'Resource Cards Count',
        test: results.test.resources.resourceCards,
        production: results.production.resourcesWithPrefix.resourceCards,
        match: results.test.resources.resourceCards === results.production.resourcesWithPrefix.resourceCards
      });
    }
    
    // Compare image counts
    if (results.test.resources.success && results.production.resourcesWithPrefix.success) {
      results.comparisons.push({
        aspect: 'Resource Images Count',
        test: results.test.resources.images,
        production: results.production.resourcesWithPrefix.images,
        match: results.test.resources.images === results.production.resourcesWithPrefix.images
      });
    }
    
    // Output the results
    console.log('\n=== VERIFICATION RESULTS ===');
    console.log('Test Site:');
    console.log(` - Resources page (${SITES.test.paths.resources}): ${results.test.resources.success ? 'Success' : 'Failure'}`);
    if (results.test.resources.success) {
      console.log(`   * Resource Cards: ${results.test.resources.resourceCards}`);
      console.log(`   * Images: ${results.test.resources.images}`);
      console.log(`   * Title: ${results.test.resources.pageTitle}`);
    }
    
    console.log(` - Resources page (${SITES.test.paths.resourcesWithPrefix}): ${results.test.resourcesWithPrefix.success ? 'Success' : 'Failure'}`);
    if (results.test.resourcesWithPrefix.success) {
      console.log(`   * Resource Cards: ${results.test.resourcesWithPrefix.resourceCards}`);
      console.log(`   * Images: ${results.test.resourcesWithPrefix.images}`);
      console.log(`   * Title: ${results.test.resourcesWithPrefix.pageTitle}`);
    }
    
    console.log('\nProduction Site:');
    console.log(` - Resources page (${SITES.production.paths.resourcesWithPrefix}): ${results.production.resourcesWithPrefix.success ? 'Success' : 'Failure'}`);
    if (results.production.resourcesWithPrefix.success) {
      console.log(`   * Resource Cards: ${results.production.resourcesWithPrefix.resourceCards}`);
      console.log(`   * Images: ${results.production.resourcesWithPrefix.images}`);
      console.log(`   * Title: ${results.production.resourcesWithPrefix.pageTitle}`);
    }
    
    console.log('\nComparisons:');
    for (const comparison of results.comparisons) {
      console.log(` - ${comparison.aspect}: ${comparison.match ? 'MATCH u2705' : 'MISMATCH u274C'}`);
      console.log(`   * Test: ${comparison.test}`);
      console.log(`   * Production: ${comparison.production}`);
    }
    
    // Save the results to a JSON file
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'verification-results.json'),
      JSON.stringify(results, null, 2)
    );
    console.log(`\nResults saved to ${path.join(SCREENSHOT_DIR, 'verification-results.json')}`);
    
    console.log('\nScreenshots saved in:', SCREENSHOT_DIR);
    console.log('Completed deployment verification');
  } catch (error) {
    console.error('Error in verification process:', error);
  } finally {
    await browser.close();
  }
}

// Run the main function
main();
