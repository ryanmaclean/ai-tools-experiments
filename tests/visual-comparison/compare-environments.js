const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration - will be overridden by command line args
const DEFAULT_CONFIG = {
  productionUrl: process.env.PRODUCTION_URL || 'https://production.example.com',
  testUrl: process.env.TEST_URL || 'https://test.example.com',
  outputDir: path.join(__dirname, '..', '..', 'test-results', 'visual-comparison'),
  pagesToTest: [
    { path: '/', name: 'homepage' },
    { path: '/about', name: 'about' },
    { path: '/contact', name: 'contact' }
  ],
  // Optional Datadog config
  datadogReporting: process.env.DATADOG_REPORTING === 'true',
  deployId: process.env.DEPLOY_ID || `deploy-${Date.now()}`
};

// Parse command line arguments
const args = process.argv.slice(2);
let config = { ...DEFAULT_CONFIG };

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--production-url' && i + 1 < args.length) {
    config.productionUrl = args[++i];
  } else if (arg === '--test-url' && i + 1 < args.length) {
    config.testUrl = args[++i];
  } else if (arg === '--pages' && i + 1 < args.length) {
    const pagesArg = args[++i];
    try {
      // Format: path1:name1,path2:name2
      config.pagesToTest = pagesArg.split(',').map(pageStr => {
        const [path, name] = pageStr.split(':');
        return { path, name: name || path.replace(/\W+/g, '-') };
      });
    } catch (e) {
      console.error('Error parsing pages argument:', e);
    }
  } else if (arg === '--output-dir' && i + 1 < args.length) {
    config.outputDir = args[++i];
  } else if (arg === '--datadog-reporting') {
    config.datadogReporting = true;
  } else if (arg === '--deploy-id' && i + 1 < args.length) {
    config.deployId = args[++i];
  }
}

// Ensure output directory exists
fs.mkdirSync(config.outputDir, { recursive: true });

// Create comparison results
const comparisonResults = {
  timestamp: new Date().toISOString(),
  deployId: config.deployId,
  productionUrl: config.productionUrl,
  testUrl: config.testUrl,
  pages: [],
  summary: {
    totalPages: config.pagesToTest.length,
    visualDifferences: 0,
    performanceIssues: 0
  }
};

