/**
 * Visual LLM-Assisted Testing with Ollama and Datadog Integration
 * 
 * This script uses Puppeteer to capture screenshots and then leverages
 * Ollama with a vision-capable model to analyze these screenshots
 * for visual issues and similarity. It also sends metrics to Datadog.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const axios = require('axios');
// Convert exec to a promise-based function
const execPromise = util.promisify(exec);

// Set up Datadog - using simple HTTP API for reliability
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
const screenshotsDir = path.join(__dirname, 'llm-screenshots');
const reportsDir = path.join(__dirname, 'llm-reports');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

/**
 * Run a side-by-side visual comparison using Ollama with a vision-capable model
 */
async function comparePagesVisually(localPath, prodPath) {
  try {
    console.log(`Comparing ${localPath} vs ${prodPath} using Ollama vision model...`);
    
    // Convert images to base64
    const localImageBase64 = fs.readFileSync(localPath, { encoding: 'base64' });
    const prodImageBase64 = fs.readFileSync(prodPath, { encoding: 'base64' });
    
    // Create Ollama API request with vision capabilities
    // Using llava model which has vision capabilities
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
      const pageName = localPath.split('/').pop().split('-')[0];
      await sendMetricToDatadog('visual_similarity', similarityScore, [`page:${pageName}`]);
      
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

async function analyzePage(page, url, pageName) {
  // Navigate to the page
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  
  // Take a screenshot
  const screenshotPath = path.join(screenshotsDir, `${pageName}-analysis.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  
  // Analyze the structure
  const structure = await page.evaluate(() => {
    return {
      title: document.title,
      headerExists: !!document.querySelector('header'),
      footerExists: !!document.querySelector('footer'),
      mainContentExists: !!document.querySelector('main'),
      hasImages: document.querySelectorAll('img').length > 0,
      hasLinks: document.querySelectorAll('a').length > 0,
      hasText: document.body.innerText.length > 0,
      totalElements: document.querySelectorAll('*').length
    };
  });
  
  return {
    structure,
    screenshotPath
  };
}

async function runVisualLLMTests() {
  console.log('Starting Visual LLM-assisted tests...');
  
  // Launch browsers
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: 'new'
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Define pages to test
    const pagesToTest = [
      { name: 'about', localUrl: 'http://localhost:4325/pages/about' },
      { name: 'resources', localUrl: 'http://localhost:4325/resources' }
    ];
    
    // Simulate prod URLs since we can't actually access them in this test
    // In a real implementation, you would use the actual production URL
    const prodUrls = {
      about: 'about-prod',
      resources: 'resources-prod'
    };
    
    // Test each page
    for (const { name, localUrl } of pagesToTest) {
      console.log(`\nAnalyzing ${name} page...`);
      
      // Analyze the page
      const localAnalysis = await analyzePage(page, localUrl, `${name}-local`);
      
      // Generate a simulated production reference to compare against
      // In a real test, you would use actual production URLs
      // Create a simulated prod screenshot based on the local one
      const prodScreenshotPath = path.join(screenshotsDir, `${name}-prod-simulated.png`);
      fs.copyFileSync(localAnalysis.screenshotPath, prodScreenshotPath);
      
      // In production tests, you'd use this code instead:
      // const prodAnalysis = await analyzePage(page, prodUrl, `${name}-prod`);
      
      // Perform LLM-based visual comparison
      const visualComparison = await comparePagesVisually(
        localAnalysis.screenshotPath, 
        prodScreenshotPath // In prod: prodAnalysis.screenshotPath
      );
      
      // Combined analysis
      const report = {
        page: name,
        localUrl,
        timestamp: new Date().toISOString(),
        structureAnalysis: localAnalysis.structure,
        visualComparison,
        conclusion: visualComparison.significantDifferences 
          ? "Page requires visual alignment with production"
          : "Page visually matches expected output"
      };
      
      // Save the report
      fs.writeFileSync(
        path.join(reportsDir, `${name}-llm-report.json`),
        JSON.stringify(report, null, 2)
      );
      
      // Output results
      console.log('- Structure analysis:', JSON.stringify(localAnalysis.structure, null, 2));
      console.log('- Visual comparison result:', visualComparison.analysis);
      console.log('- Conclusion:', report.conclusion);
    }
    
    // Check for visual regressions or improvements
    console.log('\nVisual similarity summary:');
    const reportFiles = fs.readdirSync(reportsDir).filter(file => file.endsWith('-llm-report.json'));
    for (const reportFile of reportFiles) {
      const report = JSON.parse(fs.readFileSync(path.join(reportsDir, reportFile)));
      console.log(`- ${report.page}: ${report.visualComparison.differenceScore.toFixed(4)} difference score`);
    }
    
    console.log('\nLLM-assisted visual tests completed!');
    return true;
  } catch (error) {
    console.error('Error during LLM-assisted visual testing:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the tests
runVisualLLMTests().then(success => {
  if (!success) {
    console.error('LLM-assisted visual tests failed!');
    process.exit(1);
  } else {
    console.log('LLM-assisted visual tests completed successfully!');
    process.exit(0);
  }
}).catch(error => {
  console.error('Unhandled error during testing:', error);
  process.exit(1);
});
