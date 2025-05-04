#!/usr/bin/env node

/**
 * Datadog Component Validator
 * - Streamlined test flow for validating critical components
 * - Handles URL pattern inconsistencies
 * - Ensures Datadog monitoring tests will pass
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Configuration
const TEST_TIMEOUT = 10000; // 10 seconds is enough for a quick component check
const DEBUG = process.env.DEBUG === 'true' || false;
let port = 4321; // Default port
let checkServer = true; // Whether to check if server is running

// Parse command line args
process.argv.forEach((arg) => {
  if (arg.startsWith('--port=')) {
    port = parseInt(arg.split('=')[1], 10);
    console.log(`Using port ${port}`);
  }
  if (arg === '--no-server-check') {
    checkServer = false;
  }
});

const baseUrl = `http://localhost:${port}`;

// Create directories if needed
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

/**
 * Main validation function
 */
async function validateComponents() {
  console.log('\n🔍 Validating critical components for Datadog monitoring...');
  console.log(`Base URL: ${baseUrl}`);
  
  // Skip server check if requested
  if (checkServer) {
    try {
      // Quick check if server is already running
      const serverCheck = await fetch(baseUrl, { timeout: 2000 })
        .then(() => true)
        .catch(() => false);
      
      if (!serverCheck) {
        console.error('❌ Development server not running! Start it with: npm run dev');
        return false;
      }
    } catch (e) {
      console.warn('⚠️ Could not check if server is running, continuing anyway...');
    }
  }
  
  let browser;
  try {
    // Launch browser with minimal settings for quick validation
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1024, height: 768 }
    });
    
    const page = await browser.newPage();
    page.setDefaultTimeout(TEST_TIMEOUT);
    
    // Enable console logging from the page if in debug mode
    if (DEBUG) {
      page.on('console', msg => console.log('Browser console:', msg.text()));
    }
    
    // Test results tracking
    const results = {
      header: { found: false, selector: null },
      footer: { found: false, selector: null },
      resourceCards: { found: false, count: 0, selector: null },
      urls: { homepage: true, resources: false },
      errors: []
    };
    
    // 1. Check homepage and its components
    console.log('\n🏠 Checking homepage components...');
    await page.goto(baseUrl, { waitUntil: 'networkidle0', timeout: TEST_TIMEOUT });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'homepage-check.png') });
    
    // Check header with multiple selector strategies
    for (const selector of ['header', '.site-header', 'header.site-header', '[class*="header"]']) {
      const header = await page.$(selector);
      if (header) {
        console.log(`✅ Found header with selector: ${selector}`);
        results.header.found = true;
        results.header.selector = selector;
        break;
      }
    }
    
    if (!results.header.found) {
      console.error('❌ Header not found on homepage! This will cause Datadog tests to fail.');
      results.errors.push('Header not found on homepage');
    }
    
    // Check footer with multiple selector strategies
    for (const selector of ['footer', '.site-footer', 'footer.site-footer', '[class*="footer"]']) {
      const footer = await page.$(selector);
      if (footer) {
        console.log(`✅ Found footer with selector: ${selector}`);
        results.footer.found = true;
        results.footer.selector = selector;
        break;
      }
    }
    
    if (!results.footer.found) {
      console.error('❌ Footer not found on homepage! This will cause Datadog tests to fail.');
      results.errors.push('Footer not found on homepage');
    }
    
    // 2. Check resources page with both URL patterns
    console.log('\n📚 Checking resources page components...');
    
    // Try both URL patterns for resources page
    for (const resourcesUrl of [`${baseUrl}/resources`, `${baseUrl}/pages/resources`]) {
      try {
        console.log(`Trying URL: ${resourcesUrl}`);
        await page.goto(resourcesUrl, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT / 2 });
        
        // Check if we successfully loaded a resources page
        const pageTitle = await page.title();
        const pageContent = await page.evaluate(() => document.body.innerText);
        
        if (pageTitle.toLowerCase().includes('resource') || 
            pageContent.toLowerCase().includes('resources')) {
          results.urls.resources = true;
          console.log(`✅ Successfully loaded resources page at: ${resourcesUrl}`);
          
          // Take screenshot for verification
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'resources-check.png') });
          
          // Check for resource cards with multiple selector strategies
          for (const selector of ['.resource-card', 'div[class*="resource"]', '.card', '.resources-grid > *']) {
            const cards = await page.$$(selector);
            if (cards.length > 0) {
              console.log(`✅ Found ${cards.length} resource cards with selector: ${selector}`);
              results.resourceCards.found = true;
              results.resourceCards.count = cards.length;
              results.resourceCards.selector = selector;
              break;
            }
          }
          
          if (!results.resourceCards.found) {
            // Try a fallback check for anything that looks like a card
            const potentialCards = await page.evaluate(() => {
              return Array.from(document.querySelectorAll('div, article')).filter(el => {
                return el.offsetWidth > 150 && 
                       el.offsetHeight > 100 && 
                       el.children.length >= 2 && 
                       el.innerText.length > 20;
              }).length;
            });
            
            if (potentialCards > 0) {
              console.log(`✅ Found ${potentialCards} potential card-like elements`);
              results.resourceCards.found = true;
              results.resourceCards.count = potentialCards;
            } else {
              console.error('❌ No resource cards found on resources page! This will cause Datadog tests to fail.');
              results.errors.push('Resource cards not found');
            }
          }
          
          // We found and checked the resources page, no need to try the other URL
          break;
        }
      } catch (error) {
        console.warn(`⚠️ Error checking ${resourcesUrl}: ${error.message}`);
      }
    }
    
    if (!results.urls.resources) {
      console.error('❌ Could not load resources page with any URL pattern!');
      results.errors.push('Resources page not accessible');
    }
    
    // Final validation summary
    console.log('\n📋 VALIDATION SUMMARY:\n');
    console.log(`Header: ${results.header.found ? '✅' : '❌'}`);
    console.log(`Footer: ${results.footer.found ? '✅' : '❌'}`);
    console.log(`Resource Cards: ${results.resourceCards.found ? `✅ (${results.resourceCards.count} found)` : '❌'}`);
    
    const allValid = results.header.found && results.footer.found && results.resourceCards.found;
    
    if (allValid) {
      console.log('\n✅ SUCCESS: All critical components validated! Datadog monitoring should pass.');
      return true;
    } else {
      console.error('\n❌ VALIDATION FAILED: Fix the following issues to ensure Datadog monitoring passes:');
      results.errors.forEach((error, i) => console.error(`  ${i+1}. ${error}`));
      return false;
    }
  } catch (error) {
    console.error(`\n❌ Unexpected error during validation: ${error.message}`);
    if (DEBUG) console.error(error);
    return false;
  } finally {
    if (browser) await browser.close();
  }
}

// Run the validation if called directly
if (require.main === module) {
  validateComponents().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { validateComponents };