// Test for each page in the config
for (const page of config.pagesToTest) {
  test(`Compare ${page.name} between environments`, async ({ browser }) => {
    const pageResult = {
      name: page.name,
      path: page.path,
      visualDifference: false,
      visualDifferenceScore: 0,
      performanceMetrics: {
        production: {},
        test: {}
      },
      performanceDifference: false,
      screenshots: {}
    };

    // Create contexts for both environments
    const productionContext = await browser.newContext();
    const testContext = await browser.newContext();
    
    // Create pages
    const productionPage = await productionContext.newPage();
    const testPage = await testContext.newPage();

    // Navigate to the page in both environments and capture performance metrics
    console.log(`Testing ${page.name} (${page.path})...`);
    
    // Start performance measurement for production
    const prodStartTime = Date.now();
    
    try {
      await productionPage.goto(config.productionUrl + page.path, { waitUntil: 'networkidle' });
      const prodEndTime = Date.now();
      pageResult.performanceMetrics.production.loadTime = prodEndTime - prodStartTime;
      
      // Take a screenshot of the production page
      const productionScreenshotPath = path.join(config.outputDir, `${page.name}-production.png`);
      await productionPage.screenshot({ path: productionScreenshotPath, fullPage: true });
      pageResult.screenshots.production = productionScreenshotPath;
      
      // Get other metrics
      pageResult.performanceMetrics.production.domNodes = await productionPage.evaluate(() => document.querySelectorAll('*').length);
      pageResult.performanceMetrics.production.cssRules = await productionPage.evaluate(() => {
        let total = 0;
        for (let i = 0; i < document.styleSheets.length; i++) {
          try {
            total += document.styleSheets[i].cssRules.length;
          } catch (e) {
            // Cross-origin stylesheets will throw an error
          }
        }
        return total;
      });
    } catch (error) {
      console.error(`Error navigating to production ${page.path}:`, error);
      pageResult.productionError = error.message;
    }
    
    // Start performance measurement for test
    const testStartTime = Date.now();
    
    try {
      await testPage.goto(config.testUrl + page.path, { waitUntil: 'networkidle' });
      const testEndTime = Date.now();
      pageResult.performanceMetrics.test.loadTime = testEndTime - testStartTime;
      
      // Take a screenshot of the test page
      const testScreenshotPath = path.join(config.outputDir, `${page.name}-test.png`);
      await testPage.screenshot({ path: testScreenshotPath, fullPage: true });
      pageResult.screenshots.test = testScreenshotPath;
      
      // Get other metrics
      pageResult.performanceMetrics.test.domNodes = await testPage.evaluate(() => document.querySelectorAll('*').length);
      pageResult.performanceMetrics.test.cssRules = await testPage.evaluate(() => {
        let total = 0;
        for (let i = 0; i < document.styleSheets.length; i++) {
          try {
            total += document.styleSheets[i].cssRules.length;
          } catch (e) {
            // Cross-origin stylesheets will throw an error
          }
        }
        return total;
      });
    } catch (error) {
      console.error(`Error navigating to test ${page.path}:`, error);
      pageResult.testError = error.message;
    }
    
    // Generate a visual comparison if both screenshots exist
    if (pageResult.screenshots.production && pageResult.screenshots.test) {
      try {
        // For a complete implementation, you'd use Playwright's built-in screenshot comparison
        // But for this demonstration, we'll use ImageMagick which is likely available on the system
        
        // Create a CSS file to mask volatile elements (optional)
        const cssPath = path.join(config.outputDir, 'volatileFilter.css');
        const cssContent = `
          /* Hide elements that change frequently */
          .timestamp, time, [data-timestamp],
          /* Hide ads and dynamic content */
          iframe, .ad, [data-ad], [data-dynamic],
          /* Hide elements with animation */
          .animate, .carousel, .slider, [data-animate]
          {
            visibility: hidden !important;
            opacity: 0 !important;
          }
        `;
        fs.writeFileSync(cssPath, cssContent);
        
        // Generate a diff image using ImageMagick
        const comparisonPath = path.join(config.outputDir, `${page.name}-diff.png`);
        execSync(`convert ${pageResult.screenshots.production} ${pageResult.screenshots.test} -compose difference -composite ${comparisonPath}`);
        
        // Calculate a difference score using ImageMagick
        const diffOutput = execSync(`compare -metric RMSE ${pageResult.screenshots.production} ${pageResult.screenshots.test} null 2>&1`, { encoding: 'utf8' });
        const diffScore = parseFloat(diffOutput.match(/(\d+\.\d+)/)?.[1] || '0');
        
        // For better results, we would implement the Playwright native comparison
        // but that requires setting up a proper Playwright test environment
        // const pixelmatch = require('pixelmatch');
        // const { PNG } = require('pngjs');
        
        pageResult.visualDifferenceScore = diffScore;
        pageResult.visualDifference = diffScore > 0.05; // 5% threshold
        pageResult.screenshots.diff = comparisonPath;
        
        if (pageResult.visualDifference) {
          comparisonResults.summary.visualDifferences++;
        }
      } catch (error) {
        console.error(`Error generating visual comparison for ${page.name}:`, error);
        pageResult.comparisonError = error.message;
      }
    }
    
    // Check for performance differences
    if (pageResult.performanceMetrics.production.loadTime && pageResult.performanceMetrics.test.loadTime) {
      const loadTimeDiff = Math.abs(pageResult.performanceMetrics.test.loadTime - pageResult.performanceMetrics.production.loadTime);
      const loadTimeThreshold = pageResult.performanceMetrics.production.loadTime * 0.2; // 20% threshold
      
      pageResult.performanceDifference = loadTimeDiff > loadTimeThreshold;
      pageResult.performanceMetrics.loadTimeDifference = loadTimeDiff;
      pageResult.performanceMetrics.loadTimeDifferencePercent = 
        (loadTimeDiff / pageResult.performanceMetrics.production.loadTime) * 100;
      
      if (pageResult.performanceDifference) {
        comparisonResults.summary.performanceIssues++;
      }
    }
    
    // Add page result to overall results
    comparisonResults.pages.push(pageResult);
    
    // Close contexts
    await productionContext.close();
    await testContext.close();
  });
}

