#!/usr/bin/env node

/**
 * Run Environment Comparison
 * 
 * This script runs the Playwright-based environment comparison and reports
 * results to Datadog using the Datadog CLI.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
  productionUrl: process.env.PRODUCTION_URL,
  testUrl: process.env.TEST_URL,
  deployId: process.env.DEPLOY_ID || `deploy-${Date.now()}`,
  siteName: process.env.SITE_NAME || 'ai-tools-experiments',
  environment: process.env.DD_ENV || 'production',
  outputDir: path.join(__dirname, '..', 'test-results', 'visual-comparison'),
  pagesToTest: process.env.PAGES_TO_TEST ? process.env.PAGES_TO_TEST.split(',') : ['/,homepage', '/about,about-page', '/contact,contact-page']
};

// ANSI colors for console output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Log with timestamp and color
 */
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  let color = COLORS.reset;
  
  switch (type) {
    case 'error':
      color = COLORS.red;
      break;
    case 'success':
      color = COLORS.green;
      break;
    case 'warning':
      color = COLORS.yellow;
      break;
    case 'info':
      color = COLORS.blue;
      break;
    case 'debug':
      color = COLORS.cyan;
      break;
  }
  
  console.log(`${color}[${timestamp}] ${message}${COLORS.reset}`);
}

/**
 * Check if Datadog CLI is installed and install if needed
 */
async function ensureDatadogCli() {
  try {
    execSync('datadog -v', { stdio: 'pipe' });
    log('Datadog CLI is already installed', 'success');
    return true;
  } catch (error) {
    log('Datadog CLI not found, installing...', 'warning');
    
    try {
      execSync('npm install -g @datadog/cli', { stdio: 'inherit' });
      log('Datadog CLI installed successfully', 'success');
      return true;
    } catch (err) {
      log(`Failed to install Datadog CLI: ${err.message}`, 'error');
      return false;
    }
  }
}

/**
 * Configure Datadog CLI with current API/APP keys
 */
