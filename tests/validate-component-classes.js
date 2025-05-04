#!/usr/bin/env node

/**
 * Component Class Validator
 * 
 * This script validates that all critical site components have the required
 * CSS classes needed for Datadog synthetic tests to pass.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Define the components and required classes to validate
const REQUIRED_COMPONENTS = [
  { name: 'Header', selector: 'header', requiredClass: 'site-header' },
  { name: 'Footer', selector: 'footer', requiredClass: 'site-footer' },
  { name: 'Resource Cards', selector: '.resource-card', requiredClass: 'resource-card', page: '/resources', minCount: 1 }
];

/**
 * Validates that components have the required classes
 */
async function validateComponentClasses(baseUrl = 'http://localhost:4321') {
  console.log('\n🔍 Validating Component Classes for Datadog Synthetics');
  console.log('====================================================');
  console.log(`Target URL: ${baseUrl}\n`);
  
  let browser;
  let page;
  let allValid = true;

  try {
    // Launch browser with anti-flakiness settings
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
    
    page = await browser.newPage();
    page.setDefaultTimeout(30000);

    // Test each component
    for (const component of REQUIRED_COMPONENTS) {
      // Navigate to the specified page or homepage
      const targetUrl = component.page ? `${baseUrl}${component.page}` : baseUrl;
      console.log(`Checking ${component.name} on ${targetUrl}`);
      
      try {
        await page.goto(targetUrl, { waitUntil: 'networkidle2' });
      } catch (error) {
        console.error(`❌ Failed to navigate to ${targetUrl}: ${error.message}`);
        allValid = false;
        continue;
      }

      // Check if the element exists
      const elements = await page.$$(component.selector);
      
      if (elements.length === 0) {
        console.error(`❌ ${component.name} not found with selector "${component.selector}"`);
        allValid = false;
        continue;
      }

      // If there's a minimum count requirement, check it
      if (component.minCount && elements.length < component.minCount) {
        console.error(`❌ Expected at least ${component.minCount} ${component.name}, but found ${elements.length}`);
        allValid = false;
        continue;
      }

      // Check if the elements have the required class
      const validElements = await page.evaluate(
        ({ selector, requiredClass }) => {
          const elements = Array.from(document.querySelectorAll(selector));
          return elements.map(el => {
            const classes = el.className.split(' ');
            return {
              hasRequiredClass: classes.includes(requiredClass),
              actualClasses: el.className
            };
          });
        },
        { selector: component.selector, requiredClass: component.requiredClass }
      );

      const invalidElements = validElements.filter(e => !e.hasRequiredClass);
      
      if (invalidElements.length > 0) {
        console.error(`❌ ${component.name} missing required class "${component.requiredClass}"`);
        invalidElements.forEach((el, i) => {
          console.error(`   Element ${i+1} has classes: "${el.actualClasses}"`);
        });
        allValid = false;
      } else {
        console.log(`✅ ${component.name} validated with required class "${component.requiredClass}"`);
      }
    }

    // Final result
    console.log('\n====================================================');
    if (allValid) {
      console.log('✅ ALL COMPONENTS VALIDATED SUCCESSFULLY');
    } else {
      console.error('❌ COMPONENT VALIDATION FAILED');
      console.error('\nPlease ensure all components have the required classes:');
      REQUIRED_COMPONENTS.forEach(comp => {
        console.error(` - ${comp.name}: should have class "${comp.requiredClass}"`);
      });
    }
    console.log('====================================================\n');
    
    return allValid;
  } catch (error) {
    console.error(`Error in component validation: ${error.message}`);
    console.error(error);
    return false;
  } finally {
    if (browser) await browser.close();
  }
}

// Run the validator if called directly
if (require.main === module) {
  // Parse command line arguments
  let baseUrl = process.env.TEST_URL || 'http://localhost:4321';
  process.argv.forEach(arg => {
    if (arg.startsWith('--url=')) {
      baseUrl = arg.split('=')[1];
    }
  });

  // Run validation
  validateComponentClasses(baseUrl)
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal error during validation:', err);
      process.exit(1);
    });
}

module.exports = { validateComponentClasses };
