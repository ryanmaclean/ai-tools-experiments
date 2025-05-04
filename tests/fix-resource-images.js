/**
 * Fix Resource Images Script
 * 
 * This script updates the resources.html file to replace all resource card
 * image paths with the correct ones from the production site.
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Paths
const RESOURCES_HTML_PATH = path.join(process.cwd(), 'src', 'content', 'transcripts', 'resources.html');
const PROD_IMAGES_JSON_PATH = path.join(__dirname, 'puppeteer-output', 'prod-images.json');

// Main function
async function main() {
  console.log('Starting resource image path fix...');
  
  // Load the production image data
  console.log(`Loading production image data from ${PROD_IMAGES_JSON_PATH}...`);
  const prodImagesRaw = fs.readFileSync(PROD_IMAGES_JSON_PATH, 'utf8');
  const prodImages = JSON.parse(prodImagesRaw);
  
  console.log(`Found ${prodImages.length} resource cards with images in production data`);
  
  // Load the resources HTML file
  console.log(`Loading resources HTML from ${RESOURCES_HTML_PATH}...`);
  const html = fs.readFileSync(RESOURCES_HTML_PATH, 'utf8');
  
  // Parse HTML with Cheerio
  const $ = cheerio.load(html);
  
  // Find all resource cards
  const resourceCards = $('.resource-card');
  console.log(`Found ${resourceCards.length} resource cards in HTML file`);
  
  if (resourceCards.length !== prodImages.length) {
    console.warn(`Warning: Number of resource cards in HTML (${resourceCards.length}) doesn't match production data (${prodImages.length})`);
    console.warn('Will attempt to match by title and content...');
  }
  
  // Track changes
  let changedCount = 0;
  let matchedByTitle = 0;
  let matchedByIndex = 0;
  
  // Process each resource card
  resourceCards.each((index, card) => {
    const $card = $(card);
    const $img = $card.find('.resource-card-image img');
    const currentSrc = $img.attr('src');
    const cardTitle = $card.find('.resource-card-content h2').text().trim();
    
    // Try to find matching production image by title first
    let prodImg = prodImages.find(img => img.title === cardTitle);
    
    if (prodImg) {
      matchedByTitle++;
    } else {
      // Fall back to matching by index if titles don't match
      prodImg = prodImages[index];
      if (prodImg) matchedByIndex++;
    }
    
    // Update the image source if we found a matching production image
    if (prodImg && prodImg.imgSrc && currentSrc !== prodImg.imgSrc) {
      $img.attr('src', prodImg.imgSrc);
      $img.attr('alt', prodImg.imgAlt);
      changedCount++;
      console.log(`Card ${index+1}: Changed image from "${currentSrc}" to "${prodImg.imgSrc}"`);
    }
  });
  
  // Save the updated HTML
  const backupPath = `${RESOURCES_HTML_PATH}.bak`;
  fs.writeFileSync(backupPath, html); // Create backup of original
  fs.writeFileSync(RESOURCES_HTML_PATH, $.html());
  
  console.log('\n=== SUMMARY ===');
  console.log(`Total resource cards processed: ${resourceCards.length}`);
  console.log(`Changed image paths: ${changedCount}`);
  console.log(`Matched by title: ${matchedByTitle}`);
  console.log(`Matched by index: ${matchedByIndex}`);
  console.log(`Original file backed up to: ${backupPath}`);
  console.log(`Updated file saved to: ${RESOURCES_HTML_PATH}`);
  
  console.log('\n=== NEXT STEPS ===');
  console.log('1. Rebuild the site to apply the changes');
  console.log('2. Run visual comparison tests to confirm the fix');
  console.log('3. Commit and push the changes to both repositories');
  console.log('4. Deploy to Netlify and verify the fix');
}

// Run the main function
main().catch(error => {
  console.error('Error fixing resource images:', error);
});
