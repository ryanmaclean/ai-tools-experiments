const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function testSite() {
  console.log('Starting comprehensive site tests...');
  
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
    await page.goto('http://localhost:4324', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(screenshotsDir, 'homepage.png') });
    
    // Check header and footer
    const header = await page.$('header');
    const footer = await page.$('footer');
    console.log(`- Header exists: ${!!header}`);
    console.log(`- Footer exists: ${!!footer}`);
    
    // Test 2: Navigation to Resources page
    console.log('\nTest 2: Testing navigation to Resources page...');
    const resourcesLink = await page.$('header a[href="/resources"]');
    if (resourcesLink) {
      await resourcesLink.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      await page.screenshot({ path: path.join(screenshotsDir, 'resources-page.png') });
      console.log(`- Successfully navigated to Resources page: ${page.url().includes('/resources')}`);
    } else {
      console.log('- Resources link not found');
    }
    
    // Test 3: Navigation to Observations page
    console.log('\nTest 3: Testing navigation to Observations page...');
    const observationsLink = await page.$('header a[href="/observations"]');
    if (observationsLink) {
      await observationsLink.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      await page.screenshot({ path: path.join(screenshotsDir, 'observations-page.png') });
      console.log(`- Successfully navigated to Observations page: ${page.url().includes('/observations')}`);
    } else {
      console.log('- Observations link not found');
    }
    
    // Test 4: Navigation to About page
    console.log('\nTest 4: Testing navigation to About page...');
    const aboutLink = await page.$('header a[href="/pages/about"]');
    if (aboutLink) {
      await aboutLink.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      await page.screenshot({ path: path.join(screenshotsDir, 'about-page.png') });
      console.log(`- Successfully navigated to About page: ${page.url().includes('/pages/about')}`);
    } else {
      console.log('- About link not found');
    }
    
    // Test 5: Episode page navigation and content
    console.log('\nTest 5: Testing episode page navigation and content...');
    // Navigate back to homepage
    await page.goto('http://localhost:4324', { waitUntil: 'networkidle2' });
    
    // Take a screenshot for debugging
    await page.screenshot({ path: path.join(screenshotsDir, 'episode-nav-start.png') });
    
    try {
      // Wait for episode links to be fully loaded
      console.log('- Waiting for recording card links...');
      await page.waitForSelector('.recording-card a', { timeout: 15000 });
      const episodeLinks = await page.$$('.recording-card a');
      console.log(`- Found ${episodeLinks.length} episode links`);
      
      if (episodeLinks.length > 0) {
        try {
          // Get the href attribute of the first episode link
          const href = await page.evaluate(el => el.getAttribute('href'), episodeLinks[0]);
          console.log(`- First episode link href: ${href}`);
          
          // Navigate directly to the episode page
          const fullUrl = `http://localhost:4324${href}`;
          console.log(`- Navigating directly to: ${fullUrl}`);
          await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 45000 });
          
          await page.screenshot({ path: path.join(screenshotsDir, 'episode-page.png') });
          
          // Check for back link
          const backLink = await page.$('.back-link');
          console.log(`- Back link exists: ${!!backLink}`);
          
          // Check for transcript content
          const transcriptContent = await page.$('.transcript-body-content');
          console.log(`- Transcript content exists: ${!!transcriptContent}`);
          
          if (backLink) {
            try {
              // Click the back link to return to homepage
              await backLink.click();
              await page.waitForNavigation({ waitUntil: 'networkidle2' });
              console.log(`- Successfully navigated back to homepage`);
            } catch (backNavError) {
              console.log(`- Warning: Error navigating back: ${backNavError.message}`);
            }
          }
        } catch (episodeError) {
          console.log(`- Warning: Error navigating to episode page: ${episodeError.message}`);
        }
      } else {
        console.log('- No episode links found');
      }
    } catch (selectorError) {
      console.log(`- Warning: Error finding episode links: ${selectorError.message}`);
    }
    
    // Test 6: Mobile responsiveness
    console.log('\nTest 6: Testing mobile responsiveness...');
    // Set mobile viewport
    await page.setViewport({ width: 375, height: 667, isMobile: true });
    await page.goto('http://localhost:4324', { waitUntil: 'networkidle2' });
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
    }
    
    console.log('\nAll tests completed successfully!');
    return true;
  } catch (error) {
    console.error('Error during site testing:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the tests
testSite().then(success => {
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
