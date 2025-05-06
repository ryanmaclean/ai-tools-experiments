/**
 * Simple Post-Deployment Test Script
 * 
 * This script verifies Datadog RUM integration and basic content accessibility 
 * in both test and production environments.
 */

const { test, expect } = require('@playwright/test');

// Environment configurations based on actual setup
const environments = {
  production: {
    name: 'Production',
    baseUrl: 'https://ai-tools-lab.com',
    pathPrefix: '/pages'
  },
  test: {
    name: 'Test',
    baseUrl: 'https://ai-tools-lab-tst.netlify.app',
    pathPrefix: '/pages' // Now using same prefix as production for URL standardization
  }
};

// Simple content checks for post-deployment verification
test.describe('Post-deployment verification', () => {
  // Verify that Datadog RUM is properly integrated in both environments
  test('Datadog RUM integration', async ({ page }) => {
    // Check in both environments
    for (const [envKey, env] of Object.entries(environments)) {
      console.log(`Checking Datadog RUM in ${env.name} environment`);
      await page.goto(`${env.baseUrl}${env.pathPrefix}/`);
      await page.waitForLoadState('networkidle');
      
      // Check for Datadog script
      const hasDatadogScript = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script'));
        return scripts.some(script => script.src && script.src.includes('datadog-rum'));
      });
      
      // Check for Datadog initialization
      const hasDatadogInitialized = await page.evaluate(() => {
        return typeof window.DD_RUM !== 'undefined';
      });
      
      // Verify Datadog presence
      expect(hasDatadogScript, `${env.name} environment should have Datadog script`).toBe(true);
      expect(hasDatadogInitialized, `${env.name} environment should initialize Datadog RUM`).toBe(true);
    }
  });
  
  // Verify that home page loads in both environments
  test('Home page loads properly', async ({ page }) => {
    for (const [envKey, env] of Object.entries(environments)) {
      console.log(`Checking home page in ${env.name} environment`);
      await page.goto(`${env.baseUrl}${env.pathPrefix}/`);
      await page.waitForLoadState('networkidle');
      
      // Get page title
      const title = await page.title();
      
      // Check for common elements that should be present
      const hasLogo = await page.evaluate(() => {
        return document.querySelector('header') !== null;
      });
      
      // Verify basic content
      expect(title, `${env.name} home page should have a title`).not.toBe('');
      expect(hasLogo, `${env.name} home page should have a header`).toBe(true);
    }
  });
});
