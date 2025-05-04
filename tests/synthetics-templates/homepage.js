/**
 * Homepage Synthetic Test Template
 * 
 * Specialized test for the Homepage that validates specific elements
 * that should be present on the main landing page.
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
  await page.waitForSelector('.hero-section', { visible: true, timeout: 5000 });
  
  // Take a screenshot of the full page
  await page.screenshot({ fullPage: true });
  
  // Check for critical page elements
  const pageChecks = await page.evaluate(() => {
    return {
      header: !!document.querySelector('header'),
      footer: !!document.querySelector('footer'),
      heroSection: !!document.querySelector('.hero-section'),
      episodeCards: document.querySelectorAll('.recording-card').length,
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
    pageChecks.heroSection,
    'Hero section not found on page'
  );
  assert(
    pageChecks.episodeCards > 0,
    `Expected episode cards on homepage, but found ${pageChecks.episodeCards}`
  );
  
  // Check classes and styles on critical elements
  const headerChecks = await page.evaluate(() => {
    const header = document.querySelector('header');
    if (!header) return { className: '', styles: {} };
    
    const styles = window.getComputedStyle(header);
    return {
      className: header.className,
      styles: {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        position: styles.position,
        zIndex: styles.zIndex,
        padding: styles.padding
      }
    };
  });
  
  const footerChecks = await page.evaluate(() => {
    const footer = document.querySelector('footer');
    if (!footer) return { className: '', styles: {} };
    
    const styles = window.getComputedStyle(footer);
    return {
      className: footer.className,
      styles: {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        position: styles.position
      }
    };
  });
  
  // Assert required classes are present
  assert(
    headerChecks.className.includes('site-header'),
    `Header should have class 'site-header', but found: ${headerChecks.className}`
  );
  
  assert(
    footerChecks.className.includes('site-footer'),
    `Footer should have class 'site-footer', but found: ${footerChecks.className}`
  );
  
  // Assert required CSS properties for header
  const validHeaderBgColors = [
    'rgb(147, 172, 181)', // Direct #93ACB5 color
    'rgba(147, 172, 181, 1)', // Same with full alpha
    '#93acb5', // Hex format (browser might normalize this)
    'var(--secondary-color)' // CSS variable (though getComputedStyle should resolve this)
  ];
  
  assert(
    validHeaderBgColors.some(color => headerChecks.styles.backgroundColor.toLowerCase().includes(color.toLowerCase())),
    `Header background color is invalid. Expected a shade of #93ACB5, but got: ${headerChecks.styles.backgroundColor}`
  );
  
  assert(
    headerChecks.styles.color.includes('255, 255, 255') || headerChecks.styles.color.includes('#fff') || headerChecks.styles.color.includes('#ffffff'),
    `Header text color should be white, but got: ${headerChecks.styles.color}`
  );
  
  // Check navigation links
  const navLinks = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('nav a'));
    return links.map(link => ({ text: link.innerText, href: link.href }));
  });
  
  // Verify we have navigation links
  assert(
    navLinks.length > 0,
    'Navigation links not found on homepage'
  );
  
  // Assert load time is reasonable
  assert(
    loadTime < 5000,
    `Page load time (${loadTime}ms) exceeds threshold of 5000ms`
  );
  
  // Add custom metric for load time
  setMetric('loadTime', loadTime);
  
  // Add custom metric for episode card count
  setMetric('episodeCardCount', pageChecks.episodeCards);
  
  // Close page
  await page.close();
  
  return {
    status: 'passed',
    message: 'Homepage loaded successfully with all critical elements'
  };
}

// Run the test
runTest();
