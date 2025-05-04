/**
 * Episode Page Synthetic Test Template
 * 
 * Specific template for testing episode transcript pages.
 * Uses Puppeteer-compatible syntax for Datadog's browser test runner.
 */

async function runTest() {
  // Start browser and create a new page
  const page = await browser.newPage();
  
  // Record performance metrics
  const startTime = Date.now();
  
  // Navigate to the episode page
  console.log(`Navigating to episode page {{ROUTE}} at {{URL}}`);
  const response = await page.goto("{{URL}}", { waitUntil: 'networkidle0' });
  
  // Check if page loaded successfully
  assert(
    response.status() === 200,
    `Expected status code 200 but got ${response.status()}`
  );
  
  // Wait for critical elements specific to episode pages
  await page.waitForSelector('header', { visible: true, timeout: 5000 });
  await page.waitForSelector('footer', { visible: true, timeout: 5000 });
  await page.waitForSelector('.episode-content, .transcript-content', { visible: true, timeout: 5000 });
  
  // Take a screenshot of the episode page
  await page.screenshot({ fullPage: true });
  
  // Check for episode title and content
  const hasEpisodeTitle = await page.evaluate(() => {
    const title = document.querySelector('h1, .episode-title, .title');
    return !!title && title.textContent.trim().length > 0;
  });
  
  const hasEpisodeContent = await page.evaluate(() => {
    const content = document.querySelector('.episode-content, .transcript-content, article');
    return !!content && content.textContent.trim().length > 100; // At least some meaningful content
  });
  
  // Check for navigation elements
  const hasNavigation = await page.evaluate(() => {
    const nav = document.querySelector('.episode-navigation, .navigation, .nav-links');
    return !!nav;
  });
  
  // Record load time
  const loadTime = Date.now() - startTime;
  console.log(`Episode page loaded in ${loadTime}ms`);
  
  // Assert episode title exists
  assert(
    hasEpisodeTitle,
    'Episode title not found on page'
  );
  
  // Assert episode content exists
  assert(
    hasEpisodeContent,
    'Episode content not found or too short'
  );
  
  // Assert navigation exists
  assert(
    hasNavigation,
    'Navigation elements not found on episode page'
  );
  
  // Test episode navigation functionality
  const hasNavLinks = await page.evaluate(() => {
    const prevLink = document.querySelector('.prev-episode, [data-nav="prev"]');
    const nextLink = document.querySelector('.next-episode, [data-nav="next"]');
    const homeLink = document.querySelector('.home-link, [data-nav="home"]');
    
    return {
      hasPrev: !!prevLink,
      hasNext: !!nextLink,
      hasHome: !!homeLink
    };
  });
  
  // Log navigation availability without failing the test
  // (first and last episodes won't have prev/next respectively)
  console.log(`Navigation links: ${JSON.stringify(hasNavLinks)}`);
  
  // Check if images are loaded properly
  const brokenImages = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('img'));
    return images.filter(img => {
      return !img.complete || img.naturalWidth === 0;
    }).length;
  });
  
  // Assert no broken images
  assert(
    brokenImages === 0,
    `Found ${brokenImages} broken or unloaded images`
  );
  
  // Assert load time is reasonable
  assert(
    loadTime < 3000,
    `Page load time (${loadTime}ms) exceeds threshold of 3000ms`
  );
  
  // Add custom metrics
  setMetric('loadTime', loadTime);
  setMetric('hasNavLinks', Object.values(hasNavLinks).filter(v => v).length);
  
  // Close page
  await page.close();
  
  return {
    status: 'passed',
    message: 'Episode page loaded successfully with content and navigation'
  };
}

// Run the test
runTest();
