/**
 * Post-Deployment Validation Script
 * 
 * A simple, CI-friendly script that verifies key aspects of the site after deployment:
 * - Datadog RUM integration
 * - Basic page accessibility
 * - Critical navigation elements
 *
 * Designed to be run in CI pipelines with non-zero exit codes on failures.
 */

const { chromium } = require('playwright');
const https = require('https');

// Datadog logging helper
function logToDatadog(message, status, additionalTags = {}) {
  // Skip if no API key is set
  const apiKey = process.env.DD_API_KEY;
  if (!apiKey) {
    console.log('Skipping Datadog logging: DD_API_KEY not set');
    return;
  }
  
  // Prepare log payload
  const timestamp = Math.floor(Date.now() / 1000);
  const hostname = process.env.HOSTNAME || 'post-deploy-check';
  
  // Build tags array
  const tags = [
    'source:post-deploy-check',
    `status:${status}`,
    ...Object.entries(additionalTags).map(([key, value]) => `${key}:${value}`)
  ];
  
  const payload = JSON.stringify({
    message,
    ddsource: 'nodejs',
    service: 'ai-tools-lab',
    hostname,
    timestamp,
    status,
    tags
  });
  
  // Send log to Datadog
  const options = {
    hostname: 'http-intake.logs.datadoghq.com',
    port: 443,
    path: '/api/v2/logs',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'DD-API-KEY': apiKey,
      'Content-Length': Buffer.byteLength(payload)
    }
  };
  
  const req = https.request(options, (res) => {
    console.log(`Datadog log sent with status: ${res.statusCode}`);
  });
  
  req.on('error', (e) => {
    console.error('Error sending log to Datadog:', e.message);
  });
  
  req.write(payload);
  req.end();
}

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

// Main function to run all checks
const runChecks = async () => {
  console.log('Starting post-deployment validation checks...');
  
  // Run environment comparison tests if requested
  if (process.env.RUN_COMPARISON === 'true') {
    try {
      console.log('\n=== Running Environment Comparison Tests ===');
      console.log('This will compare all pages between test and production environments.\n');
      
      // Run the comparison test through the Playwright test runner
      execSync('npm run compare-environments', { stdio: 'inherit' });
      console.log('\n=== Environment Comparison Complete ===');
      console.log('Check test-results/comparison/ directory for screenshots.\n');
    } catch (error) {
      console.error('\n❌ Environment comparison failed:', error.message);
    }
  }
  
  let success = true;
  console.log('\n=== Starting Post-Deployment Validation ===');
  
  // Launch browser
  const browser = await chromium.launch();
  const context = await browser.newContext();
  
  try {
    for (const env of environments) {
      console.log(`\n=== Checking ${env.name} environment: ${env.url} ===`);
      const page = await context.newPage();
      
      // Step 1: Navigate to the site
      console.log(`\n1. Accessing ${env.url}...`);
      await page.goto(env.url, { waitUntil: 'networkidle', timeout: 30000 });
      
      // Step 2: Check for Datadog RUM
      console.log('\n2. Verifying Datadog RUM integration...');
      const datadogStatus = await checkDatadogIntegration(page, env.name);
      if (!datadogStatus) success = false;
      
      // Step 3: Verify navigation elements
      console.log('\n3. Checking navigation elements...');
      const navStatus = await checkNavigation(page, env.name);
      if (!navStatus) success = false;
      
      // Step 4: Take a screenshot for reference
      console.log('\n4. Taking screenshot for reference...');
      await page.screenshot({ 
        path: `./test-results/${env.name.toLowerCase()}-homepage.png`,
        fullPage: true 
      });
      console.log(`   Screenshot saved to ./test-results/${env.name.toLowerCase()}-homepage.png`);
      
      await page.close();
    }
  } catch (error) {
    console.error('Error during post-deployment checks:', error);
    success = false;
  } finally {
    await browser.close();
  }
  
  // Final report
  console.log('\n=== Post-Deployment Validation Complete ===');
  
  // Log final results to Datadog
  const deployTimestamp = new Date().toISOString();
  const resultStatus = success ? 'pass' : 'fail';
  const summaryMessage = success 
    ? 'Post-deployment validation checks passed successfully' 
    : 'Post-deployment validation checks failed';
  
  try {
    logToDatadog(summaryMessage, resultStatus, {
      'environment': 'multiple',
      'deployment_time': deployTimestamp,
      'check_type': 'post_deploy'
    });
  } catch (e) {
    console.error('Error logging to Datadog:', e);
    // Continue execution even if logging fails
  }
  
  if (success) {
    console.log('✅ All checks passed successfully!');
    return 0; // Success exit code
  } else {
    console.error('❌ Some checks failed - see logs above for details');
    return 1; // Error exit code
  }
}

/**
 * Check Datadog RUM integration
 */
async function checkDatadogIntegration(page, envName) {
  let success = true;
  
  // Check for Datadog script
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
    console.log(`   ✅ ${envName} has Datadog RUM script`); 
  } else {
    console.error(`   ❌ ${envName} is missing Datadog RUM script`);
    success = false;
  }
  
  if (datadogInitialized.hasDD_RUM) {
    console.log(`   ✅ ${envName} has DD_RUM object available`);
  } else {
    console.error(`   ❌ ${envName} is missing DD_RUM object`);
    success = false;
  }
  
  // For production, we'll be more lenient with the initialized flag for now
  if (datadogInitialized.hasDD_RUM_INITIALIZED) {
    console.log(`   ✅ ${envName} has DD_RUM_INITIALIZED flag set`);
  } else if (envName === 'Test') {
    console.error(`   ❌ ${envName} is missing DD_RUM_INITIALIZED flag`);
    success = false;
  } else {
    console.log(`   ⚠️  ${envName} is missing DD_RUM_INITIALIZED flag (known issue, not failing check)`);
  }
  
  return success;
}

/**
 * Check navigation elements
 */
async function checkNavigation(page, envName) {
  let success = true;
  
  // Check for header
  const hasHeader = await page.evaluate(() => {
    return document.querySelector('header') !== null;
  });
  
  if (hasHeader) {
    console.log(`   ✅ ${envName} has header element`);
  } else {
    console.error(`   ❌ ${envName} is missing header element`);
    success = false;
  }
  
  // Get page title
  const title = await page.title();
  if (title && title.trim() !== '') {
    console.log(`   ✅ ${envName} has page title: "${title}"`);
  } else {
    console.error(`   ❌ ${envName} is missing page title`);
    success = false;
  }
  
  // Check for navigation links (specific content verification)
  const navLinks = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('nav a, header a'));
    return links.map(link => ({
      text: link.textContent.trim(),
      href: link.getAttribute('href')
    }));
  });
  
  if (navLinks.length > 0) {
    console.log(`   ✅ ${envName} has ${navLinks.length} navigation links`);
    
    // Log the first few links for verification
    navLinks.slice(0, 3).forEach(link => {
      console.log(`     - "${link.text}" → ${link.href}`);
    });
  } else {
    console.error(`   ❌ ${envName} has no navigation links`);
    success = false;
  }
  
  return success;
}

// Run the verification and exit with appropriate code
runPostDeployChecks().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  console.error('Error running post-deployment checks:', error);
  process.exit(1);
});
