/**
 * Screenshot capture utility using Puppeteer MCP
 * 
 * This utility captures screenshots of both local and production pages
 * for visual comparison testing with Datadog CI Visibility.
 */

const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Create directories if they don't exist
const screenshotsDir = path.join(process.cwd(), 'tests/screenshots');
const localDir = path.join(screenshotsDir, 'local');
const prodDir = path.join(screenshotsDir, 'prod');
const diffDir = path.join(screenshotsDir, 'diff');

for (const dir of [screenshotsDir, localDir, prodDir, diffDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Captures screenshots using Puppeteer MCP
 * This function will be called in a test environment where MCP is available
 * 
 * @param {string} name - Screenshot name
 * @param {string} url - URL to capture
 * @param {Object} options - Capture options
 * @returns {Promise<string>} - Path to the captured screenshot
 */
async function captureWithMcp(name, url, options = {}) {
  // This will be handled by the MCP integration in the actual test
  // The test will use browser_preview and mcp0_puppeteer_* functions
  // This is a placeholder function that will be replaced by actual MCP code in the test
  
  console.log(`[MCP] Capturing screenshot for ${name} at ${url}`);
  return `Screenshot for ${name} would be captured via MCP`;
}

/**
 * Captures screenshots of both local and production pages
 * @param {string} pageName - The name of the page (e.g., 'about', 'ep01')
 * @param {string} localUrl - The local URL to capture (can be null if localPath is provided)
 * @param {string} prodUrl - The production URL to capture (can be null if prodPath is provided)
 * @param {string} localPath - Direct path for local screenshot (optional, overrides capture)
 * @param {string} prodPath - Direct path for production screenshot (optional, overrides capture)
 * @param {boolean} fullPage - Whether to capture the full page
 * @returns {Promise<Object>} - Paths to the captured screenshots
 */
async function prepareScreenshots(pageName, localUrl, prodUrl, options = {}) {
  const {
    localPath = null,
    prodPath = null,
    fullPage = true,
    width = 1280,
    height = 800
  } = options;
  
  console.log(`Preparing screenshots for ${pageName}...`);
  
  const localScreenshotPath = localPath || path.join(localDir, `${pageName}.png`);
  const prodScreenshotPath = prodPath || path.join(prodDir, `${pageName}.png`);
  const diffScreenshotPath = path.join(diffDir, `${pageName}-diff.png`);
  
  // Report to Datadog (if configured)
  try {
    const ddApiKey = process.env.DD_API_KEY;
    
    if (ddApiKey) {
      await axios.post(
        'https://api.datadoghq.com/api/v1/series',
        {
          series: [{
            metric: 'test.screenshot.prepared',
            points: [[Math.floor(Date.now() / 1000), 1]],
            type: 'count',
            tags: [`page:${pageName}`, `env:${process.env.NODE_ENV || 'test'}`]
          }]
        },
        { headers: { 'Content-Type': 'application/json', 'DD-API-KEY': ddApiKey } }
      );
    }
  } catch (error) {
    console.warn('Could not send metrics to Datadog:', error.message);
  }
  
  return {
    localPath: localScreenshotPath,
    prodPath: prodScreenshotPath,
    diffPath: diffScreenshotPath,
    pageName,
    captureOptions: {
      fullPage,
      width,
      height
    }
  };
}

/**
 * Adjusts URLs to handle differences between test and production environments
 * @param {string} pageName - Page name
 * @param {string} localPort - Local port (default: 4321)
 * @returns {Object} - URLs for local and production environments
 */
function getPageUrls(pageName, localPort = 4321) {
  // Handle special cases for URL patterns based on known differences
  let localPath, prodPath;
  
  // Convert pageName to proper URL paths accounting for differences
  if (pageName.startsWith('ep')) {
    // Episodes typically follow /pages/epXX in prod but might be just /epXX in test
    localPath = `/pages/${pageName}`;
    prodPath = `/pages/${pageName}`;
  } else if (['resources', 'about', 'observations'].includes(pageName)) {
    // These pages have /pages/ prefix in prod but might not in test
    localPath = `/${pageName}`;
    prodPath = `/pages/${pageName}`;
  } else {
    // Default paths
    localPath = `/${pageName}`;
    prodPath = `/${pageName}`;
  }
  
  return {
    localUrl: `http://localhost:${localPort}${localPath}`,
    prodUrl: `https://ai-tools-lab.com${prodPath}`
  };
}

/**
 * Records test results in Datadog (if configured)
 * @param {string} pageName - Page name
 * @param {boolean} passed - Whether the test passed
 * @param {number} diffPercentage - Percentage difference between images
 * @param {Object} analysisResults - Analysis results (optional)
 */
async function recordTestResult(pageName, passed, diffPercentage, analysisResults = null) {
  try {
    const ddApiKey = process.env.DD_API_KEY;
    
    if (!ddApiKey) {
      return;
    }
    
    // Report metric
    await axios.post(
      'https://api.datadoghq.com/api/v1/series',
      {
        series: [
          {
            metric: 'test.visual.difference_percent',
            points: [[Math.floor(Date.now() / 1000), diffPercentage]],
            type: 'gauge',
            tags: [`page:${pageName}`, `passed:${passed}`, `env:${process.env.NODE_ENV || 'test'}`]
          },
          {
            metric: 'test.visual.passed',
            points: [[Math.floor(Date.now() / 1000), passed ? 1 : 0]],
            type: 'gauge',
            tags: [`page:${pageName}`, `env:${process.env.NODE_ENV || 'test'}`]
          }
        ]
      },
      { headers: { 'Content-Type': 'application/json', 'DD-API-KEY': ddApiKey } }
    );
    
    // Report event for failures
    if (!passed) {
      await axios.post(
        'https://api.datadoghq.com/api/v1/events',
        {
          title: `Visual Test Failure: ${pageName}`,
          text: `Page ${pageName} failed visual comparison with ${diffPercentage.toFixed(2)}% difference.${analysisResults ? '\n\nAnalysis: ' + JSON.stringify(analysisResults) : ''}`,
          alert_type: 'warning',
          tags: ['test:visual', `page:${pageName}`, `env:${process.env.NODE_ENV || 'test'}`]
        },
        { headers: { 'Content-Type': 'application/json', 'DD-API-KEY': ddApiKey } }
      );
    }
  } catch (error) {
    console.warn('Could not send test results to Datadog:', error.message);
  }
}

module.exports = {
  prepareScreenshots,
  captureWithMcp,
  getPageUrls,
  recordTestResult
};
