/**
 * Resources Page Synthetic Test Template
 * 
 * Specific template for testing the resources page with resource cards.
 * Uses Puppeteer-compatible syntax for Datadog's browser test runner.
 */

async function runTest() {
  // Start browser and create a new page
  const page = await browser.newPage();
  
  // Record performance metrics
  const startTime = Date.now();
  
  // Navigate to the resources page
  console.log(`Navigating to resources page at {{URL}}`);
  const response = await page.goto("{{URL}}", { waitUntil: 'networkidle0' });
  
  // Check if page loaded successfully
  assert(
    response.status() === 200,
    `Expected status code 200 but got ${response.status()}`
  );
  
  // Wait for critical elements
  await page.waitForSelector('header', { visible: true, timeout: 5000 });
  await page.waitForSelector('footer', { visible: true, timeout: 5000 });
  await page.waitForSelector('.resource-cards, .resources-container, .cards-container', { visible: true, timeout: 5000 });
  
  // Take a screenshot of the resources page
  await page.screenshot({ fullPage: true });
  
  // Check for resource cards
  const resourceCardCount = await page.evaluate(() => {
    const cards = document.querySelectorAll('.resource-card, .card');
    return cards.length;
  });
  
  // Check if resource cards have images and links
  const resourceCardsWithImages = await page.evaluate(() => {
    const cards = document.querySelectorAll('.resource-card, .card');
    let count = 0;
    
    for (const card of cards) {
      const hasImage = !!card.querySelector('img');
      const hasLink = !!card.querySelector('a');
      
      if (hasImage && hasLink) count++;
    }
    
    return count;
  });
  
  // Record load time
  const loadTime = Date.now() - startTime;
  console.log(`Resources page loaded in ${loadTime}ms`);
  
  // Assert resources page has resource cards
  assert(
    resourceCardCount >= 10,
    `Expected to find at least 10 resource cards but found ${resourceCardCount}`
  );
  
  // Assert resource cards have images and links
  assert(
    resourceCardsWithImages === resourceCardCount,
    `Only ${resourceCardsWithImages} out of ${resourceCardCount} resource cards have both images and links`
  );
  
  // Check for broken images
  const brokenImages = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('.resource-card img, .card img'));
    return images.filter(img => {
      return !img.complete || img.naturalWidth === 0;
    }).length;
  });
  
  // Assert no broken images
  assert(
    brokenImages === 0,
    `Found ${brokenImages} broken or unloaded images in resource cards`
  );
  
  // Assert load time is reasonable
  assert(
    loadTime < 3000,
    `Page load time (${loadTime}ms) exceeds threshold of 3000ms`
  );
  
  // Add custom metrics
  setMetric('loadTime', loadTime);
  setMetric('resourceCardCount', resourceCardCount);
  setMetric('resourceCardsWithImages', resourceCardsWithImages);
  
  // Close page
  await page.close();
  
  return {
    status: 'passed',
    message: `Resources page loaded successfully with ${resourceCardCount} resource cards`
  };
}

// Run the test
runTest();