async function configureDatadogCli() {
  try {
    // Use environment variables or fetch from a secure location
    const apiKey = process.env.DD_API_KEY;
    const appKey = process.env.DD_APP_KEY;
    
    if (!apiKey || !appKey) {
      log('DD_API_KEY and DD_APP_KEY must be set in environment', 'error');
      return false;
    }
    
    // Configure Datadog CLI
    log('Configuring Datadog CLI...');
    
    // Execute the config commands but hide keys from logs
    execSync(`datadog config set api_key ${apiKey}`, { stdio: 'pipe' });
    execSync(`datadog config set application_key ${appKey}`, { stdio: 'pipe' });
    
    // Verify configuration
    execSync('datadog config list', { stdio: 'pipe' });
    log('Datadog CLI configured successfully', 'success');
    return true;
  } catch (error) {
    log(`Failed to configure Datadog CLI: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Run the Playwright environment comparison test
 */
async function runEnvironmentComparison() {
  try {
    // Check required environment variables
    if (!CONFIG.productionUrl || !CONFIG.testUrl) {
      log('PRODUCTION_URL and TEST_URL environment variables must be set', 'error');
      return false;
    }
    
    // Format pages for Playwright test
    const formattedPages = CONFIG.pagesToTest.map(page => {
      const [path, name] = page.split(',');
      return `${path}:${name || path.replace(/\W+/g, '-')}`;
    }).join(',');
    
    // Generate command with environment variables and arguments
    log(`Running environment comparison between:\n  Production: ${CONFIG.productionUrl}\n  Test: ${CONFIG.testUrl}`);
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }
    
    // Set environment variable for Datadog reporting within the Playwright test
    process.env.DATADOG_REPORTING = 'true';
    
    // Run the Playwright test with proper arguments
    const command = `npx playwright test tests/visual-comparison/compare-environments.js --reporter=list --project=chromium` +
      ` -- --production-url ${CONFIG.productionUrl} --test-url ${CONFIG.testUrl}` +
      ` --pages ${formattedPages} --output-dir ${CONFIG.outputDir}` +
      ` --datadog-reporting --deploy-id ${CONFIG.deployId}`;
      
    log('Executing comparison command...');
    execSync(command, { stdio: 'inherit' });
    
    log('Environment comparison completed successfully', 'success');
    return true;
  } catch (error) {
    log(`Error running environment comparison: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Add comparison metrics to dashboard
 */
async function updateDashboardWithComparisonWidget() {
  try {
    log('Adding comparison metrics to Datadog dashboard...');
    
    // Get the dashboard JSON template
    const dashboardScriptPath = path.join(__dirname, 'create-deployment-dashboard.js');
    const dashboardGenerator = require('./create-deployment-dashboard');
    
    // Generate the base dashboard
    const dashboard = dashboardGenerator.generateDashboardJson();
    
    // Check if the dashboard already has a visual comparison widget
    const hasComparisonWidget = dashboard.widgets.some(
      w => w.definition.title && w.definition.title.includes('Environment Comparison')
    );
    
    if (!hasComparisonWidget) {
      // Add a new widget for visual comparison results
      dashboard.widgets.push({
        definition: {
          type: 'group',
          layout_type: 'ordered',
          title: 'Environment Comparison',
          widgets: [
            {
              definition: {
                title: 'Visual Differences by Page',
                type: 'timeseries',
                requests: [
                  {
                    q: `avg:environment.comparison.visual_difference{deploy_id:*,page:*} by {page}`,
                    display_type: 'bars',
                    style: {
                      palette: 'dog_classic',
                      line_type: 'solid',
                      line_width: 'normal'
                    }
                  }
                ],
                yaxis: {
                  scale: 'linear',
                  include_zero: true,
                  min: 'auto',
                  max: 'auto'
                },
                time: { live_span: 'last_1d' }
              }
            },
            {
              definition: {
                title: 'Performance Differences by Page',
                type: 'timeseries',
                requests: [
                  {
                    q: `avg:environment.comparison.load_time_difference_percent{deploy_id:*,page:*} by {page}`,
                    display_type: 'bars',
                    style: {
                      palette: 'warm',
                      line_type: 'solid',
                      line_width: 'normal'
                    }
                  }
                ],
                yaxis: {
                  scale: 'linear',
                  include_zero: true,
                  min: 'auto',
                  max: 'auto'
                },
                time: { live_span: 'last_1d' }
              }
            },
            {
              definition: {
                title: 'Recent Comparison Events',
                type: 'list_stream',
                requests: [
                  {
                    columns: [
                      { field: 'timestamp', width: 'auto' },
                      { field: 'host', width: 'auto' },
                      { field: 'value', width: 'auto' }
                    ],
                    query: {
                      event_query: 'tags:type:environment_comparison'
                    }
                  }
                ]
              }
            }
          ]
        }
      });

      // Save the updated dashboard JSON to a file
      const tempDashboardPath = path.join(CONFIG.outputDir, 'updated-dashboard.json');
      fs.writeFileSync(tempDashboardPath, JSON.stringify(dashboard, null, 2));
      
      // Get existing dashboard ID if available
      let dashboardId = await dashboardGenerator.getExistingDashboard();
      
      // Update the dashboard using the Datadog CLI
      if (dashboardId) {
        log(`Updating existing dashboard (ID: ${dashboardId})...`);
        execSync(`datadog dashboards update ${dashboardId} --file ${tempDashboardPath}`, { stdio: 'inherit' });
      } else {
        log('Creating new dashboard with comparison metrics...');
        const output = execSync(`datadog dashboards create --file ${tempDashboardPath}`, { encoding: 'utf8' });
        dashboardId = output.match(/"id":\s*"([^"]+)"/)?.[1];
      }
      
      log(`Dashboard updated successfully with comparison widgets (ID: ${dashboardId})`, 'success');
      return true;
    } else {
      log('Dashboard already has comparison widgets, skipping update', 'info');
      return true;
    }
  } catch (error) {
    log(`Error updating dashboard with comparison widgets: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Main function to orchestrate the process
 */
async function main() {
  try {
    log('Starting environment comparison and Datadog integration');
    
    // 1. Ensure Datadog CLI is installed
    if (!await ensureDatadogCli()) {
      process.exit(1);
    }
    
    // 2. Configure Datadog CLI with API/APP keys
    if (!await configureDatadogCli()) {
      process.exit(1);
    }
    
    // 3. Run the environment comparison
    if (!await runEnvironmentComparison()) {
      process.exit(1);
    }
    
    // 4. Update the dashboard with comparison widgets
    if (!await updateDashboardWithComparisonWidget()) {
      process.exit(1);
    }
    
    log('Environment comparison and Datadog integration completed successfully', 'success');
    process.exit(0);
  } catch (error) {
    log(`Unexpected error: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main().catch(error => {
    log(`Fatal error: ${error.message}`, 'error');
    process.exit(1);
  });
}

// Export functions for testing
module.exports = {
  runEnvironmentComparison,
  updateDashboardWithComparisonWidget
};
