#!/bin/bash

# Script to setup Datadog monitoring for Netlify deployments
# IMPORTANT: This script assumes DD_API_KEY and DD_APP_KEY are set in the environment
# DO NOT hardcode or output these keys in any way

set -e

# Check if required environment variables are set without exposing them
if [ -z "${DD_API_KEY}" ]; then
  echo "Error: DD_API_KEY environment variable is not set."
  echo "Hint: These keys should be available in your ~/.profile but never expose them."
  exit 1
fi

if [ -z "${DD_APP_KEY}" ]; then
  echo "Error: DD_APP_KEY environment variable is not set."
  echo "Hint: These keys should be available in your ~/.profile but never expose them."
  exit 1
fi

echo "[$(date)] Setting up Datadog monitoring for Netlify deployments"

# Define site information without exposing sensitive data
SITE_ID="94b1b695-e156-4836-9f22-aa64256e4d05"  # From the netlify status command
SITE_URL="https://ai-tools-lab-tst.netlify.app"
SITE_NAME="ai-tools-lab-tst"

# Import synthetic tests securely
echo "[$(date)] Importing synthetic tests to Datadog"
datadog-ci synthetics import-tests --files datadog-synthetics.json 2>&1 | grep -v "API Key"

# Set up post-deployment validation with Vitest
echo "[$(date)] Setting up post-deployment validation"

# Configure test that will be triggered after Netlify deployments
cat > ./tests/netlify-post-deploy.test.js << 'EOF'
// Post-deployment test suite that runs after Netlify deployments
import { describe, test, expect, beforeAll } from 'vitest';
import fetch from 'node-fetch';

// Configuration for deployment testing
const SITE_URL = process.env.SITE_URL || 'https://ai-tools-lab-tst.netlify.app';

describe('Netlify Post-Deployment Tests', () => {
  // Test 1: Verify site is accessible
  test('Site is accessible', async () => {
    const response = await fetch(SITE_URL);
    expect(response.status).toBe(200);
  });

  // Test 2: Verify critical pages
  test.each([
    ['Home page', '/'],
    ['About page', '/about'],
    ['Resources page', '/resources'],
    ['Observations page', '/observations']
  ])('%s loads correctly', async (name, path) => {
    const response = await fetch(`${SITE_URL}${path}`);
    expect(response.status).toBe(200);
    
    const html = await response.text();
    expect(html).toContain('</html>');
  });

  // Test 3: Check for dependency errors in console logs
  test('No module dependency errors on page load', async () => {
    // This is a basic check that could be expanded with a headless browser
    const response = await fetch(SITE_URL);
    const html = await response.text();
    
    expect(html).not.toContain('Cannot find module');
    expect(html).not.toContain('ReferenceError');
    expect(html).not.toContain('dependency_installation script returned non-zero exit code');
  });
});
EOF

# Add scheduled test to package.json if not already present
if ! grep -q "test:netlify:scheduled" package.json; then
  # Using a safer approach to add the script without modifying the entire file
  echo "[$(date)] Adding scheduled test to package.json"
  npx --yes json -I -f package.json -e "this.scripts['test:netlify:scheduled']='SITE_URL=\"${SITE_URL}\" DD_TEST_REPORT=true vitest run tests/netlify-post-deploy.test.js --reporter verbose'"
fi

# Create a sample GitHub action for scheduled testing (doesn't expose keys)
cat > ./.github/workflows/scheduled-netlify-tests.yml << 'EOF'
name: Scheduled Netlify Tests

on:
  schedule:
    # Run twice daily at 6am and 6pm
    - cron: '0 6,18 * * *'
  workflow_dispatch:  # Allow manual triggering

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run Netlify post-deployment tests
        run: npm run test:netlify:scheduled
        env:
          SITE_URL: https://ai-tools-lab-tst.netlify.app
          # Use GitHub secrets for the DD_API_KEY and DD_APP_KEY
          DD_API_KEY: ${{ secrets.DD_API_KEY }}
          DD_APP_KEY: ${{ secrets.DD_APP_KEY }}
          DD_TEST_REPORT: 'true'

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: ./test-results
          retention-days: 14
EOF

echo "[$(date)] ✅ Datadog monitoring for Netlify deployments set up successfully"
echo "[$(date)] 🔒 Remember: Never expose your API or App keys!"

# Reminder about security without showing any keys
echo "[$(date)] ℹ️ Next steps:"
echo "  1. Add DD_API_KEY and DD_APP_KEY as GitHub secrets"
echo "  2. Configure Netlify webhook to trigger Datadog synthetics tests"
echo "  3. Review the test results in the Datadog dashboard at https://app.datadoghq.com"
