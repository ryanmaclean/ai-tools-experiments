/**
 * Visual Comparison for Resources Page
 * 
 * This script captures screenshots of the resources page on local and production
 * environments and compares them using Ollama with vision capabilities.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const util = require('util');
const { exec } = require('child_process');
const execPromise = util.promisify(exec);

// Set up Datadog - using simple HTTP API
const DD_API_KEY = process.env.DD_API_KEY || '';
const DD_APP_KEY = process.env.DD_APP_KEY || '';
const DD_API_URL = 'https://api.datadoghq.com/api/v2/series';

let datadogEnabled = false;

if (DD_API_KEY && DD_APP_KEY) {
  datadogEnabled = true;
  console.log('Datadog integration enabled');
} else {
  console.log('Datadog API keys not found, metrics will not be sent');
}

// Helper function to send metrics to Datadog
async function sendMetricToDatadog(metric, value, tags = []) {
  if (!datadogEnabled) return;
  
  try {
    const currentTime = Math.floor(Date.now() / 1000);
    const payload = {
      series: [
        {
          metric: `ai_tools_lab.${metric}`,
          type: 'gauge',
          points: [[currentTime, value]],
          tags: tags
        }
      ]
    };
    
    await axios.post(DD_API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': DD_API_KEY,
        'DD-APPLICATION-KEY': DD_APP_KEY
      }
    });
    
    console.log(`Submitted ${metric} metric to Datadog`);
  } catch (error) {
    console.error('Error sending metrics to Datadog:', error.message);
  }
}

// Create directories if they don't exist
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

/**
 * Run a side-by-side visual comparison using Ollama
 */
async function compareImages(localPath, prodPath) {
  try {
    console.log(`Comparing ${localPath} vs ${prodPath} using Ollama vision model...`);
    
    // Convert images to base64
    const localImageBase64 = fs.readFileSync(localPath, { encoding: 'base64' });
    const prodImageBase64 = fs.readFileSync(prodPath, { encoding: 'base64' });
    
    // Create Ollama API request with vision capabilities
    const ollamaEndpoint = 'http://localhost:11434/api/generate';
    const prompt = `
      I'm showing you two screenshots of the same web page. 
      The first is from a test environment, the second is from production.
      
      Please analyze these images and tell me:
      1. Are there any visual differences between them?
      2. If there are differences, describe them in detail
      3. Rate the visual similarity on a scale of 0-10 where 10 is identical
      4. Are there any UI elements missing or incorrectly styled?
      5. Is the content structured the same way in both versions?
      
      Please be specific and detailed in your analysis.
    `;
    
    try {
      const response = await axios.post(ollamaEndpoint, {
        model: 'llama3.2-vision',
        prompt: prompt,
        images: [localImageBase64, prodImageBase64],
        stream: false
      });
      
      const llmResponse = response.data.response;
      
      // Extract similarity score using regex
      const scoreMatch = llmResponse.match(/([0-9](\.5)?)\s*\/\s*10/i);
      const similarityScore = scoreMatch ? parseFloat(scoreMatch[1]) : 5.0;
      const normalizedScore = (10 - similarityScore) / 10; // Convert to difference score where 0 is identical
      
      // Send metric to Datadog
      await sendMetricToDatadog('visual_similarity', similarityScore, ['page:resources']);
      
      // Parse LLM response to determine if there are significant differences
      const hasDifferences = llmResponse.toLowerCase().includes('differences') && 
                           !llmResponse.toLowerCase().includes('no differences') &&
                           !llmResponse.toLowerCase().includes('identical');
      
      const analysisResult = {
        differenceScore: normalizedScore,
        similarityScore: similarityScore,
        significantDifferences: normalizedScore > 0.3, // More than 3 points difference on 10-point scale
        analysis: llmResponse,
        details: {
          layoutConsistency: normalizedScore < 0.2 ? "good" : "needs improvement",
          colorSchemeMatch: normalizedScore < 0.1 ? "good" : "needs review",
          elementAlignment: normalizedScore < 0.15 ? "good" : "needs adjustment"
        }
      };
      
      return analysisResult;
    } catch (ollamaError) {
      console.error('Error calling Ollama API:', ollamaError);
      
      // Fall back to ImageMagick if Ollama fails
      console.log('Falling back to ImageMagick comparison...');
      const compareCommand = `compare -metric RMSE "${localPath}" "${prodPath}" null: 2>&1`;
      const { stdout } = await execPromise(compareCommand).catch(err => {
        // ImageMagick outputs to stderr even on success
        return { stdout: err.stderr };
      });
      
      // Parse ImageMagick output (format: "X (Y)")
      const diffMatch = stdout.match(/(\d+\.?\d*)\s+\((\d+\.?\d*)\)/);
      const diffScore = diffMatch ? parseFloat(diffMatch[1]) : 1.0;
      
      return {
        differenceScore: diffScore,
        similarityScore: 10 - (diffScore * 10),
        significantDifferences: diffScore > 0.1,
        analysis: `Fallback analysis using ImageMagick (Ollama not available): ${
          diffScore > 0.5 
            ? "Significant visual differences detected between local and production versions."
            : diffScore > 0.1
            ? "Minor visual differences detected. Pages are mostly similar but have some noticeable variations."
            : "Pages appear visually identical or have negligible differences."
        }`,
        details: {
          layoutConsistency: diffScore < 0.2 ? "good" : "needs improvement",
          colorSchemeMatch: diffScore < 0.1 ? "good" : "needs review",
          elementAlignment: diffScore < 0.15 ? "good" : "needs adjustment"
        }
      };
    }
  } catch (error) {
    console.error('Error comparing images:', error);
    return {
      differenceScore: 1.0,
      significantDifferences: true,
      analysis: "Error performing visual comparison: " + error.message,
      details: {}
    };
  }
}

