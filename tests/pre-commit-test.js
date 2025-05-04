#!/usr/bin/env node

/**
 * Pre-commit test script for AI Tools Lab
 * Handles URL pattern inconsistencies and validates core components
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Configuration
const TEST_TIMEOUT = 15000; // 15 seconds
const DEBUG = true;
let port = 4321; // Default port
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const LOGS_DIR = path.join(__dirname, 'logs');

// Process command line arguments
process.argv.forEach((arg) => {
  if (arg.startsWith('--port=')) {
    port = parseInt(arg.split('=')[1], 10);
    console.log(`Using port: ${port}`);
  }
});

// Create directories if they don't exist
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

// Ensure clean exit
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

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
    if (DEBUG) console.log(`ℹ️ INFO: ${message}`);
    this.info.push(message);
  }

  hasErrors() {
    return this.errors.length > 0;
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      baseUrl: `http://localhost:${port}`,
      errors: this.errors,
      warnings: this.warnings,
      info: this.info,
      success: !this.hasErrors(),
    };

    const reportPath = path.join(LOGS_DIR, `test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.addInfo(`Report saved to ${reportPath}`);

    return report;
  }
}

/**
 * Start the dev server for testing
 */
async function startDevServer() {
  try {
    console.log('📋 Starting development server for testing...');
    
    // Check if server is already running
    try {
      const response = await fetch(`http://localhost:${port}`);
      if (response.ok) {
        console.log(`✅ Development server already running on port ${port}`);
        return true;
      }
    } catch (e) {
      // Server not running, which is expected
    }
    
    // Start server process
    const devCommand = `npm run dev -- --port=${port}`;
    const devProcess = require('child_process').spawn('npm', ['run', 'dev', '--', `--port=${port}`], {
      cwd: process.cwd(),
      stdio: 'pipe',
      detached: true,
    });
    
    // Don't wait for server to exit
    devProcess.unref();
    
    // Wait for server to be ready
    let attempts = 0;
    const maxAttempts = 20;
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`http://localhost:${port}`);
        if (response.ok) {
          console.log(`✅ Dev server started on port ${port}`);
          return true;
        }
      } catch (e) {
        // Server not ready yet
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.error('❌ Failed to start dev server');
    return false;
  } catch (error) {
    console.error(`❌ Error starting dev server: ${error.message}`);
    return false;
  }
}

/**
 * MAIN TEST FUNCTION
 */
async function runTests() {
  console.log('🧪 Running pre-commit tests...');
  const baseUrl = `http://localhost:${port}`;
  console.log(`Using base URL: ${baseUrl}`);
  
  const testResults = new TestResults();
  let browser;
  
  try {
    // Start dev server if needed
    const serverReady = await startDevServer();
    if (!serverReady) {
      testResults.addError('Could not start development server');
      return false;
    }
    
    // Launch browser
    console.log('🌐 Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    page.setDefaultTimeout(TEST_TIMEOUT);
    
    // 1. Test Home Page
    console.log('\n🏠 Testing homepage...');
    await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'homepage.png') });
    
    // Check header (multiple selectors for robustness)
    const headerSelectors = [
      'header', '.site-header', 'header.site-header',
      '[class*="header"]', 'body > header', '.header'
    ];
    
    let header = null;
    for (const selector of headerSelectors) {
      header = await page.$(selector);
      if (header) {
        testResults.addInfo(`Found header with selector: ${selector}`);
        break;
      }
    }
    
    if (!header) {
      testResults.addError('Header not found on homepage');
      // Save HTML for debugging
      const bodyHTML = await page.evaluate(() => document.body.innerHTML);
      fs.writeFileSync(path.join(LOGS_DIR, 'missing-header.html'), bodyHTML);
    }
    
    // Check footer (multiple selectors for robustness)
    const footerSelectors = [
      'footer', '.site-footer', 'footer.site-footer',
      '[class*="footer"]', 'body > footer', '.footer'
    ];
    
    let footer = null;
    for (const selector of footerSelectors) {
      footer = await page.$(selector);
      if (footer) {
        testResults.addInfo(`Found footer with selector: ${selector}`);
        break;
      }
    }
    
    if (!footer) {
      testResults.addError('Footer not found on homepage');
    }
    
    // 2. Test Resources Page (try both URL patterns for robustness)
    console.log('\n📚 Testing resources page...');
    
    // Try both URL patterns
    const resourcesUrls = [
      `${baseUrl}/resources`,
      `${baseUrl}/pages/resources`
    ];
    
    let resourcesLoaded = false;
    let resourcesUrl = '';
    
    for (const url of resourcesUrls) {
      try {
        testResults.addInfo(`Trying resources URL: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT / 2 });
        
        // Check if we successfully loaded a resources page
        const urlMatch = page.url().includes('resource');
        const contentMatch = await page.evaluate(() => {
          return document.body.innerText.toLowerCase().includes('resource');
        });
        
        if (urlMatch && contentMatch) {
          resourcesLoaded = true;
          resourcesUrl = url;
          testResults.addInfo(`Loaded resources page at: ${url}`);
          break;
        }
      } catch (e) {
        testResults.addWarning(`Failed to load resources page at ${url}: ${e.message}`);
      }
    }
    
    if (!resourcesLoaded) {
      testResults.addError('Could not load resources page with any URL pattern');
    } else {
      // Take screenshot
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'resources.png') });
      
      // Check for resource cards with multiple strategies
      const cardSelectors = [
        '.resource-card', 'div[class*="resource"]', '.card',
        'article', '.resources-grid > *', '.container .card'
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
        } catch (e) {
          // Continue to next selector
        }
      }
      
      // Fallback to looking for divs that look like cards
      if (resourceCards.length === 0) {
        testResults.addInfo('Using fallback card detection...');
        
        const cardCount = await page.evaluate(() => {
          const possibleCards = [];
          document.querySelectorAll('div, article, section').forEach(el => {
            // Check if element looks like a card
            if (el.innerText && 
                el.offsetWidth > 150 && el.offsetHeight > 100 &&
                el.children.length >= 2 &&
                !['header', 'footer', 'nav'].includes(el.tagName.toLowerCase())) {
              possibleCards.push(el);
            }
          });
          return possibleCards.length;
        });
        
        if (cardCount > 0) {
          testResults.addInfo(`Found ${cardCount} potential resource-like elements`);
          resourceCards = { length: cardCount };
        }
      }
      
      if (resourceCards.length === 0) {
        testResults.addError('No resource cards found on resources page');
      }
    }
    
    // Generate final report
    console.log('\n📊 RESULTS SUMMARY');
    
    const report = testResults.generateReport();
    
    if (report.success) {
      console.log('\n✅ All tests passed!');
    } else {
      console.log('\n❌ Tests failed:');
      report.errors.forEach((error, i) => console.log(` ${i+1}. ${error}`));
    }
    
    return report.success;
    
  } catch (error) {
    testResults.addError(`Unexpected error: ${error.message}`);
    console.error('Test error details:', error);
    return false;
  } finally {
    if (browser) await browser.close();
  }
}

// Run the tests
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
}

module.exports = {
  runTests
};
