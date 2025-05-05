// Comprehensive site testing script using Puppeteer
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

// Configuration
const TEST_TIMEOUT = 60000; // 60 seconds timeout
const PROD_URL = 'https://ai-tools-lab.com';
const TEST_URL = 'https://ai-tools-lab-tst.netlify.app';

// Helper function to find an available port
async function getAvailablePort() {
  // Process arguments for port override
  try {
    const portArg = process.argv.find(arg => arg.startsWith("--port="));
    if (portArg) {
      const port = parseInt(portArg.split("=")[1], 10);
      console.log(`Using port from command line argument: ${port}`);
      return port;
    }
    
    // Default to port 4321 which is likely to be used by Astro
    return 4321;
  } catch (error) {
    console.error("Error detecting server port:", error);
    return 4321;
  }
}

// Create screenshots directory if it doesn"t exist
const screenshotsDir = path.join(__dirname, "screenshots");
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

async function compareSites(prodUrl, testUrl) {
  console.log('Starting site comparison tests...');
  console.log(`Production URL: ${prodUrl}`);
  console.log(`Test URL: ${testUrl}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const prodPage = await browser.newPage();
    const testPage = await browser.newPage();

    // Set viewport size for both pages
    await prodPage.setViewport({ width: 1280, height: 800 });
    await testPage.setViewport({ width: 1280, height: 800 });

    // Test 1: Homepage comparison
    console.log('\nTest 1: Comparing homepages...');
    await Promise.all([
      prodPage.goto(prodUrl, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT }),
      testPage.goto(testUrl, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT })
    ]);

    // Take screenshots
    await prodPage.screenshot({ path: path.join(screenshotsDir, 'prod-homepage.png') });
    await testPage.screenshot({ path: path.join(screenshotsDir, 'test-homepage.png') });

    // Compare content
    const prodContent = await prodPage.content();
    const testContent = await testPage.content();

    if (prodContent !== testContent) {
      testResults.addError('Homepage content mismatch');
      // Compare specific elements
      const elements = ['header', 'footer', 'main', 'nav'];
      for (const el of elements) {
        const prodEl = await prodPage.$(el);
        const testEl = await testPage.$(el);
        if ((prodEl && !testEl) || (!prodEl && testEl)) {
          testResults.addError(`${el} element mismatch between sites`);
        }
      }
    }

    // Test 2: Check critical pages
    const criticalPages = ['about', 'resources', 'observations'];
    console.log('\nTest 2: Checking critical pages...');
    
    for (const page of criticalPages) {
      console.log(`\nChecking /pages/${page}...`);
      const [prodResponse, testResponse] = await Promise.all([
        prodPage.goto(`${prodUrl}/pages/${page}`, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT }),
        testPage.goto(`${testUrl}/pages/${page}`, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT })
      ]);

      // Take screenshots
      await prodPage.screenshot({ path: path.join(screenshotsDir, `prod-${page}.png`) });
      await testPage.screenshot({ path: path.join(screenshotsDir, `test-${page}.png`) });

      // Check if pages exist
      if (prodResponse.status() === 200 && testResponse.status() !== 200) {
        testResults.addError(`/pages/${page} page missing on test site`);
      }

      // If it's the resources page, check for cards
      if (page === 'resources' && testResponse.status() === 200) {
        const prodCards = await prodPage.$$('.card');
        const testCards = await testPage.$$('.card');

        if (prodCards.length !== testCards.length) {
          testResults.addError(`Resource card count mismatch - Prod: ${prodCards.length}, Test: ${testCards.length}`);
        }
      }
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
      console.log('\nTests failed!');
      return false;
    }

    console.log('\n✅ All tests completed successfully!');
    return true;
  } catch (error) {
    console.error('\n❌ Error during site comparison:', error);
    return false;
  } finally {
    await browser.close();
  }
}

async function testSite(baseUrl) {
  console.log("Starting comprehensive site tests...");
  console.log(`Using base URL: ${baseUrl}`);
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({ width: 1280, height: 800 });
    
    // Test 1: Homepage
    console.log("\nTest 1: Testing homepage...");
    await page.goto(baseUrl, { waitUntil: "networkidle2", timeout: TEST_TIMEOUT });
    await page.screenshot({ path: path.join(screenshotsDir, "homepage.png") });
    
    // More robust header and footer detection with detailed logging
    const headerSelectors = ['header', '.site-header', 'body > header', '[class*="header"]'];
    let header = null;
    for (const selector of headerSelectors) {
      header = await page.$(selector);
      if (header) {
        console.log(`- Found header with selector: ${selector}`);
        break;
      }
    }
    
    const footerSelectors = ['footer', '.site-footer', 'body > footer', '[class*="footer"]'];
    let footer = null;
    for (const selector of footerSelectors) {
      footer = await page.$(selector);
      if (footer) {
        console.log(`- Found footer with selector: ${selector}`);
        break;
      }
    }
    
    if (!header) {
      testResults.addError("Header is missing on homepage");
    } else {
      console.log(`- Header exists: true`);
    }
    
    if (!footer) {
      testResults.addError("Footer is missing on homepage");
    } else {
      console.log(`- Footer exists: true`);
    }
    
    // Test 2: Resources page
    console.log("\nTest 2: Testing navigation to Resources page...");
    
    // Try both URL patterns
    try {
      const targetUrl = `${baseUrl}/resources`;
      const altUrl = `${baseUrl}/pages/resources`;
      
      // Try primary URL pattern first
      await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: TEST_TIMEOUT / 2 }).catch(() => {
        console.log(`- Primary URL (${targetUrl}) failed, trying alternate URL...`);
      });
      
      // If the direct URL didn't work, try the alternate URL
      if (!page.url().includes("/resources")) {
        await page.goto(altUrl, { waitUntil: "networkidle2", timeout: TEST_TIMEOUT / 2 }).catch(() => {
          console.log(`- Alternate URL (${altUrl}) also failed...`);
        });
      }
      
      // Take a screenshot regardless of the outcome
      await page.screenshot({ path: path.join(screenshotsDir, "resources-page.png") });
      
      // Even more robust resource card detection with multiple selectors and document inspection
      const resourceCardSelectors = [
        'div[class*="resource"]', '.resource-card', 'article[class*="resource"]',
        '.card', '.resources-grid > *', '.container .card', '.resources-container .card',
        'article', '.resources-wrapper *', 'div[id*="resource"]'
      ];

      // First try with standard selectors
      let resourceCards = [];
      for (const selector of resourceCardSelectors) {
        const cards = await page.$$(selector);
        if (cards.length > 0) {
          console.log(`- Found ${cards.length} resource cards with selector: ${selector}`);
          resourceCards = cards;
          break;
        }
      }

      // If standard selectors fail, try analyzing the page structure
      if (resourceCards.length === 0) {
        console.log('- Standard selectors failed, analyzing page structure for resource-like elements');
        // Get all divs that might be cards based on their size and position
        resourceCards = await page.evaluate(() => {
          // Look for elements that are likely to be resource cards
          const possibleCards = [];
          document.querySelectorAll('div, article, section').forEach(el => {
            // Check if the element has text content and appears to be a card
            if (el.innerText && 
                el.offsetWidth > 200 && el.offsetHeight > 100 && // Reasonable card size
                el.children.length > 1 && // Has multiple child elements
                !['header', 'footer', 'nav'].includes(el.tagName.toLowerCase())) { // Not a navigation element
                possibleCards.push(el);
            }
          });
          return possibleCards.length;
        });

        console.log(`- Found ${resourceCards} potential resource-like elements through page analysis`);
      }
      
      // Take a screenshot of resources page to help debug the issue
      await page.screenshot({ path: path.join(screenshotsDir, "resources-debug.png") });
      
      if (!resourceCards || (typeof resourceCards === 'object' && resourceCards.length === 0) || 
          (typeof resourceCards === 'number' && resourceCards === 0)) {
        testResults.addError("No resource cards found on the resources page");
      }
    } catch (resourcesError) {
      testResults.addError(`Failed to load resources page: ${resourcesError.message}`);
    }
    
    // Display test results summary
    console.log("\n== TEST RESULTS SUMMARY ==");
    
    if (testResults.warnings.length > 0) {
      console.log("\n⚠️ WARNINGS:");
      testResults.warnings.forEach((warn, i) => {
        console.log(`${i+1}. ${warn}`);
      });
    }
    
    if (testResults.errors.length > 0) {
      console.log("\n❌ ERRORS:");
      testResults.errors.forEach((err, i) => {
        console.log(`${i+1}. ${err}`);
      });
      console.log("\nTests failed!");
      return false;
    }
    
    console.log("\n✅ All tests completed successfully!");
    return true;
  } catch (error) {
    console.error("\n❌ Error during site testing:", error);
    return false;
  } finally {
    await browser.close();
  }
}

// Main function to run tests
async function runTests() {
  return compareSites(PROD_URL, TEST_URL);
}

// Run the tests
runTests().then(success => {
  if (!success) {
    console.error("Tests failed!");
    process.exit(1);
  } else {
    console.log("Tests passed!");
    process.exit(0);
  }
}).catch(error => {
  console.error("Unhandled error during testing:", error);
  process.exit(1);
});
