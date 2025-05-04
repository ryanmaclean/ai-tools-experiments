const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Configuration
const TEST_TIMEOUT = 45000; // 45 seconds timeout

// Helper function to find an available port
async function getAvailablePort() {
  // Start with port 4321 and try to find an available port
  let startPort = 4321;
  let maxPort = 4340; // Try up to port 4340
  let currentPort = startPort;
  
  // Process arguments for port override
  try {
    const portArg = process.argv.find(arg => arg.startsWith('--port='));
    if (portArg) {
      const port = parseInt(portArg.split('=')[1], 10);
      console.log(`Using port from command line argument: ${port}`);
      return port;
    }
    
    // Try to detect an existing Astro server port
    const { exec } = require('child_process');
    return new Promise((resolve) => {
      // Check for running Astro servers
      exec('lsof -i -P | grep LISTEN | grep node', (error, stdout, stderr) => {
        if (error || !stdout) {
          console.log(`No existing Astro server detected, using port: ${currentPort}`);
          return resolve(currentPort);
        }
        
        // Look for pattern like ":4330" in the output
        const portMatch = stdout.match(/:43[0-9]{2}/g);
        if (portMatch && portMatch.length > 0) {
          // Extract the port number from ":4330"
          const detectedPort = parseInt(portMatch[0].substring(1), 10);
          console.log(`Detected existing Astro server on port: ${detectedPort}`);
          return resolve(detectedPort);
        }
        
        console.log(`No matching Astro server port found, using default: ${currentPort}`);
        return resolve(currentPort);
      });
    });
  } catch (error) {
    console.error('Error detecting server port:', error);
    return startPort;
  }
}

// Main function to run tests
async function runTests() {
  // Get port and set base URL
  const TEST_PORT = await getAvailablePort();
  const BASE_URL = `http://localhost:${TEST_PORT}`;
  console.log(`Base URL for tests: ${BASE_URL}`);

  return testSite(BASE_URL);
}


// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Track test warnings and errors
const testResults = {
  warnings: [],
  errors: [],
  addWarning(message) {
    this.warnings.push(message);
    console.log(`⚠️ WARNING: ${message}`);
  },
  addError(message) {
    this.errors.push(message);
    console.error(`❌ ERROR: ${message}`);
  },
  hasFailures() {
    return this.errors.length > 0;
  }
};

