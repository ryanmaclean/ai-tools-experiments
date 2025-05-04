#!/usr/bin/env node

/**
 * Navigation Test Module
 * Tests site navigation and cross-page functionality, with Datadog integration
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
const RUN_ID = `navigation-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

/**
 * Run the navigation test
 */
async function runNavigationTest() {
  const startTime = Date.now();
  let browser;
  let page;

  try {
    // Initialize Datadog tracing if available
    let datadogTracer;
    try {
      datadogTracer = require('dd-trace');
      datadogTracer.init({
        service: 'navigation-test',
        logInjection: true,
        analytics: true,
        profiling: true,
        env: process.env.NODE_ENV || 'test'
      });
    } catch (e) {
      console.log(`Worker ${workerId}: Datadog tracing not available -`, e.message);
    }

    // Start the test span
    const testSpan = datadogTracer && datadogTracer.startSpan('test.navigation');
    if (testSpan) {
      testSpan.setTag('test.url', baseUrl);
      testSpan.setTag('test.component', 'navigation');
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

    // 1. Navigate to homepage
    if (testSpan) testSpan.addTags({ 'test.step': 'navigate_home' });
    console.log(`Worker ${workerId}: Navigating to homepage: ${baseUrl}`);
    
    // Use a retry mechanism for navigation
    let navigationSuccess = false;
    let navigationAttempts = 0;
    const maxNavigationAttempts = 3;
    
    while (!navigationSuccess && navigationAttempts < maxNavigationAttempts) {
      try {
        await page.goto(baseUrl, { 
          waitUntil: 'networkidle2', 
          timeout: testTimeout / (navigationAttempts + 1)
        });
        navigationSuccess = true;
      } catch (e) {
        navigationAttempts++;
        if (navigationAttempts >= maxNavigationAttempts) throw e;
        console.log(`Worker ${workerId}: Navigation retry ${navigationAttempts}/${maxNavigationAttempts}`);
        await new Promise(r => setTimeout(r, 1000)); // Wait before retrying
      }
    }

    // 2. Find navigation links in header
    if (testSpan) testSpan.addTags({ 'test.step': 'find_nav_links' });
    console.log(`Worker ${workerId}: Finding navigation links`);
    
    // Try multiple selectors to find navigation
    const navSelectors = [
      'nav', 
      'header a', 
      'ul a', 
      '.navigation',
      '[role="navigation"]'
    ];
    
    let navLinks = [];
    let navSelector = '';
    
    for (const selector of navSelectors) {
      navLinks = await page.$$(selector);
      if (navLinks.length > 0) {
        navSelector = selector;
        console.log(`Worker ${workerId}: Found ${navLinks.length} navigation links with selector: ${selector}`);
        break;
      }
    }

    if (navLinks.length === 0) {
      throw new Error('No navigation links found');
    }

    // 3. Navigate to each link and verify page loads
    if (testSpan) testSpan.addTags({ 'test.step': 'test_navigation', 'test.link_count': navLinks.length });
    
    // Store navigation results
    const navigationResults = [];
    
    // Only test up to 3 links to avoid taking too long
    const testLinkCount = Math.min(3, navLinks.length);
    
    // Collect navigation URLs
    const navigationUrls = [];
    for (let i = 0; i < testLinkCount; i++) {
      try {
        const href = await navLinks[i].evaluate(link => link.href);
        const text = await navLinks[i].evaluate(link => link.textContent.trim());
        
        // Skip external links and empty hrefs
        const linkUrl = new URL(href);
        const baseUrlObj = new URL(baseUrl);
        
        if (linkUrl.origin === baseUrlObj.origin && href !== baseUrl) {
          navigationUrls.push({ href, text, index: i });
        } else {
          console.log(`Worker ${workerId}: Skipping link '${text}' (${href}) - same as base URL or external`);
        }
      } catch (e) {
        console.log(`Worker ${workerId}: Error getting href for link ${i}:`, e.message);
      }
    }
    
    console.log(`Worker ${workerId}: Will navigate to ${navigationUrls.length} internal links`);
    
    if (navigationUrls.length === 0) {
      console.log(`Worker ${workerId}: Warning - no valid internal navigation links found to test`);
      navigationResults.push({
        step: 'find_links',
        success: false,
        message: 'No valid internal navigation links found'
      });
    }
    
    // Navigate to each link
    for (const navUrl of navigationUrls) {
      try {
        if (testSpan) testSpan.addTags({ 'test.current_link': navUrl.text, 'test.current_url': navUrl.href });
        console.log(`Worker ${workerId}: Navigating to '${navUrl.text}' (${navUrl.href})`);
        
        // Navigate to the link
        const response = await page.goto(navUrl.href, { waitUntil: 'networkidle2', timeout: testTimeout / 2 });
        const status = response.status();
        
        // Take screenshot after navigation
        await page.screenshot({ 
          path: path.join(SCREENSHOT_DIR, `${RUN_ID}-nav-${navUrl.index}.png`),
          fullPage: false
        });
        
        // Check page title or heading to verify correct page loaded
        const title = await page.title();
        const mainHeading = await page.$('h1');
        const headingText = mainHeading ? await mainHeading.evaluate(el => el.textContent.trim()) : '';
        
        navigationResults.push({
          url: navUrl.href,
          text: navUrl.text,
          status,
          success: status >= 200 && status < 400,
          title,
          heading: headingText
        });
        
        console.log(`Worker ${workerId}: Navigation to '${navUrl.text}' success (status: ${status})`);
      } catch (e) {
        console.error(`Worker ${workerId}: Navigation to '${navUrl.text}' failed:`, e.message);
        navigationResults.push({
          url: navUrl.href,
          text: navUrl.text,
          success: false,
          error: e.message
        });
      }
      
      // Wait briefly between navigations to prevent rate limiting
      await new Promise(r => setTimeout(r, 500));
    }
    
    // 4. Return to homepage
    if (testSpan) testSpan.addTags({ 'test.step': 'return_home' });
    console.log(`Worker ${workerId}: Returning to homepage`);
    
    try {
      await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: testTimeout / 2 });
      navigationResults.push({
        url: baseUrl,
        text: 'Homepage',
        success: true,
        note: 'Returned to homepage successfully'
      });
    } catch (e) {
      console.error(`Worker ${workerId}: Failed to return to homepage:`, e.message);
      navigationResults.push({
        url: baseUrl,
        text: 'Homepage',
        success: false,
        error: e.message,
        note: 'Failed to return to homepage'
      });
    }

    // Calculate success rate
    const successfulNavigations = navigationResults.filter(r => r.success).length;
    const totalNavigations = navigationResults.length;
    const successRate = totalNavigations > 0 ? (successfulNavigations / totalNavigations) * 100 : 0;
    
    // Log test completion and duration
    const duration = Date.now() - startTime;
    console.log(`Worker ${workerId}: Navigation test completed in ${duration}ms`);
    console.log(`Worker ${workerId}: ${successfulNavigations}/${totalNavigations} navigations successful (${successRate.toFixed(1)}%)`);
    
    // Test passes if more than 70% of navigations succeeded
    const testPassed = successRate >= 70;
    
    if (testSpan) {
      testSpan.setTag('test.success', testPassed);
      testSpan.setTag('test.duration', duration);
      testSpan.setTag('test.navigation_success_rate', successRate);
      testSpan.setTag('test.successful_navigations', successfulNavigations);
      testSpan.setTag('test.total_navigations', totalNavigations);
      testSpan.finish();
    }

    // Return success result
    return {
      success: testPassed,
      component: 'navigation',
      duration,
      timestamp: new Date().toISOString(),
      details: {
        navigationLinkCount: navLinks.length,
        testedLinks: navigationUrls.length,
        successfulNavigations,
        totalNavigations,
        successRate,
        navigationResults
      }
    };
  } catch (error) {
    // Log and capture error
    const duration = Date.now() - startTime;
    console.error(`Worker ${workerId}: Navigation test failed:`, error);
    
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
      component: 'navigation',
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
    const result = await runNavigationTest();
    parentPort.postMessage(result);
  } catch (err) {
    parentPort.postMessage({
      success: false,
      component: 'navigation',
      error: {
        message: err.message,
        stack: err.stack
      }
    });
  }
})();
