const puppeteer = require('puppeteer');

async function checkResourcesPage() {
  console.log('Starting resources page check...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport size for consistent screenshots
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate to the resources page
    console.log('Navigating to resources page...');
    await page.goto('http://localhost:4321/resources', { waitUntil: 'networkidle2' });
    
    // Take screenshot for visual verification
    await page.screenshot({ path: 'tests/screenshots/resources-page.png' });
    
    // Check for resource cards
    const resourceCards = await page.$$('.resource-card');
    console.log(`Found ${resourceCards.length} resource cards`);
    
    // Check for resource card images
    const cardImages = await page.$$('.resource-card-image');
    console.log(`Found ${cardImages.length} resource card images`);
    
    // Check CSS properties of resource card images
    const hasBackgroundImage = await page.evaluate(() => {
      const cardImage = document.querySelector('.resource-card-image');
      if (!cardImage) return false;
      
      const computedStyle = window.getComputedStyle(cardImage);
      return computedStyle.backgroundImage !== 'none';
    });
    
    console.log(`Resource card images have background image: ${hasBackgroundImage}`);
    
    return {
      resourceCardsCount: resourceCards.length,
      cardImagesCount: cardImages.length,
      hasBackgroundImage
    };
  } catch (error) {
    console.error('Error checking resources page:', error);
    return { error: error.message };
  } finally {
    await browser.close();
  }
}

// Run the check
checkResourcesPage().then(results => {
  console.log('\nResults:', results);
  
  if (results.resourceCardsCount > 0 && results.hasBackgroundImage) {
    console.log('✅ Resources page check passed!');
  } else {
    console.log('❌ Resources page check failed!');
  }
});
