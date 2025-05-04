#!/usr/bin/env node

/**
 * Comprehensive Sequential Web Test for Datadog Monitoring
 * 
 * This single long-running test replaces multiple API tests with a more
 * cohesive end-to-end test that validates the entire website in sequence.
 * 
 * Features:
 * - Validates site structure (header, footer, navigation)
 * - Checks resources page and resource cards
 * - Tests observations page and content
 * - Verifies cross-page navigation
 * - Validates site responsiveness
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Configuration
const TEST_TIMEOUT = 60000; // 60 seconds for full sequential test
const DEBUG = process.env.DEBUG === 'true' || false;
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
const REPORT_DIR = path.join(__dirname, 'reports');

// Create directories if they don't exist
for (const dir of [SCREENSHOT_DIR, REPORT_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Test result tracking
class TestReport {
  constructor() {
    this.startTime = Date.now();
    this.steps = [];
    this.errors = [];
    this.warnings = [];
    this.success = true;
  }

  addStep(name, status, details = {}) {
    const step = {
      name,
      status,
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      ...details
    };
    this.steps.push(step);
    this.startTime = Date.now(); // Reset for next step

    // Log step
    const icon = status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : '❌';
    // Use a logging utility that can be captured by Datadog
    const logMessage = `${icon} ${name}`;
    console.log(logMessage);
    if (details.message) {
      console.log(`   ${details.message}`);
    }
    // Add trace if Datadog is available
    try {
      const tracer = require('dd-trace');
      const span = tracer.scope().active();
      if (span) {
        span.addTags({
          'test.step': name,
          'test.status': status,
          'test.message': details.message || ''
        });
      }
    } catch (e) {
      // Datadog tracing not available, continue without it
    }

    // Track failures
    if (status === 'fail') {
      this.success = false;
      this.errors.push({
        step: name,
        message: details.message || 'Unknown error'
      });
    } else if (status === 'warn') {
      this.warnings.push({
        step: name,
        message: details.message || 'Unknown warning'
      });
    }
  }

  generateReport() {
    const report = {
      testName: 'Datadog Sequential Web Test',
      startTime: new Date().toISOString(),
      duration: this.steps.reduce((sum, step) => sum + (step.duration || 0), 0),
      steps: this.steps,
      errors: this.errors,
      warnings: this.warnings,
      success: this.success,
      summary: {
        total: this.steps.length,
        passed: this.steps.filter(s => s.status === 'pass').length,
        warnings: this.warnings.length,
        errors: this.errors.length
      }
    };

    // Save report to file
    const reportFile = path.join(REPORT_DIR, `sequential-test-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\nFull report saved to: ${reportFile}`);

    return report;
  }
}

/**
 * Main function to run the sequential web test
 */
