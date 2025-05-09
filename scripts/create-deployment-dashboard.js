#!/usr/bin/env node

/**
 * Create Datadog Deployment Metrics Dashboard
 * 
 * This script creates a dashboard in Datadog visualizing deployment success metrics,
 * including synthetic test results, response times, and visual regression metrics.
 *
 * Uses the Datadog CLI for dashboard management.
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

// Configuration
const CONFIG = {
  dashboardName: 'Netlify Deployment Metrics',
  dashboardDescription: 'Visualizes deployment success metrics including synthetic test results, response times, and visual regression detection',
  outputDir: path.join(__dirname, '..', 'datadog-config'),
  datadogSite: process.env.DD_SITE || 'datadoghq.com'
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
    execSync(`datadog config set site ${CONFIG.datadogSite}`, { stdio: 'inherit' });
    
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
 * Get existing dashboard (if it exists)
 */
async function getExistingDashboard() {
  try {
    log('Checking for existing deployment dashboard...');
    
    // List dashboards and filter by name
    const output = execSync('datadog dashboards list --format json', { encoding: 'utf8' });
    const dashboards = JSON.parse(output);
    
    const deploymentDashboard = dashboards.find(dashboard => 
      dashboard.title === CONFIG.dashboardName
    );
    
    if (deploymentDashboard) {
      log(`Found existing dashboard with ID: ${deploymentDashboard.id}`, 'success');
      return deploymentDashboard;
    } else {
      log('No existing deployment dashboard found', 'info');
      return null;
    }
  } catch (error) {
    log(`Error checking for existing dashboard: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Generate dashboard definition JSON
 */
function generateDashboardJson() {
  const siteName = process.env.SITE_NAME || 'ai-tools-experiments';
  
  // Dashboard definition
  const dashboard = {
    title: CONFIG.dashboardName,
    description: CONFIG.dashboardDescription,
    widgets: [
      // Title widget
      {
        definition: {
          type: 'note',
          content: `# ${siteName} Deployment Metrics\n\nMonitoring deployment success and visual regression metrics`,
          background_color: 'vivid_blue',
          font_size: '16',
          text_align: 'center',
          show_tick: true,
          tick_pos: 'bottom',
          tick_edge: 'bottom'
        },
        layout: {
          x: 0,
          y: 0,
          width: 12,
          height: 2
        }
      },
      
      // Deployment Success Rate
      {
        definition: {
          title: 'Deployment Success Rate',
          title_size: '16',
          title_align: 'left',
          type: 'query_value',
          requests: [
            {
              q: `sum:synthetics.test.results{test_name:*css*validation*,env:${process.env.DD_ENV || 'production'}} by {status}.as_count().last('1d')`,
              aggregator: 'sum',
              conditional_formats: [
                {
                  comparator: '<',
                  value: 80,
                  palette: 'red'
                },
                {
                  comparator: '>=',
                  value: 80,
                  palette: 'yellow'
                },
                {
                  comparator: '>=',
                  value: 95,
                  palette: 'green'
                }
              ]
            }
          ],
          precision: 1,
          autoscale: true
        },
        layout: {
          x: 0,
          y: 2,
          width: 4,
          height: 3
        }
      },
      
      // Deployment Frequency
      {
        definition: {
          title: 'Deployment Frequency',
          title_size: '16',
          title_align: 'left',
          type: 'timeseries',
          requests: [
            {
              q: `sum:events{source:deployment,site:${siteName}}.rollup(count).by{status}`,
              display_type: 'bars'
            }
          ],
          custom_links: [],
          time: {}
        },
        layout: {
          x: 4,
          y: 2,
          width: 8,
          height: 3
        }
      },
      
      // CSS Validation Test Results
      {
        definition: {
          title: 'CSS Validation Test Results',
          title_size: '16',
          title_align: 'left',
          type: 'timeseries',
          requests: [
            {
              q: `sum:synthetics.test.results{test_name:*css*validation*,env:${process.env.DD_ENV || 'production'}} by {status}.as_count()`,
              display_type: 'line'
            }
          ],
          markers: [
            {
              value: 'y = 0',
              display_type: 'error dashed',
              label: 'All Tests Failing'
            }
          ],
          time: {}
        },
        layout: {
          x: 0,
          y: 5,
          width: 6,
          height: 4
        }
      },
      
      // API Response Time Around Deployments
      {
        definition: {
          title: 'API Response Time Around Deployments',
          title_size: '16',
          title_align: 'left',
          type: 'timeseries',
          requests: [
            {
              q: `avg:api.http.response_time{env:${process.env.DD_ENV || 'production'}}`,
              display_type: 'line'
            }
          ],
          events: [
            {
              q: `sources:deployment status:success tags:site:${siteName}`
            }
          ],
          time: {}
        },
        layout: {
          x: 6,
          y: 5,
          width: 6,
          height: 4
        }
      },
      
      // Visual Regression Detection
      {
        definition: {
          title: 'Visual Regression Detection',
          title_size: '16',
          title_align: 'left',
          type: 'timeseries',
          requests: [
            {
              q: `sum:synthetics.browser.run_results{test_name:*css*validation*,check_type:contains,env:${process.env.DD_ENV || 'production'},status:fail} by {check_name}.as_count()`,
              display_type: 'bars'
            }
          ],
          time: {}
        },
        layout: {
          x: 0,
          y: 9,
          width: 12,
          height: 4
        }
      },
      
      // Recent Deployments List
      {
        definition: {
          title: 'Recent Deployments',
          title_size: '16',
          title_align: 'left',
          type: 'list_stream',
          requests: [
            {
              columns: [
                {
                  field: 'timestamp',
                  width: 'auto'
                },
                {
                  field: 'message',
                  width: 'auto'
                },
                {
                  field: 'status',
                  width: 'auto'
                }
              ],
              query: {
                data_source: 'event_stream',
                event_size: 'l',
                query: `sources:deployment tags:site:${siteName}`
              }
            }
          ]
        },
        layout: {
          x: 0,
          y: 13,
          width: 12,
          height: 4
        }
      }
    ],
    template_variables: [
      {
        name: 'env',
        default: process.env.DD_ENV || 'production',
        prefix: 'env'
      }
    ],
    layout_type: 'ordered',
    is_read_only: false,
    notify_list: []
  };
  
  return dashboard;
}

