#!/usr/bin/env node

/**
 * HTML Component Validator
 * 
 * This script validates critical components across both production and test environments,
 * focusing specifically on the HTML structure rather than URL patterns.
 */

const puppeteer = require('puppeteer');

// Environment configurations with correct URL patterns
const ENVIRONMENTS = {
  production: {
    baseUrl: 'https://ai-tools-lab.com',
    routes: {
      home: '/',
      about: '/pages/about',
      resources: '/pages/resources',
      observations: '/pages/observations'
    }
  },
  staging: {
    baseUrl: 'https://ai-tools-lab-tst.netlify.app',
    routes: {
      home: '/',
      about: '/about',
      resources: '/resources',
      observations: '/observations'
    }
  }
};

// Components to validate with their required classes
const COMPONENTS = [
  { name: 'Header', selector: 'header', requiredClass: 'site-header' },
  { name: 'Footer', selector: 'footer', requiredClass: 'site-footer' },
  { name: 'Resource Cards', selector: '.resource-card', requiredClass: 'resource-card', page: 'resources', minCount: 1 }
];

/**
 * Validate HTML components on a specific environment
 */
async function validateEnvironment(env) {
  console.log(`\n🔍 Validating ${env} environment: ${ENVIRONMENTS[env].baseUrl}`);
  console.log('================================================');
  
  const results = {
    environment: env,
    baseUrl: ENVIRONMENTS[env].baseUrl,
    components: [],
    success: true
  };
  
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);
    
    // Check each component on its appropriate page
    for (const component of COMPONENTS) {
      const route = component.page || 'home';
      const url = `${ENVIRONMENTS[env].baseUrl}${ENVIRONMENTS[env].routes[route]}`;
      
      console.log(`Checking ${component.name} on ${url}`);
      
      try {
        await page.goto(url, { waitUntil: 'networkidle2' });
        
        // Check if component exists and has required class
        const elementCount = await page.$$eval(
          component.selector,
          (elements, requiredClass) => {
            return elements.map(el => {
              const classes = el.className.split(' ');
              return {
                hasRequiredClass: classes.includes(requiredClass),
                actualClasses: el.className
              };
            });
          },
          component.requiredClass
        );
        
        const componentResult = {
          name: component.name,
          selector: component.selector,
          requiredClass: component.requiredClass,
          url: url,
          elementsFound: elementCount.length,
          validElements: elementCount.filter(e => e.hasRequiredClass).length,
          success: elementCount.length > 0 && 
                  (component.minCount ? elementCount.length >= component.minCount : true) &&
                  elementCount.filter(e => e.hasRequiredClass).length === elementCount.length
        };
        
        results.components.push(componentResult);
        
        if (!componentResult.success) {
          results.success = false;
          console.log(`❌ ${component.name}: Failed validation`);
          console.log(`   Found ${componentResult.elementsFound} elements, ${componentResult.validElements} with required class`);
        } else {
          console.log(`✅ ${component.name}: Passed validation`);
        }
        
      } catch (error) {
        results.components.push({
          name: component.name,
          selector: component.selector,
          requiredClass: component.requiredClass,
          url: url,
          error: error.message,
          success: false
        });
        
        results.success = false;
        console.log(`❌ ${component.name}: Error during validation - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error(`Error validating ${env} environment:`, error);
    results.error = error.message;
    results.success = false;
  } finally {
    if (browser) await browser.close();
  }
  
  return results;
}

/**
 * Main validation function to test both environments
 */
async function validateAllEnvironments() {
  const results = {};
  
  console.log('🌐 HTML COMPONENT VALIDATOR');
  console.log('===========================')
  console.log('Validating critical components across environments\n');
  
  // Test production environment
  results.production = await validateEnvironment('production');
  
  // Test staging environment
  results.staging = await validateEnvironment('staging');
  
  // Output summary
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('===========================')
  
  const productionStatus = results.production.success ? '✅ PASS' : '❌ FAIL';
  const stagingStatus = results.staging.success ? '✅ PASS' : '❌ FAIL';
  
  console.log(`Production: ${productionStatus}`);
  console.log(`Staging: ${stagingStatus}`);
  
  // Check if components match between environments
  const environmentsMatch = results.production.components.every((prodComp, index) => {
    const stagingComp = results.staging.components[index];
    return prodComp.success === stagingComp.success && 
           prodComp.validElements === stagingComp.validElements;
  });
  
  if (environmentsMatch) {
    console.log('\n✅ Environments are consistent')
  } else {
    console.log('\n❌ Environments are inconsistent');
    console.log('The following components differ between environments:');
    
    results.production.components.forEach((prodComp, index) => {
      const stagingComp = results.staging.components[index];
      if (prodComp.success !== stagingComp.success || prodComp.validElements !== stagingComp.validElements) {
        console.log(`- ${prodComp.name}:`);
        console.log(`  Production: ${prodComp.success ? 'Pass' : 'Fail'} (${prodComp.validElements}/${prodComp.elementsFound} valid)`); 
        console.log(`  Staging: ${stagingComp.success ? 'Pass' : 'Fail'} (${stagingComp.validElements}/${stagingComp.elementsFound} valid)`);
      }
    });
  }
  
  return results.production.success && results.staging.success;
}

// Run the validation if called directly
if (require.main === module) {
  validateAllEnvironments()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('\nFatal error during validation:', err);
      process.exit(1);
    });
}

module.exports = { validateAllEnvironments, validateEnvironment };
