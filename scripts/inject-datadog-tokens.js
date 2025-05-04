/**
 * Script to inject Datadog tokens into the RUM integration file during build
 * 
 * This script replaces placeholder values with actual Datadog Application ID
 * and Client Token from environment variables.
 */

const fs = require('fs');
const path = require('path');

// Path to the Datadog RUM configuration file
const rumFilePath = path.join(
  process.cwd(),
  'dist',
  'js',
  'datadog-rum.js'
);

console.log(`Injecting Datadog tokens into: ${rumFilePath}`);

// Get tokens from environment variables
const applicationId = process.env.DD_APPLICATION_ID;
const clientToken = process.env.DD_CLIENT_TOKEN;

if (!applicationId || !clientToken) {
  console.warn('⚠️ Datadog RUM tokens not found in environment variables!');
  console.warn('RUM tracking will be disabled. Set DD_APPLICATION_ID and DD_CLIENT_TOKEN to enable.');
  process.exit(0); // Exit without error to not break the build
}

try {
  // Check if the file exists
  if (!fs.existsSync(rumFilePath)) {
    console.error(`❌ Error: RUM file not found at: ${rumFilePath}`);
    process.exit(1);
  }
  
  // Read the file content
  let content = fs.readFileSync(rumFilePath, 'utf8');
  
  // Replace placeholder values with actual tokens
  content = content.replace('__DATADOG_APPLICATION_ID__', applicationId);
  content = content.replace('__DATADOG_CLIENT_TOKEN__', clientToken);
  
  // Write the updated content back to the file
  fs.writeFileSync(rumFilePath, content, 'utf8');
  
  console.log('✅ Successfully injected Datadog tokens!');
} catch (error) {
  console.error(`❌ Error injecting Datadog tokens: ${error.message}`);
  process.exit(1);
}
