/**
 * About Page Synthetic Test Template
 * 
 * Specialized test for the About page that validates specific elements
 * that should be present on the About page.
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
  await page.waitForSelector('.about-content', { visible: true, timeout: 5000 });
  
  // Take a screenshot of the full page
  await page.screenshot({ fullPage: true });
  
  // Check for critical page elements
  const pageChecks = await page.evaluate(() => {
    return {
      header: !!document.querySelector('header'),
      footer: !!document.querySelector('footer'),
      aboutContent: !!document.querySelector('.about-content'),
      pageTitle: document.querySelector('h1') ? document.querySelector('h1').innerText : ''
    };
  });
  
  // Record load time
  const loadTime = Date.now() - startTime;
  console.log(`Page loaded in ${loadTime}ms`);
  
  // Assert critical elements exist
  assert(
    pageChecks.header,
    'Header element not found on page'
  );
  assert(
    pageChecks.footer,
    'Footer element not found on page'
  );
  assert(
    pageChecks.aboutContent,
    'About content not found on page'
  );
  assert(
    pageChecks.pageTitle.includes('About'),
    `Page title should include 'About', but found: ${pageChecks.pageTitle}`
  );
  
  // Check URL patterns
  const currentUrl = await page.url();
  console.log(`Current URL: ${currentUrl}`);
  
  if (currentUrl.includes('ai-tools-lab.com')) {
    // Production should use /pages/ prefix
    assert(
      currentUrl.includes('/pages/about'),
      `Production URL should use '/pages/' prefix, but found: ${currentUrl}`
    );
  } else if (currentUrl.includes('ai-tools-lab-tst.netlify.app')) {
    // Test site uses direct route
    assert(
      currentUrl.includes('/about'),
      `Test URL should use direct path, but found: ${currentUrl}`
    );
  }
  
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
    message: 'About page loaded successfully with all critical elements'
  };
}

// Run the test
runTest();
