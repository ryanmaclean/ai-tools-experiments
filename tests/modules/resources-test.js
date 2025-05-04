#!/usr/bin/env node

/**
 * Resources Component Test Module
 * Tests the resources page and resource cards, with Datadog integration
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
const RUN_ID = `resources-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

/**
 * Run the resources page test
 */
async function runResourcesTest() {
  const startTime = Date.now();
  let browser;
  let page;

  try {
    // Initialize Datadog tracing if available
    let datadogTracer;
    try {
      datadogTracer = require('dd-trace');
      datadogTracer.init({
        service: 'resources-test',
        logInjection: true,
        analytics: true,
        profiling: true,
        env: process.env.NODE_ENV || 'test'
      });
    } catch (e) {
      console.log(`Worker ${workerId}: Datadog tracing not available -`, e.message);
    }

    // Start the test span
    const testSpan = datadogTracer && datadogTracer.startSpan('test.resources');
    if (testSpan) {
      testSpan.setTag('test.url', baseUrl);
      testSpan.setTag('test.component', 'resources');
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

    // 1. Navigate to the resources page directly
    // Extract the domain from the baseUrl
    const baseUrlObj = new URL(baseUrl);
    const resourcesUrl = `${baseUrlObj.origin}/resources`;

    if (testSpan) testSpan.addTags({ 'test.step': 'navigate', 'test.resource_url': resourcesUrl });
    console.log(`Worker ${workerId}: Navigating to resources page: ${resourcesUrl}`);
    
    // Use a retry mechanism for navigation (common source of flakiness)
    let navigationSuccess = false;
    let navigationAttempts = 0;
    const maxNavigationAttempts = 3;
    
    while (!navigationSuccess && navigationAttempts < maxNavigationAttempts) {
      try {
        await page.goto(resourcesUrl, { 
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

    // 2. Check for resource cards
    if (testSpan) testSpan.addTags({ 'test.step': 'check_resource_cards' });
    console.log(`Worker ${workerId}: Checking for resource cards`);
    
    // Try different selectors with fallbacks to reduce flakiness
    const resourceCardSelectors = [
      '.resource-card',
      'div[class*="resource"]',
      'article[class*="resource"]',
      '.card'
    ];
    
    let resourceCards = [];
    let selectorUsed = '';
    
    for (const selector of resourceCardSelectors) {
      resourceCards = await page.$$(selector);
      if (resourceCards.length > 0) {
        selectorUsed = selector;
        console.log(`Worker ${workerId}: Found ${resourceCards.length} resource cards with selector: ${selector}`);
        break;
      }
    }

    if (resourceCards.length === 0) {
      // If no cards found initially, wait and try once more
      await new Promise(r => setTimeout(r, 2000)); // Wait longer
      
      for (const selector of resourceCardSelectors) {
        resourceCards = await page.$$(selector);
        if (resourceCards.length > 0) {
          selectorUsed = selector;
          console.log(`Worker ${workerId}: Found ${resourceCards.length} resource cards with selector after waiting: ${selector}`);
          break;
        }
      }
      
      // If still no cards, check for any potential resource container
      if (resourceCards.length === 0) {
        const anyContainer = await page.$('main') || await page.$('body');
        if (anyContainer) {
          const html = await page.evaluate(el => el.innerHTML, anyContainer);
          console.log(`Worker ${workerId}: Container HTML snippet:`);
          console.log(html.substring(0, 500) + '... [truncated]');
        }
        throw new Error('No resource cards found with any selector');
      }
    }

    // 3. Validate a sample of resource cards
    if (testSpan) testSpan.addTags({ 'test.step': 'validate_cards', 'test.card_count': resourceCards.length });
    
    // Sample up to 5 cards for detailed validation
    const sampleSize = Math.min(5, resourceCards.length);
    const sampleIndices = Array.from({ length: sampleSize }, (_, i) => 
      Math.floor(i * (resourceCards.length / sampleSize)));
    
    const cardValidations = [];
    
    for (let i = 0; i < sampleIndices.length; i++) {
      const cardIndex = sampleIndices[i];
      const card = resourceCards[cardIndex];
      
      try {
        // Check if card has a title
        const hasTitle = await card.evaluate(el => {
          const titleEl = el.querySelector('h2, h3, .title, [class*="title"]');
          return !!titleEl && titleEl.textContent.trim().length > 0;
        });
        
        // Check if card has a link
        const hasLink = await card.evaluate(el => {
          const links = el.querySelectorAll('a');
          return links.length > 0;
        });
        
        // Check if card has an image or icon
        const hasImage = await card.evaluate(el => {
          return el.querySelector('img') !== null || 
                 el.querySelector('svg') !== null ||
                 el.querySelector('[class*="icon"]') !== null;
        });
        
        // Check if card is visible
        const isVisible = await card.evaluate(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && 
                 style.visibility !== 'hidden' && 
                 style.opacity !== '0' &&
                 el.offsetWidth > 0 &&
                 el.offsetHeight > 0;
        });
        
        cardValidations.push({
          index: cardIndex,
          hasTitle,
          hasLink,
          hasImage,
          isVisible,
          valid: hasTitle && hasLink && isVisible
        });
        
      } catch (e) {
        console.error(`Worker ${workerId}: Error validating card ${cardIndex}:`, e.message);
        cardValidations.push({
          index: cardIndex,
          error: e.message,
          valid: false
        });
      }
    }
    
    const validCards = cardValidations.filter(v => v.valid).length;
    if (validCards === 0) {
      throw new Error('No valid resource cards found');
    }
    
    // 4. Take screenshot of resource cards area
    if (testSpan) testSpan.addTags({ 'test.step': 'screenshot' });
    
    // Try to get bounding box of the container of cards
    const container = await page.$(selectorUsed).then(el => 
      el ? el.evaluateHandle(el => el.parentElement || el) : null
    );
    
    if (container) {
      const containerBox = await container.boundingBox();
      if (containerBox) {
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `${RUN_ID}-resources.png`),
          clip: {
            x: containerBox.x,
            y: containerBox.y,
            width: containerBox.width,
            height: Math.min(containerBox.height, 1000) // Limit height to avoid giant screenshots
          }
        });
      }
    }

    // Log test completion and duration
    const duration = Date.now() - startTime;
    console.log(`Worker ${workerId}: Resources test completed successfully in ${duration}ms`);
    console.log(`Worker ${workerId}: Found ${resourceCards.length} resource cards, ${validCards} validated as valid`);
    
    if (testSpan) {
      testSpan.setTag('test.success', true);
      testSpan.setTag('test.duration', duration);
      testSpan.setTag('test.resource_cards_found', resourceCards.length);
      testSpan.setTag('test.valid_cards', validCards);
      testSpan.finish();
    }

    // Return success result
    return {
      success: true,
      component: 'resources',
      duration,
      timestamp: new Date().toISOString(),
      details: {
        resourceCardsFound: resourceCards.length,
        validCards,
        cardSamplesValidated: cardValidations.length,
        selectorUsed,
        cardValidations,
        screenshotPath: path.join(SCREENSHOT_DIR, `${RUN_ID}-resources.png`)
      }
    };
  } catch (error) {
    // Log and capture error
    const duration = Date.now() - startTime;
    console.error(`Worker ${workerId}: Resources test failed:`, error);
    
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
      component: 'resources',
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
    const result = await runResourcesTest();
    parentPort.postMessage(result);
  } catch (err) {
    parentPort.postMessage({
      success: false,
      component: 'resources',
      error: {
        message: err.message,
        stack: err.stack
      }
    });
  }
})();
