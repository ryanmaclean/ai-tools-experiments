/**
 * AI Tools Lab Visual Validation via Puppeteer MCP
 * 
 * This script uses Puppeteer directly through MCP for visual validation
 * before allowing commits and deployments. It tests key page elements
 * across all routes in both production and staging environments.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Color formatting for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Production vs. Staging URL handling
const ENV = {
  PRODUCTION: {
    base: 'https://ai-tools-lab.com',
    pathPrefix: '/pages',
    name: 'Production'
  },
  STAGING: {
    base: 'https://ai-tools-lab-tst.netlify.app',
    pathPrefix: '',
    name: 'Staging'
  }
};

// Routes to verify - this matches our 21 Synthetics tests
const ROUTES = [
  { path: '/', name: 'Home', selectors: ['.main-content, h1'] },
  { path: '/about', name: 'About', selectors: ['.about-content, article'] },
  { path: '/resources', name: 'Resources', selectors: ['.resource-cards, .resource-grid'] },
  { path: '/observations', name: 'Observations', selectors: ['.observations-content'] }
];

// Add episode routes
for (let i = 1; i <= 17; i++) {
  const epNum = String(i).padStart(2, '0');
  ROUTES.push({ 
    path: `/ep${epNum}`, 
    name: `Episode ${epNum}`, 
    selectors: ['.episode-content, article'] 
  });
}

// Main function
async function main() {
  console.log(`\n${colors.blue}${colors.bright}PUPPETEER VISUAL VALIDATION${colors.reset}`);
  console.log(`${colors.blue}============================${colors.reset}\n`);
  
  // Create screenshots directory if it doesn't exist
  const screenshotDir = path.join(__dirname, '../tests/validation-screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  
  // Determine environment to test
  const env = process.env.TEST_PRODUCTION === 'true' ? ENV.PRODUCTION : ENV.STAGING;
  console.log(`${colors.bright}Testing Environment: ${env.name}${colors.reset}`);
  console.log(`Base URL: ${env.base}\n`);
  
  try {
    // Launch browser
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Track results
    const results = {
      success: 0,
      failed: 0,
      details: [],
      routeMap: {}
    };
    
    try {
      // Test each route
      for (const route of ROUTES) {
        const result = await testRoute(browser, route, env, screenshotDir);
        
        if (result.success) {
          results.success++;
        } else {
          results.failed++;
        }
        
        results.details.push(result);
        results.routeMap[route.path] = result;
      }
      
      // Show summary
      printSummary(results);
      
      // Generate datadog-synthetics.json for use by pre-commit hook
      await generateSyntheticsConfig(results, env);
      
    } finally {
      await browser.close();
    }
    
    return results;
  } catch (error) {
    console.error(`${colors.red}ERROR: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Test a single route
async function testRoute(browser, route, env, screenshotDir) {
  // Determine full URL
  const url = getRouteUrl(route.path, env);
  console.log(`${colors.cyan}Testing ${route.name}: ${url}${colors.reset}`);
  
  const result = {
    name: route.name,
    path: route.path,
    url,
    success: false,
    errors: [],
    warnings: [],
    selectors: {},
    screenshotPath: ''
  };
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Visit the page
    const response = await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
    
    // Check status code
    if (!response) {
      result.errors.push('No response received');
    } else if (response.status() !== 200) {
      result.errors.push(`HTTP ${response.status()}: ${response.statusText()}`);
    }
    
    // Take screenshot
    const screenshotName = `${route.path.replace(/\//g, '-').replace(/^-/, '')}`;
    const screenshotPath = path.join(screenshotDir, `${screenshotName || 'home'}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    result.screenshotPath = screenshotPath;
    
    // Check for required global elements
    await testSelectors(page, ['header', 'footer', 'main'], result);
    
    // Check route-specific selectors
    if (route.selectors && route.selectors.length > 0) {
      await testSelectors(page, route.selectors, result);
    }
    
    // Check for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        result.warnings.push(`Console error: ${msg.text()}`);
      }
    });
    
    // Set success status
    result.success = result.errors.length === 0;
    
    if (result.success) {
      console.log(`${colors.green}✅ ${route.name} validated successfully${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ ${route.name} validation failed${colors.reset}`);
      result.errors.forEach(error => {
        console.log(`  ${colors.red}- ${error}${colors.reset}`);
      });
    }
    
    if (result.warnings.length > 0) {
      console.log(`${colors.yellow}  Warnings:${colors.reset}`);
      result.warnings.forEach(warning => {
        console.log(`  ${colors.yellow}- ${warning}${colors.reset}`);
      });
    }
    
    await page.close();
    return result;
  } catch (error) {
    result.errors.push(`Exception: ${error.message}`);
    console.log(`${colors.red}❌ ${route.name} validation failed: ${error.message}${colors.reset}`);
    return result;
  }
}

// Test if selectors exist on the page
async function testSelectors(page, selectors, result) {
  for (const selector of selectors) {
    try {
      // If selector contains commas, it's a list of alternative selectors
      const alternatives = selector.split(/\s*,\s*/);
      let found = false;
      
      for (const alt of alternatives) {
        try {
          await page.waitForSelector(alt, { timeout: 5000 });
          found = true;
          result.selectors[alt] = true;
          break;
        } catch (err) {
          // Try next alternative
          result.selectors[alt] = false;
        }
      }
      
      if (!found) {
        result.errors.push(`Element '${selector}' not found`);
      }
    } catch (error) {
      result.errors.push(`Selector error for '${selector}': ${error.message}`);
    }
  }
}

