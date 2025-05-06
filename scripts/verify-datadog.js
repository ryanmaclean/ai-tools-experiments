/**
 * Simple Datadog RUM Verification Script
 * 
 * This script checks both test and production environments
 * to ensure Datadog RUM is properly integrated.
 */

const { chromium } = require('playwright');

// Environment configurations
const environments = [
  {
    name: 'Test',
    url: 'https://ai-tools-lab-tst.netlify.app/'
  },
  {
    name: 'Production',
    url: 'https://ai-tools-lab.com/pages/'
  }
];

async function verifyDatadogRUM() {
  console.log('Starting Datadog RUM verification...');
  
  const browser = await chromium.launch();
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36',
  });
  
  try {
    for (const env of environments) {
      console.log(`\nChecking ${env.name} environment at ${env.url}`);
      
      // Open a new page
      const page = await context.newPage();
      
      // Listen for console logs
      page.on('console', msg => {
        if (msg.text().includes('Datadog') || msg.text().includes('DD_RUM')) {
          console.log(`Console log from ${env.name}: ${msg.text()}`);
        }
      });
      
      // Navigate to the environment URL
      await page.goto(env.url, { waitUntil: 'networkidle' });
      
      // Check for Datadog RUM script in page
      const hasDatadogScript = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script'));
        return scripts.some(script => 
          script.src && (script.src.includes('datadog-rum') || script.src.includes('dd-rum'))
        );
      });
      
      // Check for Datadog initialization
      const datadogInitialized = await page.evaluate(() => {
        return {
          hasDD_RUM: typeof window.DD_RUM !== 'undefined',
          hasDD_RUM_INITIALIZED: typeof window.DD_RUM_INITIALIZED !== 'undefined'
        };
      });
      
      // Report results
      if (hasDatadogScript) {
        console.log(`✅ ${env.name} environment has Datadog RUM script`); 
      } else {
        console.error(`❌ ${env.name} environment is missing Datadog RUM script`);
      }
      
      if (datadogInitialized.hasDD_RUM) {
        console.log(`✅ ${env.name} environment has DD_RUM object available`);
      } else {
        console.error(`❌ ${env.name} environment is missing DD_RUM object`);
      }
      
      if (datadogInitialized.hasDD_RUM_INITIALIZED) {
        console.log(`✅ ${env.name} environment has DD_RUM_INITIALIZED flag set`);
      } else {
        console.error(`❌ ${env.name} environment is missing DD_RUM_INITIALIZED flag`);
      }
      
      // Check page title
      const title = await page.title();
      console.log(`📝 ${env.name} page title: "${title}"`);  
      
      // Close the page
      await page.close();
    }
    
  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await browser.close();
  }
  
  console.log('\nDatadog RUM verification complete!');
}

// Run the verification
verifyDatadogRUM().catch(e => {
  console.error('Script execution failed:', e);
  process.exit(1);
});
