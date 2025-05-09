#!/usr/bin/env node

/**
 * Create Datadog Alerts for Native Module Dependency Failures
 * 
 * This script creates monitors in Datadog to alert on native module dependency
 * failures in Netlify deployments. It uses the Datadog CLI for monitor management.
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

// Configuration
const CONFIG = {
  siteName: process.env.SITE_NAME || 'ai-tools-experiments',
  environment: process.env.DD_ENV || 'production',
  outputDir: path.join(__dirname, '..', 'datadog-config'),
  datadogSite: process.env.DD_SITE || 'datadoghq.com',
  notifyList: process.env.NOTIFY_LIST ? process.env.NOTIFY_LIST.split(',') : ['@slack-datadog-alerts'],
  nativeModules: ['esbuild', 'sharp', 'canvas', 'node-sass', 'bcrypt']
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
 * Get existing monitors for dependency failures
 */
async function getExistingMonitors() {
  try {
    log('Checking for existing dependency failure monitors...');
    
    // List monitors and filter by tags
    const output = execSync('datadog monitors list --format json', { encoding: 'utf8' });
    const monitors = JSON.parse(output);
    
    const dependencyMonitors = monitors.filter(monitor => 
      monitor.tags.includes(`site:${CONFIG.siteName}`) && 
      monitor.tags.includes('type:dependency') &&
      monitor.tags.includes('netlify:true')
    );
    
    if (dependencyMonitors.length > 0) {
      log(`Found ${dependencyMonitors.length} existing dependency monitors`, 'success');
      return dependencyMonitors;
    } else {
      log('No existing dependency monitors found', 'info');
      return [];
    }
  } catch (error) {
    log(`Error checking for existing monitors: ${error.message}`, 'error');
    return [];
  }
}

/**
 * Generate monitor definitions for native module dependency failures
 */
function generateMonitorDefinitions() {
  const monitors = [];
  
  // Native Module Failure Monitor (generic)
  monitors.push({
    name: `[${CONFIG.environment.toUpperCase()}] Native Module Dependency Failures - ${CONFIG.siteName}`,
    type: 'log alert',
    query: `logs("source:netlify @site:${CONFIG.siteName} @env:${CONFIG.environment} \"native module\" OR \"Failed at the\" -\"successfully installed\"").index("*").rollup("count").last("15m") > 0`,
    message: `Native module dependency failure detected in ${CONFIG.siteName} Netlify build.\n\nThis could indicate an issue with architecture-specific binaries or missing build dependencies.\n\nRecommended actions:\n1. Check build logs for specific module failures\n2. Verify NODE_VERSION and architecture settings in netlify.toml\n3. Ensure proper installation of development dependencies\n\n{{#is_alert}}\nAlert details: {{value}} failure(s) detected in the last 15 minutes.\n{{/is_alert}}\n\n{{#is_recovery}}\nAlert has recovered.\n{{/is_recovery}}\n\n@${CONFIG.notifyList.join(' @')}`,
    tags: [`env:${CONFIG.environment}`, `site:${CONFIG.siteName}`, 'type:dependency', 'netlify:true'],
    priority: 3,
    options: {
      thresholds: { critical: 0 },
      notify_audit: true,
      require_full_window: false,
      notify_no_data: false,
      renotify_interval: 60,
      include_tags: true,
      evaluation_delay: 60
    }
  });
  
  // Individual Native Module Monitors (specific)
  CONFIG.nativeModules.forEach(moduleName => {
    monitors.push({
      name: `[${CONFIG.environment.toUpperCase()}] ${moduleName} Dependency Failure - ${CONFIG.siteName}`,
      type: 'log alert',
      query: `logs("source:netlify @site:${CONFIG.siteName} @env:${CONFIG.environment} \"Failed at the ${moduleName}\" OR \"${moduleName}@\" \"ERR!\" -\"successfully installed\"").index("*").rollup("count").last("15m") > 0`,
      message: `${moduleName} dependency failure detected in ${CONFIG.siteName} Netlify build.\n\nThis could indicate an issue with architecture-specific binaries or missing build dependencies.\n\nRecommended actions:\n1. Check if ${moduleName} requires specific OS packages\n2. Verify NODE_VERSION and architecture settings in netlify.toml\n3. Consider adding a pre-build step to ensure correct architecture\n\n{{#is_alert}}\nAlert details: {{value}} failure(s) detected in the last 15 minutes.\n{{/is_alert}}\n\n{{#is_recovery}}\nAlert has recovered.\n{{/is_recovery}}\n\n@${CONFIG.notifyList.join(' @')}`,
      tags: [`env:${CONFIG.environment}`, `site:${CONFIG.siteName}`, 'type:dependency', 'netlify:true', `module:${moduleName}`],
      priority: 3,
      options: {
        thresholds: { critical: 0 },
        notify_audit: true,
        require_full_window: false,
        notify_no_data: false,
        renotify_interval: 60,
        include_tags: true,
        evaluation_delay: 60
      }
    });
  });
  
  // Slow Dependency Installation Monitor
  monitors.push({
    name: `[${CONFIG.environment.toUpperCase()}] Slow Dependency Installation - ${CONFIG.siteName}`,
    type: 'metric alert',
    query: `avg(last_15m):avg:netlify.build.duration{site:${CONFIG.siteName},env:${CONFIG.environment},step:installing_dependencies} > 300`,
    message: `Dependency installation for ${CONFIG.siteName} is taking longer than expected.\n\nThis could indicate an issue with npm/yarn cache or slow installation of native modules.\n\nRecommended actions:\n1. Check for large dependencies that may need optimization\n2. Consider using a package manager cache\n3. Review the build log for slow-installing packages\n\n{{#is_alert}}\nAlert details: Installation taking {{value}} seconds (threshold: 300s).\n{{/is_alert}}\n\n{{#is_recovery}}\nAlert has recovered. Installation time is now {{value}} seconds.\n{{/is_recovery}}\n\n@${CONFIG.notifyList.join(' @')}`,
    tags: [`env:${CONFIG.environment}`, `site:${CONFIG.siteName}`, 'type:dependency', 'netlify:true', 'performance:true'],
    priority: 4,
    options: {
      thresholds: { critical: 300, warning: 240 },
      notify_audit: true,
      require_full_window: false,
      notify_no_data: false,
      renotify_interval: 0,
      include_tags: true
    }
  });
  
  return monitors;
}

