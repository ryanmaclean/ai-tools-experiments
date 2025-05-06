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

// Environment configurations - STANDARDIZED URL PATTERNS
const environments = [
  {
    name: 'Test',
    baseUrl: 'https://ai-tools-lab-tst.netlify.app',
    pathPrefix: '/pages', // Now using same prefix as production for URL standardization
    skipPattern: /\.(jpg|jpeg|png|gif|svg|webp|css|js)$/i, // Skip assets
    // Skip only problematic protocol handlers, test all page URLs
    knownIssuePattern: /^(javascript:|mailto:|tel:)/i,
  },
  {
    name: 'Production',
    baseUrl: 'https://ai-tools-lab.com',
    pathPrefix: '/pages',
    skipPattern: /\.(jpg|jpeg|png|gif|svg|webp|css|js)$/i, // Skip assets
    // Skip only problematic protocol handlers
    knownIssuePattern: /^(javascript:|mailto:|tel:)/i,
  }
];

// Configuration
const config = {
  maxDepth: 3,                // Maximum crawl depth
  concurrentRequests: 5,      // Number of concurrent page instances
  timeout: 30000,             // Timeout for each page load in ms
  logFile: path.join('test-results', 'link-verification.log'),
  statusLogInterval: 5,       // Log crawl status every N pages
  retry: {
    count: 2,                 // Number of retries for failed requests
    delay: 1000               // Delay between retries in ms
  }
};

// Initialize logging
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

// Datadog logging helper
function logToDatadog(message, status, additionalTags = {}) {
  const apiKey = process.env.DD_API_KEY;
  if (!apiKey) {
    log('Skipping Datadog logging: DD_API_KEY not set', 'warn');
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
    log(`Datadog log sent with status: ${res.statusCode}`);
  });
  
  req.on('error', (e) => {
    log(`Error sending log to Datadog: ${e.message}`, 'error');
  });
  
  req.write(payload);
  req.end();
}

// Normalize URL for comparison and storage
function normalizeUrl(url, baseUrl, pathPrefix) {
  // Handle non-HTTP protocols and fragments
  if (!url || url.startsWith('javascript:') || url.startsWith('mailto:') || url.startsWith('#')) {
    return null;
  }
  
  // If it's already a fully qualified URL, check if it's for the same site
  if (url.startsWith('http')) {
    if (url.includes(baseUrl)) {
      // Only keep the path for our site
      return url.replace(baseUrl, '');
    } else {
      // External URL, not interested for this test
      return null;
    }
  }
  
  // Handle relative paths
  let normalizedUrl = url;
  
  // Ensure leading slash
  if (!normalizedUrl.startsWith('/')) {
    normalizedUrl = `/${normalizedUrl}`;
  }
  
  // Special handling for production environment path prefix
  if (baseUrl.includes('ai-tools-lab.com')) {
    // Check if URL needs the path prefix
    if (!normalizedUrl.startsWith(pathPrefix) && normalizedUrl !== '/') {
      // Add the /pages prefix if it's missing
      normalizedUrl = `${pathPrefix}${normalizedUrl}`;
    } else if (normalizedUrl === '/') {
      // Root URL in production should have the pathPrefix
      normalizedUrl = pathPrefix + '/';
    }
  }
  
  return normalizedUrl;
}

// Should this URL be skipped?
function shouldSkipUrl(url, env) {
  // Skip known issue patterns
  if (env.knownIssuePattern && env.knownIssuePattern.test(url)) {
    log(`Skipping known issue URL: ${url}`, 'warn');
    return true;
  }
  
  // Skip asset patterns
  if (env.skipPattern && env.skipPattern.test(url)) {
    log(`Skipping asset: ${url}`);
    return true;
  }
  
  // Skip external URLs
  if (url.startsWith('http') && !url.includes(env.baseUrl)) {
    log(`Skipping external URL: ${url}`);
    return true;
  }
  
  // Skip mailto:, tel:, and javascript: links
  if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('javascript:')) {
    log(`Skipping non-http URL: ${url}`);
    return true;
  }
  
  return false;
}

