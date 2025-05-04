/**
 * Observations Page Synthetic Test Template
 * 
 * Specific template for testing the observations page.
 * Uses Puppeteer-compatible syntax for Datadog's browser test runner.
 */

async function runTest() {
  // Start browser and create a new page
  const page = await browser.newPage();
  
  // Record performance metrics
  const startTime = Date.now();
  
  // Navigate to the observations page
  console.log(`Navigating to observations page at {{URL}}`);
  const response = await page.goto("{{URL}}", { waitUntil: 'networkidle0' });
  
  // Check if page loaded successfully
  assert(
    response.status() === 200,
    `Expected status code 200 but got ${response.status()}`
  );
  
  // Wait for critical elements
  await page.waitForSelector('header', { visible: true, timeout: 5000 });
  await page.waitForSelector('footer', { visible: true, timeout: 5000 });
  await page.waitForSelector('.observations-content, .content', { visible: true, timeout: 5000 });
  
  // Take a screenshot of the observations page
  await page.screenshot({ fullPage: true });
  
  // Check for content sections
  const contentSections = await page.evaluate(() => {
    const sections = document.querySelectorAll('section, article, .content-section');
    return sections.length;
  });
  
  // Check if page has meaningful content
  const hasContent = await page.evaluate(() => {
    const content = document.querySelector('.observations-content, .content');
    return content && content.textContent.trim().length > 200; // At least some meaningful content
  });
  
  // Record load time
  const loadTime = Date.now() - startTime;
  console.log(`Observations page loaded in ${loadTime}ms`);
  
  // Assert observations page has content sections
  assert(
    contentSections > 0,
    `Expected to find content sections but found ${contentSections}`
  );
  
  // Assert observations page has meaningful content
  assert(
    hasContent,
    'Observations page lacks meaningful content'
  );
  
  // Check for accessibility issues (simplified version)
  const accessibilityIssues = await page.evaluate(() => {
    // Check for basic accessibility issues
    const issues = [];
    
    // Check for images without alt text
    const imagesWithoutAlt = Array.from(document.querySelectorAll('img:not([alt])'));
    if (imagesWithoutAlt.length > 0) {
      issues.push(`${imagesWithoutAlt.length} images without alt text`);
    }
    
    // Check for proper heading hierarchy
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const headingTags = headings.map(h => h.tagName.toLowerCase());
    
    // Check if there's an h1
    if (!headingTags.includes('h1')) {
      issues.push('No h1 heading found');
    }
    
    return issues;
  });
  
  // Log accessibility issues without failing the test
  if (accessibilityIssues.length > 0) {
    console.log(`Accessibility issues found: ${accessibilityIssues.join(', ')}`);
  }
  
  // Assert load time is reasonable
  assert(
    loadTime < 3000,
    `Page load time (${loadTime}ms) exceeds threshold of 3000ms`
  );
  
  // Add custom metrics
  setMetric('loadTime', loadTime);
  setMetric('contentSections', contentSections);
  setMetric('accessibilityIssues', accessibilityIssues.length);
  
  // Close page
  await page.close();
  
  return {
    status: 'passed',
    message: `Observations page loaded successfully with ${contentSections} content sections`
  };
}

// Run the test
runTest();
