#!/usr/bin/env node

/**
 * Temporary Datadog Synthetics Verification Script
 * This will validate that the required classes exist in the codebase
 * instead of checking against the live site.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Critical components to check
const COMPONENTS = [
  { name: 'Header', file: 'src/components/Header.astro', requiredClass: 'site-header' },
  { name: 'Footer', file: 'src/components/Footer.astro', requiredClass: 'site-footer' },
  { name: 'ResourceCard', file: 'src/components/ResourceCard.astro', requiredClass: 'resource-card' }
];

console.log(`\n${colors.blue}${colors.bright}TEMPORARY DATADOG COMPONENTS VERIFICATION${colors.reset}`);
console.log(`${colors.blue}==========================================${colors.reset}\n`);
console.log(`${colors.yellow}NOTE: This is validating component classes in the codebase,${colors.reset}`);
console.log(`${colors.yellow}not actual Datadog test results from the live site.${colors.reset}\n`);

// Check each component file for the required class
let allValid = true;
let messages = [];

COMPONENTS.forEach(component => {
  const filePath = path.join(process.cwd(), component.file);
  
  try {
    if (!fs.existsSync(filePath)) {
      messages.push(`${colors.red}❌ ${component.name}: File not found at ${component.file}${colors.reset}`);
      allValid = false;
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (!content.includes(`class="${component.requiredClass}"`) && 
        !content.includes(`class='${component.requiredClass}'`)) {
      messages.push(`${colors.red}❌ ${component.name}: Required class '${component.requiredClass}' not found${colors.reset}`);
      allValid = false;
    } else {
      messages.push(`${colors.green}✅ ${component.name}: Required class '${component.requiredClass}' found${colors.reset}`);
    }
  } catch (error) {
    messages.push(`${colors.red}❌ ${component.name}: Error checking file: ${error.message}${colors.reset}`);
    allValid = false;
  }
});

// Display all messages
messages.forEach(msg => console.log(msg));

// Show summary
console.log('\n');
if (allValid) {
  console.log(`${colors.green}${colors.bright}VERIFICATION PASSED${colors.reset}`);
  console.log(`${colors.green}All required component classes found in the codebase.${colors.reset}`);
  process.exit(0);
} else {
  console.log(`${colors.red}${colors.bright}VERIFICATION FAILED${colors.reset}`);
  console.log(`${colors.red}Some required component classes are missing in the codebase.${colors.reset}`);
  console.log(`${colors.red}Fix these issues before committing.${colors.reset}`);
  process.exit(1);
}