/**
 * Create or update the dashboard
 */
async function createOrUpdateDashboard() {
  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }
    
    // Generate dashboard definition
    const dashboard = generateDashboardJson();
    const dashboardJsonPath = path.join(CONFIG.outputDir, 'deployment-dashboard.json');
    
    // Write dashboard JSON to file
    fs.writeFileSync(dashboardJsonPath, JSON.stringify(dashboard, null, 2));
    log(`Dashboard JSON written to ${dashboardJsonPath}`, 'success');
    
    // Check if dashboard already exists
    const existingDashboard = await getExistingDashboard();
    
    let result;
    if (existingDashboard) {
      // Update existing dashboard
      log(`Updating existing dashboard (ID: ${existingDashboard.id})...`);
      result = execSync(`datadog dashboards update ${existingDashboard.id} --file ${dashboardJsonPath}`, { encoding: 'utf8' });
      log('Dashboard updated successfully', 'success');
    } else {
      // Create new dashboard
      log('Creating new dashboard...');
      result = execSync(`datadog dashboards create --file ${dashboardJsonPath}`, { encoding: 'utf8' });
      log('Dashboard created successfully', 'success');
    }
    
    // Extract dashboard ID from result
    const dashboardId = result.match(/"id":\s*"([^"]+)"/)?.[1];
    
    if (dashboardId) {
      log(`Dashboard ID: ${dashboardId}`, 'success');
      
      // Save dashboard ID to file for future reference
      fs.writeFileSync(path.join(CONFIG.outputDir, 'dashboard-id.txt'), dashboardId);
      
      // Generate dashboard URL
      const dashboardUrl = `https://${CONFIG.datadogSite}/dashboard/${dashboardId}`;
      log(`Dashboard URL: ${dashboardUrl}`, 'success');
      
      return { success: true, dashboardId, dashboardUrl };
    } else {
      log('Failed to extract dashboard ID from result', 'error');
      return { success: false, error: 'Failed to extract dashboard ID' };
    }
  } catch (error) {
    log(`Error creating/updating dashboard: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
}

/**
 * Main function to orchestrate the process
 */
async function main() {
  try {
    log('Starting Datadog dashboard creation');
    
    // 1. Ensure Datadog CLI is installed
    if (!await ensureDatadogCli()) {
      process.exit(1);
    }
    
    // 2. Configure Datadog CLI with API/APP keys
    if (!await configureDatadogCli()) {
      process.exit(1);
    }
    
    // 3. Create or update the dashboard
    const result = await createOrUpdateDashboard();
    
    if (result.success) {
      log(`Dashboard available at: ${result.dashboardUrl}`, 'success');
      process.exit(0);
    } else {
      log(`Dashboard creation failed: ${result.error}`, 'error');
      process.exit(1);
    }
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
  generateDashboardJson,
  getExistingDashboard,
  createOrUpdateDashboard
};
