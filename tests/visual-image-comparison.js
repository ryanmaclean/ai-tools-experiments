/**
 * Visual Image Comparison
 * 
 * This script performs visual comparison of resource card images between
 * test and production sites, handling both URL differences and visual content.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createCanvas, Image } = require('canvas');

// URLs to compare
const TEST_URL = 'https://ai-tools-lab-tst.netlify.app/pages/resources';
const PROD_URL = 'https://ai-tools-lab.com/pages/resources';

// Setup output directory
const OUTPUT_DIR = path.join(__dirname, 'image-comparison');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Calculate the similarity between two images
 */
function calculateSimilarity(imgA, imgB) {
  const width = Math.min(imgA.width, imgB.width);
  const height = Math.min(imgA.height, imgB.height);
  
  const canvas1 = createCanvas(width, height);
  const ctx1 = canvas1.getContext('2d');
  ctx1.drawImage(imgA, 0, 0, width, height);
  
  const canvas2 = createCanvas(width, height);
  const ctx2 = canvas2.getContext('2d');
  ctx2.drawImage(imgB, 0, 0, width, height);
  
  const data1 = ctx1.getImageData(0, 0, width, height).data;
  const data2 = ctx2.getImageData(0, 0, width, height).data;
  
  let matchingPixels = 0;
  const totalPixels = width * height;
  const threshold = 50; // RGB difference threshold
  
  for (let i = 0; i < data1.length; i += 4) {
    const r1 = data1[i];
    const g1 = data1[i + 1];
    const b1 = data1[i + 2];
    
    const r2 = data2[i];
    const g2 = data2[i + 1];
    const b2 = data2[i + 2];
    
    const diff = Math.sqrt(
      Math.pow(r1 - r2, 2) +
      Math.pow(g1 - g2, 2) +
      Math.pow(b1 - b2, 2)
    );
    
    if (diff < threshold) {
      matchingPixels++;
    }
  }
  
  return (matchingPixels / totalPixels) * 100;
}

/**
 * Download an image and return it as an Image object
 */
async function downloadImage(url, baseUrl) {
  try {
    // Handle relative URLs
    const fullUrl = url.startsWith('http') ? url : new URL(url, baseUrl).href;
    
    const response = await axios.get(fullUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = err => reject(err);
      img.src = buffer;
    });
  } catch (error) {
    console.error(`Error downloading image from ${url}:`, error.message);
    return null;
  }
}

/**
 * Extract resource card image info from a page
 */
