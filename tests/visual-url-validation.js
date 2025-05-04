/**
 * Visual URL Validation for AI Tools Lab
 * 
 * This script visually validates key URLs in the test environment using Puppeteer
 * to ensure they can be properly accessed and rendering correctly. This serves as
 * an early warning system for problems that would cause Datadog synthetic tests to fail.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Color formatting for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// URLs to validate
const STAGING_BASE = 'https://ai-tools-lab-tst.netlify.app';
const KEY_PAGES = [
  { route: '/', name: 'Home Page' },
  { route: '/about', name: 'About Page' },
  { route: '/resources', name: 'Resources Page' },
  { route: '/observations', name: 'Observations Page' },
  { route: '/ep01', name: 'Episode 01 Page' }
];

// Key element selectors that must exist on all pages
const GLOBAL_SELECTORS = [
  'header',
  'footer'
];

// Page-specific selectors
const PAGE_SELECTORS = {
  '/': ['.episode-grid', '.episode-card'],
  '/about': ['.about-content'],
  '/resources': ['.resource-cards', '.resource-card'],
  '/observations': ['.observations-content'],
  '/ep01': ['.episode-content', '.episode-navigation']
};

/**
 * Main function to run visual URL validation
 */
async function main() {
  console.log(`${colors.blue}${colors.bright}Visual URL Validation${colors.reset}`);
  console.log(`${colors.blue}====================${colors.reset}\n`);
  
  // Create screenshots directory if it doesn't exist
  const screenshotDir = path.join(__dirname, 'validation-screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Results tracking
    const results = {
      success: 0,
      failed: 0,
      details: []
    };
    
    // Check each key page
    for (const page of KEY_PAGES) {
      const url = STAGING_BASE + page.route;
      const result = await validateUrl(browser, url, page.name, page.route, screenshotDir);
      
      if (result.success) {
        results.success++;
      } else {
        results.failed++;
      }
      
      results.details.push(result);
    }
    
    // Print summary
    printSummary(results);
    
    // Exit with appropriate code
    if (results.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } finally {
    await browser.close();
  }
}

/**
 * Validate a single URL using Puppeteer
 */
async function validateUrl(browser, url, pageName, route, screenshotDir) {
  console.log(`${colors.cyan}Testing ${pageName}: ${url}${colors.reset}`);
  
  const result = {
    name: pageName,
    url,
    success: false,
    errors: [],
    warnings: [],
    screenshotPath: ''
  };
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setDefaultTimeout(10000); // 10 second timeout
  
  try {
    // Navigate to URL
    const response = await page.goto(url, { waitUntil: 'networkidle0' });
    
    // Check response status
    if (!response) {
      result.errors.push('Failed to get response from page');
    } else if (response.status() !== 200) {
      result.errors.push(`Page returned status ${response.status()}`);
    }
    
    // Take screenshot
    const screenshotPath = path.join(screenshotDir, `${route.replace(/\//g, '')}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    result.screenshotPath = screenshotPath;
    
    // Check global selectors
    for (const selector of GLOBAL_SELECTORS) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
      } catch (error) {
        result.errors.push(`Global element '${selector}' not found`);
      }
    }
    
    // Check page-specific selectors
    if (PAGE_SELECTORS[route]) {
      for (const selector of PAGE_SELECTORS[route]) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
        } catch (error) {
          result.errors.push(`Page element '${selector}' not found`);
        }
      }
    }
    
    // Check for browser console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        result.warnings.push(`Console error: ${msg.text()}`);
      }
    });
    
    // Check for broken images
    const brokenImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.filter(img => !img.complete || img.naturalWidth === 0).length;
    });
    
    if (brokenImages > 0) {
      result.warnings.push(`Found ${brokenImages} broken or unloaded images`);
    }
    
    // Set success based on errors
    result.success = result.errors.length === 0;
    
    // Print result
    if (result.success) {
      console.log(`${colors.green}u2705 ${pageName} validated successfully${colors.reset}`);
    } else {
      console.log(`${colors.red}u274c ${pageName} validation failed${colors.reset}`);
      result.errors.forEach(error => {
        console.log(`  ${colors.red}- ${error}${colors.reset}`);
      });
    }
    
    if (result.warnings.length > 0) {
      console.log(`${colors.yellow}  Warnings:${colors.reset}`);
      result.warnings.forEach(warning => {
        console.log(`  ${colors.yellow}- ${warning}${colors.reset}`);
      });
    }
    
    return result;
  } catch (error) {
    result.errors.push(`Exception: ${error.message}`);
    console.log(`${colors.red}u274c ${pageName} validation failed: ${error.message}${colors.reset}`);
    return result;
  } finally {
    await page.close();
  }
}

/**
 * Print summary of validation results
 */
function printSummary(results) {
  console.log(`\n${colors.blue}${colors.bright}Validation Summary${colors.reset}`);
  console.log(`${colors.blue}=================${colors.reset}\n`);
  
  console.log(`${colors.bright}Pages tested: ${results.details.length}${colors.reset}`);
  console.log(`${colors.green}Pages passing: ${results.success}${colors.reset}`);
  console.log(`${colors.red}Pages failing: ${results.failed}${colors.reset}\n`);
  
  if (results.failed > 0) {
    console.log(`${colors.red}${colors.bright}Failed pages:${colors.reset}`);
    results.details
      .filter(result => !result.success)
      .forEach(result => {
        console.log(`${colors.red}- ${result.name}: ${result.url}${colors.reset}`);
      });
      
    console.log(`\n${colors.red}${colors.bright}Please fix these issues before committing!${colors.reset}`);
    console.log(`${colors.yellow}Screenshots saved to: ${path.resolve(__dirname, 'validation-screenshots')}${colors.reset}`);
  } else {
    console.log(`${colors.green}${colors.bright}All pages validated successfully!${colors.reset}`);
    console.log(`${colors.green}Visual validation passed. Your changes should work with Datadog synthetics.${colors.reset}`);
  }
}

// Run the main function
main().catch(error => {
  console.error(`${colors.red}FATAL ERROR: ${error.message}${colors.reset}`);
  process.exit(1);
});
