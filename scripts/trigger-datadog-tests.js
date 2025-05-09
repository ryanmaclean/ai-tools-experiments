#!/usr/bin/env node

/**
 * Trigger Datadog Tests using Datadog CLI
 * 
 * This script uses the Datadog CLI to trigger synthetic tests after a deployment.
 * It's designed to be called from the Netlify post-build process or directly.
 */

const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
  testName: 'AI Tools Lab CSS Validation Test',
  outputDir: path.join(__dirname, '..', 'logs'),
  datadogSite: process.env.DD_SITE || 'datadoghq.com',
  deploymentType: process.env.DEPLOY_TYPE || 'netlify'
};

// ANSI colors for console output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
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
    const result = execSync('datadog config list', { encoding: 'utf8' });
    log('Datadog CLI configured successfully', 'success');
    
    // Don't log the actual keys
    log('Configuration validated', 'success');
    return true;
  } catch (error) {
    log(`Failed to configure Datadog CLI: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Find the synthetic test ID by name
 */
async function findSyntheticTest() {
  try {
    log(`Finding synthetic test: ${CONFIG.testName}`);
    
    // List all synthetic tests and filter by name
    const output = execSync('datadog synthetics list', { encoding: 'utf8' });
    
    // Parse test info (assumes JSON output format)
    const lines = output.split('\n');
    let testId = null;
    
    for (const line of lines) {
      if (line.includes(CONFIG.testName)) {
        // Extract the test ID
        const match = line.match(/[a-z0-9]{10}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}|[a-z0-9]{24}/);
        if (match) {
          testId = match[0];
          break;
        }
      }
    }
    
    if (testId) {
      log(`Found test with ID: ${testId}`, 'success');
      return testId;
    } else {
      log(`Test "${CONFIG.testName}" not found`, 'error');
      
      // Try to list synthetic tests with a more specific filter
      log('Available tests:');
      execSync('datadog synthetics list --format=pretty', { stdio: 'inherit' });
      
      return null;
    }
  } catch (error) {
    log(`Error finding synthetic test: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Trigger a synthetic test run
 */
async function triggerSyntheticTest(testId) {
  if (!testId) {
    log('No test ID provided', 'error');
    return false;
  }
  
  try {
    log(`Triggering test run for ${testId}`);
    
    // Get deployment-specific variables
    const deploymentId = process.env.DEPLOY_ID || `manual-${Date.now()}`;
    const siteName = process.env.SITE_NAME || 'ai-tools-experiments';
    
    // Create variables to attach to the test run
    const variables = [
      `--variable "deploymentId=${deploymentId}"`,
      `--variable "siteName=${siteName}"`,
      `--variable "triggerType=${CONFIG.deploymentType}"`
    ].join(' ');
    
    // Execute the test trigger command
    const command = `datadog synthetics run-test ${testId} ${variables}`;
    log(`Executing: ${command}`);
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }
    
    // Output log file path
    const logFile = path.join(CONFIG.outputDir, `datadog-test-${deploymentId}.log`);
    
    // Execute the command and stream output to file
    const testProcess = exec(command);
    let output = '';
    
    testProcess.stdout.on('data', (data) => {
      output += data;
      process.stdout.write(data);
    });
    
    testProcess.stderr.on('data', (data) => {
      output += data;
      process.stderr.write(data);
    });
    
    return new Promise((resolve) => {
      testProcess.on('close', (code) => {
        // Write output to log file
        fs.writeFileSync(logFile, output);
        
        if (code === 0) {
          log(`Test triggered successfully, log saved to ${logFile}`, 'success');
          resolve(true);
        } else {
          log(`Test trigger failed with code ${code}, log saved to ${logFile}`, 'error');
          resolve(false);
        }
      });
    });
  } catch (error) {
    log(`Error triggering test: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Post a deployment event to Datadog
 */
async function postDeploymentEvent(success) {
  try {
    const deploymentId = process.env.DEPLOY_ID || `manual-${Date.now()}`;
    const siteName = process.env.SITE_NAME || 'ai-tools-experiments';
    const commitSha = process.env.COMMIT_REF || 'unknown';
    const status = success ? 'success' : 'failure';
    
    // Create the event title and message
    const title = `Deployment: ${siteName} (${status})`;
    const message = `Deployment ID: ${deploymentId}\nCommit: ${commitSha}\nStatus: ${status}`;
    
    // Define tags for the event
    const tags = [
      `deployment_id:${deploymentId}`,
      `site:${siteName}`,
      `commit:${commitSha}`,
      `status:${status}`,
      'triggered_by:cli'
    ].join(' ');
    
    // Post the event
    const command = `datadog events post "${title}" "${message}" --tags ${tags} --type deployment`;
    log('Posting deployment event to Datadog');
    
    execSync(command, { stdio: 'inherit' });
    log('Deployment event posted successfully', 'success');
    return true;
  } catch (error) {
    log(`Error posting deployment event: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Main function to orchestrate the process
 */
async function main() {
  try {
    log('Starting Datadog tests trigger');
    
    // 1. Ensure Datadog CLI is installed
    if (!await ensureDatadogCli()) {
      process.exit(1);
    }
    
    // 2. Configure Datadog CLI with API/APP keys
    if (!await configureDatadogCli()) {
      process.exit(1);
    }
    
    // 3. Find the synthetic test by name
    const testId = await findSyntheticTest();
    if (!testId) {
      // Post a deployment event even if test wasn't found
      await postDeploymentEvent(false);
      process.exit(1);
    }
    
    // 4. Trigger the test
    const success = await triggerSyntheticTest(testId);
    
    // 5. Post a deployment event to Datadog
    await postDeploymentEvent(success);
    
    // Exit with appropriate code
    process.exit(success ? 0 : 1);
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
  findSyntheticTest,
  triggerSyntheticTest,
  postDeploymentEvent
};
