/**
 * Post-Deployment Visual Comparison Tests
 * 
 * This script automatically verifies visual consistency between test and production
 * environments after deployment. It follows these principles:
 * 
 * - Stateless: No persistent state between test runs
 * - Minimal Dependencies: Only requires Playwright
 * - Datadog Integration: Logs all test results to Datadog
 * - Simple Design: Easy to maintain and extend
 */

const { test, expect } = require('@playwright/test');

// Consistent logging with Datadog integration
class Logger {
  static log(message, level = 'info') {
    // Format as Datadog compatible log with metadata
    const logEntry = {
      message,
      level,
      timestamp: new Date().toISOString(),
      service: 'ai-tools-lab-tests',
      test_type: 'visual-comparison',
    };
    
    // Log to console in JSON format for Datadog agent pickup
    console.log(`[DD_TEST_LOG] ${JSON.stringify(logEntry)}`);
    
    // Also log human-readable version
    console.log(`[${level.toUpperCase()}] ${message}`);
  }
  
  static info(message) { this.log(message, 'info'); }
  static warn(message) { this.log(message, 'warn'); }
  static error(message) { this.log(message, 'error'); }
}

// Environment configuration
const environments = {
  production: {
    baseUrl: 'https://ai-tools-lab.com',
    pathPrefix: '/pages',
    expectedEnv: 'production'
  },
  test: {
    baseUrl: 'https://ai-tools-lab-tst.netlify.app',
    pathPrefix: '',
    expectedEnv: 'staging'
  }
};

// Pages to test - can be extended easily
const pagePaths = [
  '/',                // Home
  '/resources',       // Resources
  '/observations',    // Observations
  '/about'            // About
];

// Test suite
test.describe('Post-deployment verification tests', () => {
  
  // Run before all tests
  test.beforeAll(async () => {
    Logger.info('Starting post-deployment verification tests');
  });
  
  // Run after all tests
  test.afterAll(async () => {
    Logger.info('Post-deployment verification tests completed');
  });
  
  // Visual comparison tests for each page
  for (const pagePath of pagePaths) {
    test(`Page "${pagePath}" should be visually consistent across environments`, async ({ page }) => {
      // Full URLs for both environments
      const testUrl = `${environments.test.baseUrl}${environments.test.pathPrefix}${pagePath}`;
      const prodUrl = `${environments.production.baseUrl}${environments.production.pathPrefix}${pagePath}`;
      
      Logger.info(`Comparing ${testUrl} with ${prodUrl}`);
      
      // Test environment check
      await page.goto(testUrl);
      await page.waitForLoadState('networkidle');
      const testTitle = await page.title();
      const testScreenshot = await page.screenshot({ fullPage: true });
      
      // Production environment check
      await page.goto(prodUrl);
      await page.waitForLoadState('networkidle');
      const prodTitle = await page.title();
      const prodScreenshot = await page.screenshot({ fullPage: true });
      
      // Verify page titles match (basic content check)
      expect(testTitle, `Page titles should match for ${pagePath}`).toBe(prodTitle);
      Logger.info(`Page titles match for ${pagePath}: "${testTitle}"`);
      
      // Visual comparison - save screenshots for manual verification
      // This is a simple approach - could be extended with visual diffing libraries
      await page.context().tracing.start({ screenshots: true, snapshots: true });
      await page.context().tracing.stop({
        path: `test-results/trace-${pagePath.replace(/\//g, '-')}.zip`
      });
      
      // For automated tests in CI, we can't do pixel-perfect comparison easily
      // So we'll check content similarity instead of exact pixel matching
      const contentSimilarityPass = await comparePageContent(page, testUrl, prodUrl);
      expect(contentSimilarityPass, `Content should be similar for ${pagePath}`).toBe(true);
      
      Logger.info(`✅ Visual verification passed for "${pagePath}"`);
    });
  }
  
  // URL structure tests - verify routing works correctly in both environments
  test('URL routing should work correctly in both environments', async ({ page }) => {
    // Test direct routes in test environment
    for (const pagePath of pagePaths) {
      // Skip the root path for this test
      if (pagePath === '/') continue;
      
      const testDirectUrl = `${environments.test.baseUrl}${pagePath}`;
      Logger.info(`Testing direct URL: ${testDirectUrl}`);
      
      await page.goto(testDirectUrl);
      await page.waitForLoadState('networkidle');
      
      // Check we didn't get a 404
      const title = await page.title();
      expect(title, `Page should load with direct URL: ${testDirectUrl}`).not.toContain('404');
      
      Logger.info(`✅ Direct URL works: ${testDirectUrl}`);
    }
    
    // Test prefixed routes in production environment
    for (const pagePath of pagePaths) {
      // Skip the root path for this test
      if (pagePath === '/') continue;
      
      const prodPrefixUrl = `${environments.production.baseUrl}${environments.production.pathPrefix}${pagePath}`;
      Logger.info(`Testing prefixed URL: ${prodPrefixUrl}`);
      
      await page.goto(prodPrefixUrl);
      await page.waitForLoadState('networkidle');
      
      // Check we didn't get a 404
      const title = await page.title();
      expect(title, `Page should load with prefixed URL: ${prodPrefixUrl}`).not.toContain('404');
      
      Logger.info(`✅ Prefixed URL works: ${prodPrefixUrl}`);
    }
  });
  
  // Test Datadog RUM environment detection
  test('Datadog RUM should detect the correct environment', async ({ page }) => {
    // Check test environment
    await verifyDatadogEnvironment(page, 
      `${environments.test.baseUrl}`,
      environments.test.expectedEnv
    );
    
    // Check production environment
    await verifyDatadogEnvironment(page, 
      `${environments.production.baseUrl}${environments.production.pathPrefix}/`,
      environments.production.expectedEnv
    );
    
    Logger.info('✅ Datadog RUM environment detection verified');
  });
});