// Print summary of results
function printSummary(results) {
  console.log(`\n${colors.blue}${colors.bright}VALIDATION SUMMARY${colors.reset}`);
  console.log(`${colors.blue}=================${colors.reset}\n`);
  
  console.log(`${colors.bright}Routes tested: ${results.details.length}${colors.reset}`);
  console.log(`${colors.green}Routes passing: ${results.success}${colors.reset}`);
  console.log(`${colors.red}Routes failing: ${results.failed}${colors.reset}\n`);
  
  if (results.failed > 0) {
    console.log(`${colors.red}${colors.bright}Failed routes:${colors.reset}`);
    results.details
      .filter(result => !result.success)
      .forEach(result => {
        console.log(`${colors.red}- ${result.name}: ${result.url}${colors.reset}`);
        result.errors.forEach(error => {
          console.log(`  ${colors.red}  - ${error}${colors.reset}`);
        });
      });
      
    console.log(`\n${colors.red}${colors.bright}Please fix these issues before committing!${colors.reset}`);
    console.log(`${colors.yellow}Screenshots saved to: ${path.resolve(__dirname, '../tests/validation-screenshots')}${colors.reset}`);
  } else {
    console.log(`${colors.green}${colors.bright}All routes validated successfully!${colors.reset}`);
    console.log(`${colors.green}Your changes are ready for Datadog Synthetics monitoring.${colors.reset}`);
  }
}

// Generate Datadog Synthetics configuration file
async function generateSyntheticsConfig(results, env) {
  console.log(`\n${colors.blue}Generating Datadog Synthetics configuration...${colors.reset}`);
  
  // Create config object based on validation results
  const config = {
    env: env.name.toLowerCase(),
    baseUrl: env.base,
    pathPrefix: env.pathPrefix,
    validatedAt: new Date().toISOString(),
    routes: {}
  };
  
  // Add route configurations
  ROUTES.forEach(route => {
    const result = results.routeMap[route.path];
    config.routes[route.path] = {
      name: route.name,
      url: getRouteUrl(route.path, env),
      valid: result ? result.success : false,
      selectors: route.selectors || []
    };
  });
  
  // Write config to file
  const configPath = path.join(__dirname, '../tests/datadog-synthetics.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  console.log(`${colors.green}✅ Configuration saved to: ${configPath}${colors.reset}`);
}

// Get the full URL for a route based on environment
function getRouteUrl(routePath, env) {
  let path = routePath;
  
  // Special case for home page
  if (path === '/') {
    return env.base + path;
  }
  
  // Production uses /pages prefix for most routes except homepage
  if (env.pathPrefix && !path.startsWith(env.pathPrefix)) {
    path = `${env.pathPrefix}${path}`;
  }
  
  return env.base + path;
}

// Execute main function if run directly
if (require.main === module) {
  main().catch(error => {
    console.error(`${colors.red}${colors.bright}FATAL ERROR: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = { main, getRouteUrl, ENV, ROUTES };