// Main link verification function
async function verifyAllLinks() {
  initLogFile();
  log('Starting link verification across environments...');
  
  // Launch browser once for all environments
  const browser = await chromium.launch();
  
  // Store all results
  const allResults = {};
  let overallSuccess = true;
  
  try {
    // Check each environment
    for (const env of environments) {
      log(`\n=== Testing ${env.name} Environment ===`);
      log(`Base URL: ${env.baseUrl}`);
      log(`Path Prefix: ${env.pathPrefix || 'None'}`);
      
      // Results for this environment
      const results = {
        startTime: new Date().toISOString(),
        endTime: null,
        duration: 0,
        totalLinks: 0,
        successfulLinks: 0,
        brokenCount: 0,
        checkedUrls: {},
        brokenLinks: []
      };
      
      // Queue of URLs to check
      let urlsToCheck = [
        // Start with the home page
        env.name === 'Production' ? env.pathPrefix + '/' : '/',
        // Also check episodes - use correct structure: /pages/ep01 format
        ...[...Array(20)].map((_, i) => {
          const num = i + 1;
          // Use zero-padded episode numbers to match production format
          const paddedNum = num.toString().padStart(2, '0');
          // Both environments now use /pages/ep01 format
          return `/pages/ep${paddedNum}`;
        })
      ];
      
      // Track URLs we've already queued to avoid duplicates
      const queuedUrls = new Set(urlsToCheck);
      
      // Start processing URLs
      let processedCount = 0;
      const maxConcurrency = config.concurrentRequests;
      
      // Create browser contexts to allow concurrent processing
      const contexts = [];
      for (let i = 0; i < maxConcurrency; i++) {
        contexts.push(await browser.newContext());
      }
      
      // Process URLs until queue is empty
      while (urlsToCheck.length > 0) {
        // Get batch of URLs to process concurrently
        const batch = urlsToCheck.splice(0, maxConcurrency);
        
        // Process batch concurrently
        const batchPromises = batch.map(async (url, idx) => {
          const context = contexts[idx % contexts.length];
          const page = await context.newPage();
          
          try {
            // Set page timeout
            page.setDefaultTimeout(config.timeout);
            
            // Construct full URL
            const fullUrl = `${env.baseUrl}${url}`;
            log(`Checking ${fullUrl}...`);
            
            // Try to visit the page
            const response = await page.goto(fullUrl, { waitUntil: 'networkidle' });
            const status = response ? response.status() : 404;
            
            // Check if page loaded successfully
            if (status >= 200 && status < 400) {
              // Success case
              results.successfulLinks++;
              results.checkedUrls[url] = { status, success: true };
              log(`✓ ${url} (${status})`);
              
              // Extract all links from this page
              const links = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('a[href]'))
                  .map(a => ({
                    href: a.href,
                    text: a.textContent.trim()
                  }));
              });
              
              results.totalLinks += links.length;
              log(`Found ${links.length} links on ${url}`);
              
              // Process all found links
              for (const link of links) {
                const normalizedUrl = normalizeUrl(link.href, env.baseUrl, env.pathPrefix);
                
                // Skip null URLs, already checked, or should be skipped
                if (!normalizedUrl || 
                    results.checkedUrls[normalizedUrl] || 
                    shouldSkipUrl(normalizedUrl, env) ||
                    queuedUrls.has(normalizedUrl)) {
                  continue;
                }
                
                // Add to queue
                urlsToCheck.push(normalizedUrl);
                queuedUrls.add(normalizedUrl);
              }
            } else {
              // Error case - page didn't load properly
              results.brokenCount++;
              results.checkedUrls[url] = { status, success: false };
              results.brokenLinks.push({
                url, 
                status,
                referrer: "direct"
              });
              log(`❌ ${url} (${status})`, 'error');
            }
          } catch (error) {
            // Exception case - network error, timeout, etc.
            results.brokenCount++;
            results.checkedUrls[url] = { error: error.message, success: false };
            results.brokenLinks.push({
              url,
              error: error.message,
              referrer: "direct"
            });
            log(`❌ ${url} (${error.message})`, 'error');
          } finally {
            await page.close();
          }
          
          // Update progress counter
          processedCount++;
          if (processedCount % config.statusLogInterval === 0) {
            log(`Progress: ${processedCount} URLs checked, ${urlsToCheck.length} remaining...`);
          }
        });
        
        // Wait for all pages in this batch to complete
        await Promise.all(batchPromises);
      }
      
      // Clean up browser contexts
      for (const context of contexts) {
        await context.close();
      }
      
      // Finalize results for this environment
      results.endTime = new Date().toISOString();
      results.duration = new Date(results.endTime) - new Date(results.startTime);
      
      // Generate summary
      log(`\n--- ${env.name} Environment Summary ---`);
      log(`Total URLs checked: ${Object.keys(results.checkedUrls).length}`);
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
        log('✅ No broken links found!');
      }
      
      // Save detailed results to file
      const resultsPath = path.join('test-results', `link-verification-${env.name.toLowerCase()}.json`);
      fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
      log(`Detailed results saved to: ${resultsPath}`);
      
      // Save to overall results
      allResults[env.name] = results;
      
      // Log to Datadog
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
  } catch (error) {
    log(`Unexpected error: ${error.message}`, 'error');
    logToDatadog(`Link verification failed with error: ${error.message}`, 'error');
    overallSuccess = false;
  } finally {
    // Clean up browser
    await browser.close();
  }
  
  // Overall summary
  log('\n=== Overall Link Verification Results ===');
  let totalBroken = 0;
  for (const env of environments) {
    const envResults = allResults[env.name];
    if (envResults) {
      totalBroken += envResults.brokenCount;
      log(`${env.name}: ${envResults.brokenCount > 0 ? `❌ ${envResults.brokenCount} broken links` : '✅ All links OK'}`);
    } else {
      log(`${env.name}: No results available`, 'error');
      totalBroken++;
    }
  }
  
  log(`\nFinal result: ${totalBroken === 0 ? '✅ PASS' : `❌ FAIL (${totalBroken} broken links)`}`);
  
  // Log final result to Datadog
  logToDatadog(
    `Link verification complete: ${totalBroken === 0 ? 'All links valid' : `${totalBroken} broken links found`}`,
    totalBroken === 0 ? 'ok' : 'error'
  );
  
  return totalBroken === 0 ? 0 : 1;
}

// Run the verification
verifyAllLinks().then(exitCode => {
  log(`\nLink verification complete. Exiting with code ${exitCode}`);
  process.exit(exitCode);
}).catch(error => {
  log(`Fatal error in link verification: ${error.message}`, 'error');
  logToDatadog(`Fatal error in link verification: ${error.stack || error.message}`, 'error');
  process.exit(1);
});
