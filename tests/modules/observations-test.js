#!/usr/bin/env node

/**
 * Observations Page Test Module
 * Tests the observations page, with Datadog integration
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
const RUN_ID = `observations-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

/**
 * Run the observations page test
 */
async function runObservationsTest() {
  const startTime = Date.now();
  let browser;
  let page;

  try {
    // Initialize Datadog tracing if available
    let datadogTracer;
    try {
      datadogTracer = require('dd-trace');
      datadogTracer.init({
        service: 'observations-test',
        logInjection: true,
        analytics: true,
        profiling: true,
        env: process.env.NODE_ENV || 'test'
      });
    } catch (e) {
      console.log(`Worker ${workerId}: Datadog tracing not available -`, e.message);
    }

    // Start the test span
    const testSpan = datadogTracer && datadogTracer.startSpan('test.observations');
    if (testSpan) {
      testSpan.setTag('test.url', baseUrl);
      testSpan.setTag('test.component', 'observations');
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

    // Enable console logging in debug mode
    if (debug) {
      page.on('console', msg => console.log(`[Browser ${workerId}] ${msg.text()}`));
    }

    // 1. Handle URL patterns based on environment
    // Extract domain from baseUrl
    const baseUrlObj = new URL(baseUrl);
    const isProd = baseUrlObj.hostname.includes('ai-tools-lab.com');
    const observationsPaths = isProd ? ["/pages/observations"] : ["/observations", "/pages/observations"];
    
    if (testSpan) {
      testSpan.setTag('test.is_prod', isProd);
      testSpan.setTag('test.observation_paths', JSON.stringify(observationsPaths));
    }
    
    // 2. Try multiple paths until one works
    let observationsUrl = null;
    let observationsLoaded = false;
    let navigationError = null;
    
    if (testSpan) testSpan.addTags({ 'test.step': 'navigate' });
    
    for (const observationsPath of observationsPaths) {
      observationsUrl = `${baseUrlObj.origin}${observationsPath}`;
      console.log(`Worker ${workerId}: Attempting to load observations at: ${observationsUrl}`);
      
      // Use a retry mechanism for navigation
      let navigationAttempts = 0;
      const maxNavigationAttempts = 2; // Fewer retries per URL pattern
      
      while (!observationsLoaded && navigationAttempts < maxNavigationAttempts) {
        try {
          await page.goto(observationsUrl, { 
            waitUntil: 'networkidle2', 
            timeout: testTimeout / (navigationAttempts + 1)
          });
          
          // Check for page title or content to verify we're on the observations page
          const pageTitle = await page.title();
          const hasObservationsContent = await page.evaluate(() => {
            const heading = document.querySelector('h1, h2');
            return heading && heading.textContent.toLowerCase().includes('observation');
          });
          
          if (pageTitle.toLowerCase().includes('observation') || hasObservationsContent) {
            observationsLoaded = true;
            console.log(`Worker ${workerId}: Successfully loaded observations page at ${observationsUrl}`);
            if (testSpan) testSpan.setTag('test.observation_url_used', observationsUrl);
            break;
          } else {
            console.log(`Worker ${workerId}: Page loaded but doesn't appear to be observations (title: ${pageTitle})`);
            navigationAttempts++;
          }
        } catch (e) {
          navigationAttempts++;
          navigationError = e;
          console.log(`Worker ${workerId}: Navigation failed for ${observationsUrl}: ${e.message}`);
          if (navigationAttempts >= maxNavigationAttempts) {
            console.log(`Worker ${workerId}: Max navigation attempts reached for this path`); 
            break;
          }
          await new Promise(r => setTimeout(r, 1000)); // Wait before retrying
        }
      }
      
      if (observationsLoaded) break; // Found a working path
    }
    
    if (!observationsLoaded) {
      throw new Error(`Failed to load observations page with any path: ${navigationError?.message || 'Unknown error'}`);
    }

    // Take screenshot for debugging
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, `${RUN_ID}-initial.png`),
      fullPage: true
    });

    // 3. Check for observations content
    if (testSpan) testSpan.addTags({ 'test.step': 'check_content' });
    console.log(`Worker ${workerId}: Checking for observations content`);
    
    // Check for main heading
    const mainHeading = await page.$('h1, h2');
    if (!mainHeading) {
      throw new Error('No main heading found on observations page');
    }
    
    const headingText = await page.evaluate(el => el.textContent, mainHeading);
    console.log(`Worker ${workerId}: Found main heading: "${headingText}"`);
    
    // Check for observation cards or list items
    const observationSelectors = [
      '.observation', 
      '[class*="observation"]',
      'article', 
      '.card',
      'li'
    ];
    
    let observationItems = [];
    let observationSelector = '';
    
    for (const selector of observationSelectors) {
      observationItems = await page.$$(selector);
      if (observationItems.length > 0) {
        observationSelector = selector;
        console.log(`Worker ${workerId}: Found ${observationItems.length} observation items with selector: ${selector}`);
        break;
      }
    }
    
    // Even if we don't find specific observation items, check if there's substantive content
    const hasSubstantiveContent = await page.evaluate(() => {
      const mainContent = document.querySelector('main') || document.body;
      const paragraphs = mainContent.querySelectorAll('p');
      const lists = mainContent.querySelectorAll('ul, ol');
      return paragraphs.length > 0 || lists.length > 0;
    });
    
    if (observationItems.length === 0 && !hasSubstantiveContent) {
      throw new Error('No observation content found on page');
    }
    
    // 4. Take a screenshot of the observations content
    if (testSpan) testSpan.addTags({ 'test.step': 'screenshot' });
    
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${RUN_ID}-observations.png`),
      fullPage: true
    });

    // Log test completion and duration
    const duration = Date.now() - startTime;
    console.log(`Worker ${workerId}: Observations test completed successfully in ${duration}ms`);
    
    if (testSpan) {
      testSpan.setTag('test.success', true);
      testSpan.setTag('test.duration', duration);
      testSpan.setTag('test.observation_items_found', observationItems.length);
      testSpan.setTag('test.has_substantive_content', hasSubstantiveContent);
      testSpan.finish();
    }

    // Return success result
    return {
      success: true,
      component: 'observations',
      duration,
      timestamp: new Date().toISOString(),
      details: {
        observationsUrlUsed: observationsUrl,
        mainHeading: headingText,
        observationItemsFound: observationItems.length,
        observationSelector: observationSelector || 'none',
        hasSubstantiveContent,
        screenshotPath: path.join(SCREENSHOT_DIR, `${RUN_ID}-observations.png`)
      }
    };
  } catch (error) {
    // Log and capture error
    const duration = Date.now() - startTime;
    console.error(`Worker ${workerId}: Observations test failed:`, error);
    
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
      component: 'observations',
      duration,
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack
      },
      details: {
        screenshotPath: page ? path.join(SCREENSHOT_DIR, `${RUN_ID}-error.png`) : null
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
    const result = await runObservationsTest();
    parentPort.postMessage(result);
  } catch (err) {
    parentPort.postMessage({
      success: false,
      component: 'observations',
      error: {
        message: err.message,
        stack: err.stack
      }
    });
  }
})();
