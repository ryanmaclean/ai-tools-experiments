#!/usr/bin/env node

/**
 * Footer Component Test Module
 * Tests the site footer in isolation, with Datadog integration
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
const RUN_ID = `footer-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

/**
 * Run the footer component test
 */
async function runFooterTest() {
  const startTime = Date.now();
  let browser;
  let page;

  try {
    // Initialize Datadog tracing if available
    let datadogTracer;
    try {
      datadogTracer = require('dd-trace');
      datadogTracer.init({
        service: 'footer-test',
        logInjection: true,
        analytics: true,
        profiling: true,
        env: process.env.NODE_ENV || 'test'
      });
    } catch (e) {
      console.log(`Worker ${workerId}: Datadog tracing not available -`, e.message);
    }

    // Start the test span
    const testSpan = datadogTracer && datadogTracer.startSpan('test.footer');
    if (testSpan) {
      testSpan.setTag('test.url', baseUrl);
      testSpan.setTag('test.component', 'footer');
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

    // Scroll to the bottom of the page to ensure footer is in viewport
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 500)); // Wait for scroll to complete

    // Take screenshot for debugging
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, `${RUN_ID}-initial.png`),
      fullPage: true
    });

    // 2. Check for footer
    if (testSpan) testSpan.addTags({ 'test.step': 'check_footer' });
    console.log(`Worker ${workerId}: Checking for footer element`);
    
    // Try multiple selectors with fallbacks (reduces flakiness)
    const footerSelectors = [
      'footer.site-footer', 
      'footer#site-footer',
      'div.site-footer',
      'footer',
      '[role="contentinfo"]'
    ];
    
    let footerElement = null;
    for (const selector of footerSelectors) {
      footerElement = await page.$(selector);
      if (footerElement) {
        console.log(`Worker ${workerId}: Found footer with selector: ${selector}`);
        break;
      }
    }

    if (!footerElement) {
      throw new Error('Footer element not found with any selector');
    }

    // 3. Check footer visibility
    if (testSpan) testSpan.addTags({ 'test.step': 'check_visibility' });
    
    const isFooterVisible = await footerElement.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    });

    if (!isFooterVisible) {
      throw new Error('Footer element is not visible');
    }
    
    // 4. Check for links in footer
    if (testSpan) testSpan.addTags({ 'test.step': 'check_links' });
    console.log(`Worker ${workerId}: Checking for links in footer`);
    
    const footerLinks = await footerElement.$$('a');
    const linkCount = footerLinks.length;
    
    if (linkCount === 0) {
      throw new Error('No links found in footer');
    }
    
    console.log(`Worker ${workerId}: Found ${linkCount} links in footer`);
    
    // 5. Take screenshot of the footer
    if (testSpan) testSpan.addTags({ 'test.step': 'screenshot' });
    
    const footerBox = await footerElement.boundingBox();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${RUN_ID}-footer.png`),
      clip: {
        x: footerBox.x,
        y: footerBox.y,
        width: footerBox.width,
        height: footerBox.height
      }
    });

    // Log test completion and duration
    const duration = Date.now() - startTime;
    console.log(`Worker ${workerId}: Footer test completed successfully in ${duration}ms`);
    
    if (testSpan) {
      testSpan.setTag('test.success', true);
      testSpan.setTag('test.duration', duration);
      testSpan.finish();
    }

    // Return success result
    return {
      success: true,
      component: 'footer',
      duration,
      timestamp: new Date().toISOString(),
      details: {
        footerFound: true,
        footerVisible: isFooterVisible,
        linkCount,
        screenshotPath: path.join(SCREENSHOT_DIR, `${RUN_ID}-footer.png`)
      }
    };
  } catch (error) {
    // Log and capture error
    const duration = Date.now() - startTime;
    console.error(`Worker ${workerId}: Footer test failed:`, error);
    
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
      component: 'footer',
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
    const result = await runFooterTest();
    parentPort.postMessage(result);
  } catch (err) {
    parentPort.postMessage({
      success: false,
      component: 'footer',
      error: {
        message: err.message,
        stack: err.stack
      }
    });
  }
})();
