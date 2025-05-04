/**
 * Homepage Synthetic Test Template
 * 
 * Specific template for testing the homepage with episode grid and navigation elements.
 * Uses Puppeteer-compatible syntax for Datadog's browser test runner.
 */

async function runTest() {
  // Start browser and create a new page
  const page = await browser.newPage();
  
  // Record performance metrics
  const startTime = Date.now();
  
  // Navigate to the homepage
  console.log(`Navigating to homepage at {{URL}}`);
  const response = await page.goto("{{URL}}", { waitUntil: 'networkidle0' });
  
  // Check if page loaded successfully
  assert(
    response.status() === 200,
    `Expected status code 200 but got ${response.status()}`
  );
  
  // Wait for critical elements
  await page.waitForSelector('header', { visible: true, timeout: 5000 });
  await page.waitForSelector('footer', { visible: true, timeout: 5000 });
  await page.waitForSelector('.episode-grid', { visible: true, timeout: 5000 });
  
  // Take a screenshot of the homepage
  await page.screenshot({ fullPage: true });
  
  // Check for episode thumbnails
  const episodeCount = await page.evaluate(() => {
    const episodes = document.querySelectorAll('.episode-card, .episode-thumbnail');
    return episodes.length;
  });
  
  // Check for navigation elements
  const hasNavigation = await page.evaluate(() => {
    const nav = document.querySelector('nav, .navigation');
    return !!nav;
  });
  
  // Record load time
  const loadTime = Date.now() - startTime;
  console.log(`Homepage loaded in ${loadTime}ms`);
  
  // Assert homepage has episodes
  assert(
    episodeCount > 0,
    `Expected to find episode thumbnails but found ${episodeCount}`
  );
  
  // Assert navigation exists
  assert(
    hasNavigation,
    'Navigation elements not found on homepage'
  );
  
  // Assert load time is reasonable
  assert(
    loadTime < 3000,
    `Page load time (${loadTime}ms) exceeds threshold of 3000ms`
  );
  
  // Check links accessibility
  const brokenLinks = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href]'));
    return links.filter(link => {
      const href = link.getAttribute('href');
      return !href || href === '#' || href === 'javascript:void(0)';
    }).map(link => link.innerText || link.textContent || 'unnamed link');
  });
  
  // Assert no broken links
  assert(
    brokenLinks.length === 0,
    `Found ${brokenLinks.length} potentially broken links: ${brokenLinks.join(', ')}`
  );
  
  // Add custom metrics
  setMetric('loadTime', loadTime);
  setMetric('episodeCount', episodeCount);
  
  // Close page
  await page.close();
  
  return {
    status: 'passed',
    message: `Homepage loaded successfully with ${episodeCount} episodes`
  };
}

// Run the test
runTest();
