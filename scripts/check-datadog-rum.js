const fs = require('fs');
const path = require('path');

// Function to check RUM events by looking at Datadog agent logs or configuration
function checkRumStatus() {
  try {
    console.log('Checking Datadog RUM status...');
    
    // Check if Datadog configuration file exists and contains RUM settings
    const configPath = '/opt/datadog-agent/etc/datadog.yaml';
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      if (configContent.includes('rum_enabled: true') || configContent.includes('rum_enabled:true')) {
        console.log('Datadog RUM is enabled in configuration.');
      } else {
        console.log('Datadog RUM is not enabled in configuration.');
        return false;
      }
    } else {
      console.log('Datadog configuration file not found at', configPath);
      console.log('Unable to directly confirm RUM configuration status.');
    }
    
    // Check logs for RUM initialization
    // This is a simplistic check and may need adjustment based on actual log location
    const logDir = '/opt/datadog-agent/logs';
    if (fs.existsSync(logDir)) {
      const logFiles = fs.readdirSync(logDir).filter(f => f.endsWith('.log'));
      let rumMentioned = false;
      for (const logFile of logFiles) {
        const logPath = path.join(logDir, logFile);
        const logContent = fs.readFileSync(logPath, 'utf8');
        if (logContent.includes('RUM') || logContent.includes('rum')) {
          console.log(`RUM mentioned in log file: ${logFile}`);
          rumMentioned = true;
        }
      }
      if (rumMentioned) {
        console.log('Datadog RUM appears to be active based on log entries.');
        return true;
      } else {
        console.log('No mention of RUM found in log files. RUM may not be collecting data.');
        return false;
      }
    } else {
      console.log('Datadog log directory not found at', logDir);
      console.log('Unable to confirm RUM status through logs.');
      return false;
    }
  } catch (error) {
    console.error('Error checking RUM status:', error.message);
    return false;
  }
}

// Run the check
const result = checkRumStatus();
process.exit(result ? 0 : 1);