async function runSequentialTest(baseUrl = 'http://localhost:4321') {
  console.log(`\n🔄 Starting Comprehensive Sequential Web Test\n`);
  console.log(`Target URL: ${baseUrl}\n`);
  
  const report = new TestReport();
  let browser;
  let page;

  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1366, height: 768 }
    });
    
    page = await browser.newPage();
    page.setDefaultTimeout(TEST_TIMEOUT);
    
    // Enable console logging if in debug mode
    if (DEBUG) {
      page.on('console', msg => console.log(`[Browser Console] ${msg.text()}`));
    }
    
    // 1. Test Homepage Loading
    await page.goto(baseUrl, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-homepage.png') });
    
    const title = await page.title();
    if (title && title.includes('AI Tools')) {
      report.addStep('Homepage Load', 'pass', { message: `Page title: ${title}` });
    } else {
      report.addStep('Homepage Load', 'fail', { message: `Unexpected page title: ${title}` });
    }
    
    // 2. Validate Header
    const headerSelectors = ['header', '.site-header', 'header.site-header'];
    let headerFound = false;
    for (const selector of headerSelectors) {
      const header = await page.$(selector);
      if (header) {
        headerFound = true;
        report.addStep('Header Detection', 'pass', { message: `Found header with selector: ${selector}` });
        break;
      }
    }
    
    if (!headerFound) {
      report.addStep('Header Detection', 'fail', { message: 'Header not found on homepage' });
    }
    
    // 3. Validate Navigation Links
    const navLinks = await page.$$eval('a', links => {
      return links.map(link => ({
        text: link.innerText.trim(),
        href: link.getAttribute('href')
      })).filter(link => link.text && link.href);
    });
    
    const requiredLinks = ['home', 'resources', 'observations', 'about'];
    const foundLinks = requiredLinks.filter(required => {
      return navLinks.some(link => {
        return link.text.toLowerCase().includes(required) || 
               link.href.toLowerCase().includes(required);
      });
    });
    
    if (foundLinks.length === requiredLinks.length) {
      report.addStep('Navigation Links', 'pass', { message: `Found all required navigation links` });
    } else {
      const missing = requiredLinks.filter(link => !foundLinks.includes(link));
      report.addStep('Navigation Links', 'warn', { 
        message: `Missing navigation links: ${missing.join(', ')}`,
        found: foundLinks,
        missing
      });
    }
    
    // 4. Validate Footer
    const footerSelectors = ['footer', '.site-footer', 'footer.site-footer'];
    let footerFound = false;
    for (const selector of footerSelectors) {
      const footer = await page.$(selector);
      if (footer) {
        footerFound = true;
        report.addStep('Footer Detection', 'pass', { message: `Found footer with selector: ${selector}` });
        break;
      }
    }
    
    if (!footerFound) {
      report.addStep('Footer Detection', 'fail', { message: 'Footer not found on homepage' });
    }
    
    // 5. Navigate to Resources Page
    // Try both URL patterns
    let resourcesLoaded = false;
    for (const resourcesPath of ['/resources', '/pages/resources']) {
      try {
        const resourcesUrl = new URL(resourcesPath, baseUrl).href;
        await page.goto(resourcesUrl, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT / 2 });
        
        // Check if we loaded a resources page
        const resourcesTitle = await page.title();
        const pageText = await page.evaluate(() => document.body.innerText);
        
        if (resourcesTitle.toLowerCase().includes('resource') || pageText.toLowerCase().includes('resources')) {
          resourcesLoaded = true;
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-resources.png') });
          report.addStep('Resources Page Navigation', 'pass', { message: `Successfully loaded resources page at: ${resourcesUrl}` });
          break;
        }
      } catch (e) {
        console.warn(`Warning attempting ${resourcesPath}: ${e.message}`);
      }
    }
    
    if (!resourcesLoaded) {
      report.addStep('Resources Page Navigation', 'fail', { message: 'Could not load resources page with any URL pattern' });
    } else {
      // 6. Validate Resource Cards
      const cardSelectors = ['.resource-card', 'div[class*="resource"]', '.card'];
      let resourceCards = [];
      let cardSelector = '';
      
      for (const selector of cardSelectors) {
        const cards = await page.$$(selector);
        if (cards.length > 0) {
          resourceCards = cards;
          cardSelector = selector;
          break;
        }
      }
      
      if (resourceCards.length > 0) {
        report.addStep('Resource Cards', 'pass', { 
          message: `Found ${resourceCards.length} resource cards with selector: ${cardSelector}`,
          count: resourceCards.length
        });
        
        // 7. Test Resource Card Click
        try {
          // Try to find a clickable element within the first card
          const cardLinks = await resourceCards[0].$$('a');
          if (cardLinks.length > 0) {
            // Store current URL to verify navigation
            const beforeUrl = page.url();
            
            // Open link in a new tab to avoid disrupting our test flow
            const newPagePromise = new Promise(resolve => {
              browser.once('targetcreated', target => resolve(target.page()));
            });
            
            await cardLinks[0].click({ button: 'middle' }); // Middle-click to open in new tab
            
            // Wait for the new tab to open and load
            const newPage = await newPagePromise;
            await newPage.waitForNavigation({ waitUntil: 'networkidle2', timeout: TEST_TIMEOUT / 2 });
            
            // Take screenshot of resource link
            await newPage.screenshot({ path: path.join(SCREENSHOT_DIR, '03-resource-link.png') });
            
            // Verify we navigated somewhere
            const afterUrl = await newPage.url();
            if (afterUrl !== beforeUrl) {
              report.addStep('Resource Card Link', 'pass', { 
                message: `Successfully opened resource link: ${afterUrl}`,
                url: afterUrl
              });
            } else {
              report.addStep('Resource Card Link', 'warn', { message: 'Resource card link did not navigate to a new page' });
            }
            
            // Close the new tab
            await newPage.close();
          } else {
            report.addStep('Resource Card Link', 'warn', { message: 'No clickable links found in resource card' });
          }
        } catch (e) {
          report.addStep('Resource Card Link', 'warn', { 
            message: `Error testing resource card link: ${e.message}`,
            error: e.toString()
          });
        }
      } else {
        report.addStep('Resource Cards', 'fail', { message: 'No resource cards found on resources page' });
      }
      
      // 8. Test Observations Page Navigation
      try {
        // Handle URL patterns based on environment
        // Production site uses /pages/ prefix, test site doesn't
        const isProd = baseUrl.includes('ai-tools-lab.com');
        const observationsPaths = isProd ? ["/pages/observations"] : ["/observations"];
        
        // Try both patterns if necessary and log which we're trying
        let observationsLoaded = false;
        let successfulUrl = '';
        
        for (const observationsPath of observationsPaths) {
          try {
            const observationsUrl = new URL(observationsPath, baseUrl).href;
            if (DEBUG) console.log(`Trying observations page URL: ${observationsUrl}`);
            
            await page.goto(observationsUrl, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT / 2 });
            
            // Check if we loaded an observations page
            const observationsTitle = await page.title();
            const pageText = await page.evaluate(() => document.body.innerText);
            
            if (observationsTitle.toLowerCase().includes('observation') || pageText.toLowerCase().includes('observations')) {
              observationsLoaded = true;
              successfulUrl = observationsUrl;
              await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-observations.png') });
              report.addStep('Observations Page Navigation', 'pass', { message: `Successfully loaded observations page at: ${observationsUrl}` });
              
              // Check for observations content
              const contentElements = await page.$$('article, .observation, div[class*="observation"]');
              if (contentElements.length > 0) {
                report.addStep('Observations Content', 'pass', { message: `Found ${contentElements.length} observation elements` });
              } else {
                report.addStep('Observations Content', 'warn', { message: 'No observation-specific elements found' });
              }
              
              break;
            }
          } catch (e) {
            if (DEBUG) console.warn(`Warning attempting ${observationsPath}: ${e.message}`);
          }
        }
        
        if (!observationsLoaded) {
          report.addStep('Observations Page Navigation', 'fail', { 
            message: `Could not load observations page with any URL pattern: ${observationsPaths.join(', ')}` 
          });
        }
      } catch (e) {
        report.addStep('Observations Page Navigation', 'fail', { 
          message: `Error navigating to observations page: ${e.message}`,
          error: e.toString()
        });
      }
      
      // 10. Return to Homepage
      try {
        await page.goto(baseUrl, { waitUntil: 'networkidle2' });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-back-to-homepage.png') });
        
        // Verify we're back on the homepage
        const homeTitle = await page.title();
        if (homeTitle === title) {
          report.addStep('Return to Homepage', 'pass', { message: 'Successfully returned to homepage' });
        } else {
          report.addStep('Return to Homepage', 'warn', { message: `Returned to page with unexpected title: ${homeTitle}` });
        }
      } catch (e) {
        report.addStep('Return to Homepage', 'fail', { 
          message: `Error returning to homepage: ${e.message}`,
          error: e.toString()
        });
      }
    }
    
    // 11. Test Mobile Responsiveness
    try {
      // Set mobile viewport
      await page.setViewport({ width: 375, height: 667, isMobile: true });
      await page.reload({ waitUntil: 'networkidle2' });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-mobile-view.png') });
      
      // Check for hamburger menu or mobile navigation indicator
      const mobileNavIndicators = [
        '.hamburger-menu', '.mobile-nav', 'button[aria-label*="menu"]', 'button[aria-label*="navigation"]'
      ];
      
      let mobileNavFound = false;
      for (const selector of mobileNavIndicators) {
        const indicator = await page.$(selector);
        if (indicator) {
          mobileNavFound = true;
          report.addStep('Mobile Responsiveness', 'pass', { message: `Mobile navigation detected via selector: ${selector}` });
          
          // Try to click the mobile menu
          try {
            await indicator.click();
            // Use setTimeout instead of waitForTimeout
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait for animation
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-mobile-menu-open.png') });
            report.addStep('Mobile Menu', 'pass', { message: 'Successfully clicked mobile menu' });
          } catch (e) {
            report.addStep('Mobile Menu', 'warn', { message: `Error clicking mobile menu: ${e.message}` });
          }
          
          break;
        }
      }
      
      if (!mobileNavFound) {
        report.addStep('Mobile Responsiveness', 'warn', { message: 'No mobile navigation indicators found' });
      }
      
      // Reset viewport back to desktop
      await page.setViewport({ width: 1366, height: 768 });
    } catch (e) {
      report.addStep('Mobile Responsiveness', 'warn', { 
        message: `Error testing mobile responsiveness: ${e.message}`,
        error: e.toString()
      });
    }
    
    // 12. Final Validation
    // Check for critical errors
    if (report.errors.length === 0) {
      report.addStep('Critical Component Validation', 'pass', { message: 'All critical components validated successfully' });
    } else {
      report.addStep('Critical Component Validation', 'fail', { 
        message: `Failed to validate ${report.errors.length} critical components`,
        errors: report.errors.map(e => e.message).join(', ')
      });
    }
    
    // Generate final report
    const finalReport = report.generateReport();
    
    // Print summary
    console.log('\n📊 TEST SUMMARY:');
    console.log('========================');
    console.log(`Total Steps: ${finalReport.summary.total}`);
    console.log(`Passed: ${finalReport.summary.passed}`);
    console.log(`Warnings: ${finalReport.summary.warnings}`);
    console.log(`Errors: ${finalReport.summary.errors}`);
    console.log(`Result: ${finalReport.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log('========================\n');
    
    return finalReport.success;
    
  } catch (error) {
    console.error(`Error in sequential test: ${error.message}`);
    if (DEBUG) console.error(error);
    
    report.addStep('Unexpected Error', 'fail', { 
      message: `Test failed with unexpected error: ${error.message}`,
      error: error.toString(),
      stack: error.stack
    });
    
    return false;
  } finally {
    if (browser) await browser.close();
  }
}

// Command line arguments
let baseUrl = process.env.TEST_URL || 'http://localhost:4321';
process.argv.forEach(arg => {
  if (arg.startsWith('--url=')) {
    baseUrl = arg.split('=')[1];
  }
  if (arg === '--debug') {
    process.env.DEBUG = 'true';
  }
});

// Run the test
if (require.main === module) {
  runSequentialTest(baseUrl)
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal error running test:', err);
      process.exit(1);
    });
}

module.exports = { runSequentialTest };
