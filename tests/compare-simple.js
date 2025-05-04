/**
 * Simple Visual Comparison Test with Datadog Integration
 * Uses ImageMagick for direct image comparison and keeps memory usage low
 */

const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Helper for async execution
const execAsync = util.promisify(exec);

// Directories
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Datadog config - securely using environment variables
const DD_API_KEY = process.env.DD_API_KEY || '';
const DD_APP_KEY = process.env.DD_APP_KEY || '';
const DD_API_URL = 'https://api.datadoghq.com/api/v1/series';

/**
 * Send a metric to Datadog
 * @param {string} name - Metric name
 * @param {number} value - Value to record
 * @param {Array} tags - Tags to associate with metric
 */
async function sendMetricToDatadog(name, value, tags = []) {
  if (!DD_API_KEY || !DD_APP_KEY) {
    console.log('Datadog API keys not found in environment, skipping metrics');
    return;
  }
  
  try {
    // Construct payload with the current timestamp
    const payload = {
      series: [{
        metric: `ai_tools_lab.${name}`,
        points: [[Math.floor(Date.now() / 1000), value]],
        type: 'gauge',
        tags: tags
      }]
    };
    
    // Send to Datadog
    const response = await axios.post(DD_API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': DD_API_KEY,
        'DD-APPLICATION-KEY': DD_APP_KEY
      }
    });
    
    console.log(`Sent metric ${name}=${value} to Datadog. Status: ${response.status}`);
  } catch (error) {
    console.error(`Error sending metric to Datadog: ${error.message}`);
  }
}

/**
 * Use Puppeteer to capture screenshots of both environments
 */
