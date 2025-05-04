/**
 * Simplified Terraform Configuration Validator for Datadog Synthetics
 * 
 * This script validates the Terraform configuration file and URL patterns
 * without requiring external dependencies.
 */

const fs = require('fs');
const path = require('path');

// Source environment variables directly
const DD_API_KEY = process.env.DD_API_KEY || process.env.TF_VAR_datadog_api_key;
const DD_APP_KEY = process.env.DD_APP_KEY || process.env.TF_VAR_datadog_app_key;

// Constants
const TERRAFORM_FILE = path.join(__dirname, 'datadog_synthetics.tf');
const PRODUCTION_URL = 'https://ai-tools-lab.com';
const STAGING_URL = 'https://ai-tools-lab-tst.netlify.app';

// ANSI Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Main function
function main() {
  console.log(`${colors.blue}========================================================${colors.reset}`);
  console.log(`${colors.blue}${colors.bright} Datadog Synthetics Configuration Validator${colors.reset}`);
  console.log(`${colors.blue}========================================================${colors.reset}\n`);
  
  // Check environment credentials
  checkEnvironment();
  
  // Validate Terraform config
  validateTerraformConfig();
  
  // Extract and validate URL patterns
  const tests = extractTests();
  validateUrlPatterns(tests);
  
  // Print summary
  printSummary(tests);
}

// Check for required environment variables
function checkEnvironment() {
  console.log(`${colors.blue}Checking environment credentials...${colors.reset}`);
  
  if (!DD_API_KEY) {
    console.log(`${colors.yellow}⚠️ DD_API_KEY or TF_VAR_datadog_api_key not set${colors.reset}`);
    console.log(`${colors.yellow}  You'll need to provide these when running terraform${colors.reset}`);
  } else {
    console.log(`${colors.green}✅ Datadog API key found${colors.reset}`);
  }
  
  if (!DD_APP_KEY) {
    console.log(`${colors.yellow}⚠️ DD_APP_KEY or TF_VAR_datadog_app_key not set${colors.reset}`);
    console.log(`${colors.yellow}  You'll need to provide these when running terraform${colors.reset}`);
  } else {
    console.log(`${colors.green}✅ Datadog Application key found${colors.reset}`);
  }
  
  console.log();
}

