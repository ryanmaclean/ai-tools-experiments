#!/usr/bin/env node

/**
 * Mobile Responsiveness Test Module
 * Tests the site's mobile experience, with Datadog integration
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
const RUN_ID = `mobile-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

// Mobile device presets to test
const MOBILE_DEVICES = [
  { name: 'iPhone 12', width: 390, height: 844, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1' },
  { name: 'Pixel 5', width: 393, height: 851, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36' }
];

/**
 * Run the mobile responsiveness test
 */
async function runMobileTest() {
  const startTime = Date.now();
  let browser;
  let page;

  try {
    // Initialize Datadog tracing if available
    let datadogTracer;
    try {
      datadogTracer = require('dd-trace');
      datadogTracer.init({
        service: 'mobile-test',
        logInjection: true,
        analytics: true,
        profiling: true,
        env: process.env.NODE_ENV || 'test'
      });
    } catch (e) {
      console.log(`Worker ${workerId}: Datadog tracing not available -`, e.message);
    }

    // Start the test span
    const testSpan = datadogTracer && datadogTracer.startSpan('test.mobile');
    if (testSpan) {
      testSpan.setTag('test.url', baseUrl);
      testSpan.setTag('test.component', 'mobile');
      testSpan.setTag('test.worker_id', workerId);
    }

    // Launch browser with anti-flakiness settings
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    
    page = await browser.newPage();
    page.setDefaultNavigationTimeout(testTimeout);
    page.setDefaultTimeout(testTimeout / 2);

    // Enable console logging in debug mode
    if (debug) {
      page.on('console', msg => console.log(`[Browser ${workerId}] ${msg.text()}`));
    }

    // Store results for each device
    const deviceResults = [];
    
    // Test each mobile device preset
    for (const device of MOBILE_DEVICES) {
      if (testSpan) testSpan.addTags({ 'test.step': `test_${device.name.toLowerCase().replace(' ', '_')}` });
      console.log(`Worker ${workerId}: Testing on ${device.name}`);
      
      // Configure viewport for this device
      await page.setViewport({
        width: device.width,
        height: device.height,
        isMobile: device.isMobile,
        hasTouch: device.hasTouch
      });
      
      // Set user agent
      await page.setUserAgent(device.userAgent);
      
      // 1. Navigate to homepage
      console.log(`Worker ${workerId}: Navigating to ${baseUrl} on ${device.name}`);
      
      // Use retry mechanism for navigation
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
          console.log(`Worker ${workerId}: Navigation retry ${navigationAttempts}/${maxNavigationAttempts} on ${device.name}`);
          await new Promise(r => setTimeout(r, 1000)); // Wait before retrying
        }
      }
      
      // Take screenshot of mobile view
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${RUN_ID}-${device.name.toLowerCase().replace(' ', '-')}.png`),
        fullPage: true
      });
      
      // 2. Check for mobile navigation indicators
      console.log(`Worker ${workerId}: Checking for mobile navigation on ${device.name}`);
      
      const mobileNavSelectors = [
        '.hamburger-menu',
        '.mobile-nav',
        'button[aria-label*="menu"]',
        'button[aria-label*="navigation"]',
        '.menu-button',
        '.navbar-toggler',
        'button.menu',
        '[class*="hamburger"]'
      ];
      
      let mobileNavFound = false;
      let mobileNavSelector = '';
      let mobileMenuWorks = false;
      
      // Look for mobile navigation indicators
      for (const selector of mobileNavSelectors) {
        const navIndicator = await page.$(selector);
        if (navIndicator) {
          mobileNavFound = true;
          mobileNavSelector = selector;
          console.log(`Worker ${workerId}: Found mobile navigation with selector: ${selector} on ${device.name}`);
          
          // Try clicking the mobile menu
          try {
            await navIndicator.click();
            // Wait for animation
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Take screenshot of open menu
            await page.screenshot({
              path: path.join(SCREENSHOT_DIR, `${RUN_ID}-${device.name.toLowerCase().replace(' ', '-')}-menu-open.png`),
              fullPage: true
            });
            
            // Check if menu opened by looking for newly visible elements
            const visibleMenuLinks = await page.evaluate(() => {
              const links = Array.from(document.querySelectorAll('nav a, .mobile-menu a, .menu a'));
              return links.filter(link => {
                const style = window.getComputedStyle(link);
                return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
              }).length;
            });
            
            mobileMenuWorks = visibleMenuLinks > 0;
            console.log(`Worker ${workerId}: Mobile menu click ${mobileMenuWorks ? 'successful' : 'failed'} on ${device.name}`);
            break;
          } catch (e) {
            console.log(`Worker ${workerId}: Error clicking mobile menu on ${device.name}:`, e.message);
          }
        }
      }
      
      // 3. Check for responsive layout
      console.log(`Worker ${workerId}: Checking responsive layout on ${device.name}`);
      
      // Measure content width vs viewport width
      const isContentFitting = await page.evaluate(() => {
        const viewportWidth = window.innerWidth;
        const bodyWidth = document.body.scrollWidth;
        const horizontalOverflow = bodyWidth > viewportWidth;
        
        // Check if there's horizontal scrolling (usually indicates poor mobile design)
        const hasHorizontalScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
        
        return {
          viewportWidth,
          bodyWidth,
          horizontalOverflow,
          hasHorizontalScroll,
          contentFits: !horizontalOverflow && !hasHorizontalScroll
        };
      });
      
      // 4. Check text readability (font size)
      const textReadability = await page.evaluate(() => {
        const paragraphs = Array.from(document.querySelectorAll('p, h1, h2, h3, a'));
        let tooSmallCount = 0;
        
        for (const el of paragraphs) {
          const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
          if (fontSize < 12) {
            tooSmallCount++;
          }
        }
        
        return {
          totalTextElements: paragraphs.length,
          tooSmallElements: tooSmallCount,
          readabilityScore: paragraphs.length > 0 ? 
            ((paragraphs.length - tooSmallCount) / paragraphs.length) * 100 : 100
        };
      });
      
      // Add results for this device
      deviceResults.push({
        device: device.name,
        viewport: `${device.width}x${device.height}`,
        mobileNavFound,
        mobileNavSelector: mobileNavFound ? mobileNavSelector : 'none',
        mobileMenuWorks,
        contentFits: isContentFitting.contentFits,
        hasHorizontalScroll: isContentFitting.hasHorizontalScroll,
        readabilityScore: textReadability.readabilityScore,
        screenshotPath: path.join(SCREENSHOT_DIR, `${RUN_ID}-${device.name.toLowerCase().replace(' ', '-')}.png`)
      });
    }
    
    // Calculate overall mobile score
    const mobileScores = deviceResults.map(result => {
      let score = 0;
      if (result.mobileNavFound) score += 40;
      if (result.mobileMenuWorks) score += 20;
      if (result.contentFits) score += 30;
      // Add up to 10 points for readability (normalized from readabilityScore)
      score += Math.min(10, Math.floor(result.readabilityScore / 10));
      return score;
    });
    
    const averageMobileScore = mobileScores.reduce((sum, score) => sum + score, 0) / mobileScores.length;
    const testPassed = averageMobileScore >= 70; // Pass if 70% or better mobile experience
    
    // Log test completion and duration
    const duration = Date.now() - startTime;
    console.log(`Worker ${workerId}: Mobile test completed in ${duration}ms`);
    console.log(`Worker ${workerId}: Average mobile score: ${averageMobileScore.toFixed(1)}% (${testPassed ? 'PASS' : 'FAIL'})`);
    
    if (testSpan) {
      testSpan.setTag('test.success', testPassed);
      testSpan.setTag('test.duration', duration);
      testSpan.setTag('test.mobile_score', averageMobileScore);
      testSpan.setTag('test.devices_tested', MOBILE_DEVICES.length);
      testSpan.finish();
    }

    // Return success result
    return {
      success: testPassed,
      component: 'mobile',
      duration,
      timestamp: new Date().toISOString(),
      details: {
        averageMobileScore,
        devicesTested: MOBILE_DEVICES.length,
        deviceResults
      }
    };
  } catch (error) {
    // Log and capture error
    const duration = Date.now() - startTime;
    console.error(`Worker ${workerId}: Mobile test failed:`, error);
    
    // Screenshot on failure for debugging
    if (page) {
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${RUN_ID}-error.png`),
        fullPage: true
      });
    }

    return {
      success: false,
      component: 'mobile',
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
    const result = await runMobileTest();
    parentPort.postMessage(result);
  } catch (err) {
    parentPort.postMessage({
      success: false,
      component: 'mobile',
      error: {
        message: err.message,
        stack: err.stack
      }
    });
  }
})();
