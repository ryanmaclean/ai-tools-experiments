#!/usr/bin/env node

// Script to verify basic HTML structure of the site
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, 'structure-verify');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function verifyStructure() {
  console.log('\n📝 Verifying site structure...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    console.log('🔍 Checking localhost:4322 site structure');
    
    // Load page with longer timeout
    await page.goto('http://localhost:4322', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    // Take screenshot of full page
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'fullpage.png'),
      fullPage: true
    });
    
    // Check basic HTML structure
    const structure = await page.evaluate(() => {
      const result = {
        title: document.title,
        bodyChildCount: document.body.childNodes.length,
        bodyChildTags: Array.from(document.body.children).map(el => el.tagName.toLowerCase()),
        headerExists: !!document.querySelector('header'),
        siteHeaderExists: !!document.querySelector('.site-header'),
        footerExists: !!document.querySelector('footer'),
        mainExists: !!document.querySelector('main'),
        htmlStructure: document.documentElement.outerHTML.substring(0, 500) // First 500 chars
      };
      return result;
    });
    
    console.log('\n🏗️ PAGE STRUCTURE:');
    console.log('====================');
    console.log(`Page title: ${structure.title}`);
    console.log(`Body child elements: ${structure.bodyChildCount}`);
    console.log(`Body direct child tags: ${structure.bodyChildTags.join(', ')}`);
    console.log(`Header tag exists: ${structure.headerExists}`);
    console.log(`Site-header class exists: ${structure.siteHeaderExists}`);
    console.log(`Footer tag exists: ${structure.footerExists}`);
    console.log(`Main tag exists: ${structure.mainExists}`);
    console.log('\nHTML Structure Preview:');
    console.log(structure.htmlStructure + '...');

    // Go to resources page
    console.log('\n🔍 Checking resources page structure');
    
    // Try both URL formats (/resources and /pages/resources)
    let resourcesLoaded = false;
    
    try {
      await page.goto('http://localhost:4322/resources', { 
        waitUntil: 'networkidle2', 
        timeout: 15000 
      });
      resourcesLoaded = true;
    } catch (e) {
      console.log('❌ Failed to load /resources, trying /pages/resources');
      try {
        await page.goto('http://localhost:4322/pages/resources', { 
          waitUntil: 'networkidle2', 
          timeout: 15000 
        });
        resourcesLoaded = true;
      } catch (e2) {
        console.log('❌ Failed to load /pages/resources too');
      }
    }
    
    if (resourcesLoaded) {
      // Take screenshot of resources page
      await page.screenshot({ 
        path: path.join(screenshotsDir, 'resources.png'),
        fullPage: true
      });
      
      // Check for resource cards
      const resourcesInfo = await page.evaluate(() => {
        const allElements = document.querySelectorAll('*');
        const resourceCards = document.querySelectorAll('.resource-card, div[class*="resource"], .card');
        
        return {
          url: window.location.href,
          resourceCardCount: resourceCards.length,
          totalElements: allElements.length,
          pageHTML: document.documentElement.outerHTML.substring(0, 500) // First 500 chars
        };
      });
      
      console.log('\n🧩 RESOURCES PAGE:');
      console.log('====================');
      console.log(`URL: ${resourcesInfo.url}`);
      console.log(`Resource cards found: ${resourcesInfo.resourceCardCount}`);
      console.log(`Total elements on page: ${resourcesInfo.totalElements}`);
      console.log('\nHTML Structure Preview:');
      console.log(resourcesInfo.pageHTML + '...');
    }
    
    // Create a report with all info
    const report = `# Site Structure Verification

## Homepage
- Title: ${structure.title}
- Body elements: ${structure.bodyChildCount}
- Body child tags: ${structure.bodyChildTags.join(', ')}
- Header exists: ${structure.headerExists}
- Site-header class exists: ${structure.siteHeaderExists}
- Footer exists: ${structure.footerExists}
- Main exists: ${structure.mainExists}

## Resources Page
${resourcesLoaded ? `- URL: ${resourcesInfo.url}\n- Resource cards: ${resourcesInfo.resourceCardCount}\n- Total elements: ${resourcesInfo.totalElements}` : '- Failed to load resources page'}
`;
    
    fs.writeFileSync(path.join(screenshotsDir, 'structure-report.md'), report);
    
    console.log('\n📊 Report generated at structure-verify/structure-report.md');
    return true;
  } catch (error) {
    console.error('❌ Error during structure verification:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the structure verification
verifyStructure().then(success => {
  console.log(success ? '\n✅ Structure verification completed!' : '\n❌ Structure verification failed!');
}).catch(err => {
  console.error('Unexpected error:', err);
});
