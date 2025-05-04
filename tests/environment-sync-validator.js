#!/usr/bin/env node

/**
 * Environment Synchronization Validator
 * 
 * This script validates critical HTML structure and CSS classes between
 * test and production environments to ensure consistency.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Save screenshots for comparison
const SCREENSHOT_DIR = path.join(__dirname, 'env-screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Environment configurations
const ENVIRONMENTS = [
  {
    name: 'production',
    baseUrl: 'https://ai-tools-lab.com',
    urlPattern: page => page === 'home' ? 'https://ai-tools-lab.com' : `https://ai-tools-lab.com/pages/${page}`
  },
  {
    name: 'test',
    baseUrl: 'https://ai-tools-lab-tst.netlify.app',
    urlPattern: page => page === 'home' ? 'https://ai-tools-lab-tst.netlify.app' : `https://ai-tools-lab-tst.netlify.app/${page}`
  }
];

// Pages to validate
const PAGES = [
  'home',
  'about',
  'resources',
  'observations'
];

// Critical components to validate
const CRITICAL_COMPONENTS = [
  { name: 'Header', selector: 'header', requiredClass: 'site-header' },
  { name: 'Footer', selector: 'footer', requiredClass: 'site-footer' },
  { name: 'Resources', page: 'resources', selector: '.resource-card', minCount: 10 }
];

/**
 * Validate components on a page
 */
async function validatePage(page, environment, pageName) {
  const url = environment.urlPattern(pageName);
  console.log(`Navigating to ${url}...`);
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Take screenshot for visual comparison
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, `${environment.name}-${pageName}.png`),
      fullPage: true 
    });
    
    // Find relevant components for this page
    const pageComponents = CRITICAL_COMPONENTS.filter(comp => 
      !comp.page || comp.page === pageName
    );
    
    const results = [];
    
    // Check each component
    for (const component of pageComponents) {
      // Check if element exists
      const elements = await page.$$(component.selector);
      
      if (elements.length === 0) {
        results.push({
          component: component.name,
          selector: component.selector,
          exists: false,
          hasRequiredClass: false,
          count: 0,
          status: 'missing'
        });
        continue;
      }
      
      // Check min count if specified
      if (component.minCount && elements.length < component.minCount) {
        results.push({
          component: component.name,
          selector: component.selector,
          exists: true,
          hasRequiredClass: null,
          count: elements.length,
          status: 'insufficient'
        });
        continue;
      }
      
      // Check if element has required class
      let hasRequiredClass = true;
      if (component.requiredClass) {
        hasRequiredClass = await page.evaluate(
          (selector, requiredClass) => {
            const element = document.querySelector(selector);
            if (!element) return false;
            
            const classes = element.className.split(' ');
            return classes.includes(requiredClass);
          },
          component.selector,
          component.requiredClass
        );
      }
      
      results.push({
        component: component.name,
        selector: component.selector,
        exists: true,
        hasRequiredClass,
        count: elements.length,
        status: hasRequiredClass ? 'valid' : 'missing-class'
      });
    }
    
    return results;
  } catch (error) {
    console.error(`Error validating ${pageName} on ${environment.name}:`, error.message);
    return [{ error: error.message, status: 'error' }];
  }
}

/**
 * Main function to validate environment synchronization
 */
async function validateEnvironmentSync() {
  console.log('\n🔄 Environment Synchronization Validator');
  console.log('=========================================');
  
  const browsers = [];
  let results = {};
  
  try {
    // Launch browsers for each environment
    for (const environment of ENVIRONMENTS) {
      console.log(`\n📊 Testing ${environment.name.toUpperCase()} environment`);
      console.log(`Base URL: ${environment.baseUrl}`);
      
      // Launch browser
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      browsers.push(browser);
      
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      
      // Test each page
      const envResults = {};
      
      for (const pageName of PAGES) {
        console.log(`\nChecking ${pageName} page...`);
        const pageResults = await validatePage(page, environment, pageName);
        envResults[pageName] = pageResults;
        
        // Log results
        pageResults.forEach(result => {
          const icon = result.status === 'valid' ? '✅' : result.status === 'missing' ? '❌' : result.status === 'missing-class' ? '⚠️' : '🔍';
          console.log(`${icon} ${result.component}: ${result.status}${result.count ? ` (count: ${result.count})` : ''}`);
        });
      }
      
      results[environment.name] = envResults;
    }
    
    // Compare results between environments
    console.log('\n🔄 Comparing Environments');
    console.log('=========================================');
    
    const differences = [];
    
    // Loop through pages
    for (const pageName of PAGES) {
      const pageResults = {};
      
      // Get results for each environment
      for (const environment of ENVIRONMENTS) {
        pageResults[environment.name] = results[environment.name][pageName];
      }
      
      // Compare components across environments
      const prodResults = pageResults.production;
      const testResults = pageResults.test;
      
      // Check if we have results for both environments
      if (!prodResults || !testResults) continue;
      
      // Create component map for easy comparison
      const prodMap = prodResults.reduce((map, item) => {
        map[item.component] = item;
        return map;
      }, {});
      
      const testMap = testResults.reduce((map, item) => {
        map[item.component] = item;
        return map;
      }, {});
      
      // Collect all component names
      const allComponents = [...new Set([
        ...prodResults.map(r => r.component),
        ...testResults.map(r => r.component)
      ])];
      
      // Check each component
      for (const component of allComponents) {
        const prod = prodMap[component];
        const test = testMap[component];
        
        // Skip if missing in either (this will be caught elsewhere)
        if (!prod || !test) continue;
        
        // Check for inconsistencies
        if (prod.status !== test.status) {
          differences.push({
            page: pageName,
            component,
            production: prod,
            test: test,
            issue: 'Status mismatch'
          });
        }
        
        // Check count differences for components with minCount
        if (prod.count !== test.count && (prod.count > 0 || test.count > 0)) {
          differences.push({
            page: pageName,
            component,
            production: prod,
            test: test,
            issue: 'Count mismatch'
          });
        }
      }
    }
    
    // Output differences
    if (differences.length === 0) {
      console.log('\n✅ No inconsistencies found between environments!');
    } else {
      console.log(`\n⚠️ Found ${differences.length} inconsistencies between environments:`);
      
      differences.forEach((diff, i) => {
        console.log(`\n${i+1}. ${diff.page} page - ${diff.component} (${diff.issue})`);
        console.log(`   Production: ${diff.production.status}${diff.production.count ? ` (count: ${diff.production.count})` : ''}`);
        console.log(`   Test: ${diff.test.status}${diff.test.count ? ` (count: ${diff.test.count})` : ''}`);
      });
    }
    
    // Save full results to file
    fs.writeFileSync(
      path.join(__dirname, 'environment-sync-results.json'),
      JSON.stringify({ results, differences }, null, 2)
    );
    
    console.log('\n📋 Full results saved to environment-sync-results.json');
    
    return differences.length === 0;
  } catch (error) {
    console.error('Error during environment sync validation:', error);
    return false;
  } finally {
    // Close all browsers
    for (const browser of browsers) {
      await browser.close();
    }
  }
}

// Run the validator if called directly
if (require.main === module) {
  validateEnvironmentSync()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal error during validation:', err);
      process.exit(1);
    });
}

module.exports = { validateEnvironmentSync };
