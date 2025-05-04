/**
 * Puppeteer Image Extractor
 * 
 * This script uses Puppeteer to directly extract and compare image paths
 * from the production and test sites, then download the missing images.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// URLs to analyze
const PROD_URL = 'https://ai-tools-lab.com/pages/resources';
const TEST_URL = 'https://ai-tools-lab-tst.netlify.app/pages/resources';

// Output directory
const OUTPUT_DIR = path.join(__dirname, 'puppeteer-output');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Extract image paths using Puppeteer
 */
async function extractImagePaths(url) {
  console.log(`Extracting image paths from ${url}...`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Take a screenshot of the entire page
    await page.screenshot({ 
      path: path.join(OUTPUT_DIR, `${new URL(url).hostname}.png`),
      fullPage: true 
    });
    
    // Extract image data directly from the DOM
    const imageData = await page.evaluate(() => {
      const resources = [];
      const cards = document.querySelectorAll('.resource-card');
      
      cards.forEach((card, index) => {
        const title = card.querySelector('.resource-card-content h2')?.textContent?.trim() || '';
        const img = card.querySelector('.resource-card-image img');
        
        resources.push({
          index,
          title,
          imgSrc: img ? img.getAttribute('src') : '',
          imgAlt: img ? img.getAttribute('alt') : '',
          resourceDescription: card.querySelector('.resource-card-content p')?.textContent?.trim() || ''
        });
      });
      
      return resources;
    });
    
    return imageData;
  } catch (error) {
    console.error(`Error extracting data from ${url}:`, error.message);
    return [];
  } finally {
    await browser.close();
  }
}

/**
 * Download an image
 */
async function downloadImage(imageUrl, outputPath, baseUrl) {
  try {
    // Make sure URL is absolute
    const fullUrl = imageUrl.startsWith('http') 
      ? imageUrl 
      : new URL(imageUrl, baseUrl).href;
    
    console.log(`Downloading ${fullUrl}...`);
    
    const response = await axios({
      method: 'GET',
      url: fullUrl,
      responseType: 'arraybuffer'
    });
    
    // Create directory if it doesn't exist
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, response.data);
    console.log(`Saved to ${outputPath}`);
    return true;
  } catch (error) {
    console.error(`Error downloading ${imageUrl}:`, error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Starting image extraction and comparison...');
  
  // Extract image paths from both sites
  const prodImages = await extractImagePaths(PROD_URL);
  const testImages = await extractImagePaths(TEST_URL);
  
  console.log(`Production site: ${prodImages.length} resource cards found`);
  console.log(`Test site: ${testImages.length} resource cards found`);
  
  // Write image data to file
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'prod-images.json'),
    JSON.stringify(prodImages, null, 2)
  );
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'test-images.json'),
    JSON.stringify(testImages, null, 2)
  );
  
  // Count unique image paths
  const uniqueProdPaths = [...new Set(prodImages.map(img => img.imgSrc))];
  const uniqueTestPaths = [...new Set(testImages.map(img => img.imgSrc))];
  
  console.log(`Unique image paths in production: ${uniqueProdPaths.length}`);
  console.log(`Unique image paths in test: ${uniqueTestPaths.length}`);
  
  // Show sample of production image paths
  console.log('\nProduction image paths (sample):');
  uniqueProdPaths.slice(0, 5).forEach(path => console.log(` - ${path}`));
  
  // Show sample of test image paths
  console.log('\nTest image paths (sample):');
  uniqueTestPaths.slice(0, 5).forEach(path => console.log(` - ${path}`));
  
  // Compare and download missing production images
  console.log('\nDownloading production images that differ from test site...');
  
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    imageMappings: []
  };
  
  // Using a for loop instead of forEach for better async handling
  for (let i = 0; i < Math.min(prodImages.length, testImages.length); i++) {
    const prodImg = prodImages[i];
    const testImg = testImages[i];
    
    // Skip if production image source is already the same as test
    if (prodImg.imgSrc === testImg.imgSrc) {
      results.skipped++;
      continue;
    }
    
    // Skip if it's a data URL or empty
    if (!prodImg.imgSrc || prodImg.imgSrc.startsWith('data:')) {
      results.skipped++;
      continue;
    }
    
    // Create local file path
    const urlPath = prodImg.imgSrc.startsWith('/') ? prodImg.imgSrc : `/${prodImg.imgSrc}`;
    const localPath = path.join(process.cwd(), 'public', urlPath);
    
    // Check if file already exists
    if (fs.existsSync(localPath)) {
      console.log(`File already exists: ${localPath}`);
      results.skipped++;
      continue;
    }
    
    // Download the image
    const success = await downloadImage(prodImg.imgSrc, localPath, PROD_URL);
    
    if (success) {
      results.success++;
      results.imageMappings.push({
        index: i,
        title: prodImg.title,
        prodImagePath: prodImg.imgSrc,
        testImagePath: testImg.imgSrc,
        localSavedPath: localPath
      });
    } else {
      results.failed++;
    }
  }
  
  // Print summary
  console.log('\n=== DOWNLOAD SUMMARY ===');
  console.log(`Images compared: ${Math.min(prodImages.length, testImages.length)}`);
  console.log(`Successfully downloaded: ${results.success}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Skipped (already exists or matching): ${results.skipped}`);
  
  // Save the results
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'download-results.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log('\nResults saved to tests/puppeteer-output/download-results.json');
  
  // Make recommendations
  console.log('\n=== NEXT STEPS ===');
  console.log(`1. Update the HTML in src/content/transcripts/resources.html to use the correct image paths`);
  console.log(`2. Run visual comparison tests again to confirm images match`);
  console.log(`3. Commit and push changes to both repositories`);
  console.log(`4. Deploy to Netlify and verify the fix`);
}

// Run the main function
main().catch(error => {
  console.error('Error in main process:', error);
});
