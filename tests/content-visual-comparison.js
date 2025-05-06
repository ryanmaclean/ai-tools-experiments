/**
 * Content Visual Comparison Test
 * 
 * This script compares the visual appearance of content between test and production environments
 * using Playwright's visual comparison capabilities. It focuses on verifying that:
 * 
 * 1. Episode content appears the same visually in both environments
 * 2. No duplicate headers/footers or chrome elements appear in content
 * 3. Layout is consistent across environments
 * 
 * All results are logged to Datadog for monitoring and alerting.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { getDatadogLogger } = require('../utils/datadog-logger');

// Configure environments
const environments = [
  {
    name: 'test',
    baseUrl: 'https://ai-tools-lab-tst.netlify.app',
    pathPrefix: '',
  },
  {
    name: 'production',
    baseUrl: 'https://ai-tools-lab.com',
    pathPrefix: '/pages',
  },
];

// Content pages to compare
const episodesToCompare = Array.from({ length: 20 }, (_, i) => `ep${i + 1}`);

// Get logger
const logger = getDatadogLogger('content-visual-comparison', {
  service: process.env.DD_SERVICE || 'ai-tools-lab',
  version: process.env.DD_VERSION || '1.0.0',
});

// Directory for screenshots
const screenshotDir = path.join(process.cwd(), 'test-results/visual-comparison');

// Ensure directory exists
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function captureScreenshots() {
  logger.info('Starting visual comparison of content between environments');
  
  const browser = await chromium.launch();
  const results = {
    total: episodesToCompare.length,
    compared: 0,
    matching: 0,
    differences: [],
  };

  try {
    // Create contexts for each environment
    const contexts = await Promise.all(
      environments.map(async (env) => {
        const context = await browser.newContext({
          viewport: { width: 1280, height: 720 },
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Visual-Comparison-Test',
        });
        return { env, context };
      })
    );

    // Compare each episode
    for (const episode of episodesToCompare) {
      logger.info(`Comparing episode: ${episode}`);
      
      try {
        const pages = await Promise.all(
          contexts.map(async ({ env, context }) => {
            const page = await context.newPage();
            // Construct URL based on environment - using standardized /pages/ep## format
            const url = `${env.baseUrl}${env.pathPrefix}/${episode}`;
            await page.goto(url, { waitUntil: 'networkidle' });
            
            // Wait for content to be fully loaded
            await page.waitForLoadState('networkidle');
            
            // Take full page screenshot since we don't know exact content structure
            const screenshotPath = path.join(screenshotDir, `${env.name}-${episode}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
            
            return { env, page, screenshotPath };
          })
        );

        // Compare screenshots
        const testScreenshot = fs.readFileSync(pages[0].screenshotPath);
        const prodScreenshot = fs.readFileSync(pages[1].screenshotPath);
        
        const imagesMatch = testScreenshot.equals(prodScreenshot);
        results.compared++;
        
        if (imagesMatch) {
          results.matching++;
          logger.info(`✅ Episode ${episode} visual appearance matches between environments`);
        } else {
          results.differences.push(episode);
          logger.error(`❌ Episode ${episode} visual appearance differs between environments`);
        }
        
        // Close pages
        await Promise.all(pages.map(({ page }) => page.close()));
        
      } catch (error) {
        logger.error(`Error comparing episode ${episode}: ${error.message}`);
        results.differences.push(episode);
      }
    }
    
    // Close contexts
    await Promise.all(contexts.map(({ context }) => context.close()));
    
  } catch (error) {
    logger.error(`Error during visual comparison: ${error.message}`);
  } finally {
    await browser.close();
  }
  
  // Log summary
  logger.info(`Visual comparison completed. Results: ${results.matching}/${results.compared} match`);
  
  if (results.differences.length > 0) {
    logger.error(`Episodes with visual differences: ${results.differences.join(', ')}`);
  }
  
  return results;
}

// Run test if called directly
if (require.main === module) {
  captureScreenshots()
    .then((results) => {
      // Log to Datadog
      logger.info('Content visual comparison complete', {
        results: {
          total: results.total,
          compared: results.compared,
          matching: results.matching,
          differences: results.differences,
        },
      });
      
      // Exit with appropriate code
      const success = results.differences.length === 0;
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      logger.error(`Fatal error: ${error.message}`);
      process.exit(1);
    });
} else {
  // Export for use in other tests
  module.exports = { captureScreenshots };
}