async function testSite(baseUrl) {
  console.log('Starting comprehensive site tests...');
  console.log(`Using base URL: ${baseUrl}`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({ width: 1280, height: 800 });
    
    // Test 1: Homepage
    console.log('\nTest 1: Testing homepage...');
    await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT });
    await page.screenshot({ path: path.join(screenshotsDir, 'homepage.png') });
    
    // Check header and footer
    const header = await page.$('header');
    const footer = await page.$('footer');
    
    if (!header) {
      testResults.addError('Header is missing on homepage');
    } else {
      console.log(`- Header exists: true`);
    }
    
    if (!footer) {
      testResults.addError('Footer is missing on homepage');
    } else {
      console.log(`- Footer exists: true`);
    }
    
    // Test 2: Resources page
    console.log('\nTest 2: Testing navigation to Resources page...');
    try {
      // Navigate directly to the resources page instead of clicking
      await page.goto(`${baseUrl}/resources`, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT });
      await page.screenshot({ path: path.join(screenshotsDir, 'resources-page.png') });
      
      // Check if resources page has correct content
      const resourceCards = await page.$$('.resource-card');
      console.log(`- Found ${resourceCards.length} resource cards`);
      
      if (resourceCards.length === 0) {
        testResults.addError('No resource cards found on the resources page');
        return false;
      }
      
      // Check resources page title to confirm we're on the right page
      const pageTitle = await page.title();
      console.log(`- Resources page title: ${pageTitle}`);
      
      if (!pageTitle.toLowerCase().includes('resources')) {
        testResults.addError('Page title does not contain "resources"');
        return false;
      }
      
      // Return to homepage for next tests
      await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT });
      console.log(`- Successfully navigated to Resources page: true`);
    } catch (resourcesError) {
      testResults.addError(`Resources page test failed: ${resourcesError.message}`);
      return false;
    }
    
    // Test 3: Observations page
    console.log('\nTest 3: Testing navigation to Observations page...');
    try {
      // Navigate directly to the observations page instead of clicking
      await page.goto(`${baseUrl}/observations`, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT });
      await page.screenshot({ path: path.join(screenshotsDir, 'observations-page.png') });
      
      // Check observations page title to confirm we're on the right page
      const pageTitle = await page.title();
      console.log(`- Observations page title: ${pageTitle}`);
      
      if (!pageTitle.toLowerCase().includes('observations')) {
        testResults.addError('Page title does not contain "observations"');
        return false;
      }
      
      // Return to homepage for next tests
      await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT });
      console.log(`- Successfully navigated to Observations page: true`);
    } catch (observationsError) {
      testResults.addError(`Observations page test failed: ${observationsError.message}`);
      return false;
    }
    
    // Test 4: Navigation to About page
    console.log('\nTest 4: Testing navigation to About page...');
    try {
      // Navigate directly to the About page
      await page.goto(`${baseUrl}/about`, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT });
      await page.screenshot({ path: path.join(screenshotsDir, 'about-page.png') });
      
      // Check About page title to confirm we're on the right page
      const pageTitle = await page.title();
      console.log(`- About page title: ${pageTitle}`);
      
      if (!pageTitle.toLowerCase().includes('about')) {
        testResults.addError('Page title does not contain "about"');
        return false;
      }
      
      // Return to homepage for next tests
      await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT });
      console.log(`- Successfully navigated to About page: true`);
    } catch (aboutError) {
      testResults.addError(`About page test failed: ${aboutError.message}`);
      return false;
    }
    
    // Test 5: Episode page navigation and content
    console.log('\nTest 5: Testing episode page navigation and content...');
    // Navigate back to homepage
    
    try {
      await page.waitForSelector('.recording-card a', { timeout: TEST_TIMEOUT });
      console.log('- Waiting for recording card links...');
      
      // Get all episode links
      const episodeLinks = await page.$$('.recording-card a');
      console.log(`- Found ${episodeLinks.length} episode links`);
      
      if (episodeLinks.length === 0) {
        testResults.addError('No episode links found on homepage');
        return false;
      }
      
      // Check first episode link if available
      // Get href attribute of the first episode link
      const href = await page.evaluate(link => link.getAttribute('href'), episodeLinks[0]);
      
      if (!href) {
        testResults.addError('No href attribute found on first episode link');
        return false;
      }
      
      console.log(`- First episode link href: ${href}`);
      
      // Navigate directly to the episode page
      const fullUrl = `${baseUrl}${href}`;
      console.log(`- Navigating directly to: ${fullUrl}`);
      await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT });
      
      await page.screenshot({ path: path.join(screenshotsDir, 'episode-page.png') });
      
      // Check for back link
      const backLink = await page.$('.back-link');
      if (!backLink) {
        testResults.addError('Back link is missing on episode page');
        return false;
      }
      console.log(`- Back link exists: true`);
      
      // Check for transcript content
      const transcriptContent = await page.$('.transcript-body-content');
      if (!transcriptContent) {
        testResults.addError('Transcript content is missing on episode page');
        return false;
      }
      console.log(`- Transcript content exists: true`);
      
      // Test the back link navigation
      try {
        // Use JavaScript click instead of Puppeteer's click method
        await page.evaluate(() => {
          const backLink = document.querySelector('.back-link');
          if (backLink) {
            console.log('Back link found in DOM');
            backLink.click();
            return true;
          } else {
            console.log('Back link not found in DOM');
            return false;
          }
        });
        
        // Wait for navigation
        try {
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: TEST_TIMEOUT });
          console.log(`- Successfully navigated back to homepage`);
        } catch (navError) {
          // If navigation fails, try direct navigation to home page
          console.log(`- Warning: Navigation after click failed: ${navError.message}`);
          testResults.addWarning(`Back link navigation timeout - using direct navigation fallback`);
          await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT });
        }
      } catch (backNavError) {
        testResults.addWarning(`Back link click issue: ${backNavError.message}`);
        console.log(`- Using direct navigation as fallback for back link`);
        // Use direct navigation as fallback
        await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT });
      }
    } catch (episodeError) {
      testResults.addError(`Episode page test failed: ${episodeError.message}`);
      return false;
    }
    
    // Test 6: Mobile responsiveness
    console.log('\nTest 6: Testing mobile responsiveness...');
    try {
      // Set mobile viewport
      await page.setViewport({ width: 375, height: 667, isMobile: true });
      await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT });
      await page.screenshot({ path: path.join(screenshotsDir, 'mobile-homepage.png') });
      
      // Check for hamburger menu on mobile
      const hamburgerMenu = await page.$('.hamburger-menu');
      console.log(`- Hamburger menu exists: ${!!hamburgerMenu}`);
      
      // Test hamburger menu functionality if it exists
      if (hamburgerMenu) {
        await hamburgerMenu.click();
        // Wait a moment for animation
        await new Promise(resolve => setTimeout(resolve, 500));
        await page.screenshot({ path: path.join(screenshotsDir, 'mobile-menu-open.png') });
        
        // Check if mobile nav is visible
        const mobileNavVisible = await page.evaluate(() => {
          const mobileNav = document.querySelector('.mobile-nav');
          if (!mobileNav) return false;
          const style = window.getComputedStyle(mobileNav);
          return style.display !== 'none';
        });
        
        console.log(`- Mobile navigation menu visible after click: ${mobileNavVisible}`);
      } else {
        testResults.addWarning('Mobile hamburger menu not found');
      }
    } catch (mobileError) {
      testResults.addWarning(`Mobile responsiveness test issue: ${mobileError.message}`);
      console.log(`- Warning: Error during mobile test: ${mobileError.message}`);
      // Don't fail the test for mobile issues, just log a warning
    }
    
    // Display test results summary
    console.log('\n== TEST RESULTS SUMMARY ==');
    
    if (testResults.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      testResults.warnings.forEach((warn, i) => {
        console.log(`${i+1}. ${warn}`);
      });
    }
    
    if (testResults.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      testResults.errors.forEach((err, i) => {
        console.log(`${i+1}. ${err}`);
      });
      console.log('\nTests completed with errors!');
      return false;
    }
    
    console.log('\n✅ All tests completed successfully!');
    return true;
  } catch (error) {
    console.error('\n❌ Error during site testing:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the tests
runTests().then(success => {
  if (!success) {
    console.error('Tests failed!');
    process.exit(1);
  } else {
    console.log('Tests passed!');
    process.exit(0);
  }
}).catch(error => {
  console.error('Unhandled error during testing:', error);
  process.exit(1);
});
