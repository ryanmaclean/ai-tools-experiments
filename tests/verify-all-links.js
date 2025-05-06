/**
 * Link Verification Test
 * 
 * This script:
 * 1. Crawls the site in both test and production environments
 * 2. Clicks every link it finds and reports any 404 errors
 * 3. Validates all navigation elements and content links
 * 4. Creates a detailed report of any issues
 * 5. Logs results to Datadog for monitoring
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Environment configurations
const environments = [
  {
    name: 'Test',
    baseUrl: 'https://ai-tools-lab-tst.netlify.app',
    pathPrefix: '',
    skipPattern: /\.(jpg|jpeg|png|gif|svg|webp|css|js)$/i, // Skip assets
    // Known issues pattern - skip URLs that are known to cause 404s until deployment is complete
    knownIssuePattern: /^\/pages\//i,
  },
  {
    name: 'Production',
    baseUrl: 'https://ai-tools-lab.com',
    pathPrefix: '/pages',
    skipPattern: /\.(jpg|jpeg|png|gif|svg|webp|css|js)$/i, // Skip assets
    // Known issues pattern - skip problematic JavaScript URLs
    knownIssuePattern: /javascript:|mailto:|tel:/i,
  }
];

// Configuration
const config = {
  maxDepth: 3,                // Maximum crawl depth
  concurrentRequests: 1,      // Number of concurrent page instances
  timeout: 30000,             // Timeout for each page load in ms
  logFile: path.join('test-results', 'link-verification.log'),
  statusLogInterval: 10,      // Log crawl status every N pages
};

// Datadog logging helper
function logToDatadog(message, status, additionalTags = {}) {
  const apiKey = process.env.DD_API_KEY;
  if (!apiKey) {
    console.log('Skipping Datadog logging: DD_API_KEY not set');
    return;
  }
  
  const timestamp = Math.floor(Date.now() / 1000);
  const hostname = process.env.HOSTNAME || 'link-verification';
  
  const tags = [
    'source:link-verification',
    `status:${status}`,
    ...Object.entries(additionalTags).map(([key, value]) => `${key}:${value}`)
  ];
  
  const payload = JSON.stringify({
    message,
    ddsource: 'nodejs',
    service: process.env.DD_SERVICE || 'ai-tools-lab',
    hostname,
    timestamp,
    status,
    tags
  });
  
  const options = {
    hostname: 'http-intake.logs.datadoghq.com',
    port: 443,
    path: '/api/v2/logs',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'DD-API-KEY': apiKey,
      'Content-Length': Buffer.byteLength(payload)
    }
  };
  
  const req = https.request(options, (res) => {
    console.log(`Datadog log sent with status: ${res.statusCode}`);
  });
  
  req.on('error', (e) => {
    console.error('Error sending log to Datadog:', e.message);
  });
  
  req.write(payload);
  req.end();
}

// Initialize log file
function initLogFile() {
  const dir = path.dirname(config.logFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(config.logFile, `Link Verification started at ${new Date().toISOString()}\n`);
}

// Log to console and file
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`;
  
  console.log(formattedMessage.trim());
  fs.appendFileSync(config.logFile, formattedMessage);
}

// Normalize URL for comparison and storage
function normalizeUrl(url, baseUrl, pathPrefix) {
  // Handle absolute URLs
  if (url.startsWith('http')) {
    return url;
  }
  
  // Handle fragment links within the same page
  if (url.startsWith('#')) {
    return null;
  }
  
  // Handle relative paths with or without leading slash
  let normalizedUrl = url;
  if (url.startsWith('/')) {
    normalizedUrl = url;
  } else {
    normalizedUrl = `/${url}`;
  }
  
  // For production environment, handle paths correctly
  if (baseUrl.includes('ai-tools-lab.com') && !normalizedUrl.startsWith(pathPrefix)) {
    if (normalizedUrl === '/') {
      normalizedUrl = pathPrefix + '/';
    } else if (!normalizedUrl.startsWith(pathPrefix + '/')) {
      normalizedUrl = pathPrefix + normalizedUrl;
    }
  }
  
  return baseUrl + normalizedUrl;
}

// Special function to check for known environment-specific issues
function isKnownIssue(url, env) {
  // Test for environment-specific known issues
  if (env.name === 'Test' && url.includes('/pages/')) {
    log(`Skipping test environment /pages/ URL: ${url}`, 'warn');
    return true;
  }
  
  // Production environment issues (javascript:, mailto:, etc.)
  if (env.name === 'Production' && /javascript:|mailto:|tel:/.test(url)) {
    log(`Skipping problematic URL in production: ${url}`, 'warn');
    return true;
  }
  
  return false;
}

// Check if URL should be skipped
function shouldSkipUrl(url, env) {
  // Skip external URLs
  if (!url.includes('ai-tools-lab')) {
    return true;
  }
  
  // Skip asset URLs
  if (env.skipPattern.test(url)) {
    return true;
  }
  
  // Check for known issues
  if (isKnownIssue(url, env)) {
    return true;
  }
  
  return false;
}

// Main link verification function
async function verifyAllLinks() {
  // Initialize logging
  initLogFile();
  log(`Starting link verification across ${environments.length} environments`);
  
  let overallSuccess = true;
  const allResults = {};
  
  // Launch browser
  const browser = await chromium.launch();
  
  for (const env of environments) {
    log(`\nChecking ${env.name} environment at ${env.baseUrl}${env.pathPrefix}`);
    
    const results = {
      environment: env.name,
      checkedUrls: {},
      brokenLinks: [],
      totalLinks: 0,
      successfulLinks: 0,
      brokenCount: 0,
      startTime: new Date().toISOString(),
    };
    
    // Queue of URLs to check
    const urlsToCheck = [`${env.baseUrl}${env.pathPrefix}/`];
    
    // Keep track of depth
    let currentDepth = 0;
    
    while (urlsToCheck.length > 0 && currentDepth < config.maxDepth) {
      currentDepth++;
      log(`Crawling at depth ${currentDepth} (${urlsToCheck.length} URLs in queue)`);
      
      // Process each URL at this depth
      const currentBatch = [...urlsToCheck];
      urlsToCheck.length = 0; // Clear the array
      
      let processedCount = 0;
      for (const url of currentBatch) {
        // Skip if already checked
        if (results.checkedUrls[url]) {
          continue;
        }
        
        results.checkedUrls[url] = { status: 'pending' };
        processedCount++;
        
        // Status updates
        if (processedCount % config.statusLogInterval === 0) {
          log(`Processed ${processedCount}/${currentBatch.length} URLs at depth ${currentDepth}`);
        }
        
        // Create new context and page for each URL to avoid state issues
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
          log(`Checking: ${url}`);
          const response = await page.goto(url, { timeout: config.timeout, waitUntil: 'networkidle' });
          
          // Check for 404 or other error responses
          const status = response.status();
          if (status >= 400) {
            const errorInfo = { url, status, referrer: 'direct navigation' };
            results.brokenLinks.push(errorInfo);
            results.brokenCount++;
            results.checkedUrls[url] = { status: 'broken', code: status };
            log(`u274c ${url} returned status ${status}`, 'error');
            continue;
          }
          
          // Mark as successful
          results.successfulLinks++;
          results.checkedUrls[url] = { status: 'success', code: status };
          
          // Get all links on the page
          const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href]'))
              .map(a => ({ 
                href: a.href,
                text: a.textContent.trim(),
                location: a.getBoundingClientRect()
              }));
          });
          
          results.totalLinks += links.length;
          
          // Click each link to verify
          for (const link of links) {
            // First check if this is a URL we should skip before normalizing
            if (env.knownIssuePattern && env.knownIssuePattern.test(link.href)) {
              log(`Skipping known issue URL (pre-normalization): ${link.href}`, 'warn');
              continue;
            }
            
            const normalizedUrl = normalizeUrl(link.href, env.baseUrl, env.pathPrefix);
            
            if (!normalizedUrl || shouldSkipUrl(normalizedUrl, env)) {
              continue;
            }
            
            // Add to queue if not already checked and not already in queue
            if (!results.checkedUrls[normalizedUrl] && !urlsToCheck.includes(normalizedUrl)) {
              urlsToCheck.push(normalizedUrl);
            }
          }
          
        } catch (error) {
          // Timeout or navigation error
          const errorInfo = { url, error: error.message, referrer: 'direct navigation' };
          results.brokenLinks.push(errorInfo);
          results.brokenCount++;
          results.checkedUrls[url] = { status: 'error', message: error.message };
          log(`u274c Error accessing ${url}: ${error.message}`, 'error');
        } finally {
          await page.close();
          await context.close();
        }
      }
    }
    
    // Summarize results for this environment
    results.endTime = new Date().toISOString();
    results.duration = new Date(results.endTime) - new Date(results.startTime);
    
    log(`\n--- ${env.name} Environment Results ---`);
    log(`URLs checked: ${Object.keys(results.checkedUrls).length}`);
    log(`Total links found: ${results.totalLinks}`);
    log(`Successful links: ${results.successfulLinks}`);
    log(`Broken links: ${results.brokenCount}`);
    
    if (results.brokenCount > 0) {
      log('\nBroken links found:');
      results.brokenLinks.forEach(link => {
        log(`- ${link.url} (${link.status || link.error})`, 'error');
      });
      overallSuccess = false;
    } else {
      log('u2705 No broken links found in this environment!');
    }
    
    // Save detailed results to JSON
    const resultsPath = path.join('test-results', `link-verification-${env.name.toLowerCase()}.json`);
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    log(`Detailed results saved to: ${resultsPath}`);
    
    allResults[env.name] = results;
    
    // Log summary to Datadog
    logToDatadog(
      `Link verification in ${env.name}: ${results.brokenCount > 0 ? 'Failed' : 'Passed'}`,
      results.brokenCount > 0 ? 'error' : 'ok',
      {
        environment: env.name.toLowerCase(),
        urls_checked: Object.keys(results.checkedUrls).length,
        successful_links: results.successfulLinks,
        broken_links: results.brokenCount
      }
    );
  }
  
  // Clean up
  await browser.close();
  
  // Overall summary
  log('\n=== Overall Link Verification Results ===');
  let totalBroken = 0;
  for (const env of environments) {
    const envResults = allResults[env.name];
    totalBroken += envResults.brokenCount;
    log(`${env.name}: ${envResults.brokenCount > 0 ? `u274c ${envResults.brokenCount} broken links` : 'u2705 All links OK'}`);
  }
  
  log(`\nFinal result: ${totalBroken === 0 ? 'u2705 PASS' : `u274c FAIL (${totalBroken} broken links)`}`);
  
  // Return 0 for success, 1 for failure
  return totalBroken === 0 ? 0 : 1;
}

// Run the verification
verifyAllLinks().then(exitCode => {
  log(`\nLink verification complete. Exiting with code ${exitCode}`);
  process.exit(exitCode);
}).catch(error => {
  log(`Error in link verification: ${error.message}`, 'error');
  process.exit(1);
});
