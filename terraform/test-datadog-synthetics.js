/**
 * Test Script for Datadog Synthetics Configuration
 * 
 * This script does two important things:
 * 1. Validates the Terraform configuration for Datadog Synthetics
 * 2. Tests the actual browser checks against target URLs
 * 
 * This follows Google staff engineer practices of testing configurations
 * before deployment and ensuring correctness across environments.
 */

require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const puppeteer = require('puppeteer');

// Extract Datadog credentials from environment variables
const DD_API_KEY = process.env.DD_API_KEY || process.env.TF_VAR_datadog_api_key;
const DD_APP_KEY = process.env.DD_APP_KEY || process.env.TF_VAR_datadog_app_key;

// Constants
const TERRAFORM_FILE = path.join(__dirname, 'datadog_synthetics.tf');
const PRODUCTION_URL = 'https://ai-tools-lab.com';
const STAGING_URL = 'https://ai-tools-lab-tst.netlify.app';

// Colors for console output
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

/**
 * Main function to validate and test the Datadog Synthetics configuration
 */
async function main() {
  console.log(`${colors.blue}========================================================${colors.reset}`);
  console.log(`${colors.blue}${colors.bright} Datadog Synthetics Configuration Validator${colors.reset}`);
  console.log(`${colors.blue}========================================================${colors.reset}\n`);
  
  // Step 1: Check for required credentials
  validateEnvironment();
  
  // Step 2: Validate Terraform configuration file
  validateTerraformConfiguration();
  
  // Step 3: Extract routes and tests from Terraform config
  const testsConfig = extractTestsFromTerraform();
  
  // Step 4: Run actual browser tests against target URLs
  await runBrowserTests(testsConfig);
}

/**
 * Validates that required environment variables are set
 */
function validateEnvironment() {
  console.log(`${colors.blue}Checking environment configuration...${colors.reset}`);
  
  if (!DD_API_KEY) {
    console.warn(`${colors.yellow}⚠️ Warning: DD_API_KEY or TF_VAR_datadog_api_key not set${colors.reset}`);
    console.warn(`${colors.yellow}  Set this in your environment or .env file for production use${colors.reset}\n`);
  } else {
    console.log(`${colors.green}✅ Datadog API key found${colors.reset}`);
  }
  
  if (!DD_APP_KEY) {
    console.warn(`${colors.yellow}⚠️ Warning: DD_APP_KEY or TF_VAR_datadog_app_key not set${colors.reset}`);
    console.warn(`${colors.yellow}  Set this in your environment or .env file for production use${colors.reset}\n`);
  } else {
    console.log(`${colors.green}✅ Datadog APP key found${colors.reset}`);
  }
  
  console.log(`${colors.green}Environment check complete${colors.reset}\n`);
}

/**
 * Validates the Terraform configuration file
 */
