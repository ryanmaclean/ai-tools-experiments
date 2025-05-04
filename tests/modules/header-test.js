#!/usr/bin/env node

/**
 * Header Component Test Module
 * Tests the site header in isolation, with Datadog integration
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { workerData, parentPort } = require('worker_threads');

// Worker configuration
const {
  baseUrl = 'http://localhost:4321',
  debug = false,
  testTimeout = 60000,
  workerId = 0
} = workerData || {};

// Directories for artifacts
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Create a unique ID for this test run
const RUN_ID = `header-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

/**
 * Run the header component test
 */
async function runHeaderTest() {
  const startTime = Date.now();
  let browser;
  let page;

  try {
    // Initialize Datadog tracing if available
    let datadogTracer;
    try {
      datadogTracer = require('dd-trace');
      datadogTracer.init({
        service: 'header-test',
        logInjection: true,
        analytics: true,
        profiling: true,
        env: process.env.NODE_ENV || 'test'
      });
    } catch (e) {
      console.log(`Worker ${workerId}: Datadog tracing not available -`, e.message);
    }

    // Start the test span
    const testSpan = datadogTracer && datadogTracer.startSpan('test.header');
    if (testSpan) {
      testSpan.setTag('test.url', baseUrl);
      testSpan.setTag('test.component', 'header');
      testSpan.setTag('test.worker_id', workerId);
    }

    // Launch browser with anti-flakiness settings
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Prevents OOM in Docker containers
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1366,768'
      ],
      defaultViewport: { width: 1366, height: 768 }
    });
    
    page = await browser.newPage();
    
    // Set tighter timeouts to fail fast
    page.setDefaultNavigationTimeout(testTimeout);
    page.setDefaultTimeout(testTimeout / 2);

    // Stability improvements
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      // Block unnecessary resources that might cause flakiness
      const blockedResourceTypes = ['image', 'media', 'font'];
      if (blockedResourceTypes.includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Enable console logging in debug mode
    if (debug) {
      page.on('console', msg => console.log(`[Browser ${workerId}] ${msg.text()}`));
    }

    // 1. Navigate to the page
    if (testSpan) testSpan.addTags({ 'test.step': 'navigate' });
    console.log(`Worker ${workerId}: Navigating to ${baseUrl}`);
    
    // Use a retry mechanism for navigation (common source of flakiness)
    let navigationSuccess = false;
    let navigationAttempts = 0;
    const maxNavigationAttempts = 3;
    
    while (!navigationSuccess && navigationAttempts < maxNavigationAttempts) {
      try {
        await page.goto(baseUrl, { 
          waitUntil: 'networkidle2', 
          timeout: testTimeout / (navigationAttempts + 1) // Decrease timeout with each retry
        });
        navigationSuccess = true;
      } catch (e) {
        navigationAttempts++;
        if (navigationAttempts >= maxNavigationAttempts) throw e;
        console.log(`Worker ${workerId}: Navigation retry ${navigationAttempts}/${maxNavigationAttempts}`);
        await new Promise(r => setTimeout(r, 1000)); // Wait before retrying
      }
    }

    // Take screenshot for debugging
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, `${RUN_ID}-initial.png`),
      fullPage: true
    });

    // 2. Check for header
    if (testSpan) testSpan.addTags({ 'test.step': 'check_header' });
    console.log(`Worker ${workerId}: Checking for header element`);
    
    // Try multiple selectors with fallbacks (reduces flakiness)
    const headerSelectors = [
      'header.site-header', 
      'header#site-header',
      'div.site-header',
      'header',
      '[role="banner"]'
    ];
    
    let headerElement = null;
    for (const selector of headerSelectors) {
      headerElement = await page.$(selector);
      if (headerElement) {
        console.log(`Worker ${workerId}: Found header with selector: ${selector}`);
        break;
      }
    }

    if (!headerElement) {
      throw new Error('Header element not found with any selector');
    }

    // 3. Check header visibility
    if (testSpan) testSpan.addTags({ 'test.step': 'check_visibility' });
    
    const isHeaderVisible = await headerElement.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    });

    if (!isHeaderVisible) {
      throw new Error('Header element is not visible');
    }
    
    // 4. Check for navigation links in header
    if (testSpan) testSpan.addTags({ 'test.step': 'check_nav_links' });
    console.log(`Worker ${workerId}: Checking for navigation links`);
    
    const navLinks = await headerElement.$$('a');
    if (navLinks.length === 0) {
      throw new Error('No navigation links found in header');
    }
    
    console.log(`Worker ${workerId}: Found ${navLinks.length} navigation links`);
    
    // 5. Take screenshot of the header
    if (testSpan) testSpan.addTags({ 'test.step': 'screenshot' });
    
    const headerBox = await headerElement.boundingBox();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${RUN_ID}-header.png`),
      clip: {
        x: headerBox.x,
        y: headerBox.y,
        width: headerBox.width,
        height: headerBox.height
      }
    });

    // Log test completion and duration
    const duration = Date.now() - startTime;
    console.log(`Worker ${workerId}: Header test completed successfully in ${duration}ms`);
    
    if (testSpan) {
      testSpan.setTag('test.success', true);
      testSpan.setTag('test.duration', duration);
      testSpan.finish();
    }

    // Return success result
    return {
      success: true,
      component: 'header',
      duration,
      timestamp: new Date().toISOString(),
      details: {
        headerFound: true,
        headerVisible: isHeaderVisible,
        navLinksCount: navLinks.length,
        screenshotPath: path.join(SCREENSHOT_DIR, `${RUN_ID}-header.png`)
      }
    };
  } catch (error) {
    // Log and capture error
    const duration = Date.now() - startTime;
    console.error(`Worker ${workerId}: Header test failed:`, error);
    
    // Screenshot on failure for debugging
    if (page) {
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${RUN_ID}-error.png`),
        fullPage: true
      });
    }

    if (browser && debug) {
      console.log(`Worker ${workerId}: Page HTML at failure:`);
      const html = await page.content();
      console.log(html.substring(0, 500) + '... [truncated]');
    }

    return {
      success: false,
      component: 'header',
      duration,
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack
      },
      details: {
        screenshotPath: path.join(SCREENSHOT_DIR, `${RUN_ID}-error.png`)
      }
    };
  } finally {
    // Always close browser to prevent memory leaks
    if (browser) await browser.close();
  }
}

// Run the test and send results back to the parent
(async () => {
  try {
    const result = await runHeaderTest();
    parentPort.postMessage(result);
  } catch (err) {
    parentPort.postMessage({
      success: false,
      component: 'header',
      error: {
        message: err.message,
        stack: err.stack
      }
    });
  }
})();
