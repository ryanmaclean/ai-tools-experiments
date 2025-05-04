/**
 * Production Screenshot Capture Utility
 * 
 * This script captures screenshots from the production site to use as baseline
 * reference images for visual regression testing with Datadog.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Path configuration
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const PROD_DIR = path.join(SCREENSHOTS_DIR, 'prod');

// Ensure directories exist
for (const dir of [SCREENSHOTS_DIR, PROD_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Define pages to capture
const pagesToCapture = [
  // Main pages
  { name: 'about', url: 'https://ai-tools-lab.com/pages/about' },
  { name: 'resources', url: 'https://ai-tools-lab.com/pages/resources' },
  { name: 'observations', url: 'https://ai-tools-lab.com/pages/observations' },
  // Homepage
  { name: 'home', url: 'https://ai-tools-lab.com/' },
];

// Add episodes (ep01-ep17)
for (let i = 1; i <= 17; i++) {
  const episodeNum = String(i).padStart(2, '0');
  pagesToCapture.push({
    name: `ep${episodeNum}`,
    url: `https://ai-tools-lab.com/pages/ep${episodeNum}`
  });
}

/**
 * Capture a screenshot of a page using Puppeteer
 */
async function captureScreenshot(page, urlInfo) {
  const { name, url } = urlInfo;
  const outputPath = path.join(PROD_DIR, `${name}.png`);
  
  console.log(`Capturing ${name} from ${url}...`);
  
  try {
    // Navigate to the page
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for content to be fully rendered
    await page.waitForSelector('main', { timeout: 5000 }).catch(() => {
      console.warn(`Warning: 'main' selector not found on ${name}`);
    });
    
    // Give the page a bit more time to stabilize
    await page.waitForTimeout(1000);
    
    // Set viewport size for consistent captures
    await page.setViewport({ width: 1280, height: 900 });
    
    // Take the screenshot
    await page.screenshot({
      path: outputPath,
      fullPage: true
    });
    
    console.log(`✅ Captured ${name} successfully`);
    return { name, success: true, path: outputPath };
  } catch (error) {
    console.error(`❌ Error capturing ${name}:`, error.message);
    return { name, success: false, error: error.message };
  }
}

/**
 * Main function to capture all screenshots
 */
async function captureAllScreenshots() {
  const results = { succeeded: [], failed: [] };
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null
  });
  
  try {
    const page = await browser.newPage();
    
    // Set user agent to avoid being blocked
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    console.log(`\n📸 Starting screenshot capture for ${pagesToCapture.length} pages...\n`);
    
    // Process URLs sequentially to avoid overloading the server
    for (const urlInfo of pagesToCapture) {
      const result = await captureScreenshot(page, urlInfo);
      
      if (result.success) {
        results.succeeded.push(result);
      } else {
        results.failed.push(result);
      }
      
      // Small delay between captures
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error('Error during screenshot capture:', error);
  } finally {
    await browser.close();
  }
  
  // Report results
  console.log('\n📊 Screenshot Capture Results:');
  console.log(`✅ Successfully captured: ${results.succeeded.length}/${pagesToCapture.length}`);
  
  if (results.failed.length > 0) {
    console.log(`❌ Failed captures: ${results.failed.length}`);
    console.log('Failed pages:', results.failed.map(f => f.name).join(', '));
  }
  
  // Create a report file
  const reportPath = path.join(SCREENSHOTS_DIR, 'capture-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📝 Report saved to ${reportPath}`);
  
  // Notify about next steps
  console.log('\n🔍 Next steps:');
  console.log('1. Run visual comparison tests: npm run test:visual:dd');
  console.log('2. Check results in your Datadog dashboard');
}

// Run the capture process
captureAllScreenshots().catch(console.error);
