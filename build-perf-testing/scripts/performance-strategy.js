/**
 * Performance Optimization Strategy Generator
 *
 * This script analyzes the current site performance and generates
 * strategic recommendations based on the TODO list priorities.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// URLs to analyze
const SITE_URL = 'http://localhost:4324';
const PAGES = [
  '/',
  '/pages/resources',
  '/pages/ep17',
  '/pages/about',
  '/pages/observations'
];

// Output directory
const OUTPUT_DIR = path.join(__dirname, 'performance-analysis');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Capture performance metrics for a page
 */
async function capturePerformance(browser, url) {
  console.log(`Analyzing ${url}...`);
  
  const page = await browser.newPage();
  
  // Enable performance metrics collection
  await page.setCacheEnabled(false);
  await page.setJavaScriptEnabled(true);
  
  // Navigate to the page
  await page.goto(url, {
    waitUntil: 'networkidle0',
    timeout: 30000
  });
  
  // Collect performance metrics
  const performanceMetrics = {};
  
  // Collect resource size information
  performanceMetrics.resources = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource');
    return resources.map(resource => ({
      name: resource.name,
      size: resource.transferSize,
      type: resource.initiatorType,
      duration: resource.duration,
    }));
  });
  
  // Sort resources by size (largest first)
  performanceMetrics.resources.sort((a, b) => b.size - a.size);
  
  // Calculate total transfer size
  performanceMetrics.totalTransferSize = performanceMetrics.resources.reduce(
    (sum, resource) => sum + (resource.size || 0), 0
  );
  
  // Take a screenshot
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `${new URL(url).pathname.replace(/\//g, '-') || 'home'}.png`),
    fullPage: true
  });
  
  // Close the page
  await page.close();
  
  return performanceMetrics;
}

/**
 * Generate optimization strategy from performance data
 */
function generateStrategy(performanceData) {
  const strategy = {
    highPriority: [],
    mediumPriority: [],
    lowPriority: []
  };
  
  // Analyze total transfer size
  const totalMB = performanceData.totalTransferSize / (1024 * 1024);
  if (totalMB > 5) {
    strategy.highPriority.push({
      issue: 'Large network payload',
      details: `Total transfer size is ${totalMB.toFixed(2)}MB, which exceeds recommended 5MB limit`,
      solution: 'Compress and optimize large resources, especially images and JavaScript files'
    });
  }
  
  // Analyze large resources
  const largeResources = performanceData.resources
    .filter(r => r.size > 200 * 1024) // Resources larger than 200KB
    .map(r => ({
      url: r.name,
      size: `${(r.size / 1024).toFixed(2)}KB`,
      type: r.initiatorType
    }));
  
  if (largeResources.length > 0) {
    strategy.highPriority.push({
      issue: 'Large individual resources',
      details: `Found ${largeResources.length} resources larger than 200KB`,
      resources: largeResources,
      solution: 'Optimize large images with WebP format, compress JavaScript/CSS, implement code splitting'
    });
  }
  
  // Check for image optimization opportunities
  const imageResources = performanceData.resources.filter(r => 
    r.initiatorType === 'img' || r.name.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)
  );
  
  const largeImages = imageResources.filter(r => r.size > 100 * 1024);
  if (largeImages.length > 0) {
    strategy.mediumPriority.push({
      issue: 'Unoptimized images',
      details: `Found ${largeImages.length} images larger than 100KB`,
      solution: 'Replace with Astro Image component, convert to WebP, properly size images'
    });
  }
  
  // Check for render-blocking resources
  const possiblyBlockingResources = performanceData.resources.filter(r => 
    (r.initiatorType === 'script' || r.initiatorType === 'link') && 
    r.duration > 200
  );
  
  if (possiblyBlockingResources.length > 0) {
    strategy.mediumPriority.push({
      issue: 'Potential render-blocking resources',
      details: `Found ${possiblyBlockingResources.length} resources that might block rendering`,
      solution: 'Use defer/async for scripts, preload critical resources, lazy-load non-critical JS/CSS'
    });
  }
  
  return strategy;
}

/**
 * Run the analysis
 */
async function main() {
  console.log('Starting performance analysis...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const results = {};
    
    // Analyze each page
    for (const pagePath of PAGES) {
      const url = `${SITE_URL}${pagePath}`;
      results[pagePath] = await capturePerformance(browser, url);
    }
    
    // Generate strategies for each page
    const strategies = {};
    let overallHighPriority = [];
    let overallMediumPriority = [];
    
    for (const pagePath of PAGES) {
      const metrics = results[pagePath];
      strategies[pagePath] = generateStrategy(metrics);
      
      // Collect unique high priority issues
      strategies[pagePath].highPriority.forEach(issue => {
        if (!overallHighPriority.some(i => i.issue === issue.issue)) {
          overallHighPriority.push(issue);
        }
      });
      
      // Collect unique medium priority issues
      strategies[pagePath].mediumPriority.forEach(issue => {
        if (!overallMediumPriority.some(i => i.issue === issue.issue)) {
          overallMediumPriority.push(issue);
        }
      });
    }
    
    // Create overall strategy
    const overallStrategy = {
      highPriorityTasks: overallHighPriority,
      mediumPriorityTasks: overallMediumPriority,
      pageSpecificStrategies: strategies
    };
    
    // Save results and strategy
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'performance-metrics.json'),
      JSON.stringify(results, null, 2)
    );
    
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'optimization-strategy.json'),
      JSON.stringify(overallStrategy, null, 2)
    );
    
    // Generate a human-readable summary
    const summary = [
      '# Performance Optimization Strategy\n',
      '## High Priority Tasks',
      ...overallHighPriority.map(issue => 
        `- **${issue.issue}**: ${issue.details}\n  - Solution: ${issue.solution}`
      ),
      '\n## Medium Priority Tasks',
      ...overallMediumPriority.map(issue => 
        `- **${issue.issue}**: ${issue.details}\n  - Solution: ${issue.solution}`
      ),
      '\n## Page-Specific Issues',
      ...PAGES.map(pagePath => {
        const pageStrategy = strategies[pagePath];
        const pageIssues = [
          ...pageStrategy.highPriority, 
          ...pageStrategy.mediumPriority
        ];
        
        if (pageIssues.length === 0) return null;
        
        return `### ${pagePath || 'Homepage'}\n` + 
          pageIssues.map(issue => `- **${issue.issue}**: ${issue.solution}`).join('\n');
      }).filter(Boolean)
    ].join('\n\n');
    
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'strategy-summary.md'),
      summary
    );
    
    console.log(`\nAnalysis complete! Results saved to ${OUTPUT_DIR}`);
    console.log(`\nStrategy summary saved to ${path.join(OUTPUT_DIR, 'strategy-summary.md')}`);
    console.log('\nTop priority tasks:');
    overallHighPriority.forEach(issue => {
      console.log(`- ${issue.issue}: ${issue.solution}`);
    });
  } catch (error) {
    console.error('Error during performance analysis:', error);
  } finally {
    await browser.close();
  }
}

// Run the main function
main().catch(error => {
  console.error('Uncaught error:', error);
});
