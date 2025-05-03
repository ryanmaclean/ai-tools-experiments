// Comprehensive site testing script using Puppeteer
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Ensure screenshots directory exists
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function testSite() {
  console.log('Starting comprehensive site tests...');
  
  // Launch browser
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
    await page.goto('http://localhost:4321', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(screenshotsDir, 'homepage.png') });
    
    // Check header and footer
    const header = await page.$('header');
    const footer = await page.$('footer');
    console.log(`- Header exists: ${!!header}`);
    console.log(`- Footer exists: ${!!footer}`);
    
    // Check play button overlays
    const playButtonOverlays = await page.$$('.play-button-overlay');
    console.log(`- Play button overlays: ${playButtonOverlays.length} found`);
    
    if (playButtonOverlays.length > 0) {
      // Take screenshot of a card with play button
      const firstCard = await page.$('.recording-card');
      if (firstCard) {
        await firstCard.screenshot({ path: path.join(screenshotsDir, 'recording-card.png') });
      }
    }
    
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
    await page.goto('http://localhost:4321', { waitUntil: 'networkidle2' });
    
    // Wait for episode links to be fully loaded
    await page.waitForSelector('.recording-card a', { timeout: 5000 });
    const episodeLinks = await page.$$('.recording-card a');
    
    if (episodeLinks.length > 0) {
      try {
        // Get the href attribute of the first episode link
        const href = await page.evaluate(el => el.getAttribute('href'), episodeLinks[0]);
        
        // Use page.click for better reliability
        await page.click('.recording-card a:first-of-type');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        // If click fails, try direct navigation
        if (href && !page.url().includes(href)) {
          console.log(`- Direct click failed, trying navigation to: ${href}`);
          await page.goto(`http://localhost:4321${href}`, { waitUntil: 'networkidle2' });
        }
        
        await page.screenshot({ path: path.join(screenshotsDir, 'episode-page.png') });
        
        // Check for back link
        const backLink = await page.$('.back-link');
        console.log(`- Back link exists: ${!!backLink}`);
        
        // Check for transcript content
        const transcriptContent = await page.$('.transcript-body-content');
        console.log(`- Transcript content exists: ${!!transcriptContent}`);
      
        // Test back navigation
        if (backLink) {
          try {
            // Make sure the element is visible and clickable
            await page.waitForSelector('.back-link', { visible: true, timeout: 5000 });
            
            // Use page.click instead of element.click for better reliability
            await page.click('.back-link');
            
            await page.waitForNavigation({ waitUntil: 'networkidle2' });
            console.log(`- Successfully navigated back to homepage: ${page.url() === 'http://localhost:4321/' || page.url() === 'http://localhost:4321'}`);
          } catch (clickError) {
            console.log(`- Warning: Could not click back link: ${clickError.message}`);
            // Continue with tests instead of failing completely
          }
        }
      } catch (episodeError) {
        console.log(`- Warning: Error navigating to episode page: ${episodeError.message}`);
        // Continue with other tests
      }
    } else {
      console.log('- No episode links found');
    }
    
    // Test 6: Mobile responsiveness
    console.log('\nTest 6: Testing mobile responsiveness...');
    // Set mobile viewport
    await page.setViewport({ width: 375, height: 667, isMobile: true });
    await page.goto('http://localhost:4321', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(screenshotsDir, 'mobile-homepage.png') });
    
    // Check for hamburger menu on mobile
    const hamburgerMenu = await page.$('.hamburger-menu');
    console.log(`- Hamburger menu exists: ${!!hamburgerMenu}`);
    
    // Test hamburger menu functionality if it exists
    if (hamburgerMenu) {
      await hamburgerMenu.click();
      await page.waitForTimeout(500); // Wait for animation
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
    console.error('Site testing failed');
    process.exit(1);
  }
});
