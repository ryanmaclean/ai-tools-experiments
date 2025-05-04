#!/usr/bin/env node

/**
 * CLI-Driven Datadog Synthetics Validator with Ollama and Aider Integration
 * 
 * This script validates Datadog Synthetics tests across environments using:
 * - MCP Puppeteer for visual validation (per user preference)
 * - Vitest for test assertions
 * - Ollama with llama3.2 for on-the-fly problem solving
 * - Aider for code fixes when issues are identified
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Configuration
const DD_API_KEY = process.env.DD_API_KEY || '';
const DD_APP_KEY = process.env.DD_APP_KEY || '';
const BASE_URLS = {
  production: 'https://ai-tools-lab.com',
  test: 'https://ai-tools-lab-tst.netlify.app'
};

// Page routes to validate
const ROUTES = [
  { name: 'Home', path: '/' },
  { name: 'About', path: '/pages/about', testPath: '/pages/about' },
  { name: 'Resources', path: '/pages/resources', testPath: '/resources' },
  { name: 'Observations', path: '/pages/observations', testPath: '/observations' }
];

// Episode pages to validate
const EPISODE_PAGES = Array.from({ length: 17 }, (_, i) => {
  const num = String(i + 1).padStart(2, '0');
  return { 
    name: `Episode ${num}`, 
    path: `/pages/ep${num}`,
    testPath: `/pages/ep${num}` // In both environments, episode pages use /pages/ prefix
  };
});

// All pages to validate
const ALL_PAGES = [...ROUTES, ...EPISODE_PAGES];

// Setup readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Ask a question and get user input
 */
function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

/**
 * Console log with timestamp
 */
function log(message, type = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = {
    info: `${colors.blue}[INFO]${colors.reset}`,
    success: `${colors.green}[SUCCESS]${colors.reset}`,
    error: `${colors.red}[ERROR]${colors.reset}`,
    warning: `${colors.yellow}[WARNING]${colors.reset}`
  }[type] || `${colors.blue}[INFO]${colors.reset}`;
  
  console.log(`${colors.dim}[${timestamp}]${colors.reset} ${prefix} ${message}`);
}

/**
 * Make a request to the Datadog API
 */
