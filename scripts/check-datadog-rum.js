/**
 * Datadog RUM Configuration Verification Script
 *
 * This script directly checks the Datadog configuration files in your project
 * to ensure proper RUM implementation. It checks for:
 * 1. Presence of Datadog RUM initialization code
 * 2. Correct environment variable detection logic
 * 3. Prevention of duplicate initialization
 * 4. Consistent configuration values across files
 */

const fs = require('fs');
const path = require('path');

// Logger utility to replace console.log and potentially send logs to Datadog
const logger = {
  info: function(message) {
    process.stdout.write(`[INFO] ${message}
`);
  },
  warn: function(message) {
    process.stdout.write(`[WARN] ${message}
`);
  },
  error: function(message) {
    process.stderr.write(`[ERROR] ${message}
`);
  },
  success: function(message) {
    process.stdout.write(`[SUCCESS] ${message}
`);
  },
  group: function(label) {
    process.stdout.write(`
=== ${label} ===
`);
  }
};

// Safe file reader function to address non-literal path issue
function safeReadFile(filePath) {
  // Validate path to ensure it's within the project directory
  const normalizedPath = path.normalize(filePath);
  const projectRoot = process.cwd();
  
  if (!normalizedPath.startsWith(projectRoot)) {
    logger.error(`Attempted to access file outside project: ${filePath}`);
    return null;
  }
  
  try {
    return fs.readFileSync(normalizedPath, 'utf8');
  } catch (err) {
    logger.error(`Error reading file ${normalizedPath}: ${err.message}`);
    return null;
  }
}

// Define paths to key files with Datadog RUM implementation
const filesToCheck = [
  'src/layouts/MainLayout.astro',
  'src/js/datadog-config.js',
  'src/js/client-scripts.js',
  'src/content/transcripts/index.html'
];

// Define expected configuration values for verification
const expectedConfig = {
  // At least one of these should be found in the files
  applicationIds: [
    '719fdc0f-589e-4c5a-bf1c-fa42f53208fd',
    'db2aad17-02cf-4e95-bee7-09293dd29f1a'
  ],
  // At least one of these should be found in the files
  clientTokens: [
    'pub3ab714d81ea179c4cf78b41467d1090b',
    'pub501e7bdae51f592b13b33adf351655a3'
  ],
  // These should be in all files
  service: 'ai-tools-lab',
  site: 'datadoghq.com'
};

