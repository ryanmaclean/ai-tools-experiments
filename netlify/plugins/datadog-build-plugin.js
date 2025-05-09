/**
 * Netlify Build Plugin for Datadog Integration
 * 
 * This plugin integrates Datadog monitoring with Netlify builds,
 * handling pre-build checks and post-build verification.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Plugin configuration
const PLUGIN_NAME = 'netlify-plugin-datadog';
const REQUIRED_ENV_VARS = ['DD_API_KEY', 'DD_APP_KEY'];

// Helper function to validate environment
function validateEnvironment() {
  const missing = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Helper function to run Datadog tests
function runDatadogTests() {
  try {
    execSync('npm run synthetics:test', { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error('Datadog tests failed:', error);
    return false;
  }
}

// Helper function to verify deployment
async function verifyDeployment(deploymentId) {
  try {
    const response = await fetch(`${process.env.URL}/.netlify/functions/datadog-monitor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'deployment_complete',
        deploymentId
      })
    });

    if (!response.ok) {
      throw new Error(`Deployment verification failed: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Failed to verify deployment:', error);
    return false;
  }
}

// Plugin implementation
module.exports = {
  name: PLUGIN_NAME,
  
  // Pre-build hook
  async onPreBuild({ utils, inputs }) {
    console.log('🔍 Running pre-build checks...');
    
    try {
      // Validate environment
      validateEnvironment();
      
      // Run Datadog tests
      const testsPassed = runDatadogTests();
      if (!testsPassed) {
        utils.build.failBuild('Datadog tests failed during pre-build check');
      }
      
      console.log('✅ Pre-build checks completed successfully');
    } catch (error) {
      utils.build.failBuild(`Pre-build checks failed: ${error.message}`);
    }
  },
  
  // Post-build hook
  async onPostBuild({ utils, inputs, constants }) {
    console.log('🔍 Running post-build verification...');
    
    try {
      // Get deployment ID from Netlify
      const deploymentId = process.env.DEPLOY_ID;
      if (!deploymentId) {
        throw new Error('Deployment ID not found');
      }
      
      // Verify deployment
      const verified = await verifyDeployment(deploymentId);
      if (!verified) {
        utils.build.failBuild('Post-build verification failed');
      }
      
      console.log('✅ Post-build verification completed successfully');
    } catch (error) {
      utils.build.failBuild(`Post-build verification failed: ${error.message}`);
    }
  },
  
  // Success hook
  async onSuccess({ utils, inputs, constants }) {
    console.log('✨ Build completed successfully!');
    
    // Create success marker file
    const successFile = path.join(constants.PUBLISH_DIR, '.datadog-success');
    fs.writeFileSync(successFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      deploymentId: process.env.DEPLOY_ID
    }));
  },
  
  // Error hook
  async onError({ utils, inputs, constants, error }) {
    console.error('❌ Build failed:', error);
    
    // Create error marker file
    const errorFile = path.join(constants.PUBLISH_DIR, '.datadog-error');
    fs.writeFileSync(errorFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      error: error.message,
      deploymentId: process.env.DEPLOY_ID
    }));
  }
}; 