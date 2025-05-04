#!/usr/bin/env node

/**
 * Robust site test script for AI Tools Lab
 * Handles URL pattern inconsistencies and provides detailed debugging
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Configuration
const TEST_TIMEOUT = 30000; // 30 seconds
const DEBUG = true;
let basePort = 4323; // Updated to default to 4323
let useDocker = false;

// Process command line arguments
process.argv.forEach((arg) => {
  if (arg.startsWith('--port=')) {
    basePort = parseInt(arg.split('=')[1], 10);
    console.log(`Using port from command line argument: ${basePort}`);
  }
  if (arg === '--docker') {
    useDocker = true;
    console.log('Using Docker mode');
  }
});

// Base URL for tests
const baseUrl = `http://localhost:${basePort}`;
console.log(`Base URL for tests: ${baseUrl}`);

// Create screenshots directory
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Create logs directory
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Test results tracking
class TestResults {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  addError(message) {
    console.error(`❌ ERROR: ${message}`);
    this.errors.push(message);
  }

  addWarning(message) {
    console.warn(`⚠️ WARNING: ${message}`);
    this.warnings.push(message);
  }

  addInfo(message) {
    if (DEBUG) {
      console.log(`ℹ️ INFO: ${message}`);
    }
    this.info.push(message);
  }

  hasErrors() {
    return this.errors.length > 0;
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      baseUrl,
      errors: this.errors,
      warnings: this.warnings,
      info: this.info,
      success: !this.hasErrors(),
    };

    const reportPath = path.join(logsDir, `test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.addInfo(`Test report saved to ${reportPath}`);

    return report;
  }
}

// Common assertions
async function assertElementExists(page, selector, description, testResults) {
  // Try multiple selectors to increase robustness
  const selectors = Array.isArray(selector) ? selector : [selector];
  
  for (const sel of selectors) {
    try {
      const element = await page.$(sel);
      if (element) {
        testResults.addInfo(`Found ${description} with selector: ${sel}`);
        return { found: true, element, selector: sel };
      }
    } catch (error) {
      testResults.addWarning(`Error checking selector ${sel}: ${error.message}`);
    }
  }
  
  // If we got here, we didn't find the element with any selector
  testResults.addError(`${description} not found on page. Tried selectors: ${selectors.join(', ')}`);
  return { found: false };
}

// Main test function
async function runTests() {
  console.log('\nStarting comprehensive site tests...');
  console.log(`Using base URL: ${baseUrl}\n`);
  
  const testResults = new TestResults();
  let browser;
  
  try {
    // Launch browser with appropriate settings
    const launchOptions = {
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1920, height: 1080 },
    };
    
    if (useDocker) {
      launchOptions.executablePath = '/usr/bin/chromium';
    }
    
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    
    // Set longer timeouts and handle errors
    page.setDefaultTimeout(TEST_TIMEOUT);
    page.on('error', (err) => testResults.addError(`Page error: ${err.message}`));
    page.on('pageerror', (err) => testResults.addError(`Page error: ${err.message}`));
    
    // Enable console logging from the page
    page.on('console', (msg) => {
      const text = msg.text();
      // Filter out noisy messages
      if (!text.includes('"Request id') && !text.includes('CORS request') && 
          !text.includes('Failed to load resource')) {
        testResults.addInfo(`Console: ${msg.type()}: ${text}`);
      }
    });
    
    // Record DOM structure for debugging
    async function recordDomStructure(page, filename) {
      try {
        const structure = await page.evaluate(() => {
          function getElements(selector) {
            return [...document.querySelectorAll(selector)].map(el => ({
              tagName: el.tagName.toLowerCase(),
              id: el.id || null,
              className: el.className || null,
              textContent: el.textContent?.substring(0, 50)?.trim() || null
            }));
          }
          
          return {
            title: document.title,
            doctype: document.doctype ? document.doctype.name : null,
            headerElements: getElements('header, .header, [class*="header"]'),
            footerElements: getElements('footer, .footer, [class*="footer"]'),
            cardElements: getElements('.card, [class*="card"], .resource, [class*="resource"]')
          };
        });
        
        fs.writeFileSync(
          path.join(logsDir, `${filename}.json`),
          JSON.stringify(structure, null, 2)
        );
        
        testResults.addInfo(`DOM structure saved to ${filename}.json`);
        return structure;
      } catch (error) {
        testResults.addWarning(`Failed to record DOM structure: ${error.message}`);
        return null;
      }
    }
    
    /**
     * Test 1: Homepage basics
     */
    console.log('Test 1: Testing homepage...');
    
    try {
      await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT });
      await page.screenshot({ path: path.join(screenshotsDir, 'homepage.png') });
      await recordDomStructure(page, 'homepage-dom');
      
      // Test header existence with multiple selectors
      const headerSelectors = [
        'header', 'div.site-header', '.header', 
        '[class*="header"]', '[class*="Header"]',
        'body > header', 'body > div.header'
      ];
      
      const { found: headerFound } = await assertElementExists(
        page, headerSelectors, 'Header', testResults
      );
      
      // If header not found, check the raw HTML to see what might be wrong
      if (!headerFound) {
        const bodyHTML = await page.evaluate(() => document.body.innerHTML);
        fs.writeFileSync(path.join(logsDir, 'homepage-html.html'), bodyHTML);
        testResults.addInfo('Saved raw HTML to homepage-html.html for debugging');
      }
      
      // Test footer existence with multiple selectors
      const footerSelectors = [
        'footer', 'div.site-footer', '.footer', 
        '[class*="footer"]', '[class*="Footer"]',
        'body > footer', 'body > div.footer'
      ];
      
      await assertElementExists(page, footerSelectors, 'Footer', testResults);
      
    } catch (homeError) {
      testResults.addError(`Homepage error: ${homeError.message}`);
    }
    
    /**
     * Test 2: Resources page
     */
    console.log('\nTest 2: Testing navigation to Resources page...');
    
    // Try both URL patterns
    const resourcesUrls = [
      `${baseUrl}/resources`,
      `${baseUrl}/pages/resources`
    ];
    
    let resourcesPage = null;
    
    for (const resourcesUrl of resourcesUrls) {
      try {
        testResults.addInfo(`Trying resources URL: ${resourcesUrl}`);
        await page.goto(resourcesUrl, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT });
        
        // Check if we landed on what looks like a resources page
        const urlMatches = page.url().includes('resource');
        const titleMatches = await page.evaluate(() => {
          return document.title.toLowerCase().includes('resource') || 
                 document.body.innerText.toLowerCase().includes('resources');
        });
        
        if (urlMatches || titleMatches) {
          resourcesPage = resourcesUrl;
          testResults.addInfo(`Successfully loaded resources page at: ${resourcesUrl}`);
          break;
        } else {
          testResults.addWarning(`Loaded page at ${resourcesUrl} but it doesn't look like a resources page`);
        }
      } catch (error) {
        testResults.addWarning(`Error loading ${resourcesUrl}: ${error.message}`);
      }
    }
    
    if (!resourcesPage) {
      testResults.addError('Failed to load resources page with any URL pattern');
    } else {
      // Take screenshot of resources page
      await page.screenshot({ path: path.join(screenshotsDir, 'resources-page.png') });
      await recordDomStructure(page, 'resources-dom');
      
      // Use a more comprehensive approach to find resource cards
      testResults.addInfo('Searching for resource cards...');
      
      // Try with standard selectors first
      const cardSelectors = [
        '.resource-card', 'div[class*="resource"]',
        '.card', '.resources-grid > *', 
        '.resource', '[class*="resource-"]',
        'article', '.grid-item', '.resources-container .card',
        '.content-container > div > div'
      ];
      
      let resourceCards = [];
      
      for (const selector of cardSelectors) {
        try {
          const cards = await page.$$(selector);
          if (cards.length > 0) {
            resourceCards = cards;
            testResults.addInfo(`Found ${cards.length} resource cards with selector: ${selector}`);
            break;
          }
        } catch (error) {
          testResults.addWarning(`Error with selector ${selector}: ${error.message}`);
        }
      }
      
      // If standard approach failed, try advanced detection
      if (resourceCards.length === 0) {
        testResults.addInfo('Standard selectors failed, using advanced detection...');
        
        try {
          // Look for elements that look like cards based on structure and content
          const cardCount = await page.evaluate(() => {
            // Possible card elements
            const candidates = document.querySelectorAll(
              'div, article, section, li'
            );
            
            const possibleCards = [];
            candidates.forEach(el => {
              // Check if element looks like a card
              const hasTitle = el.querySelector('h2, h3, h4, strong') !== null;
              const hasMultipleChildren = el.children.length >= 2;
              const isReasonableSize = el.offsetWidth > 150 && el.offsetHeight > 100;
              const hasText = el.innerText.length > 20;
              const isNotHeader = !['header', 'footer', 'nav'].includes(el.tagName.toLowerCase());
              const isNotFullWidth = el.offsetWidth < document.body.offsetWidth - 50;
              
              if (hasText && hasMultipleChildren && isReasonableSize && isNotHeader && isNotFullWidth) {
                possibleCards.push(el);
              }
            });
            
            return possibleCards.length;
          });
          
          testResults.addInfo(`Found ${cardCount} potential resource cards through advanced detection`);
          
          if (cardCount > 0) {
            resourceCards = { length: cardCount };
          }
        } catch (detectionError) {
          testResults.addWarning(`Advanced detection error: ${detectionError.message}`);
        }
      }
      
      if (resourceCards.length === 0) {
        testResults.addError('No resource cards found on the resources page');
      }
    }
    
    // Generate and display test report
    console.log('\n== TEST RESULTS SUMMARY ==\n');
    
    if (testResults.hasErrors()) {
      console.log('❌ ERRORS:');
      testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    if (testResults.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      testResults.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}`);
      });
    }
    
    const report = testResults.generateReport();
    
    // Final summary
    if (report.success) {
      console.log('\n✅ All tests passed successfully!');
    } else {
      console.log('\n❌ Tests failed!');
    }
    
    return report.success;
    
  } catch (error) {
    testResults.addError(`Unexpected error in test runner: ${error.message}`);
    console.error('Test runner error details:', error);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the tests and exit with appropriate code
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
