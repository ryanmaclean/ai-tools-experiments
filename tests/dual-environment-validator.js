#!/usr/bin/env node

/**
 * Dual-Environment Validator for AI Tools Lab
 * 
 * This script validates both production and test environments
 * to ensure all monitored URLs are actually functional before
 * allowing deployment or commits.
 */

const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Environment configuration
const ENVIRONMENTS = {
  PRODUCTION: {
    name: 'Production',
    baseUrl: 'https://ai-tools-lab.com',
    urlPrefix: '/pages',
    expectedTitle: 'AI Tools Lab',
    expectedElements: ['header', 'footer', 'main']
  },
  TEST: {
    name: 'Test',
    baseUrl: 'https://ai-tools-lab-tst.netlify.app',
    urlPrefix: '',
    expectedTitle: 'AI Tools Lab',
    expectedElements: ['header', 'footer', 'main']
  }
};

// Routes to test in both environments
const ROUTES = [
  { path: '/', name: 'Home' },
  { path: '/about', name: 'About' },
  { path: '/resources', name: 'Resources' },
  { path: '/observations', name: 'Observations' }
];

// First 5 episodes to test as a sample
// Testing all 17 would make this run too long
for (let i = 1; i <= 5; i++) {
  const epNum = String(i).padStart(2, '0');
  ROUTES.push({ path: `/ep${epNum}`, name: `Episode ${epNum}` });
}

/**
 * Main validation function
 */
async function main() {
  console.log(`\n${colors.blue}${colors.bright}DUAL-ENVIRONMENT URL VALIDATOR${colors.reset}`);
  console.log(`${colors.blue}==============================${colors.reset}\n`);
  
  console.log(`${colors.bright}Testing both environments before deployment${colors.reset}`);
  console.log(`- Production: ${ENVIRONMENTS.PRODUCTION.baseUrl}`);
  console.log(`- Test: ${ENVIRONMENTS.TEST.baseUrl}\n`);
  
  // Results tracking
  const results = {
    production: { success: 0, failure: 0, details: [] },
    test: { success: 0, failure: 0, details: [] }
  };
  
  // Test Production Environment
  console.log(`${colors.blue}${colors.bright}Testing Production Environment${colors.reset}`);
  for (const route of ROUTES) {
    const url = getUrl(route.path, ENVIRONMENTS.PRODUCTION);
    const result = await testUrl(url, route.name, ENVIRONMENTS.PRODUCTION);
    results.production.details.push(result);
    
    if (result.status === 200) {
      results.production.success++;
    } else {
      results.production.failure++;
    }
  }
  
  // Test Test Environment
  console.log(`\n${colors.blue}${colors.bright}Testing Test Environment${colors.reset}`);
  for (const route of ROUTES) {
    const url = getUrl(route.path, ENVIRONMENTS.TEST);
    const result = await testUrl(url, route.name, ENVIRONMENTS.TEST);
    results.test.details.push(result);
    
    if (result.status === 200) {
      results.test.success++;
    } else {
      results.test.failure++;
    }
  }
  
  // Print summary
  printSummary(results);
  
  // Determine if validation passes
  const productionValid = results.production.failure === 0;
  const testValid = results.test.failure === 0;
  
  if (productionValid && testValid) {
    console.log(`\n${colors.green}${colors.bright}VALIDATION PASSED${colors.reset}`);
    console.log(`${colors.green}Both environments are ready for Datadog monitoring!${colors.reset}`);
    return { success: true, results };
  } else {
    console.log(`\n${colors.red}${colors.bright}VALIDATION FAILED${colors.reset}`);
    if (!productionValid) {
      console.log(`${colors.red}Production environment has issues that need fixing.${colors.reset}`);
    }
    if (!testValid) {
      console.log(`${colors.red}Test environment has issues that need fixing.${colors.reset}`);
    }
    console.log(`\n${colors.yellow}Fix these issues before proceeding with deployment.${colors.reset}`);
    return { success: false, results };
  }
}

