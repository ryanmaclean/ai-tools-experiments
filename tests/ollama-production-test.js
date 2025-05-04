/**
 * Ollama Production Test
 * 
 * This script analyzes the production site HTML to extract the resource card image paths
 * and compares them with the test site to identify discrepancies.
 */

const axios = require('axios');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Ollama API endpoint
const OLLAMA_API = 'http://localhost:11434/api/generate';

// URLs to check
const PROD_URL = 'https://ai-tools-lab.com/pages/resources';
const TEST_URL = 'https://ai-tools-lab-tst.netlify.app/pages/resources';

// Output directory
const OUTPUT_DIR = path.join(__dirname, 'ollama-test-output');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Extract image data using Puppeteer
 */
async function extractImageData(url) {
  console.log(`Extracting image data from ${url}...`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Get the raw HTML of the page
    const html = await page.content();
    
    // Extract image information with Puppeteer
    const imageInfo = await page.evaluate(() => {
      const resourceCards = Array.from(document.querySelectorAll('.resource-card'));
      return resourceCards.map((card, index) => {
        const img = card.querySelector('.resource-card-image img');
        const titleEl = card.querySelector('.resource-card-content h2');
        const description = card.querySelector('.resource-card-content p')?.textContent?.trim() || '';
        
        return {
          index,
          title: titleEl?.textContent?.trim() || '',
          imgSrc: img?.getAttribute('src') || '',
          imgAlt: img?.getAttribute('alt') || '',
          description: description.substring(0, 100) + (description.length > 100 ? '...' : ''),
        };
      });
    });
    
    // Save the HTML for later analysis
    fs.writeFileSync(path.join(OUTPUT_DIR, `${new URL(url).hostname}-resources.html`), html);
    
    return {
      url,
      imageInfo,
      html
    };
  } catch (error) {
    console.error(`Error extracting image data from ${url}:`, error.message);
    return { url, error: error.message };
  } finally {
    await browser.close();
  }
}

/**
 * Analyze the differences with Ollama
 */
async function analyzeWithOllama(prodData, testData) {
  const prompt = `I need you to compare resource card image paths between production and test sites.

Production site resources page (${prodData.url}) has these image paths:
${JSON.stringify(prodData.imageInfo.map(i => ({ title: i.title, imgSrc: i.imgSrc })), null, 2)}

Test site resources page (${testData.url}) has these image paths:
${JSON.stringify(testData.imageInfo.map(i => ({ title: i.title, imgSrc: i.imgSrc })), null, 2)}

Please analyze the differences between the image paths and explain why the test site uses different images. Also suggest a proper fix to make both sites consistent. Be concise but specific.`;

  try {
    console.log('\nSending query to Ollama...');
    const response = await axios.post(OLLAMA_API, {
      model: 'llama3',
      prompt: prompt,
      stream: false
    });

    const analysisResult = response.data.response;
    return analysisResult;
  } catch (error) {
    console.error('Error querying Ollama:', error.message);
    return `Error analyzing with Ollama: ${error.message}. You may need to check if Ollama is running locally with the llama3 model.`;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Starting Ollama production vs test analysis...');
  
  // Extract data from both sites
  const prodData = await extractImageData(PROD_URL);
  const testData = await extractImageData(TEST_URL);
  
  // Compare image paths directly
  console.log('\n=== DIRECT COMPARISON ===');
  console.log(`Production site: ${prodData.imageInfo.length} resource cards`);
  console.log(`Test site: ${testData.imageInfo.length} resource cards`);
  
  // Tally unique image paths
  const prodImagePaths = prodData.imageInfo.map(i => i.imgSrc);
  const testImagePaths = testData.imageInfo.map(i => i.imgSrc);
  
  const uniqueProdPaths = [...new Set(prodImagePaths)];
  const uniqueTestPaths = [...new Set(testImagePaths)];
  
  console.log(`\nUnique image paths in production: ${uniqueProdPaths.length}`);
  console.log(uniqueProdPaths.slice(0, 5).join('\n'));
  
  console.log(`\nUnique image paths in test: ${uniqueTestPaths.length}`);
  console.log(uniqueTestPaths.slice(0, 5).join('\n'));
  
  // Compare actual paths between the two sites
  console.log('\n=== SAMPLE COMPARISONS ===');
  const minCards = Math.min(prodData.imageInfo.length, testData.imageInfo.length);
  
  // Only show a few examples to keep output manageable
  for (let i = 0; i < Math.min(3, minCards); i++) {
    const prodCard = prodData.imageInfo[i];
    const testCard = testData.imageInfo[i];
    
    console.log(`\nCard ${i+1}:`);
    console.log(`Title: "${prodCard.title}" vs "${testCard.title}"`);
    console.log(`Prod image: ${prodCard.imgSrc}`);
    console.log(`Test image: ${testCard.imgSrc}`);
  }
  
  // Analyze with Ollama
  const ollamaAnalysis = await analyzeWithOllama(prodData, testData);
  
  console.log('\n=== OLLAMA ANALYSIS ===');
  console.log(ollamaAnalysis);
  
  // Save the analysis results
  const results = {
    timestamp: new Date().toISOString(),
    productionCards: prodData.imageInfo.length,
    testCards: testData.imageInfo.length,
    uniqueProductionPaths: uniqueProdPaths,
    uniqueTestPaths: uniqueTestPaths,
    ollamaAnalysis
  };
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'comparison-results.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log(`\nResults saved to ${path.join(OUTPUT_DIR, 'comparison-results.json')}`);
  console.log('Completed analysis');
}

// Check if Ollama is running first
async function checkOllama() {
  try {
    const response = await axios.post(OLLAMA_API, {
      model: 'llama3',
      prompt: 'Hello',
      stream: false
    });
    
    console.log('Ollama is running with llama3 model');
    return true;
  } catch (error) {
    console.error('Error connecting to Ollama:', error.message);
    console.log('Proceeding without Ollama analysis');
    return false;
  }
}

// Run the main function
checkOllama().then(ollamaRunning => {
  if (ollamaRunning) {
    main();
  } else {
    // Run without Ollama analysis
    main().catch(error => {
      console.error('Error in main process:', error);
    });
  }
});
