/**
 * Extract Image Paths
 * 
 * This script extracts the image paths from the saved HTML files
 * of both the production and test sites for comparison.
 */

const fs = require('fs');
const cheerio = require('cheerio');
const path = require('path');

// Paths to the saved HTML files
const PROD_HTML_PATH = path.join(__dirname, 'ollama-test-output', 'ai-tools-lab.com-resources.html');
const TEST_HTML_PATH = path.join(__dirname, 'ollama-test-output', 'ai-tools-lab-tst.netlify.app-resources.html');

// Extract image data from HTML file
function extractImageData(filePath) {
  console.log(`Extracting image data from ${filePath}...`);
  
  try {
    const html = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(html);
    
    const resources = [];
    
    $('.resource-card').each((index, card) => {
      const $card = $(card);
      const title = $card.find('.resource-card-content h2').text().trim();
      const $img = $card.find('.resource-card-image img');
      const imgSrc = $img.attr('src') || '';
      const imgAlt = $img.attr('alt') || '';
      
      resources.push({
        index,
        title,
        imgSrc,
        imgAlt
      });
    });
    
    return resources;
  } catch (error) {
    console.error(`Error extracting data from ${filePath}:`, error.message);
    return [];
  }
}

// Compare the image data
function compareImageData(prodImages, testImages) {
  console.log('\n=== COMPARISON RESULTS ===');
  console.log(`Production site: ${prodImages.length} resource cards`);
  console.log(`Test site: ${testImages.length} resource cards`);
  
  // Count unique image paths
  const uniqueProdPaths = [...new Set(prodImages.map(img => img.imgSrc))];
  const uniqueTestPaths = [...new Set(testImages.map(img => img.imgSrc))];
  
  console.log(`\nUnique image paths in production: ${uniqueProdPaths.length}`);
  console.log(`Unique image paths in test: ${uniqueTestPaths.length}`);
  
  // Show the unique paths from production
  console.log('\nUnique production image paths:');
  uniqueProdPaths.forEach((path, index) => {
    console.log(`${index + 1}. ${path}`);
  });
  
  // Show the unique paths from test
  console.log('\nUnique test image paths:');
  uniqueTestPaths.forEach((path, index) => {
    console.log(`${index + 1}. ${path}`);
  });
  
  // Compare individual cards
  console.log('\n=== CARD COMPARISON ===');
  const minLength = Math.min(prodImages.length, testImages.length);
  
  let mismatchCount = 0;
  for (let i = 0; i < minLength; i++) {
    const prod = prodImages[i];
    const test = testImages[i];
    
    if (prod.imgSrc !== test.imgSrc) {
      mismatchCount++;
      console.log(`\nCard ${i + 1} - "${prod.title}"`);
      console.log(`  Production: ${prod.imgSrc}`);
      console.log(`  Test:       ${test.imgSrc}`);
    }
  }
  
  console.log(`\nTotal mismatched image paths: ${mismatchCount} out of ${minLength}`);
  
  // Generate a mapping from test to production image paths
  console.log('\n=== FIX MAPPING ===');
  console.log('Map of test titles to production image paths:');
  
  const mapping = {};
  for (let i = 0; i < minLength; i++) {
    mapping[testImages[i].title] = prodImages[i].imgSrc;
  }
  
  console.log(JSON.stringify(mapping, null, 2));
  
  return {
    prodImages,
    testImages,
    uniqueProdPaths,
    uniqueTestPaths,
    mismatchCount,
    mapping
  };
}

// Main function
function main() {
  const prodImages = extractImageData(PROD_HTML_PATH);
  const testImages = extractImageData(TEST_HTML_PATH);
  
  const results = compareImageData(prodImages, testImages);
  
  // Save the results
  fs.writeFileSync(
    path.join(__dirname, 'ollama-test-output', 'image-path-mapping.json'),
    JSON.stringify(results.mapping, null, 2)
  );
  
  console.log('\nImage path mapping saved to tests/ollama-test-output/image-path-mapping.json');
}

// Run the main function
main();