// After all tests run, save the results and optionally send to Datadog
test.afterAll(async () => {
  // Save results to a JSON file
  const resultsPath = path.join(config.outputDir, 'comparison-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(comparisonResults, null, 2));
  console.log(`Results saved to ${resultsPath}`);
  
  // Generate HTML report
  const htmlReportPath = path.join(config.outputDir, 'report.html');
  generateHtmlReport(comparisonResults, htmlReportPath);
  console.log(`HTML report generated at ${htmlReportPath}`);
  
  // Send to Datadog if enabled
  if (config.datadogReporting) {
    await sendToDatadog(comparisonResults);
  }
});

/**
 * Generate an HTML report for the comparison results
 */
function generateHtmlReport(results, outputPath) {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Environment Comparison Report</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
      h1 { color: #333; }
      .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
      .page { margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
      .page h2 { margin-top: 0; color: #444; }
      .metrics { display: flex; margin-bottom: 15px; }
      .metrics div { flex: 1; }
      .warning { color: orange; }
      .error { color: red; }
      .success { color: green; }
      .images { display: flex; flex-wrap: wrap; gap: 10px; }
      .image-container { text-align: center; }
      img { max-width: 100%; height: auto; max-height: 300px; border: 1px solid #ddd; }
    </style>
  </head>
  <body>
    <h1>Environment Comparison Report</h1>
    
    <div class="summary">
      <h2>Summary</h2>
      <p>Production URL: ${results.productionUrl}</p>
      <p>Test URL: ${results.testUrl}</p>
      <p>Deploy ID: ${results.deployId}</p>
      <p>Timestamp: ${results.timestamp}</p>
      <p>Pages Tested: ${results.summary.totalPages}</p>
      <p class="${results.summary.visualDifferences > 0 ? 'error' : 'success'}">
        Visual Differences: ${results.summary.visualDifferences}/${results.summary.totalPages}
      </p>
      <p class="${results.summary.performanceIssues > 0 ? 'warning' : 'success'}">
        Performance Issues: ${results.summary.performanceIssues}/${results.summary.totalPages}
      </p>
    </div>
    
    ${results.pages.map(page => `
      <div class="page">
        <h2>${page.name} (${page.path})</h2>
        
        ${page.productionError || page.testError ? `
          <div class="error">
            ${page.productionError ? `<p>Production Error: ${page.productionError}</p>` : ''}
            ${page.testError ? `<p>Test Error: ${page.testError}</p>` : ''}
          </div>
        ` : ''}
        
        <div class="metrics">
          <div>
            <h3>Production Metrics</h3>
            <p>Load Time: ${page.performanceMetrics.production.loadTime}ms</p>
            <p>DOM Nodes: ${page.performanceMetrics.production.domNodes}</p>
            <p>CSS Rules: ${page.performanceMetrics.production.cssRules}</p>
          </div>
          
          <div>
            <h3>Test Metrics</h3>
            <p>Load Time: ${page.performanceMetrics.test.loadTime}ms</p>
            <p>DOM Nodes: ${page.performanceMetrics.test.domNodes}</p>
            <p>CSS Rules: ${page.performanceMetrics.test.cssRules}</p>
          </div>
        </div>
        
        ${page.performanceDifference ? `
          <div class="warning">
            <p>Performance Difference Detected:</p>
            <p>Load Time Difference: ${page.performanceMetrics.loadTimeDifference.toFixed(2)}ms (${page.performanceMetrics.loadTimeDifferencePercent.toFixed(2)}%)</p>
          </div>
        ` : ''}
        
        ${page.visualDifference ? `
          <div class="error">
            <p>Visual Difference Detected</p>
            <p>Difference Score: ${page.visualDifferenceScore.toFixed(4)}</p>
          </div>
        ` : ''}
        
        <div class="images">
          ${page.screenshots.production ? `
            <div class="image-container">
              <h4>Production</h4>
              <img src="${path.basename(page.screenshots.production)}" alt="Production screenshot">
            </div>
          ` : ''}
          
          ${page.screenshots.test ? `
            <div class="image-container">
              <h4>Test</h4>
              <img src="${path.basename(page.screenshots.test)}" alt="Test screenshot">
            </div>
          ` : ''}
          
          ${page.screenshots.diff ? `
            <div class="image-container">
              <h4>Difference</h4>
              <img src="${path.basename(page.screenshots.diff)}" alt="Difference image">
            </div>
          ` : ''}
        </div>
      </div>
    `).join('')}
  </body>
  </html>
  `;
  
  fs.writeFileSync(outputPath, html);
}

/**
 * Send comparison results to Datadog using the CLI
 */
async function sendToDatadog(results) {
  try {
    console.log('Sending results to Datadog...');
    
    // Ensure Datadog CLI is installed and configured
    // Using a similar approach to our other Datadog CLI scripts
    const datadogApiKey = process.env.DD_API_KEY;
    const datadogAppKey = process.env.DD_APP_KEY;
    
    if (!datadogApiKey || !datadogAppKey) {
      console.error('DD_API_KEY and DD_APP_KEY must be set in environment');
      return;
    }
    
    // Verify Datadog CLI is installed
    try {
      execSync('datadog -v', { stdio: 'pipe' });
    } catch (error) {
      console.log('Datadog CLI not found, installing...');
      execSync('npm install -g @datadog/cli', { stdio: 'inherit' });
    }
    
    // Configure Datadog CLI
    execSync(`datadog config set api_key ${datadogApiKey}`, { stdio: 'pipe' });
    execSync(`datadog config set application_key ${datadogAppKey}`, { stdio: 'pipe' });
    
    // Create a Datadog event for the comparison
    const eventTitle = `Environment Comparison: ${results.summary.visualDifferences > 0 || results.summary.performanceIssues > 0 ? 'Issues Detected' : 'All Clear'}`;
    
    const eventText = `
    Comparison between Production (${results.productionUrl}) and Test (${results.testUrl})\n\n
    Deploy ID: ${results.deployId}\n
    Visual Differences: ${results.summary.visualDifferences}/${results.summary.totalPages}\n
    Performance Issues: ${results.summary.performanceIssues}/${results.summary.totalPages}\n\n
    See attachment for details.
    `;
    
    // Save a temporary JSON for the CLI to use
    const tempJsonPath = path.join(config.outputDir, 'datadog-event-data.json');
    fs.writeFileSync(tempJsonPath, JSON.stringify({
      title: eventTitle,
      text: eventText,
      tags: [
        `deploy_id:${results.deployId}`, 
        'type:environment_comparison',
        `visual_differences:${results.summary.visualDifferences}`,
        `performance_issues:${results.summary.performanceIssues}`
      ],
      alert_type: results.summary.visualDifferences > 0 ? 'error' : 
                  results.summary.performanceIssues > 0 ? 'warning' : 'info'
    }));
    
    // Send event using Datadog CLI
    execSync(`datadog events post --file ${tempJsonPath}`, { stdio: 'inherit' });
    
    // Send metrics
    for (const page of results.pages) {
      if (page.visualDifferenceScore !== undefined) {
        // Send visual difference score as a metric
        const metricName = 'environment.comparison.visual_difference';
        const tags = `page:${page.name},deploy_id:${results.deployId}`;
        const value = page.visualDifferenceScore;
        
        execSync(`datadog metrics post ${metricName} ${value} --tags ${tags}`, { stdio: 'inherit' });
      }
      
      if (page.performanceMetrics.loadTimeDifference !== undefined) {
        // Send load time difference as a metric
        const metricName = 'environment.comparison.load_time_difference_percent';
        const tags = `page:${page.name},deploy_id:${results.deployId}`;
        const value = page.performanceMetrics.loadTimeDifferencePercent;
        
        execSync(`datadog metrics post ${metricName} ${value} --tags ${tags}`, { stdio: 'inherit' });
      }
    }
    
    console.log('Results sent to Datadog successfully');
  } catch (error) {
    console.error('Error sending results to Datadog:', error.message);
  }
}
