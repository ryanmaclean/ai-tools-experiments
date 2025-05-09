/**
 * Datadog Synthetic Tests Verification Script
 * 
 * This script verifies all synthetic monitoring components and marks them as verified
 * only after successful testing. It provides detailed reporting and status tracking.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const TERRAFORM_DIR = path.join(__dirname, '..', 'terraform');
const VERIFICATION_DIR = path.join(__dirname, '..', 'verification-results');
const ENVIRONMENTS = ['dev', 'tst', 'prd'];

// Test components to verify
const TEST_COMPONENTS = {
  api: {
    name: 'API Tests',
    tests: ['health-check', 'endpoints'],
    verified: false
  },
  browser: {
    name: 'Browser Tests',
    tests: ['functionality', 'responsive', 'navigation'],
    verified: false
  },
  visual: {
    name: 'Visual Regression Tests',
    tests: ['desktop', 'mobile'],
    verified: false
  },
  performance: {
    name: 'Performance Tests',
    tests: ['fcp', 'lcp', 'tti', 'cls'],
    verified: false
  },
  security: {
    name: 'Security Tests',
    tests: ['headers', 'csp', 'xss'],
    verified: false
  }
};

// Helper function to run Terraform command
function runTerraform(command) {
  try {
    execSync(`cd ${TERRAFORM_DIR} && ${command}`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Terraform command failed: ${error.message}`);
    return false;
  }
}

// Helper function to verify API tests
async function verifyApiTests(env) {
  console.log(`\n🔍 Verifying API tests for ${env}...`);
  const results = {
    health: false,
    endpoints: false
  };

  try {
    // Test health endpoint
    const healthResponse = execSync(`curl -s ${getEnvUrl(env)}/api/health`).toString();
    results.health = healthResponse.includes('"status":"ok"');

    // Test observations endpoint
    const observationsResponse = execSync(`curl -s ${getEnvUrl(env)}/api/observations`).toString();
    results.endpoints = observationsResponse.includes('"data"');

    return results.health && results.endpoints;
  } catch (error) {
    console.error(`API test verification failed for ${env}:`, error.message);
    return false;
  }
}

// Helper function to verify browser tests
async function verifyBrowserTests(env) {
  console.log(`\n🔍 Verifying browser tests for ${env}...`);
  const results = {
    functionality: false,
    responsive: false,
    navigation: false
  };

  try {
    // Run browser tests using Puppeteer
    const testScript = `
      const puppeteer = require('puppeteer');
      (async () => {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        // Test functionality
        await page.goto('${getEnvUrl(env)}');
        results.functionality = await page.$eval('h1', el => el.textContent === 'AI Tools Lab');
        
        // Test responsive design
        await page.setViewport({ width: 375, height: 667 });
        results.responsive = await page.$('.mobile-menu-button') !== null;
        
        // Test navigation
        await page.click('nav a');
        results.navigation = await page.url() !== '${getEnvUrl(env)}';
        
        await browser.close();
      })();
    `;

    execSync(`node -e "${testScript}"`);
    return results.functionality && results.responsive && results.navigation;
  } catch (error) {
    console.error(`Browser test verification failed for ${env}:`, error.message);
    return false;
  }
}

// Helper function to verify visual regression tests
async function verifyVisualTests(env) {
  console.log(`\n🔍 Verifying visual regression tests for ${env}...`);
  const results = {
    desktop: false,
    mobile: false
  };

  try {
    // Run visual regression tests using Puppeteer and pixelmatch
    const testScript = `
      const puppeteer = require('puppeteer');
      const pixelmatch = require('pixelmatch');
      const PNG = require('pngjs').PNG;
      const fs = require('fs');
      
      (async () => {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        // Test desktop view
        await page.setViewport({ width: 1920, height: 1080 });
        await page.goto('${getEnvUrl(env)}');
        const desktopScreenshot = await page.screenshot();
        results.desktop = await compareScreenshots(desktopScreenshot, 'desktop-baseline.png');
        
        // Test mobile view
        await page.setViewport({ width: 375, height: 667 });
        const mobileScreenshot = await page.screenshot();
        results.mobile = await compareScreenshots(mobileScreenshot, 'mobile-baseline.png');
        
        await browser.close();
      })();
    `;

    execSync(`node -e "${testScript}"`);
    return results.desktop && results.mobile;
  } catch (error) {
    console.error(`Visual test verification failed for ${env}:`, error.message);
    return false;
  }
}

// Helper function to verify performance tests
async function verifyPerformanceTests(env) {
  console.log(`\n🔍 Verifying performance tests for ${env}...`);
  const results = {
    fcp: false,
    lcp: false,
    tti: false,
    cls: false
  };

  try {
    // Run performance tests using Lighthouse
    const lighthouseScript = `
      const lighthouse = require('lighthouse');
      const chromeLauncher = require('chrome-launcher');
      
      (async () => {
        const chrome = await chromeLauncher.launch();
        const options = { logLevel: 'info', output: 'json', port: chrome.port };
        const results = await lighthouse('${getEnvUrl(env)}', options);
        
        const metrics = results.lhr.audits;
        results.fcp = metrics['first-contentful-paint'].score >= 0.9;
        results.lcp = metrics['largest-contentful-paint'].score >= 0.9;
        results.tti = metrics['interactive'].score >= 0.9;
        results.cls = metrics['cumulative-layout-shift'].score >= 0.9;
        
        await chrome.kill();
      })();
    `;

    execSync(`node -e "${lighthouseScript}"`);
    return results.fcp && results.lcp && results.tti && results.cls;
  } catch (error) {
    console.error(`Performance test verification failed for ${env}:`, error.message);
    return false;
  }
}

// Helper function to verify security tests
async function verifySecurityTests(env) {
  console.log(`\n🔍 Verifying security tests for ${env}...`);
  const results = {
    headers: false,
    csp: false,
    xss: false
  };

  try {
    // Test security headers
    const headers = execSync(`curl -I -s ${getEnvUrl(env)}`).toString();
    results.headers = headers.includes('Strict-Transport-Security') &&
                     headers.includes('X-Content-Type-Options') &&
                     headers.includes('X-Frame-Options');

    // Test CSP
    results.csp = headers.includes('Content-Security-Policy');

    // Test XSS protection
    results.xss = headers.includes('X-XSS-Protection');

    return results.headers && results.csp && results.xss;
  } catch (error) {
    console.error(`Security test verification failed for ${env}:`, error.message);
    return false;
  }
}

// Helper function to get environment URL
function getEnvUrl(env) {
  const urls = {
    dev: 'https://ai-tools-lab-dev.netlify.app',
    tst: 'https://ai-tools-lab-tst.netlify.app',
    prd: 'https://ai-tools-lab.com'
  };
  return urls[env];
}

// Helper function to save verification results
function saveVerificationResults(results) {
  const resultsFile = path.join(VERIFICATION_DIR, 'verification-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`\n✅ Verification results saved to: ${resultsFile}`);
}

// Main verification function
async function verifyAllComponents() {
  console.log('🚀 Starting synthetic tests verification...');
  
  // Create verification directory
  if (!fs.existsSync(VERIFICATION_DIR)) {
    fs.mkdirSync(VERIFICATION_DIR, { recursive: true });
  }

  const verificationResults = {
    timestamp: new Date().toISOString(),
    environments: {}
  };

  // Verify each environment
  for (const env of ENVIRONMENTS) {
    console.log(`\n📋 Verifying ${env.toUpperCase()} environment...`);
    verificationResults.environments[env] = {};

    // Verify each component
    for (const [component, config] of Object.entries(TEST_COMPONENTS)) {
      let verified = false;
      
      switch (component) {
        case 'api':
          verified = await verifyApiTests(env);
          break;
        case 'browser':
          verified = await verifyBrowserTests(env);
          break;
        case 'visual':
          verified = await verifyVisualTests(env);
          break;
        case 'performance':
          verified = await verifyPerformanceTests(env);
          break;
        case 'security':
          verified = await verifySecurityTests(env);
          break;
      }

      verificationResults.environments[env][component] = {
        name: config.name,
        verified,
        tests: config.tests.map(test => ({
          name: test,
          verified: verified // All tests in a component share the same verification status
        }))
      };

      // Update component verification status
      TEST_COMPONENTS[component].verified = verified;
    }
  }

  // Save verification results
  saveVerificationResults(verificationResults);

  // Print summary
  console.log('\n📊 Verification Summary:');
  for (const [component, config] of Object.entries(TEST_COMPONENTS)) {
    console.log(`${config.name}: ${config.verified ? '✅' : '❌'}`);
  }

  // Exit with appropriate status code
  const allVerified = Object.values(TEST_COMPONENTS).every(comp => comp.verified);
  process.exit(allVerified ? 0 : 1);
}

// Run the verification
verifyAllComponents().catch(error => {
  console.error('Verification failed:', error);
  process.exit(1);
}); 