async function captureScreenshots() {
  const puppeteer = require('puppeteer');
  
  console.log('Capturing fresh screenshots with Puppeteer...');
  
  // Setup paths
  const localImagePath = path.join(SCREENSHOTS_DIR, 'resources-local.png');
  const prodImagePath = path.join(SCREENSHOTS_DIR, 'resources-prod.png');
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Capture local Docker site
    console.log('Capturing local screenshot...');
    await page.goto('http://localhost:4321/resources', { waitUntil: 'networkidle0', timeout: 30000 });
    await page.screenshot({ path: localImagePath, fullPage: true });
    console.log(`Local screenshot saved to ${localImagePath}`);
    
    // Capture production site (note the /pages/ prefix as mentioned in your memories)
    console.log('Capturing production screenshot...');
    await page.goto('https://ai-tools-lab.com/pages/resources', { waitUntil: 'networkidle0', timeout: 30000 });
    await page.screenshot({ path: prodImagePath, fullPage: true });
    console.log(`Production screenshot saved to ${prodImagePath}`);
    
    return { localImagePath, prodImagePath };
  } catch (error) {
    console.error(`Error capturing screenshots: ${error.message}`);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Compare two images using a simple pixel comparison
 * Falls back to this method if ImageMagick fails
 */
async function comparePixels(image1Path, image2Path) {
  const { createCanvas, loadImage } = require('canvas');
  
  try {
    // Load images
    const img1 = await loadImage(image1Path);
    const img2 = await loadImage(image2Path);
    
    // Calculate a similarity score based on dimensions first
    const dimensionSimilarity = Math.min(
      img1.width / img2.width,
      img2.width / img1.width,
      img1.height / img2.height,
      img2.height / img1.height
    );
    
    // If dimensions are too different, return low similarity
    if (dimensionSimilarity < 0.8) {
      return {
        normalizedDiff: 0.5,
        similarityScore: dimensionSimilarity * 10,
        match: false,
        reason: 'Image dimensions differ significantly'
      };
    }
    
    // For very large images, we'll sample pixels rather than compare all
    // This prevents memory issues
    const sampleSize = 1000; // Number of random pixels to sample
    const diffThreshold = 0.2; // Threshold for considering pixels different
    
    // Count differences
    let diffCount = 0;
    
    // Create canvases for both images
    const canvas1 = createCanvas(img1.width, img1.height);
    const ctx1 = canvas1.getContext('2d');
    ctx1.drawImage(img1, 0, 0);
    
    const canvas2 = createCanvas(img2.width, img2.height);
    const ctx2 = canvas2.getContext('2d');
    ctx2.drawImage(img2, 0, 0);
    
    // Sample random pixels
    for (let i = 0; i < sampleSize; i++) {
      // Generate random coordinates
      const x = Math.floor(Math.random() * Math.min(img1.width, img2.width));
      const y = Math.floor(Math.random() * Math.min(img1.height, img2.height));
      
      // Get pixel data
      const pixel1 = ctx1.getImageData(x, y, 1, 1).data;
      const pixel2 = ctx2.getImageData(x, y, 1, 1).data;
      
      // Calculate difference (simplified)
      const diff = Math.abs(pixel1[0] - pixel2[0]) + 
                  Math.abs(pixel1[1] - pixel2[1]) + 
                  Math.abs(pixel1[2] - pixel2[2]);
      
      // If difference exceeds threshold, count it
      if (diff > 30) {
        diffCount++;
      }
    }
    
    // Calculate normalized difference
    const normalizedDiff = diffCount / sampleSize;
    
    // Convert to similarity score (0-10)
    const similarityScore = Math.max(0, 10 - (normalizedDiff * 20));
    
    return {
      normalizedDiff,
      similarityScore,
      match: similarityScore > 8,
      sampledPixels: sampleSize
    };
  } catch (error) {
    console.error(`Error in pixel comparison: ${error.message}`);
    return {
      normalizedDiff: 1,
      similarityScore: 0,
      match: false,
      error: error.message
    };
  }
}

/**
 * Compare two images using ImageMagick
 */
async function compareImages(image1Path, image2Path) {
  try {
    // First try ImageMagick
    try {
      // Use ImageMagick's compare command to get difference metrics
      const compareCommand = `compare -metric RMSE "${image1Path}" "${image2Path}" null: 2>&1`;
      
      console.log(`Running comparison: ${compareCommand}`);
      
      // ImageMagick outputs to stderr even on success, so we need to catch it
      const { stdout, stderr } = await execAsync(compareCommand).catch(err => {
        return { stdout: '', stderr: err.stderr || err.message };
      });
      
      const output = stdout || stderr;
      console.log(`Comparison output: ${output}`);
      
      // Parse the output - format is typically "0.12345 (123.45)"
      // But we need to handle multiple formats
      const match = output.match(/(\d+\.?\d*)\s*(?:\(|:)\s*(\d+\.?\d*)(?:\)|)/);
      
      if (match) {
        // First number is normalized RMSE (0-1), second is actual error
        const normalizedDiff = parseFloat(match[1]);
        const totalDiff = parseFloat(match[2]);
        
        // Convert to similarity score (0-10, where 10 is identical)
        const similarityScore = Math.max(0, 10 - (normalizedDiff * 10));
        
        return {
          normalizedDiff,
          totalDiff,
          similarityScore,
          match: similarityScore > 8, // Threshold for "matching" images
          output
        };
      }
      
      // If we couldn't parse the output, fallback to pixel comparison
      console.log('Could not parse ImageMagick output, falling back to pixel comparison');
      throw new Error('ImageMagick output format not recognized');
    } catch (imgError) {
      // ImageMagick failed, fallback to pixel comparison
      console.log(`ImageMagick comparison failed: ${imgError.message}`);
      console.log('Falling back to pixel comparison...');
      return await comparePixels(image1Path, image2Path);
    }
  } catch (error) {
    console.error(`Error comparing images: ${error.message}`);
    return {
      normalizedDiff: 1,
      totalDiff: 100,
      similarityScore: 0,
      match: false,
      error: error.message
    };
  }
}

/**
 * Main function to run the comparison
 */
async function main() {
  const startTime = Date.now();
  console.log('Starting visual comparison test');
  
  try {
    // First capture fresh screenshots using Puppeteer
    console.log('Capturing fresh screenshots of both environments...');
    const { localImagePath, prodImagePath } = await captureScreenshots();
    
    // Now compare the screenshots
    console.log(`Comparing:
  - ${localImagePath}
  - ${prodImagePath}`);
    const result = await compareImages(localImagePath, prodImagePath);
  
    // Print results
    console.log('\n=== COMPARISON RESULTS ===');
    console.log(`Similarity Score: ${result.similarityScore.toFixed(2)}/10`);
    console.log(`Normalized Difference: ${result.normalizedDiff.toFixed(4)}`);
    console.log(`Match: ${result.match ? 'YES \u2705' : 'NO \u274c'}`);
    
    // Send metrics to Datadog
    await sendMetricToDatadog('visual_similarity', result.similarityScore, ['page:resources']);
    await sendMetricToDatadog('visual_test.duration', (Date.now() - startTime) / 1000, ['page:resources']);
    
    if (!result.match) {
      await sendMetricToDatadog('visual_test.failure', 1, ['reason:visual_mismatch', 'page:resources']);
      console.log('\n\u274c Resources page does NOT match between environments');
      process.exit(1);
    } else {
      await sendMetricToDatadog('visual_test.success', 1, ['page:resources']);
      console.log('\n\u2705 Resources page matches between environments');
      process.exit(0);
    }
  } catch (error) {
    console.error(`\n\u274c Error during visual comparison: ${error.message}`);
    await sendMetricToDatadog('visual_test.error', 1, ['error_type:exception', `error:${error.message.replace(/\s+/g, '_').substring(0, 50)}`]);
    process.exit(1);
  }
}

// Run the program
main();