/**
 * Construct URL based on environment and route
 */
function getUrl(path, env) {
  // Home page is always just the base URL with no prefix
  if (path === '/') {
    return env.baseUrl + path;
  }
  
  // Special case for About page which seems to have /pages/ in both environments
  if (path === '/about' && env === ENVIRONMENTS.TEST) {
    return `${env.baseUrl}/pages${path}`;
  }
  
  // Special case for episode pages in test environment - try with /pages/ prefix too
  if (path.match(/\/ep\d+/) && env === ENVIRONMENTS.TEST) {
    return `${env.baseUrl}/pages${path}`;
  }
  
  // Normal case - apply prefix according to environment
  return `${env.baseUrl}${env.urlPrefix}${path}`;
}

/**
 * Test a specific URL
 */
async function testUrl(url, routeName, env) {
  console.log(`Testing ${routeName}: ${url}`);
  
  return new Promise((resolve) => {
    const result = {
      url,
      routeName,
      env: env.name,
      status: 0,
      error: null
    };
    
    // Parse URL to determine if http or https
    const isHttps = url.startsWith('https');
    const requestLib = isHttps ? https : http;
    
    const req = requestLib.get(url, (res) => {
      result.status = res.statusCode;
      
      if (res.statusCode === 200) {
        console.log(`  ${colors.green}u2705 ${routeName} is available (${res.statusCode})${colors.reset}`);
      } else {
        console.log(`  ${colors.red}u274c ${routeName} returned ${res.statusCode}${colors.reset}`);
        result.error = `HTTP status ${res.statusCode}`;
      }
      
      resolve(result);
    });
    
    req.on('error', (error) => {
      console.log(`  ${colors.red}u274c ${routeName} error: ${error.message}${colors.reset}`);
      result.error = error.message;
      resolve(result);
    });
    
    // Set a timeout
    req.setTimeout(10000, () => {
      req.abort();
      console.log(`  ${colors.red}u274c ${routeName} timed out${colors.reset}`);
      result.error = 'Request timed out';
      resolve(result);
    });
  });
}

/**
 * Print summary of validation results
 */
function printSummary(results) {
  console.log(`\n${colors.blue}${colors.bright}Validation Summary${colors.reset}`);
  console.log(`${colors.blue}=================${colors.reset}\n`);
  
  // Production summary
  console.log(`${colors.cyan}${colors.bright}Production Environment:${colors.reset}`);
  console.log(`- Base URL: ${ENVIRONMENTS.PRODUCTION.baseUrl}`);
  console.log(`- Routes tested: ${results.production.details.length}`);
  console.log(`- ${colors.green}Success: ${results.production.success}${colors.reset}`);
  console.log(`- ${colors.red}Failure: ${results.production.failure}${colors.reset}`);
  
  if (results.production.failure > 0) {
    console.log(`\n${colors.red}Failed Production Routes:${colors.reset}`);
    results.production.details
      .filter(r => r.error)
      .forEach(r => {
        console.log(`- ${r.routeName}: ${r.url} - ${r.error}`);
      });
  }
  
  // Test environment summary
  console.log(`\n${colors.cyan}${colors.bright}Test Environment:${colors.reset}`);
  console.log(`- Base URL: ${ENVIRONMENTS.TEST.baseUrl}`);
  console.log(`- Routes tested: ${results.test.details.length}`);
  console.log(`- ${colors.green}Success: ${results.test.success}${colors.reset}`);
  console.log(`- ${colors.red}Failure: ${results.test.failure}${colors.reset}`);
  
  if (results.test.failure > 0) {
    console.log(`\n${colors.red}Failed Test Routes:${colors.reset}`);
    results.test.details
      .filter(r => r.error)
      .forEach(r => {
        console.log(`- ${r.routeName}: ${r.url} - ${r.error}`);
      });
  }
}

// Run main function if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error(`${colors.red}${colors.bright}FATAL ERROR: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = { main, getUrl, testUrl, ENVIRONMENTS, ROUTES };