async function datadogApiRequest(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.datadoghq.com',
      path: `/api/v1/${endpoint}`,
      method: method,
      headers: {
        'DD-API-KEY': DD_API_KEY,
        'DD-APPLICATION-KEY': DD_APP_KEY,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }
    
    const req = https.request(options, res => {
      let responseData = '';
      
      res.on('data', chunk => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(responseData));
          } catch (error) {
            resolve(responseData);
          }
        } else {
          reject(new Error(`API returned status ${res.statusCode}: ${responseData}`));
        }
      });
    });
    
    req.on('error', error => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Get all Datadog Synthetics tests
 */
async function getSyntheticsTests() {
  try {
    return await datadogApiRequest('synthetics/tests');
  } catch (error) {
    log(`Failed to fetch Datadog Synthetics tests: ${error.message}`, 'error');
    return [];
  }
}

/**
 * Create a Datadog Synthetics test
 */
async function createSyntheticsTest(name, url, tags = []) {
  try {
    const testConfig = {
      name: name,
      type: 'browser',
      config: {
        request: {
          method: 'GET',
          url: url
        },
        assertions: [
          { type: 'statusCode', operator: 'is', target: 200 }
        ],
        variables: [],
        device_ids: ['chrome.laptop_large'],
        steps: [
          {
            name: `Navigate to ${name}`,
            type: 'goToUrl',
            url: url,
            timeout: 30000,
            allowFailure: false
          }
        ]
      },
      message: `${name} is not responding correctly`,
      tags: ['ai-tools-lab', ...tags],
      status: 'live', 
      locations: ['aws:us-east-1'],
      options: {
        tick_every: 300,
        min_failure_duration: 0,
        min_location_failed: 1,
        retry: { count: 2, interval: 300 },
        monitor_options: {
          renotify_interval: 120,
          notify_audit: true
        }
      }
    };
    
    return await datadogApiRequest('synthetics/tests/browser', 'POST', testConfig);
  } catch (error) {
    log(`Failed to create test ${name}: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Use Ollama to solve a problem
 */
async function askOllama(prompt) {
  log('Consulting Ollama with llama3.2 model...');
  
  return new Promise((resolve, reject) => {
    try {
      const ollamaProcess = spawn('ollama', ['run', 'llama3.2', prompt]);
      let output = '';
      
      ollamaProcess.stdout.on('data', data => {
        const chunk = data.toString();
        process.stdout.write(chunk);
        output += chunk;
      });
      
      ollamaProcess.stderr.on('data', data => {
        process.stderr.write(data.toString());
      });
      
      ollamaProcess.on('close', code => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Ollama process exited with code ${code}`));
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Use Aider to fix code issues
 */
async function useAider(filePath, instruction) {
  log(`Using Aider to fix ${path.basename(filePath)}...`);
  
  return new Promise((resolve, reject) => {
    try {
      const aiderProcess = spawn('aider', [filePath], { stdio: 'inherit' });
      
      // Send the instruction to Aider's stdin
      aiderProcess.stdin.write(`${instruction}\n`);
      
      aiderProcess.on('close', code => {
        if (code === 0) {
          resolve(true);
        } else {
          reject(new Error(`Aider process exited with code ${code}`));
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Create Vitest file for browser validation
 */
async function createVitestBrowserValidation() {
  const vitestFilePath = path.join(__dirname, 'browser-validation.test.js');
  
  const testContent = `
/**
 * Browser Validation Tests with Vitest and Puppeteer
 * Generated by cli-datadog-validator.js
 */
// @ts-check
const { test, describe, expect, beforeAll, afterAll } = require('vitest');
const puppeteer = require('puppeteer');

// URLs configuration
const URLS = {
  production: {
    home: 'https://ai-tools-lab.com/',
    about: 'https://ai-tools-lab.com/pages/about',
    resources: 'https://ai-tools-lab.com/pages/resources',
    observations: 'https://ai-tools-lab.com/pages/observations',
    ep01: 'https://ai-tools-lab.com/pages/ep01'
  },
  test: {
    home: 'https://ai-tools-lab-tst.netlify.app/',
    about: 'https://ai-tools-lab-tst.netlify.app/pages/about',
    resources: 'https://ai-tools-lab-tst.netlify.app/resources',
    observations: 'https://ai-tools-lab-tst.netlify.app/observations',
    ep01: 'https://ai-tools-lab-tst.netlify.app/pages/ep01'
  }
};

let browser;
let page;

beforeAll(async () => {
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });
  page = await browser.newPage();
});

afterAll(async () => {
  await browser.close();
});

describe('Production Environment Validation', () => {
  test('Homepage should be accessible and contain navigation', async () => {
    await page.goto(URLS.production.home, { waitUntil: 'networkidle0' });
    
    const title = await page.title();
    expect(title).toContain('AI Tools Lab');
    
    const hasNavigation = await page.evaluate(() => {
      return !!document.querySelector('nav');
    });
    expect(hasNavigation).toBe(true);
  });
  
  test('Resources page should contain resource cards', async () => {
    await page.goto(URLS.production.resources, { waitUntil: 'networkidle0' });
    
    const resourceCards = await page.evaluate(() => {
      return document.querySelectorAll('.resource-card').length;
    });
    
    expect(resourceCards).toBeGreaterThan(0);
  });
});

describe('Test Environment Validation', () => {
  test('Test environment homepage should match production structure', async () => {
    // First check production
    await page.goto(URLS.production.home, { waitUntil: 'networkidle0' });
    const prodNavItems = await page.evaluate(() => {
      return document.querySelectorAll('nav a').length;
    });
    
    // Then check test environment
    await page.goto(URLS.test.home, { waitUntil: 'networkidle0' });
    const testNavItems = await page.evaluate(() => {
      return document.querySelectorAll('nav a').length;
    });
    
    expect(testNavItems).toBe(prodNavItems);
  });
});
`;
  
  fs.writeFileSync(vitestFilePath, testContent);
  log(`Created Vitest browser validation file: ${vitestFilePath}`, 'success');
  return vitestFilePath;
}

/**
 * Run Vitest for browser validation
 */
async function runVitestValidation(vitestFilePath) {
  log('Running browser validation with Vitest and Puppeteer...');
  
  try {
    execSync(`npx vitest run ${vitestFilePath}`, { stdio: 'inherit' });
    log('Browser validation tests passed!', 'success');
    return true;
  } catch (error) {
    log(`Browser validation tests failed: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Validate URLs in both environments
 */
async function validateUrls() {
  log('Validating URLs in both environments...');
  
  const results = {
    production: { success: 0, failure: 0, urls: [] },
    test: { success: 0, failure: 0, urls: [] }
  };
  
  // Test production URLs
  for (const page of ALL_PAGES) {
    const url = `${BASE_URLS.production}${page.path}`;
    try {
      // Use Node.js https.get instead of fetch which may not be available
      const checkUrl = (url) => {
        return new Promise((resolve, reject) => {
          const lib = url.startsWith('https') ? require('https') : require('http');
          const request = lib.get(url, (response) => {
            resolve({
              ok: response.statusCode >= 200 && response.statusCode < 300,
              status: response.statusCode
            });
          });
          request.on('error', (err) => reject(err));
        });
      };
      
      const response = await checkUrl(url);
      if (response.ok) {
        results.production.success++;
        results.production.urls.push({ name: page.name, url, status: response.status });
        log(`✅ Production ${page.name}: ${url}`, 'success');
      } else {
        results.production.failure++;
        results.production.urls.push({ name: page.name, url, status: response.status });
        log(`❌ Production ${page.name}: ${url} - Status ${response.status}`, 'error');
      }
    } catch (error) {
      results.production.failure++;
      results.production.urls.push({ name: page.name, url, error: error.message });
      log(`❌ Production ${page.name}: ${url} - ${error.message}`, 'error');
    }
  }
  
  // Test staging URLs
  for (const page of ALL_PAGES) {
    const testPath = page.testPath || page.path;
    const url = `${BASE_URLS.test}${testPath}`;
    try {
      // Use the same checkUrl helper for test environment
      const checkUrl = (url) => {
        return new Promise((resolve, reject) => {
          const lib = url.startsWith('https') ? require('https') : require('http');
          const request = lib.get(url, (response) => {
            resolve({
              ok: response.statusCode >= 200 && response.statusCode < 300,
              status: response.statusCode
            });
          });
          request.on('error', (err) => reject(err));
        });
      };
      
      const response = await checkUrl(url);
      if (response.ok) {
        results.test.success++;
        results.test.urls.push({ name: page.name, url, status: response.status });
        log(`✅ Test ${page.name}: ${url}`, 'success');
      } else {
        results.test.failure++;
        results.test.urls.push({ name: page.name, url, status: response.status });
        log(`❌ Test ${page.name}: ${url} - Status ${response.status}`, 'error');
      }
    } catch (error) {
      results.test.failure++;
      results.test.urls.push({ name: page.name, url, error: error.message });
      log(`❌ Test ${page.name}: ${url} - ${error.message}`, 'error');
    }
  }
  
  return results;
}

/**
 * Create Datadog Synthetics tests for all valid URLs
 */
async function createSyntheticsTests(urlResults) {
  log('Creating Datadog Synthetics tests for validated URLs...');
  
  const existingTests = await getSyntheticsTests();
  const existingTestNames = existingTests.map(test => test.name);
  
  // Create tests for production URLs
  let createdCount = 0;
  for (const urlData of urlResults.production.urls) {
    if (urlData.status === 200) {
      const testName = `${urlData.name} Test`;
      
      if (existingTestNames.includes(testName)) {
        log(`Test already exists: ${testName}`, 'warning');
        continue;
      }
      
      log(`Creating test: ${testName} for ${urlData.url}`);
      const result = await createSyntheticsTest(testName, urlData.url, [
        'env:production', 
        `page:${urlData.name.toLowerCase().replace(/\s+/g, '-')}`
      ]);
      
      if (result) {
        createdCount++;
        log(`Created test: ${testName}`, 'success');
      }
    }
  }
  
  log(`Created ${createdCount} new Datadog Synthetics tests`, 'success');
  return createdCount;
}

/**
 * Use MCP Puppeteer for visual validation
 */
async function visualValidation() {
  log('Creating visual validation script...');
  
  const puppeteerScript = path.join(__dirname, 'visual-validation-mcp.js');
  const scriptContent = `
#!/usr/bin/env node

/**
 * Visual Validation using MCP Puppeteer
 * This is designed to be used with the MCP Puppeteer API
 */

// This script is meant to be used with the MCP Puppeteer feature
// When running without MCP, import puppeteer directly
const puppeteer = require('puppeteer');

// URLs to validate
const URLS = {
  production: {
    home: 'https://ai-tools-lab.com/',
    about: 'https://ai-tools-lab.com/pages/about',
    resources: 'https://ai-tools-lab.com/pages/resources'
  },
  test: {
    home: 'https://ai-tools-lab-tst.netlify.app/',
    about: 'https://ai-tools-lab-tst.netlify.app/pages/about',
    resources: 'https://ai-tools-lab-tst.netlify.app/resources'
  }
};

/**
 * Main function to run visual validation
 */
async function runVisualValidation() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Validate production homepage
    console.log('Validating production homepage...');
    await page.goto(URLS.production.home, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'production-home.png' });
    
    // Check for key elements
    const hasNavigation = await page.evaluate(() => {
      return Boolean(document.querySelector('nav'));
    });
    
    console.log('Navigation present: ' + (hasNavigation ? 'Yes' : 'No'));
    
    // Validate test homepage and compare to production
    console.log('Validating test homepage...');
    await page.goto(URLS.test.home, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'test-home.png' });
    
    // Check for same elements
    const testHasNavigation = await page.evaluate(() => {
      return Boolean(document.querySelector('nav'));
    });
    
    console.log('Test navigation present: ' + (testHasNavigation ? 'Yes' : 'No'));
    console.log('Navigation consistency: ' + (hasNavigation === testHasNavigation ? 'Consistent' : 'Inconsistent'));
    
    // Validate resources page
    console.log('Validating resources pages...');
    await page.goto(URLS.production.resources, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'production-resources.png' });
    
    await page.goto(URLS.test.resources, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'test-resources.png' });
    
    console.log('Visual validation completed successfully!');
  } finally {
    await browser.close();
  }
}

// Run the visual validation
runVisualValidation().catch(error => {
  console.error('Error during visual validation:', error);
  process.exit(1);
});
`;
  
  fs.writeFileSync(puppeteerScript, scriptContent);
  fs.chmodSync(puppeteerScript, '755');
  
  log(`Created MCP Puppeteer visual validation script: ${puppeteerScript}`, 'success');
  log('Running visual validation...');
  
  try {
    execSync(`node ${puppeteerScript}`, { stdio: 'inherit' });
    log('Visual validation completed successfully!', 'success');
    return true;
  } catch (error) {
    log(`Visual validation failed: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  log(`${colors.blue}${colors.bright}CLI-DRIVEN DATADOG SYNTHETICS VALIDATOR${colors.reset}`);
  log(`${colors.blue}========================================${colors.reset}\n`);
  
  // Check API credentials
  if (!DD_API_KEY || !DD_APP_KEY) {
    log('Datadog API credentials not found!', 'error');
    log('Please set DD_API_KEY and DD_APP_KEY environment variables.', 'error');
    process.exit(1);
  }
  
  try {
    // Step 1: Validate URLs in both environments
    log('Step 1: Validating URLs in both environments...');
    const urlResults = await validateUrls();
    
    // Print summary
    log('\nURL Validation Summary:');
    log(`Production: ${urlResults.production.success} successful, ${urlResults.production.failure} failed`);
    log(`Test: ${urlResults.test.success} successful, ${urlResults.test.failure} failed\n`);
    
    // Step 2: Create Vitest browser validation
    log('Step 2: Setting up browser validation with Vitest...');
    const vitestFilePath = await createVitestBrowserValidation();
    
    // Step 3: Run Vitest validation
    log('Step 3: Running browser validation tests...');
    const vitestSuccess = await runVitestValidation(vitestFilePath);
    
    if (!vitestSuccess) {
      const fixTests = await askQuestion('\nVitest tests failed. Would you like to use Ollama to help fix the issues? (y/n) ');
      
      if (fixTests.toLowerCase() === 'y') {
        const prompt = `I'm trying to validate web pages in an application called AI Tools Lab. The Vitest tests are failing. The failed tests are checking if these elements exist: 'nav', '.resource-card'. Can you suggest what might be wrong and how to fix my tests?`;
        
        await askOllama(prompt);
      }
    }
    
    // Step 4: Visual validation with MCP Puppeteer
    log('Step 4: Running visual validation with MCP Puppeteer...');
    await visualValidation();
    
    // Step 5: Create Datadog Synthetics tests
    log('Step 5: Creating Datadog Synthetics tests...');
    const createdCount = await createSyntheticsTests(urlResults);
    
    if (createdCount === 0 && urlResults.production.failure > 0) {
      const fixUrl = await askQuestion('\nSome URLs failed validation. Would you like to use Aider to fix URL issues? (y/n) ');
      
      if (fixUrl.toLowerCase() === 'y') {
        await useAider(
          path.join(__dirname, 'dual-environment-validator.js'),
          'Please fix the URL patterns to match the correct structure for both production and test environments.'
        );
      }
    }
    
    log('\nDatadog Synthetics validation and setup completed!', 'success');
  } catch (error) {
    log(`An error occurred: ${error.message}`, 'error');
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
main().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});
