#!/usr/bin/env node

/**
 * Git Hooks Installation Script
 * 
 * This script installs the custom git hooks into the .git/hooks directory.
 * It should be run once after cloning the repository or when hooks are updated.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

console.log(`\n${colors.blue}${colors.bright}Installing Git Hooks${colors.reset}`);
console.log(`${colors.blue}====================${colors.reset}\n`);

// Find Git hooks directory
let gitHooksDir;
try {
  // Get the Git directory from git itself
  const gitDir = execSync('git rev-parse --git-dir', { encoding: 'utf8' }).trim();
  gitHooksDir = path.join(process.cwd(), gitDir, 'hooks');
} catch (error) {
  console.error(`${colors.red}ERROR: Failed to find Git directory.${colors.reset}`);
  console.error(`${colors.red}Are you sure you're in a Git repository?${colors.reset}`);
  process.exit(1);
}

// Create hooks directory if it doesn't exist
if (!fs.existsSync(gitHooksDir)) {
  console.log(`${colors.yellow}Creating hooks directory: ${gitHooksDir}${colors.reset}`);
  fs.mkdirSync(gitHooksDir, { recursive: true });
}

// Custom hooks to install
const hooks = [
  'pre-commit'
  // Add other hooks here if needed (pre-push, post-merge, etc.)
];

// Copy each hook to Git hooks directory
let installedCount = 0;
let skippedCount = 0;

hooks.forEach(hook => {
  const sourcePath = path.join(process.cwd(), 'hooks', hook);
  const targetPath = path.join(gitHooksDir, hook);
  
  if (!fs.existsSync(sourcePath)) {
    console.log(`${colors.yellow}Warning: Hook ${hook} not found in hooks directory.${colors.reset}`);
    return;
  }
  
  // Check if the hook already exists and is different
  let shouldInstall = true;
  if (fs.existsSync(targetPath)) {
    const existingContent = fs.readFileSync(targetPath, 'utf8');
    const newContent = fs.readFileSync(sourcePath, 'utf8');
    
    if (existingContent === newContent) {
      console.log(`${colors.green}Hook ${hook} is already up to date.${colors.reset}`);
      skippedCount++;
      shouldInstall = false;
    } else {
      // Backup existing hook if it's different
      const backupPath = `${targetPath}.backup.${Date.now()}`;
      console.log(`${colors.yellow}Backing up existing ${hook} hook to ${path.basename(backupPath)}${colors.reset}`);
      fs.copyFileSync(targetPath, backupPath);
    }
  }
  
  if (shouldInstall) {
    // Copy and make executable
    fs.copyFileSync(sourcePath, targetPath);
    fs.chmodSync(targetPath, 0o755); // rwxr-xr-x
    
    console.log(`${colors.green}Installed ${hook} hook${colors.reset}`);
    installedCount++;
  }
});

// Print summary
console.log(`\n${colors.blue}${colors.bright}Installation Summary${colors.reset}`);
console.log(`${colors.green}Hooks installed: ${installedCount}${colors.reset}`);
console.log(`${colors.yellow}Hooks skipped (already up to date): ${skippedCount}${colors.reset}`);

// Instructions for verifying installation
console.log(`\n${colors.cyan}${colors.bright}Verifying Installation${colors.reset}`);
console.log(`${colors.cyan}Run the following command to verify hooks are installed:${colors.reset}`);
console.log(`  ls -la ${gitHooksDir}\n`);

// Additional setup steps
console.log(`${colors.blue}${colors.bright}Next Steps${colors.reset}`);
console.log(`${colors.blue}1. Ensure your .env file contains Datadog API credentials:${colors.reset}`);
console.log(`   DD_API_KEY=your_api_key`);
console.log(`   DD_APP_KEY=your_app_key`);
console.log(`${colors.blue}2. Make sure Datadog synthetic tests are configured in Terraform:${colors.reset}`);
console.log(`   cd terraform && terraform apply`);
console.log(`${colors.blue}3. Test the pre-commit hook functionality:${colors.reset}`);
console.log(`   node hooks/verify-datadog-synthetics.js`);

console.log(`\n${colors.green}${colors.bright}Git hooks installation complete!${colors.reset}`);
