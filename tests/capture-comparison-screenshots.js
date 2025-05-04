const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function captureScreenshots() {
  // Ensure screenshots directory exists
  const screenshotsDir = path.join(__dirname, 'visual-comparison');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // Pages to compare
    const pagesToCompare = [
      { path: '/', name: 'homepage' },
      { path: '/resources', name: 'resources' },
      { path: '/pages/about', name: 'about' },
      { path: '/pages/ep01', name: 'ep01' },
      { path: '/pages/ep10', name: 'ep10' }
    ];

    const localPage = await browser.newPage();
    const prodPage = await browser.newPage();

    // Set identical viewport sizes
    await localPage.setViewport({ width: 1280, height: 900 });
    await prodPage.setViewport({ width: 1280, height: 900 });

    for (const page of pagesToCompare) {
      console.log(`Capturing ${page.name} screenshots...`);

      // Navigate to local page
      await localPage.goto(`http://localhost:4321${page.path}`, { waitUntil: 'networkidle2' });
      await localPage.screenshot({ 
        path: path.join(screenshotsDir, `local-${page.name}.png`),
        fullPage: true
      });

      // Navigate to production page
      await prodPage.goto(`https://ai-tools-lab.com${page.path}`, { waitUntil: 'networkidle2' });
      await prodPage.screenshot({ 
        path: path.join(screenshotsDir, `prod-${page.name}.png`),
        fullPage: true
      });
    }

    console.log('All screenshots captured successfully');
  } catch (error) {
    console.error('Error capturing screenshots:', error);
  } finally {
    await browser.close();
  }
}

captureScreenshots();
