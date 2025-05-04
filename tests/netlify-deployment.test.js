import { describe, test, expect, beforeAll } from 'vitest';
import fetch from 'node-fetch';
import { execa } from 'execa';

// Configuration for deployment testing
const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID || 'default-site-id';
const DEPLOYMENT_URL = process.env.DEPLOYMENT_URL || 'https://deploy-preview-XXXX--ai-tools-experiments.netlify.app';
const CI_BRANCH = process.env.BRANCH || 'test';

// Utility function to run Netlify CLI commands
async function runNetlifyCLI(args) {
  try {
    const { stdout } = await execa('netlify', args);
    return { success: true, output: stdout };
  } catch (error) {
    return { success: false, error: error.message, stderr: error.stderr };
  }
}

// Test deployment health
describe('Netlify Deployment Tests', () => {
  let deploymentInfo = null;

  // Get deployment information before running tests
  beforeAll(async () => {
    // Use Netlify CLI to get the latest deployment info
    const result = await runNetlifyCLI(['api', 'listSiteDeploys', '--json', '--site-id', NETLIFY_SITE_ID]);
    
    if (result.success) {
      const deploys = JSON.parse(result.output);
      // Find the latest deployment for the current branch
      deploymentInfo = deploys.find(deploy => deploy.branch === CI_BRANCH);
      console.log(`Found deployment for branch ${CI_BRANCH}:`, deploymentInfo?.id);
    } else {
      console.warn('Failed to get deployment info:', result.error);
    }
  });

  // Test 1: Verify site is accessible
  test('Site is accessible', async () => {
    const response = await fetch(DEPLOYMENT_URL);
    expect(response.status).toBe(200);
  });

  // Test 2: Verify critical pages
  test.each([
    ['Home page', '/'],
    ['About page', '/about'],
    ['Resources page', '/resources'],
    ['Observations page', '/observations']
  ])('%s loads correctly', async (name, path) => {
    const response = await fetch(`${DEPLOYMENT_URL}${path}`);
    expect(response.status).toBe(200);
    
    const html = await response.text();
    expect(html).toContain('</html>');
  });

  // Test 3: Check for client-side JavaScript errors
  test('No client-side JavaScript errors in build artifacts', async () => {
    let hasErrors = false;

    // This test requires access to build logs, so we're checking if we have deployment info
    if (deploymentInfo) {
      const logResult = await runNetlifyCLI(['api', 'getSiteDeploy', '--json', '--site-id', NETLIFY_SITE_ID, '--deploy-id', deploymentInfo.id]);
      
      if (logResult.success) {
        const deployData = JSON.parse(logResult.output);
        // Check for known error patterns in the build log
        hasErrors = !!deployData.error_message || deployData.state !== 'ready';
        
        if (hasErrors) {
          console.error('Deployment has errors:', deployData.error_message);
        }
      }
    } else {
      // If we don't have deployment info, we'll check the site for common client-side errors
      const response = await fetch(`${DEPLOYMENT_URL}`);
      const html = await response.text();
      
      // Check for signs that client-side scripts were properly restored
      hasErrors = !html.includes('document.addEventListener') && !html.includes('DOMContentLoaded');
    }

    expect(hasErrors).toBe(false);
  });

  // Test 4: Check dependency installation process
  test('Dependencies installed correctly', async () => {
    // We can use the Netlify CLI to verify the dependency cache status
    const result = await runNetlifyCLI(['buildbot:build', '--dry-run', '--context', 'test']);
    
    expect(result.success).toBe(true);
    expect(result.output).not.toContain('dependency_installation script returned non-zero exit code');
  });
});
