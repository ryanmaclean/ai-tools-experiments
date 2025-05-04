/**
 * Default Synthetic Test Template
 * 
 * This is the generic template used for all pages that don't have a specific template.
 * It uses a Puppeteer-like syntax compatible with Datadog's browser test runner.
 */

async function runTest() {
  // Start browser and create a new page
  const page = await browser.newPage();
  
  // Record performance metrics
  const startTime = Date.now();
  
  // Navigate to the target URL
  console.log(`Navigating to {{URL}}`);
  const response = await page.goto("{{URL}}", { waitUntil: 'networkidle0' });
  
  // Check if page loaded successfully
  assert(
    response.status() === 200,
    `Expected status code 200 but got ${response.status()}`
  );
  
  // Ensure page has loaded critical elements
  await page.waitForSelector('header', { visible: true, timeout: 5000 });
  await page.waitForSelector('footer', { visible: true, timeout: 5000 });
  
  // Take a screenshot of the full page
  await page.screenshot({ fullPage: true });
  
  // Check for critical page elements
  const headerExists = await page.evaluate(() => {
    return !!document.querySelector('header');
  });
  const footerExists = await page.evaluate(() => {
    return !!document.querySelector('footer');
  });
  
  // Record load time
  const loadTime = Date.now() - startTime;
  console.log(`Page loaded in ${loadTime}ms`);
  
  // Assert critical elements exist
  assert(
    headerExists,
    'Header element not found on page'
  );
  assert(
    footerExists,
    'Footer element not found on page'
  );
  
  // Assert load time is reasonable
  assert(
    loadTime < 5000,
    `Page load time (${loadTime}ms) exceeds threshold of 5000ms`
  );
  
  // Add custom metric for load time
  setMetric('loadTime', loadTime);
  
  // Close page
  await page.close();
  
  return {
    status: 'passed',
    message: 'Page loaded successfully with all critical elements'
  };
}

// Run the test
runTest();
