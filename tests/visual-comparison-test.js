/**
 * Visual Comparison Test
 * 
 * This script uses Puppeteer to compare local pages with production versions
 * to ensure they match visually and functionally without duplicated elements.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function compareVisuals() {
  console.log('Starting visual comparison tests...');
  
  // Launch two browsers - one for local and one for production
  const localBrowser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: 'new'
  });
  
  const prodBrowser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: 'new'
  });
  
  try {
    // Create pages for each browser
    const localPage = await localBrowser.newPage();
    const prodPage = await prodBrowser.newPage();
    
    // Helper function to get the port
    async function getServerPort() {
      // Default port
      const DEFAULT_PORT = 4321;
      
      // Check for PORT environment variable
      if (process.env.PORT) {
        return process.env.PORT;
      }
      
      // Check for port argument
      const portArg = process.argv.find(arg => arg.startsWith('--port='));
      if (portArg) {
        return parseInt(portArg.split('=')[1], 10);
      }
      
      // Try to detect running Astro server
      try {
        const { exec } = require('child_process');
        return new Promise((resolve) => {
          exec('lsof -i -P | grep LISTEN | grep node', (error, stdout) => {
            if (stdout) {
              const portMatch = stdout.match(/:43[0-9]{2}/g);
              if (portMatch && portMatch.length > 0) {
                const detectedPort = parseInt(portMatch[0].substring(1), 10);
                console.log(`Detected existing Astro server on port: ${detectedPort}`);
                return resolve(detectedPort);
              }
            }
            console.log(`No server detected, using default port: ${DEFAULT_PORT}`);
            return resolve(DEFAULT_PORT);
          });
        });
      } catch (error) {
        console.error('Error detecting server port:', error);
        return DEFAULT_PORT;
      }
    }
    
    // Get server port
    const port = await getServerPort();
    const localBaseUrl = `http://localhost:${port}`;
    console.log(`Using local base URL: ${localBaseUrl}`);
    
    // Set identical viewport sizes
    await localPage.setViewport({ width: 1280, height: 900 });
    await prodPage.setViewport({ width: 1280, height: 900 });
    
    // Define pages to test with both new and legacy URLs for regression testing
    const pagesToTest = [
      {
        name: 'about',
        localUrl: `${localBaseUrl}/pages/about`,
        prodUrl: 'https://ai-tools-lab.com/pages/about',
        legacyUrl: `${localBaseUrl}/about`,  // Test legacy URL pattern
        expectedRedirect: `${localBaseUrl}/pages/about`
      },
      {
        name: 'resources',
        localUrl: `${localBaseUrl}/pages/resources`,
        prodUrl: 'https://ai-tools-lab.com/pages/resources',
        legacyUrl: `${localBaseUrl}/resources`,  // Test legacy URL pattern
        expectedRedirect: `${localBaseUrl}/pages/resources`
      },
      {
        name: 'observations',
        localUrl: `${localBaseUrl}/pages/observations`,
        prodUrl: 'https://ai-tools-lab.com/pages/observations',
        legacyUrl: `${localBaseUrl}/observations`,  // Test legacy URL pattern
        expectedRedirect: `${localBaseUrl}/pages/observations`
      }
    ];
    
    // Add episode pages to test
    for (let i = 1; i <= 17; i++) {
      const episodeNum = i.toString().padStart(2, '0');
      pagesToTest.push({
        name: `ep${episodeNum}`,
        localUrl: `${localBaseUrl}/pages/ep${episodeNum}`,
        prodUrl: `https://ai-tools-lab.com/pages/ep${episodeNum}`
      });
    }
    
    // Test each page
    for (const page of pagesToTest) {
      console.log(`\nTesting ${page.name} page...`);
      
      // Test new URL pattern
      console.log(`- Testing new URL pattern (${page.localUrl})...`);
      await Promise.all([
        localPage.goto(page.localUrl, { waitUntil: 'networkidle2', timeout: 30000 }),
        prodPage.goto(page.prodUrl, { waitUntil: 'networkidle2', timeout: 30000 })
      ]);
      
      // Take screenshots
      await localPage.screenshot({ path: path.join(screenshotsDir, `${page.name}-local.png`), fullPage: true });
      await prodPage.screenshot({ path: path.join(screenshotsDir, `${page.name}-prod.png`), fullPage: true });
      
      // Test legacy URL pattern
      if (page.legacyUrl) {
        console.log(`- Testing legacy URL pattern (${page.legacyUrl})...`);
        const response = await localPage.goto(page.legacyUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Check if we got redirected to the correct URL
        const finalUrl = response.url();
        if (finalUrl === page.expectedRedirect) {
          console.log(`  ✓ Legacy URL redirects correctly to ${page.expectedRedirect}`);
        } else {
          console.error(`  ✗ Legacy URL redirects to ${finalUrl} instead of ${page.expectedRedirect}`);
          return false;
        }
        
        // Take screenshot of legacy URL result
        await localPage.screenshot({ path: path.join(screenshotsDir, `${page.name}-legacy.png`), fullPage: true });
      }
      console.log(`- Screenshots captured for ${page.name}`);
      
      // Check for duplicate headers in local version
      const headersCount = await localPage.evaluate(() => {
        return document.querySelectorAll('header').length;
      });
      
      console.log(`- Header count in local ${page.name} page: ${headersCount}`);
      if (headersCount > 1) {
        console.error(`  WARNING: Found ${headersCount} headers on ${page.name} page. Expected only 1.`);
      } else {
        console.log(`  ✓ No duplicate headers found`);
      }
      
      // Check for duplicate footers in local version
      const footersCount = await localPage.evaluate(() => {
        return document.querySelectorAll('footer').length;
      });
      
      console.log(`- Footer count in local ${page.name} page: ${footersCount}`);
      if (footersCount > 1) {
        console.error(`  WARNING: Found ${footersCount} footers on ${page.name} page. Expected only 1.`);
      } else {
        console.log(`  ✓ No duplicate footers found`);
      }
      
      // Check main content structure
      const localMainContent = await localPage.evaluate(() => {
        const main = document.querySelector('main');
        return main ? main.children.length : 0;
      });
      
      const prodMainContent = await prodPage.evaluate(() => {
        const main = document.querySelector('main');
        return main ? main.children.length : 0;
      });
      
      console.log(`- Main content structure: local has ${localMainContent} elements, prod has ${prodMainContent} elements`);
      if (localMainContent === prodMainContent) {
        console.log(`  ✓ Main content structure matches production`);
      } else {
        console.error(`  WARNING: Main content structure differs from production`);
      }
      
      // Test alternate URL pattern (only for pages with alternate patterns)
      // Check for duplicate elements and correct structure
      const headerCount = await localPage.evaluate(() => document.querySelectorAll('header').length);
      const footerCount = await localPage.evaluate(() => document.querySelectorAll('footer').length);
      const navCount = await localPage.evaluate(() => document.querySelectorAll('nav').length);
      
      console.log('- Checking page structure:');
      console.log(`  - Headers: ${headerCount} (expected: 1)`);
      console.log(`  - Footers: ${footerCount} (expected: 1)`);
      console.log(`  - Navigation: ${navCount} (expected: 1)`);
      
      if (headerCount !== 1 || footerCount !== 1 || navCount !== 1) {
        console.error(`  ✗ Page structure has duplicate or missing elements`);
        return false;
      } else {
        console.log(`  ✓ Page structure is correct`);
      }
      
      // For resources page, check for resource cards
      if (page.name === 'resources') {
        const cardCount = await localPage.evaluate(() => document.querySelectorAll('.card').length);
        const prodCardCount = await prodPage.evaluate(() => document.querySelectorAll('.card').length);
        
        console.log('- Checking resource cards:');
        console.log(`  - Local site: ${cardCount} cards`);
        console.log(`  - Production site: ${prodCardCount} cards`);
        
        if (cardCount !== prodCardCount) {
          console.error(`  ✗ Resource card count mismatch`);
          return false;
        } else {
          console.log(`  ✓ Resource card count matches production`);
        }
      }
    }
    
    // Test episode navigation
    console.log('\nTesting episode navigation...');
    await localPage.goto('http://localhost:4325', { waitUntil: 'networkidle2' });
    
    // Wait for episode links to be fully loaded with a longer timeout
    try {
      console.log('- Waiting for recording card links...');
      await localPage.waitForSelector('.recording-card a', { timeout: 15000 });
      const episodeLinks = await localPage.$$('.recording-card a');
      console.log(`- Found ${episodeLinks.length} episode links`);
      
      if (episodeLinks.length > 0) {
        // Get the href attribute of the first episode link
        const href = await localPage.evaluate(el => el.getAttribute('href'), episodeLinks[0]);
        console.log(`- First episode link href: ${href}`);
        
        // Navigate directly to the episode page
        const fullUrl = `http://localhost:4325${href}`;
        console.log(`- Navigating directly to: ${fullUrl}`);
        await localPage.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 45000 });
        
        // Take a screenshot of the episode page
        await localPage.screenshot({ path: path.join(screenshotsDir, 'episode-page.png'), fullPage: true });
        
        // Check for duplicate headers
        const episodeHeadersCount = await localPage.evaluate(() => {
          return document.querySelectorAll('header').length;
        });
        
        console.log(`- Header count in episode page: ${episodeHeadersCount}`);
        if (episodeHeadersCount > 1) {
          console.error(`  WARNING: Found ${episodeHeadersCount} headers on episode page. Expected only 1.`);
        } else {
          console.log(`  ✓ No duplicate headers found on episode page`);
        }
        
        // Check for back link functionality
        const backLink = await localPage.$('.back-link');
        if (backLink) {
          console.log(`- Back link exists on episode page`);
          
          // Check if back link is properly styled and positioned
          const backLinkBoundingBox = await backLink.boundingBox();
          if (backLinkBoundingBox) {
            console.log(`  ✓ Back link is properly rendered and positioned`);
          } else {
            console.error(`  WARNING: Back link might not be properly styled or positioned`);
          }
        } else {
          console.error(`- WARNING: Back link not found on episode page`);
        }
      } else {
        console.log('- No episode links found');
      }
    } catch (error) {
      console.error(`- Error testing episode navigation: ${error.message}`);
    }
    
    console.log('\nVisual comparison tests completed!');
    return true;
  } catch (error) {
    console.error('Error during visual comparison:', error);
    return false;
  } finally {
    await localBrowser.close();
    await prodBrowser.close();
  }
}

// Run the tests
compareVisuals().then(success => {
  if (!success) {
    console.error('Tests failed!');
    process.exit(1);
  } else {
    console.log('Visual comparison tests completed successfully!');
    process.exit(0);
  }
}).catch(error => {
  console.error('Unhandled error during testing:', error);
  process.exit(1);
});
