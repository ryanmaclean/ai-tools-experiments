/**
 * Download Production Images
 * 
 * This script downloads the resource card images from the production site
 * to the local public/images directory to fix image path discrepancies.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Output directory for images
const IMAGE_OUTPUT_DIR = path.join(process.cwd(), 'public', 'images');

// Path to the saved production HTML
const PROD_HTML_PATH = path.join(__dirname, 'ollama-test-output', 'ai-tools-lab.com-resources.html');

// Production site base URL
const PROD_BASE_URL = 'https://ai-tools-lab.com';

// Ensure output directory exists
if (!fs.existsSync(IMAGE_OUTPUT_DIR)) {
  fs.mkdirSync(IMAGE_OUTPUT_DIR, { recursive: true });
}

// Extract image URLs from the production HTML
function extractImageURLs() {
  console.log('Extracting image URLs from production HTML...');
  
  try {
    const html = fs.readFileSync(PROD_HTML_PATH, 'utf8');
    const $ = cheerio.load(html);
    
    const imageData = [];
    
    $('.resource-card').each((index, card) => {
      const $card = $(card);
      const title = $card.find('.resource-card-content h2').text().trim();
      const $img = $card.find('.resource-card-image img');
      const imgSrc = $img.attr('src') || '';
      const imgAlt = $img.attr('alt') || '';
      
      if (imgSrc && !imgSrc.includes('data:image')) { // Skip base64 images
        imageData.push({
          index,
          title,
          imgSrc,
          imgAlt
        });
      }
    });
    
    return imageData;
  } catch (error) {
    console.error('Error extracting image URLs:', error.message);
    return [];
  }
}

// Download an image
async function downloadImage(imageUrl, outputPath) {
  try {
    // Make sure URL is absolute
    const fullUrl = imageUrl.startsWith('http') 
      ? imageUrl 
      : new URL(imageUrl, PROD_BASE_URL).href;
    
    console.log(`Downloading ${fullUrl}...`);
    
    const response = await axios({
      method: 'GET',
      url: fullUrl,
      responseType: 'arraybuffer'
    });
    
    fs.writeFileSync(outputPath, response.data);
    console.log(`Saved to ${outputPath}`);
    return true;
  } catch (error) {
    console.error(`Error downloading ${imageUrl}:`, error.message);
    return false;
  }
}

// Download all images
async function downloadAllImages(imageData) {
  console.log(`\nDownloading ${imageData.length} images from production site...`);
  
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    paths: []
  };
  
  for (const item of imageData) {
    // Skip if it's a data URL or placeholder
    if (!item.imgSrc || item.imgSrc.startsWith('data:') || item.imgSrc.includes('placeholder')) {
      console.log(`Skipping ${item.imgSrc}`);
      results.skipped++;
      continue;
    }
    
    // Create local file path
    const urlPath = item.imgSrc.startsWith('/') ? item.imgSrc : `/${item.imgSrc}`;
    const localPath = path.join(process.cwd(), 'public', urlPath);
    
    // Create directory if it doesn't exist
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Check if file already exists
    if (fs.existsSync(localPath)) {
      console.log(`File already exists: ${localPath}`);
      results.skipped++;
      continue;
    }
    
    // Download the image
    const success = await downloadImage(item.imgSrc, localPath);
    
    if (success) {
      results.success++;
      results.paths.push({
        title: item.title,
        remotePath: item.imgSrc,
        localPath: localPath
      });
    } else {
      results.failed++;
    }
  }
  
  return results;
}

// Main function
async function main() {
  console.log('Starting production image download...');
  
  // Extract image URLs
  const imageData = extractImageURLs();
  console.log(`Found ${imageData.length} resource card images`);
  
  // Download images
  const results = await downloadAllImages(imageData);
  
  // Print summary
  console.log('\n=== DOWNLOAD SUMMARY ===');
  console.log(`Total images found: ${imageData.length}`);
  console.log(`Successfully downloaded: ${results.success}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Skipped (already exists): ${results.skipped}`);
  
  // Save the results
  fs.writeFileSync(
    path.join(__dirname, 'ollama-test-output', 'download-results.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log('\nDownload results saved to tests/ollama-test-output/download-results.json');
  console.log('\nNext steps:');
  console.log('1. Run the visual comparison test again with the new images');
  console.log('2. Check if the ResourceCard component is still using the correct image paths');
}

// Run the main function
main().catch(error => {
  console.error('Error in main process:', error);
});