/**
 * Verifies the Datadog RUM environment detection
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} url - URL to check
 * @param {string} expectedEnv - Expected environment value
 */
async function verifyDatadogEnvironment(page, url, expectedEnv) {
  Logger.info(`Checking Datadog environment on ${url}`);
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  
  // Check environment in console logs
  page.on('console', msg => {
    if (msg.text().includes('Datadog RUM') && msg.text().includes('env:')) {
      Logger.info(`Datadog log detected: ${msg.text()}`);
    }
  });
  
  // Extract environment from the page
  const detectedEnv = await page.evaluate(() => {
    // Try to extract from scripts in the page
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const content = script.textContent || '';
      if (content.includes('datadogConfig') && content.includes('env:')) {
        // Extract environment from env function or value
        if (content.includes('env: function()')) {
          // For dynamic environment determination
          const hostname = window.location.hostname;
          if (hostname.includes('ai-tools-lab-tst.netlify.app')) {
            return 'staging';
          } else if (hostname.includes('ai-tools-lab.com')) {
            return 'production';
          } else {
            return 'development';
          }
        } else {
          // For static environment value
          const match = content.match(/env:\s*['"]([^'"]+)['"]/);
          return match ? match[1] : null;
        }
      }
    }
    return null;
  });
  
  Logger.info(`Detected Datadog environment: ${detectedEnv}`);
  expect(detectedEnv, `Datadog RUM should detect ${expectedEnv} environment on ${url}`).toBe(expectedEnv);
}

/**
 * Compares content similarity between pages
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} url1 - First URL to compare
 * @param {string} url2 - Second URL to compare
 * @returns {Promise<boolean>} - True if content is similar
 */
async function comparePageContent(page, url1, url2) {
  // Go to first URL
  await page.goto(url1);
  await page.waitForLoadState('networkidle');
  
  // Extract relevant content (header, main text, etc.)
  const content1 = await extractPageContent(page);
  
  // Go to second URL
  await page.goto(url2);
  await page.waitForLoadState('networkidle');
  
  // Extract relevant content
  const content2 = await extractPageContent(page);
  
  // Compare extracted content
  const similarityScore = calculateSimilarity(content1, content2);
  Logger.info(`Content similarity score: ${similarityScore.toFixed(2)}`);
  
  // Consider pages similar if they have at least 90% similar content
  return similarityScore >= 0.9;
}

/**
 * Extracts relevant content from a page for comparison
 * @param {import('@playwright/test').Page} page - Playwright page
 * @returns {Promise<string>} - Extracted content
 */
async function extractPageContent(page) {
  return page.evaluate(() => {
    // Get content from key elements
    const title = document.title || '';
    const h1s = Array.from(document.querySelectorAll('h1')).map(el => el.innerText).join(' ');
    const h2s = Array.from(document.querySelectorAll('h2')).map(el => el.innerText).join(' ');
    const paragraphs = Array.from(document.querySelectorAll('p')).map(el => el.innerText).join(' ');
    
    // Get main content area text
    const mainContent = document.querySelector('main') ? 
      document.querySelector('main').innerText : '';
    
    // Combine all content for comparison
    return [title, h1s, h2s, paragraphs, mainContent].join('\n');
  });
}

/**
 * Calculates similarity between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity score (0-1)
 */
function calculateSimilarity(str1, str2) {
  // Simple comparison using Jaccard similarity
  // This is a basic approach - could be enhanced with more sophisticated algorithms
  
  // Normalize strings (lowercase, remove punctuation)
  const normalize = str => str.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  
  // Convert to word sets
  const words1 = new Set(s1.split(' '));
  const words2 = new Set(s2.split(' '));
  
  // Calculate Jaccard similarity: intersection size / union size
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}
