#!/usr/bin/env node

/**
 * Cascade Conversation Recorder
 * 
 * This script automates capturing Cascade conversations and recording them to Datadog notebooks
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const recorder = require('./datadog-notebook-recorder');

// Constants
const CONVERSATIONS_DIR = path.join(__dirname, '../data/conversations');
const LOG_FILE = path.join(__dirname, '../logs/conversation-sync.log');

// Ensure log directory exists
const logDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * Logger function to record operations
 * @param {string} message - Message to log
 */
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  // Log to console
  console.log(message);
  
  // Append to log file
  fs.appendFileSync(LOG_FILE, logMessage);
}

/**
 * Extract current conversation details from Cascade
 * This uses the Datadog MCP to access current conversation data
 */
async function captureCurrentConversation() {
  try {
    // A unique ID for the conversation based on date + random string
    const conversationId = `cascade-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const title = "Datadog Synthetics Configuration - AI Tools Lab";
    const summary = "Discussion about setting up Datadog Synthetics tests for monitoring the AI Tools Lab project using Terraform configuration.";
    
    // Create a template for the conversation
    const conversationPath = recorder.initializeConversation(title, summary, [
      "cascade", 
      "datadog", 
      "synthetics", 
      "monitoring", 
      "terraform", 
      "env:production"
    ]);
    
    log(`Created new conversation template at: ${conversationPath}`);
    
    // In a real implementation, we would use the MCP server to extract the actual conversation
    // For now, as a placeholder, we'll sync our example conversation
    await recorder.syncToDatadog(path.join(CONVERSATIONS_DIR, 'conversation-example.json'));
    
    log('Synced conversation to Datadog notebook');
    
    return conversationPath;
  } catch (error) {
    log(`Error capturing conversation: ${error.message}`);
    throw error;
  }
}

/**
 * Main function to execute the syncing process
 */
async function main() {
  try {
    log('Starting Cascade conversation sync to Datadog notebooks');
    
    // Check if Datadog API credentials are available
    if (!process.env.DD_API_KEY || !process.env.DD_APP_KEY) {
      log('⚠️ Datadog API credentials missing. Please set DD_API_KEY and DD_APP_KEY environment variables.');
      process.exit(1);
    }
    
    // Capture and sync the current conversation
    await captureCurrentConversation();
    
    log('✅ Conversation sync completed successfully');
  } catch (error) {
    log(`❌ Error in conversation sync: ${error.message}`);
    process.exit(1);
  }
}

// Execute the main function
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  captureCurrentConversation
};