/**
 * Take a screenshot of a page
 */
async function captureScreenshot(url, outputPath, fullPage = true) {
  console.log(`Capturing screenshot of ${url}...`);
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for any resources to load
    await page.waitForSelector('.resource-card', { timeout: 5000 }).catch(() => console.log('Resource cards not found'));
    
    // Take screenshot
    await page.screenshot({ path: outputPath, fullPage });
    console.log(`Screenshot saved to ${outputPath}`);
    
    return true;
  } catch (error) {
    console.error(`Error capturing screenshot of ${url}:`, error);
    return false;
  } finally {
    await browser.close();
  }
}

async function main() {
  // Define URLs and screenshot paths
  const localUrl = 'http://localhost:4321/resources';
  const prodUrl = 'https://ai-tools-lab.com/pages/resources'; // Note: production site uses /pages/ prefix
  
  const localScreenshot = path.join(screenshotsDir, 'resources-local.png');
  const prodScreenshot = path.join(screenshotsDir, 'resources-prod.png');
  
  try {
    // Capture screenshots
    await captureScreenshot(localUrl, localScreenshot);
    await captureScreenshot(prodUrl, prodScreenshot);
    
    // Compare screenshots
    const comparisonResult = await compareImages(localScreenshot, prodScreenshot);
    
    // Output results
    console.log('\nComparison Results:');
    console.log(`Similarity Score: ${comparisonResult.similarityScore}/10`);
    console.log(`Significant Differences: ${comparisonResult.significantDifferences ? 'Yes' : 'No'}`);
    console.log('\nAnalysis:');
    console.log(comparisonResult.analysis);
    console.log('\nDetails:');
    console.log(JSON.stringify(comparisonResult.details, null, 2));
    
    // Save analysis to file
    const analysisPath = path.join(screenshotsDir, 'resources-analysis.json');
    fs.writeFileSync(analysisPath, JSON.stringify(comparisonResult, null, 2));
    console.log(`\nFull analysis saved to ${analysisPath}`);
    
    // Check if the comparison is successful
    if (!comparisonResult.significantDifferences) {
      console.log('\n✅ Resources page appears to match between local and production!\n');
    } else {
      console.log('\n⚠️ Resources page has significant differences between local and production!\n');
    }
  } catch (error) {
    console.error('Error during comparison process:', error);
  }
}

// Run the main function
main();