async function extractImageInfo(browser, url) {
  console.log(`Analyzing images at ${url}...`);
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  
  // Extract information about all resource card images
  const imageInfo = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('.resource-card-image img'));
    return images.map((img, index) => ({
      index,
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt') || '',
      width: img.width,
      height: img.height,
      className: img.className,
      visible: img.offsetWidth > 0 && img.offsetHeight > 0
    }));
  });
  
  await page.close();
  return imageInfo;
}

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Extract image info from both sites
    const testImages = await extractImageInfo(browser, TEST_URL);
    const prodImages = await extractImageInfo(browser, PROD_URL);
    
    console.log(`\nTest site: ${testImages.length} images found`);
    console.log(`Production site: ${prodImages.length} images found`);
    
    // Detailed comparison with visual check
    console.log('\n=== IMAGE COMPARISON ===');
    
    // Find the minimum length to avoid index errors
    const minLength = Math.min(testImages.length, prodImages.length);
    let visuallyMatchingCount = 0;
    let pathMatchingCount = 0;
    let filenameMismatchButVisuallyMatching = 0;
    
    // Sample 5 images for detailed analysis (first 3, middle, and last)
    const samplesToCheck = [0, 1, 2, Math.floor(minLength / 2), minLength - 1];
    
    for (const i of samplesToCheck) {
      if (i >= minLength) continue;
      
      const testImg = testImages[i];
      const prodImg = prodImages[i];
      
      console.log(`\nImage ${i+1}:`);
      console.log(`  Test: ${testImg.src}`);
      console.log(`  Prod: ${prodImg.src}`);
      console.log(`  Alt text: Test='${testImg.alt}', Prod='${prodImg.alt}'`);
      
      // Extract just the filename for cleaner comparison
      const testFilename = testImg.src.split('/').pop();
      const prodFilename = prodImg.src.split('/').pop();
      const filenameMatch = testFilename === prodFilename;
      
      // Check if the source paths are the same (ignoring domain differences)
      const testPath = testImg.src.startsWith('http') ? new URL(testImg.src).pathname : testImg.src;
      const prodPath = prodImg.src.startsWith('http') ? new URL(prodImg.src).pathname : prodImg.src;
      const pathMatch = testPath === prodPath;
      
      if (pathMatch) pathMatchingCount++;
      
      // Download and visually compare the images
      try {
        const testImgObj = await downloadImage(testImg.src, TEST_URL);
        const prodImgObj = await downloadImage(prodImg.src, PROD_URL);
        
        if (testImgObj && prodImgObj) {
          const similarity = calculateSimilarity(testImgObj, prodImgObj);
          console.log(`  Visual similarity: ${similarity.toFixed(2)}%`);
          
          // Save the images for visual inspection
          const testImgPath = path.join(OUTPUT_DIR, `test-image-${i+1}.png`);
          const prodImgPath = path.join(OUTPUT_DIR, `prod-image-${i+1}.png`);
          
          // Create canvases for writing the images
          const testCanvas = createCanvas(testImgObj.width, testImgObj.height);
          const testCtx = testCanvas.getContext('2d');
          testCtx.drawImage(testImgObj, 0, 0);
          fs.writeFileSync(testImgPath, testCanvas.toBuffer());
          
          const prodCanvas = createCanvas(prodImgObj.width, prodImgObj.height);
          const prodCtx = prodCanvas.getContext('2d');
          prodCtx.drawImage(prodImgObj, 0, 0);
          fs.writeFileSync(prodImgPath, prodCanvas.toBuffer());
          
          // Consider images visually matching if similarity > 90%
          const visualMatch = similarity > 90;
          console.log(`  Visually matching: ${visualMatch ? 'YES \u2705' : 'NO \u274c'}`);
          
          if (visualMatch) {
            visuallyMatchingCount++;
            if (!filenameMatch) filenameMismatchButVisuallyMatching++;
          }
        } else {
          console.log(`  Couldn't download both images for comparison`);
        }
      } catch (error) {
        console.error(`  Error comparing images:`, error.message);
      }
      
      console.log(`  Filename match: ${filenameMatch ? 'YES \u2705' : 'NO \u274c'}`);
      console.log(`  Path match: ${pathMatch ? 'YES \u2705' : 'NO \u274c'}`);
      console.log(`  Visibility: Test=${testImg.visible}, Prod=${prodImg.visible}`);
    }
    
    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Images checked in detail: ${samplesToCheck.length}`);
    console.log(`Total resource cards: Test=${testImages.length}, Prod=${prodImages.length}`);
    console.log(`URL path match: ${pathMatchingCount}/${samplesToCheck.length} images`);
    console.log(`Visual content match: ${visuallyMatchingCount}/${samplesToCheck.length} images`);
    
    if (filenameMismatchButVisuallyMatching > 0) {
      console.log(`\nIMPORTANT: ${filenameMismatchButVisuallyMatching} images have different URLs but visually match!`);
      console.log(`This suggests the sites use different image paths for the same content.`);
    }
    
    console.log(`\nNext steps: Check the image files saved in ${OUTPUT_DIR} for visual comparison`);
    
    // Generate recommendations
    console.log('\n=== RECOMMENDATIONS ===');
    if (visuallyMatchingCount === samplesToCheck.length) {
      console.log('\u2705 The resource card images are visually the same between test and production.');
      console.log('However, they use different paths/filenames, which should be standardized.');
      console.log('\nOptions to resolve:');
      console.log('1. Update test site to use the same image paths as production');
      console.log('2. Use a CDN or consistent image path structure across environments');
      console.log('3. Add URL rewrites in Netlify config to handle both path patterns');
    } else {
      console.log('\u274c Some resource card images appear visually different between test and production.');
      console.log('This needs to be addressed before deploying to production.');
    }
  } catch (error) {
    console.error('Error in image comparison:', error);
  } finally {
    await browser.close();
  }
}

// Run the comparison
main();