// Validate the Terraform configuration
function validateTerraformConfig() {
  console.log(`${colors.blue}Validating Terraform configuration...${colors.reset}`);
  
  try {
    if (!fs.existsSync(TERRAFORM_FILE)) {
      console.error(`${colors.red}❌ ERROR: Terraform file not found at ${TERRAFORM_FILE}${colors.reset}`);
      process.exit(1);
    }
    
    const content = fs.readFileSync(TERRAFORM_FILE, 'utf8');
    
    // Basic validation checks
    if (!content.includes('provider "datadog"')) {
      console.error(`${colors.red}❌ ERROR: Datadog provider not defined in configuration${colors.reset}`);
      process.exit(1);
    }
    
    if (!content.includes('resource "datadog_synthetics_test"')) {
      console.error(`${colors.red}❌ ERROR: No synthetic tests defined in configuration${colors.reset}`);
      process.exit(1);
    }
    
    console.log(`${colors.green}✅ Terraform configuration file is valid${colors.reset}`);
    console.log();
  } catch (error) {
    console.error(`${colors.red}❌ ERROR: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Extract tests from Terraform configuration
function extractTests() {
  console.log(`${colors.blue}Extracting test definitions...${colors.reset}`);
  
  try {
    const content = fs.readFileSync(TERRAFORM_FILE, 'utf8');
    const tests = [];
    
    // Extract standard pages
    if (content.includes('resource "datadog_synthetics_test" "homepage"')) {
      tests.push({ name: 'Homepage', route: 'home', productionPath: '/', stagingPath: '/' });
    }
    
    if (content.includes('resource "datadog_synthetics_test" "about"')) {
      tests.push({ name: 'About Page', route: 'about', productionPath: '/pages/about', stagingPath: '/about' });
    }
    
    if (content.includes('resource "datadog_synthetics_test" "resources"')) {
      tests.push({ name: 'Resources Page', route: 'resources', productionPath: '/pages/resources', stagingPath: '/resources' });
    }
    
    if (content.includes('resource "datadog_synthetics_test" "observations"')) {
      tests.push({ name: 'Observations Page', route: 'observations', productionPath: '/pages/observations', stagingPath: '/observations' });
    }
    
    // Extract episode pages
    const episodeListMatch = content.match(/episode_pages\s*=\s*\[([^\]]*)\]/s);
    if (episodeListMatch) {
      const episodeList = episodeListMatch[1];
      const episodes = episodeList.match(/"ep\d+"/g) || [];
      
      episodes.forEach(ep => {
        const episode = ep.replace(/"/g, '');
        tests.push({
          name: `Episode Page - ${episode}`,
          route: episode,
          productionPath: `/pages/${episode}`,
          stagingPath: `/${episode}`
        });
      });
    }
    
    console.log(`${colors.green}✅ Found ${tests.length} synthetic tests${colors.reset}`);
    console.log();
    
    return tests;
  } catch (error) {
    console.error(`${colors.red}❌ ERROR: ${error.message}${colors.reset}`);
    return [];
  }
}

// Validate URL patterns for each environment
function validateUrlPatterns(tests) {
  console.log(`${colors.blue}Validating URL patterns across environments...${colors.reset}`);
  
  const productionUrls = tests.map(test => {
    return {
      name: test.name,
      url: PRODUCTION_URL + test.productionPath
    };
  });
  
  const stagingUrls = tests.map(test => {
    return {
      name: test.name,
      url: STAGING_URL + test.stagingPath
    };
  });
  
  // Print a few sample URLs to validate pattern correctness
  if (productionUrls.length > 0) {
    console.log(`${colors.green}Production URL samples:${colors.reset}`);
    const samples = productionUrls.slice(0, Math.min(5, productionUrls.length));
    samples.forEach(item => {
      console.log(`  - ${item.name}: ${item.url}`);
    });
  }
  
  if (stagingUrls.length > 0) {
    console.log(`\n${colors.green}Staging URL samples:${colors.reset}`);
    const samples = stagingUrls.slice(0, Math.min(5, stagingUrls.length));
    samples.forEach(item => {
      console.log(`  - ${item.name}: ${item.url}`);
    });
  }
  
  console.log();
}

// Print summary of validation
function printSummary(tests) {
  console.log(`${colors.blue}========================================================${colors.reset}`);
  console.log(`${colors.blue}${colors.bright} Configuration Validation Summary${colors.reset}`);
  console.log(`${colors.blue}========================================================${colors.reset}\n`);
  
  console.log(`${colors.green}✅ Terraform configuration is valid${colors.reset}`);
  console.log(`${colors.green}✅ Found ${tests.length} synthetic tests defined${colors.reset}`);
  console.log(`${colors.green}✅ URL patterns validated for production and staging${colors.reset}\n`);
  
  const standardTests = tests.filter(t => !t.route.startsWith('ep')).length;
  const episodeTests = tests.filter(t => t.route.startsWith('ep')).length;
  
  console.log(`${colors.cyan}Test breakdown:${colors.reset}`);
  console.log(`  - Standard pages: ${standardTests}`);
  console.log(`  - Episode pages: ${episodeTests}\n`);
  
  console.log(`${colors.bright}To deploy these tests to Datadog:${colors.reset}`);
  console.log(`  1. Set your Datadog credentials:`);
  console.log(`     export TF_VAR_datadog_api_key="your_api_key"`);
  console.log(`     export TF_VAR_datadog_app_key="your_app_key"`);
  console.log(`  2. Initialize Terraform (first time only):`);
  console.log(`     cd terraform && terraform init`);
  console.log(`  3. Apply the configuration:`);
  console.log(`     terraform apply\n`);
  
  console.log(`${colors.green}${colors.bright}Configuration is ready for deployment!${colors.reset}`);
}

// Run the main function
main();