/**
 * Create or update dependency failure monitors
 */
async function createOrUpdateMonitors() {
  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }
    
    // Generate monitor definitions
    const monitors = generateMonitorDefinitions();
    const monitorsJsonPath = path.join(CONFIG.outputDir, 'dependency-monitors.json');
    
    // Write monitor JSON to file
    fs.writeFileSync(monitorsJsonPath, JSON.stringify(monitors, null, 2));
    log(`Monitor definitions written to ${monitorsJsonPath}`, 'success');
    
    // Check for existing monitors
    const existingMonitors = await getExistingMonitors();
    const existingNames = existingMonitors.map(m => m.name);
    
    // Track created/updated monitors
    const results = {
      created: [],
      updated: [],
      failed: []
    };
    
    // Process each monitor
    for (const monitor of monitors) {
      const monitorJsonPath = path.join(CONFIG.outputDir, `monitor-${monitor.name.replace(/\W+/g, '-').toLowerCase()}.json`);
      fs.writeFileSync(monitorJsonPath, JSON.stringify(monitor, null, 2));
      
      try {
        const existingMonitor = existingMonitors.find(m => m.name === monitor.name);
        
        if (existingMonitor) {
          // Update existing monitor
          log(`Updating existing monitor: ${monitor.name}`);
          execSync(`datadog monitors update ${existingMonitor.id} --file ${monitorJsonPath}`, { stdio: 'inherit' });
          results.updated.push({
            name: monitor.name,
            id: existingMonitor.id
          });
          log(`Monitor updated successfully: ${monitor.name}`, 'success');
        } else {
          // Create new monitor
          log(`Creating new monitor: ${monitor.name}`);
          const output = execSync(`datadog monitors create --file ${monitorJsonPath}`, { encoding: 'utf8' });
          
          // Extract monitor ID from output
          const monitorId = output.match(/"id":\s*(\d+)/)?.[1];
          
          if (monitorId) {
            results.created.push({
              name: monitor.name,
              id: monitorId
            });
            log(`Monitor created successfully: ${monitor.name} (ID: ${monitorId})`, 'success');
          } else {
            log(`Failed to extract monitor ID for ${monitor.name}`, 'error');
            results.failed.push({
              name: monitor.name,
              error: 'Failed to extract ID'
            });
          }
        }
      } catch (error) {
        log(`Error processing monitor ${monitor.name}: ${error.message}`, 'error');
        results.failed.push({
          name: monitor.name,
          error: error.message
        });
      }
    }
    
    // Write results to file
    const resultsPath = path.join(CONFIG.outputDir, 'monitor-creation-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    log(`Monitor creation results written to ${resultsPath}`, 'info');
    
    return {
      success: results.failed.length === 0,
      results
    };
  } catch (error) {
    log(`Error creating/updating monitors: ${error.message}`, 'error');
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Main function to orchestrate the process
 */
async function main() {
  try {
    log('Starting Datadog monitor creation for dependency failures');
    
    // 1. Ensure Datadog CLI is installed
    if (!await ensureDatadogCli()) {
      process.exit(1);
    }
    
    // 2. Configure Datadog CLI with API/APP keys
    if (!await configureDatadogCli()) {
      process.exit(1);
    }
    
    // 3. Create or update the monitors
    const result = await createOrUpdateMonitors();
    
    if (result.success) {
      log(`Monitor creation/update completed successfully`, 'success');
      log(`Created: ${result.results.created.length}, Updated: ${result.results.updated.length}`, 'success');
      process.exit(0);
    } else {
      log(`Monitor creation/update had failures: ${result.results.failed.length} failures`, 'error');
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
  generateMonitorDefinitions,
  getExistingMonitors,
  createOrUpdateMonitors
};
