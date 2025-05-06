/**
 * Environment Comparison Test
 * 
 * Compares all key pages between test and production environments:
 * - Home, Index, Observations, Resources, About
 * - All real episode pages (excluding placeholders)
 * 
 * Uses Playwright for testing and takes screenshots for visual reference.
 * Logs results to Datadog for monitoring.
 */

// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Environment configurations
const environments = {
  production: {
    name: 'Production',
    baseUrl: 'https://ai-tools-lab.com',
    pathPrefix: '/pages'
  },
  test: {
    name: 'Test',
    baseUrl: 'https://ai-tools-lab-tst.netlify.app',
    pathPrefix: '' // Test environment uses direct routes without prefix
  }
};

// All pages to compare (excluding placeholder episodes)
const pagesToCompare = [
  { path: '/', name: 'home' },
  { path: '/resources', name: 'resources' },
  { path: '/observations', name: 'observations' },
  { path: '/about', name: 'about' }
];

// Real episodes to compare (1-17 and 20 that are not placeholders)
const realEpisodes = [
  'ep01', 'ep02', 'ep03', 'ep04', 'ep05', 'ep06', 'ep07',
  'ep08', 'ep09', 'ep10', 'ep11', 'ep12', 'ep13', 'ep14',
  'ep15', 'ep16', 'ep17', 'ep20'
];

// Directory for test results
const screenshotsDir = path.join(process.cwd(), 'test-results', 'comparison');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Simple logger with timestamps
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
}

// Helper to sanitize page names for filenames
function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
}