function validateTerraformConfiguration() {
  console.log(`${colors.blue}Validating Terraform configuration...${colors.reset}`);
  
  try {
    // Check if the Terraform file exists
    if (!fs.existsSync(TERRAFORM_FILE)) {
      console.error(`${colors.red}❌ Error: Terraform file not found at ${TERRAFORM_FILE}${colors.reset}`);
      process.exit(1);
    }
    
    // Read the file content
    const terraformContent = fs.readFileSync(TERRAFORM_FILE, 'utf8');
    
    // Perform basic validation
    validateTerraformSyntax(terraformContent);
    
    console.log(`${colors.green}✅ Terraform configuration is valid${colors.reset}\n`);
  } catch (error) {
    console.error(`${colors.red}❌ Error validating Terraform configuration: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Basic syntax validation for Terraform content
 */
function validateTerraformSyntax(content) {
  // Check for required provider section
  if (!content.includes('provider "datadog"')) {
    console.error(`${colors.red}❌ Error: Datadog provider not defined in Terraform config${colors.reset}`);
    process.exit(1);
  }
  
  // Check for synthetics test resources
  if (!content.includes('resource "datadog_synthetics_test"')) {
    console.error(`${colors.red}❌ Error: No Datadog Synthetics tests defined in Terraform config${colors.reset}`);
    process.exit(1);
  }
  
  // Check for variables
  if (!content.includes('variable "datadog_api_key"') || !content.includes('variable "datadog_app_key"')) {
    console.warn(`${colors.yellow}⚠️ Warning: Datadog API or APP key variables not properly defined${colors.reset}`);
  }
}

/**
 * Extract test configurations from Terraform file
 */
function extractTestsFromTerraform() {
  console.log(`${colors.blue}Extracting test configurations from Terraform...${colors.reset}`);
  
  try {
    const terraformContent = fs.readFileSync(TERRAFORM_FILE, 'utf8');
    
    // Extract standard pages
    const standardPages = extractStandardPagesFromTerraform(terraformContent);
    console.log(`${colors.green}✅ Found ${standardPages.length} standard page tests${colors.reset}`);
    
    // Extract episode pages
    const episodePages = extractEpisodePagesFromTerraform(terraformContent);
    console.log(`${colors.green}✅ Found ${episodePages.length} episode page tests${colors.reset}`);
    
    // Combine all tests
    const allTests = [
      ...standardPages,
      ...episodePages
    ];
    
    console.log(`${colors.green}✅ Total test configurations extracted: ${allTests.length}${colors.reset}\n`);
    
    return allTests;
  } catch (error) {
    console.error(`${colors.red}❌ Error extracting test configurations: ${error.message}${colors.reset}`);
    return [];
  }
}

/**
 * Extract standard page tests from Terraform content
 */
function extractStandardPagesFromTerraform(content) {
  const standardPages = [];
  
  // Find homepage test
  if (content.includes('resource "datadog_synthetics_test" "homepage"')) {
    standardPages.push({ 
      name: 'Homepage',
      route: 'home',
      productionPath: '/',
      stagingPath: '/',
      selectors: ['.episode-grid', 'nav', 'header', 'footer']
    });
  }
  
  // Find about page test
  if (content.includes('resource "datadog_synthetics_test" "about"')) {
    standardPages.push({ 
      name: 'About Page',
      route: 'about',
      productionPath: '/pages/about',
      stagingPath: '/about',
      selectors: ['.about-content', 'header', 'footer']
    });
  }
  
  // Find resources page test
  if (content.includes('resource "datadog_synthetics_test" "resources"')) {
    standardPages.push({ 
      name: 'Resources Page',
      route: 'resources',
      productionPath: '/pages/resources',
      stagingPath: '/resources',
      selectors: ['.resource-cards', '.resource-card', 'header', 'footer']
    });
  }
  
  // Find observations page test
  if (content.includes('resource "datadog_synthetics_test" "observations"')) {
    standardPages.push({ 
      name: 'Observations Page',
      route: 'observations',
      productionPath: '/pages/observations',
      stagingPath: '/observations',
      selectors: ['.observations-content', 'header', 'footer']
    });
  }
  
  return standardPages;
}

/**
 * Extract episode page tests from Terraform content
 */
function extractEpisodePagesFromTerraform(content) {
  const episodePages = [];
  
  // Extract episode pages list
  const episodeListMatch = content.match(/episode_pages\s*=\s*\[([^\]]*)\]/s);
  if (!episodeListMatch) return [];
  
  const episodeListStr = episodeListMatch[1];
  const episodeMatches = episodeListStr.match(/"ep\d+"/g) || [];
  
  episodeMatches.forEach(epMatch => {
    const episode = epMatch.replace(/"/g, '');
    episodePages.push({
      name: `Episode Page - ${episode}`,
      route: episode,
      productionPath: `/pages/${episode}`,
      stagingPath: `/${episode}`,
      selectors: ['.episode-content', '.episode-navigation', 'header', 'footer']
    });
  });
  
  return episodePages;
}

/**
 * Run browser tests against target URLs
 */
async function runBrowserTests(tests) {
  console.log(`${colors.blue}Running browser tests against target environments...${colors.reset}\n`);
  
  // Ask which environment to test
  const envToTest = process.argv[2] || 'staging';
  const baseUrl = envToTest === 'production' ? PRODUCTION_URL : STAGING_URL;
  
  console.log(`${colors.cyan}Testing against ${envToTest} environment: ${baseUrl}${colors.reset}\n`);
  
  // Initialize results tracking
  const results = {
    passed: 0,
    failed: 0,
    details: []
  };
  
  // Launch browser for tests
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Run tests sequentially (to avoid overloading the server)
    for (const test of tests) {
      const testResult = await runSingleBrowserTest(browser, test, baseUrl, envToTest);
      
      if (testResult.passed) {
        results.passed++;
      } else {
        results.failed++;
      }
      
      results.details.push(testResult);
    }
  } finally {
    await browser.close();
  }
  
  // Print summary
  printTestResults(results);
}

/**
 * Run a single browser test for a specific page
 */
async function runSingleBrowserTest(browser, test, baseUrl, environment) {
  const testResult = {
    name: test.name,
    route: test.route,
    passed: false,
    errors: [],
    url: ''
  };
  
  // Determine the correct URL path based on environment
  const urlPath = environment === 'production' ? test.productionPath : test.stagingPath;
  const fullUrl = baseUrl + urlPath;
  testResult.url = fullUrl;
  
  console.log(`${colors.blue}Testing ${test.name} at ${fullUrl}${colors.reset}`);
  
  try {
    // Create a new page for this test
    const page = await browser.newPage();
    await page.setDefaultTimeout(15000); // 15 second timeout
    
    // Navigate to the URL
    const startTime = Date.now();
    const response = await page.goto(fullUrl, { waitUntil: 'networkidle0' });
    const loadTime = Date.now() - startTime;
    
    // Check response status
    if (!response || response.status() !== 200) {
      testResult.errors.push(`Page returned status code ${response ? response.status() : 'unknown'}`);
    }
    
    // Check for required elements
    for (const selector of test.selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
      } catch (error) {
        testResult.errors.push(`Element '${selector}' not found on page`);
      }
    }
    
    // Take a screenshot for reference
    const screenshotDir = path.join(__dirname, '../tests/synthetics-screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    const screenshotPath = path.join(screenshotDir, `${environment}-${test.route}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    // Close the page
    await page.close();
    
    // Check if test passed
    if (testResult.errors.length === 0) {
      testResult.passed = true;
      console.log(`${colors.green}✅ ${test.name} passed in ${loadTime}ms${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ ${test.name} failed: ${testResult.errors.join('; ')}${colors.reset}`);
    }
  } catch (error) {
    testResult.errors.push(`Test execution error: ${error.message}`);
    console.log(`${colors.red}❌ ${test.name} failed: ${error.message}${colors.reset}`);
  }
  
  return testResult;
}

/**
 * Print test results summary
 */
function printTestResults(results) {
  console.log(`\n${colors.blue}========================================================${colors.reset}`);
  console.log(`${colors.blue}${colors.bright} Test Results Summary${colors.reset}`);
  console.log(`${colors.blue}========================================================${colors.reset}\n`);
  
  console.log(`${colors.bright}Total tests: ${results.passed + results.failed}${colors.reset}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}\n`);
  
  if (results.failed > 0) {
    console.log(`${colors.yellow}Failed Tests:${colors.reset}`);
    results.details
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`${colors.red}- ${test.name} (${test.url}):${colors.reset}`);
        test.errors.forEach(error => {
          console.log(`  - ${error}`);
        });
      });
  }
  
  console.log(`\n${colors.blue}Test complete. Screenshots saved to ../tests/synthetics-screenshots/${colors.reset}`);
  
  if (results.failed === 0) {
    console.log(`\n${colors.green}${colors.bright}✅ ALL TESTS PASSED - READY FOR TERRAFORM DEPLOYMENT${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}${colors.bright}⚠️ SOME TESTS FAILED - REVIEW BEFORE DEPLOYING${colors.reset}`);
  }
}

// Run the main function
main().catch(error => {
  console.error(`${colors.red}Error in main process: ${error.message}${colors.reset}`);
  process.exit(1);
});