// Expected patterns that should be present for proper implementation
const expectedPatterns = [
  // Environment detection based on hostname
  /window\.location\.hostname\.includes\(['"]ai-tools-lab-tst/,
  /window\.location\.hostname\.includes\(['"]ai-tools-lab\.com/,
  
  // Duplicate initialization prevention
  /window\.DD_RUM_INITIALIZED/,
  /\!window\.DD_RUM_INITIALIZED/,
  
  // RUM initialization
  /window\.DD_RUM\.init/
];

// Track verification results
const results = {
  files: {},
  summary: {
    checkedFiles: 0,
    foundFiles: 0,
    hasDatadogRUM: false,
    hasEnvironmentDetection: false,
    hasDuplicateInitPrevention: false,
    hasConsistentConfig: true,
    configIssues: []
  }
};

function checkFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  const fileResults = {
    exists: false,
    hasDatadogRUM: false,
    hasEnvironmentDetection: false,
    hasDuplicateInitPrevention: false,
    applicationId: null,
    clientToken: null,
    service: null,
    site: null
  };
  
  results.summary.checkedFiles++;
  
  try {
    if (fs.existsSync(fullPath)) {
      fileResults.exists = true;
      results.summary.foundFiles++;
      
      // Use safe file reading function to handle file paths securely
      const content = safeReadFile(fullPath);
      if (!content) {
        return fileResults;
      }
      
      // Check for Datadog RUM initialization
      if (content.includes('DD_RUM.init') || content.includes('DD_RUM') && content.includes('init(')) {
        fileResults.hasDatadogRUM = true;
        results.summary.hasDatadogRUM = true;
      }
      
      // Check for environment detection based on hostname
      if ((content.includes('ai-tools-lab-tst') && content.includes('staging')) ||
          (content.includes('ai-tools-lab.com') && content.includes('production'))) {
        fileResults.hasEnvironmentDetection = true;
        results.summary.hasEnvironmentDetection = true;
      }
      
      // Check for duplicate initialization prevention
      if (content.includes('DD_RUM_INITIALIZED')) {
        fileResults.hasDuplicateInitPrevention = true;
        results.summary.hasDuplicateInitPrevention = true;
      }
      
      // Extract configuration values
      for (const id of expectedConfig.applicationIds) {
        if (content.includes(id)) {
          fileResults.applicationId = id;
          break;
        }
      }
      
      for (const token of expectedConfig.clientTokens) {
        if (content.includes(token)) {
          fileResults.clientToken = token;
          break;
        }
      }
      
      if (content.includes(`service: '${expectedConfig.service}'`) || 
          content.includes(`service:"${expectedConfig.service}"`)) {
        fileResults.service = expectedConfig.service;
      }
      
      if (content.includes(`site: '${expectedConfig.site}'`) || 
          content.includes(`site:"${expectedConfig.site}"`)) {
        fileResults.site = expectedConfig.site;
      }
    }
  } catch (error) {
    logger.error(`Error checking file: ${error.message}`);
  }
  
  return fileResults;
}

// Check consistency of configuration across files
function checkConsistency() {
  const foundApplicationIds = new Set();
  const foundClientTokens = new Set();
  const consistentService = new Set();
  const consistentSite = new Set();
  
  Object.keys(results.files).forEach(file => {
    const fileData = results.files[file];
    if (fileData.applicationId) foundApplicationIds.add(fileData.applicationId);
    if (fileData.clientToken) foundClientTokens.add(fileData.clientToken);
    if (fileData.service) consistentService.add(fileData.service);
    if (fileData.site) consistentSite.add(fileData.site);
  });
  
  // Check if we found more than one application ID or client token in use
  if (foundApplicationIds.size > 1) {
    results.summary.hasConsistentConfig = false;
    results.summary.configIssues.push(
      `Multiple Application IDs found: ${Array.from(foundApplicationIds).join(', ')}`
    );
  }
  
  if (foundClientTokens.size > 1) {
    results.summary.hasConsistentConfig = false;
    results.summary.configIssues.push(
      `Multiple Client Tokens found: ${Array.from(foundClientTokens).join(', ')}`
    );
  }
}

// Main verification function
function verifyDatadogRUM() {
  logger.info('Verifying Datadog RUM Implementation...');
  
  // Check each file
  filesToCheck.forEach(file => {
    results.files[file] = checkFile(file);
  });
  
  // Check consistency across files
  checkConsistency();
  
  // Display results
  logger.group('Datadog RUM Verification Results');
  
  // Display per-file results
  logger.info('File Results:');
  Object.keys(results.files).forEach(file => {
    const fileData = results.files[file];
    logger.info(`${file}:`);
    logger.info(`  - Exists: ${fileData.exists ? '✓ Yes' : '❌ No'}`);
    if (fileData.exists) {
      logger.info(`  - Has Datadog RUM: ${fileData.hasDatadogRUM ? '✓ Yes' : '❌ No'}`);
      logger.info(`  - Has Environment Detection: ${fileData.hasEnvironmentDetection ? '✓ Yes' : '❌ No'}`);
      logger.info(`  - Has Duplicate Init Prevention: ${fileData.hasDuplicateInitPrevention ? '✓ Yes' : '❌ No'}`);
      logger.info(`  - Application ID: ${fileData.applicationId || 'Not found'}`);
      logger.info(`  - Client Token: ${fileData.clientToken ? '✓ Found' : '❌ Not found'}`);
      logger.info(`  - Service: ${fileData.service || 'Not found'}`);
      logger.info(`  - Site: ${fileData.site || 'Not found'}`);
    }
  });
  
  // Display summary
  logger.info('Summary:');
  logger.info(`  - Files Checked: ${results.summary.checkedFiles}`);
  logger.info(`  - Files Found: ${results.summary.foundFiles}`);
  logger.info(`  - Datadog RUM Implementation: ${results.summary.hasDatadogRUM ? '✓ Found' : '❌ Not found'}`);
  logger.info(`  - Environment Detection: ${results.summary.hasEnvironmentDetection ? '✓ Implemented' : '❌ Missing'}`);
  logger.info(`  - Duplicate Initialization Prevention: ${results.summary.hasDuplicateInitPrevention ? '✓ Implemented' : '❌ Missing'}`);
  logger.info(`  - Configuration Consistency: ${results.summary.hasConsistentConfig ? '✓ Consistent' : '❌ Issues found'}`);
  
  if (results.summary.configIssues.length > 0) {
    logger.warn('Configuration Issues:');
    results.summary.configIssues.forEach(issue => {
      logger.warn(`  - ${issue}`);
    });
  }
  
  // Final verdict
  logger.info('Verification Result:');
  const allPassed = 
    results.summary.hasDatadogRUM && 
    results.summary.hasEnvironmentDetection && 
    results.summary.hasDuplicateInitPrevention;
  
  if (allPassed) {
    logger.success('✓ Datadog RUM is properly implemented!');
    if (!results.summary.hasConsistentConfig) {
      logger.warn('⚠️ Warning: Configuration inconsistencies found (see above)');
    }
  } else {
    logger.error('❌ Datadog RUM implementation issues found (see details above)');
  }
  
  return allPassed;
}

// Run verification and exit with appropriate code
const result = verifyDatadogRUM();
process.exit(result ? 0 : 1);

