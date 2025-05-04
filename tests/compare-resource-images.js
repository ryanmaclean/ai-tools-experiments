/**
 * Compare Resource Card Images
 * 
 * This script compares the resource card images between test and production sites
 * to determine if they're using the same image files.
 */

const puppeteer = require('puppeteer');

// URLs to compare
const TEST_URL = 'https://ai-tools-lab-tst.netlify.app/pages/resources';
const PROD_URL = 'https://ai-tools-lab.com/pages/resources';

async function extractImageInfo(browser, url) {
  console.log(`Analyzing images at ${url}...`);
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  
  // Extract information about all resource card images
  const imageInfo = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('.resource-card-image img'));
    return images.map(img => ({
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt') || '',
      width: img.width,
      height: img.height,
      className: img.className,
      display: window.getComputedStyle(img).display,
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
    
    // Compare image sources
    const comparison = {
      identical: testImages.length === prodImages.length,
      testCount: testImages.length,
      prodCount: prodImages.length,
      differences: []
    };
    
    // Detailed comparison
    console.log('\n=== IMAGE COMPARISON ===');
    
    // Find the minimum length to avoid index errors
    const minLength = Math.min(testImages.length, prodImages.length);
    
    for (let i = 0; i < minLength; i++) {
      const testImg = testImages[i];
      const prodImg = prodImages[i];
      
      // Compare the image sources
      const srcMatch = testImg.src === prodImg.src;
      // Extract just the filename for cleaner comparison
      const testFilename = testImg.src.split('/').pop();
      const prodFilename = prodImg.src.split('/').pop();
      const filenameMatch = testFilename === prodFilename;
      
      // Check if the source paths are the same (ignoring domain differences)
      // Handle both absolute and relative URLs
      const testPath = testImg.src.startsWith('http') ? new URL(testImg.src).pathname : testImg.src;
      const prodPath = prodImg.src.startsWith('http') ? new URL(prodImg.src).pathname : prodImg.src;
      const pathMatch = testPath === prodPath;
      
      // Print detailed info for just a few examples to keep output clean
      if (i < 3 || i === minLength - 1) {
        console.log(`Image ${i+1}:`);
        console.log(`  Test: ${testImg.src}`);
        console.log(`  Prod: ${prodImg.src}`);
        console.log(`  Alt text: Test='${testImg.alt}', Prod='${prodImg.alt}'`);
        console.log(`  Exact match: ${srcMatch ? 'YES ✅' : 'NO ❌'}`);
        console.log(`  Filename match: ${filenameMatch ? 'YES ✅' : 'NO ❌'}`);
        console.log(`  Path match: ${pathMatch ? 'YES ✅' : 'NO ❌'}`);
        console.log(`  Visibility: Test=${testImg.visible}, Prod=${prodImg.visible}`);
      }
      
      if (!pathMatch) {
        comparison.differences.push({
          index: i,
          testSrc: testImg.src,
          prodSrc: prodImg.src,
          testPath,
          prodPath
        });
      }
    }
    
    // Check for extra images in either site
    if (testImages.length > prodImages.length) {
      console.log('\nTest site has extra images:');
      for (let i = prodImages.length; i < testImages.length; i++) {
        console.log(`  ${i+1}: ${testImages[i].src}`);
      }
    } else if (prodImages.length > testImages.length) {
      console.log('\nProduction site has extra images:');
      for (let i = testImages.length; i < prodImages.length; i++) {
        console.log(`  ${i+1}: ${prodImages[i].src}`);
      }
    }
    
    // Summary
    console.log('\n=== SUMMARY ===');
    if (comparison.differences.length === 0 && comparison.testCount === comparison.prodCount) {
      console.log('✅ All resource card images match between test and production sites!');
    } else {
      console.log(`❌ Found ${comparison.differences.length} differences in image paths`);
      if (comparison.testCount !== comparison.prodCount) {
        console.log(`❌ Image count mismatch: Test=${comparison.testCount}, Prod=${comparison.prodCount}`);
      }
    }
    
    return comparison;
  } catch (error) {
    console.error('Error comparing images:', error);
  } finally {
    await browser.close();
  }
}

// Run the comparison
main();
