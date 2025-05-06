// Simple test to verify the About page is working correctly
const { test, expect } = require('@playwright/test');
const { datadogLogs } = require('../scripts/datadog');

const testEnvironment = 'https://ai-tools-lab-tst.netlify.app';
const prodEnvironment = 'https://ai-tools-lab.com';

test.describe('About page test', () => {
  test('About page loads correctly in test environment', async ({ page }) => {
    // Log test start to Datadog
    datadogLogs.logger.info('Starting About page test for test environment', {
      test: 'about-page',
      environment: 'test'
    });

    // Navigate to the about page
    await page.goto(`${testEnvironment}/about`);
    
    // Wait for the page to load
    await page.waitForSelector('.about-content');
    
    // Check if the About page content is visible
    const aboutTitle = await page.textContent('h1');
    expect(aboutTitle).toContain('About AI Tools Lab');
    
    // Verify some content exists
    const aboutContent = await page.textContent('.about-content');
    expect(aboutContent.length).toBeGreaterThan(100); // Should have meaningful content
    
    datadogLogs.logger.info('Test environment About page test completed successfully', {
      test: 'about-page',
      environment: 'test',
      status: 'success'
    });
  });

  test('About page loads correctly in production environment', async ({ page }) => {
    // Log test start to Datadog
    datadogLogs.logger.info('Starting About page test for production environment', {
      test: 'about-page',
      environment: 'production'
    });

    // Navigate to the about page
    await page.goto(`${prodEnvironment}/pages/about`);
    
    // Wait for the page to load
    await page.waitForSelector('.about-content');
    
    // Check if the About page content is visible
    const aboutTitle = await page.textContent('h1');
    expect(aboutTitle).toContain('About AI Tools Lab');
    
    // Verify some content exists
    const aboutContent = await page.textContent('.about-content');
    expect(aboutContent.length).toBeGreaterThan(100); // Should have meaningful content
    
    datadogLogs.logger.info('Production environment About page test completed successfully', {
      test: 'about-page',
      environment: 'production',
      status: 'success'
    });
  });
});
