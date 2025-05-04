/**
 * Download Production Images
 * 
 * This script downloads the actual image files from the production site
 * that are missing in our local environment.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Production site URL
const PROD_URL = 'https://ai-tools-lab.com/pages/resources';

// Root directory for saving images
const PUBLIC_DIR = path.join(process.cwd(), 'public');

/**
 * Extract image URLs from production site
 */
async function extractImageUrls() {
  console.log(`Extracting image URLs from ${PROD_URL}...`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.goto(PROD_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Extract image sources directly from the page
    const imageSources = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('.resource-card-image img'));
      return images.map(img => img.getAttribute('src'));
    });
    
    return imageSources;
  } catch (error) {
    console.error('Error extracting image URLs:', error.message);
    return [];
  } finally {
    await browser.close();
  }
}

/**
 * Download an image from URL to local path
 */
async function downloadImage(imageUrl, outputPath, baseUrl = 'https://ai-tools-lab.com') {
  try {
    // Handle relative URLs
    const fullUrl = imageUrl.startsWith('http') 
      ? imageUrl 
      : new URL(imageUrl, baseUrl).href;
    
    console.log(`Downloading ${fullUrl}...`);
    
    const response = await axios({
      method: 'GET',
      url: fullUrl,
      responseType: 'arraybuffer',
      timeout: 10000
    });
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, response.data);
    console.log(`✅ Saved to ${outputPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error downloading ${imageUrl}:`, error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Starting image download process...');
  
  // Extract image URLs
  const imageUrls = await extractImageUrls();
  
  console.log(`\nFound ${imageUrls.length} unique image URLs on production site`);
  
  // Results tracking
  const results = {
    total: imageUrls.length,
    success: 0,
    failed: 0,
    skipped: 0,
    details: []
  };
  
  // Download each image
  for (const [index, url] of imageUrls.entries()) {
    // Skip data URLs or empty URLs
    if (!url || url.startsWith('data:')) {
      console.log(`Skipping image #${index+1}: Not a valid URL`);
      results.skipped++;
      continue;
    }
    
    // Create local path
    const localPath = url.startsWith('/') 
      ? path.join(PUBLIC_DIR, url)
      : path.join(PUBLIC_DIR, '/', url);
    
    // Skip if file already exists
    if (fs.existsSync(localPath)) {
      console.log(`Skipping image #${index+1}: Already exists at ${localPath}`);
      results.skipped++;
      results.details.push({
        index,
        url,
        localPath,
        status: 'skipped-exists'
      });
      continue;
    }
    
    // Download the image
    const success = await downloadImage(url, localPath);
    
    if (success) {
      results.success++;
      results.details.push({
        index,
        url,
        localPath,
        status: 'success'
      });
    } else {
      results.failed++;
      results.details.push({
        index,
        url,
        localPath,
        status: 'failed'
      });
    }
  }
  
  // Write results
  const resultsPath = path.join(__dirname, 'download-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  
  // Print summary
  console.log('\n=== DOWNLOAD SUMMARY ===');
  console.log(`Total images: ${results.total}`);
  console.log(`Successfully downloaded: ${results.success}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Skipped (already exist): ${results.skipped}`);
  console.log(`\nResults saved to: ${resultsPath}`);
  
  if (results.failed > 0) {
    console.log('\n⚠️ Some images failed to download. Check the results file for details.');
  } else {
    console.log('\n✅ All images processed successfully!');
  }
  
  console.log('\n=== NEXT STEPS ===');
  console.log('1. Commit and push the downloaded images to both repositories');
  console.log('2. Deploy to Netlify to test the changes');
  console.log('3. Run visual comparison tests to confirm image paths are correct');
}

// Run the main function
main().catch(error => {
  console.error('Error in main process:', error);
});