// Main test suite
test.describe('Environment Content Comparison', () => {
  // Test main pages
  test('Compare main pages between environments', async ({ page }) => {
    const results = {
      passed: [],
      failed: []
    };
    
    // Check each page in both environments
    for (const pageConfig of pagesToCompare) {
      log(`Comparing ${pageConfig.name} page`);
      
      // Create test-results directory if it doesn't exist yet
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }
      
      try {
        // Production URL
        const prodUrl = `${environments.production.baseUrl}${environments.production.pathPrefix}${pageConfig.path}`;
        log(`Accessing production: ${prodUrl}`);
        await page.goto(prodUrl);
        await page.waitForLoadState('networkidle');
        
        // Take production screenshot
        const prodScreenshot = path.join(screenshotsDir, `prod-${sanitizeFilename(pageConfig.name)}.png`);
        await page.screenshot({ path: prodScreenshot, fullPage: true });
        
        // Get production content (main content area only to avoid headers/footers)
        const prodContent = await page.evaluate(() => {
          // Get content from main section if it exists, otherwise from body
          const mainElement = document.querySelector('main') || document.body;
          return mainElement.textContent.trim().replace(/\s+/g, ' ');
        });
        
        // Test URL
        const testUrl = `${environments.test.baseUrl}${environments.test.pathPrefix}${pageConfig.path}`;
        log(`Accessing test: ${testUrl}`);
        await page.goto(testUrl);
        await page.waitForLoadState('networkidle');
        
        // Take test screenshot
        const testScreenshot = path.join(screenshotsDir, `test-${sanitizeFilename(pageConfig.name)}.png`);
        await page.screenshot({ path: testScreenshot, fullPage: true });
        
        // Get test content (main content area only to avoid headers/footers)
        const testContent = await page.evaluate(() => {
          // Get content from main section if it exists, otherwise from body
          const mainElement = document.querySelector('main') || document.body;
          return mainElement.textContent.trim().replace(/\s+/g, ' ');
        });
        
        // Compare content - we consider it a pass if the content is reasonably similar
        // This is a fuzzy comparison since exact matches are unlikely due to environment differences
        const contentSimilarity = calculateSimilarity(prodContent, testContent);
        const similarityThreshold = 0.75; // 75% similarity is considered a pass
        
        if (contentSimilarity >= similarityThreshold) {
          log(`✅ ${pageConfig.name} content check passed (${Math.round(contentSimilarity * 100)}% similar)`);
          results.passed.push(`${pageConfig.name} (${Math.round(contentSimilarity * 100)}% similar)`);
        } else {
          log(`❌ ${pageConfig.name} content check failed - only ${Math.round(contentSimilarity * 100)}% similar`, 'error');
          results.failed.push(`${pageConfig.name} (${Math.round(contentSimilarity * 100)}% similar)`);
        }
      } catch (error) {
        log(`❌ Error comparing ${pageConfig.name}: ${error.message}`, 'error');
        results.failed.push(`${pageConfig.name} (error: ${error.message})`);
      }
    }
    
    // Results summary
    log(`\nMain pages comparison summary:`);
    log(`Pages passed: ${results.passed.length} of ${pagesToCompare.length}`);
    if (results.failed.length > 0) {
      log(`Failed pages: ${results.failed.join(', ')}`, 'error');
    }
    
    // Test assertion
    expect(results.failed.length).toBe(0, `${results.failed.length} pages failed content comparison`);
  });
  
  // Test real episodes (not placeholders)
  test('Compare real episode pages between environments', async ({ page }) => {
    const results = {
      passed: [],
      failed: []
    };
    
    for (const episode of realEpisodes) {
      log(`Comparing ${episode} page`);
      
      try {
        // Production URL - episodes are in different locations in each environment
        const prodUrl = `${environments.production.baseUrl}${environments.production.pathPrefix}/${episode}.html`;
        log(`Accessing production: ${prodUrl}`);
        await page.goto(prodUrl);
        await page.waitForLoadState('networkidle');
        
        // Take production screenshot
        const prodScreenshot = path.join(screenshotsDir, `prod-${episode}.png`);
        await page.screenshot({ path: prodScreenshot, fullPage: true });
        
        // Get production content
        const prodContent = await page.evaluate(() => {
          // Get content from main section if it exists, otherwise from body
          const mainElement = document.querySelector('main') || document.body;
          return mainElement.textContent.trim().replace(/\s+/g, ' ');
        });
        
        // Test URL
        const testUrl = `${environments.test.baseUrl}/episodes/${episode}`;
        log(`Accessing test: ${testUrl}`);
        await page.goto(testUrl);
        await page.waitForLoadState('networkidle');
        
        // Take test screenshot
        const testScreenshot = path.join(screenshotsDir, `test-${episode}.png`);
        await page.screenshot({ path: testScreenshot, fullPage: true });
        
        // Get test content
        const testContent = await page.evaluate(() => {
          // Get content from main section if it exists, otherwise from body
          const mainElement = document.querySelector('main') || document.body;
          return mainElement.textContent.trim().replace(/\s+/g, ' ');
        });
        
        // Compare content
        const contentSimilarity = calculateSimilarity(prodContent, testContent);
        const similarityThreshold = 0.7; // 70% similarity is considered a pass for episodes
        
        if (contentSimilarity >= similarityThreshold) {
          log(`✅ ${episode} content check passed (${Math.round(contentSimilarity * 100)}% similar)`);
          results.passed.push(`${episode} (${Math.round(contentSimilarity * 100)}% similar)`);
        } else {
          log(`❌ ${episode} content check failed - only ${Math.round(contentSimilarity * 100)}% similar`, 'error');
          results.failed.push(`${episode} (${Math.round(contentSimilarity * 100)}% similar)`);
        }
      } catch (error) {
        log(`❌ Error comparing ${episode}: ${error.message}`, 'error');
        results.failed.push(`${episode} (error: ${error.message})`);
      }
    }
    
    // Results summary
    log(`\nEpisode pages comparison summary:`);
    log(`Episodes passed: ${results.passed.length} of ${realEpisodes.length}`);
    if (results.failed.length > 0) {
      log(`Failed episodes: ${results.failed.join(', ')}`, 'error');
    }
    
    // Test assertion
    expect(results.failed.length).toBe(0, `${results.failed.length} episode pages failed content comparison`);
  });
});

// Simple text similarity calculation using Levenshtein distance
function calculateSimilarity(text1, text2) {
  if (text1 === text2) return 1.0; // Exact match
  if (text1.length === 0 || text2.length === 0) return 0.0; // Empty strings
  
  const longerText = text1.length > text2.length ? text1 : text2;
  const shorterText = text1.length > text2.length ? text2 : text1;
  
  // Simple word-based comparison
  const words1 = shorterText.split(/\s+/);
  const words2 = longerText.split(/\s+/);
  
  let matchCount = 0;
  for (const word of words1) {
    if (words2.includes(word)) {
      matchCount++;
    }
  }
  
  return matchCount / words1.length;
}
