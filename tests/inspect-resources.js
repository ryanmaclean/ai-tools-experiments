const puppeteer = require('puppeteer');

async function inspectResourcesPage() {
  console.log('Inspecting resources page...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.goto('http://localhost:4321/resources', { waitUntil: 'networkidle2' });
    
    // Extract image source information
    const imageInfo = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('.resource-card-image img'));
      return images.map(img => ({
        src: img.getAttribute('src'),
        display: window.getComputedStyle(img).display,
        visible: img.offsetWidth > 0 && img.offsetHeight > 0
      }));
    });
    
    console.log('Resource card image info:');
    console.log(JSON.stringify(imageInfo, null, 2));
    
    return imageInfo;
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

inspectResourcesPage();
