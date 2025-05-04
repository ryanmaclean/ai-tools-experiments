/**
 * Accessibility Testing
 * 
 * This script uses Puppeteer and axe-core to perform accessibility testing
 * on the static HTML pages to ensure they meet WCAG guidelines.
 */

const puppeteer = require('puppeteer');
const { AxePuppeteer } = require('@axe-core/puppeteer');
const fs = require('fs');
const path = require('path');

// Create reports directory if it doesn't exist
const reportsDir = path.join(__dirname, 'a11y-reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

async function runAccessibilityTests() {
  console.log('Starting accessibility tests...');
  
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: 'new'
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Define pages to test
    const pagesToTest = [
      { name: 'home', url: 'http://localhost:4325/' },
      { name: 'about', url: 'http://localhost:4325/pages/about' },
      { name: 'resources', url: 'http://localhost:4325/resources' }
    ];
    
    // Test each page
    for (const { name, url } of pagesToTest) {
      console.log(`\nTesting accessibility for ${name} page...`);
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      // Run axe-core analysis
      const results = await new AxePuppeteer(page).analyze();
      
      // Save results to a file
      fs.writeFileSync(
        path.join(reportsDir, `${name}-a11y-report.json`),
        JSON.stringify(results, null, 2)
      );
      
      // Log results summary
      console.log(`- Accessibility violations found: ${results.violations.length}`);
      if (results.violations.length > 0) {
        console.log('- Violations summary:');
        results.violations.forEach((violation, index) => {
          console.log(`  ${index + 1}. ${violation.id}: ${violation.help} - Impact: ${violation.impact}`);
          console.log(`     Affected elements: ${violation.nodes.length}`);
        });
      } else {
        console.log('- No accessibility violations found! ✓');
      }
      
      // Check for specific accessibility features
      console.log('- Checking additional accessibility features:');
      
      // Check for alt text on images
      const imagesWithoutAlt = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img:not([alt]), img[alt=""]'));
        return images.length;
      });
      
      console.log(`  • Images without alt text: ${imagesWithoutAlt}`);
      
      // Check for proper heading structure
      const headingStructure = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        return headings.map(h => ({ level: parseInt(h.tagName.substring(1)), text: h.textContent.trim() }));
      });
      
      console.log(`  • Heading structure:`);
      headingStructure.forEach(h => console.log(`    ${h.level}: ${h.text.substring(0, 40)}${h.text.length > 40 ? '...' : ''}`))
      
      // Check for semantic HTML elements
      const semanticElements = await page.evaluate(() => {
        return {
          nav: document.querySelectorAll('nav').length,
          main: document.querySelectorAll('main').length,
          header: document.querySelectorAll('header').length,
          footer: document.querySelectorAll('footer').length,
          sections: document.querySelectorAll('section').length,
          articles: document.querySelectorAll('article').length
        };
      });
      
      console.log(`  • Semantic HTML usage:`);
      for (const [element, count] of Object.entries(semanticElements)) {
        console.log(`    ${element}: ${count}`);
      }
      
      // Check for ARIA attributes
      const ariaUsage = await page.evaluate(() => {
        return {
          ariaLabels: document.querySelectorAll('[aria-label]').length,
          ariaDescribedby: document.querySelectorAll('[aria-describedby]').length,
          ariaExpanded: document.querySelectorAll('[aria-expanded]').length,
          ariaHidden: document.querySelectorAll('[aria-hidden]').length,
          role: document.querySelectorAll('[role]').length
        };
      });
      
      console.log(`  • ARIA usage:`);
      for (const [attr, count] of Object.entries(ariaUsage)) {
        console.log(`    ${attr}: ${count}`);
      }
      
      // Check color contrast (basic check for dark text on light background)
      const bodyColor = await page.evaluate(() => {
        const body = document.body;
        const style = window.getComputedStyle(body);
        return {
          color: style.color,
          backgroundColor: style.backgroundColor
        };
      });
      
      console.log(`  • Body text/background color: ${bodyColor.color} on ${bodyColor.backgroundColor}`);
    }
    
    console.log('\nAccessibility tests completed!');
    return true;
  } catch (error) {
    console.error('Error during accessibility testing:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the tests
runAccessibilityTests().then(success => {
  if (!success) {
    console.error('Accessibility tests failed!');
    process.exit(1);
  } else {
    console.log('Accessibility tests completed successfully!');
    process.exit(0);
  }
}).catch(error => {
  console.error('Unhandled error during testing:', error);
  process.exit(1);
});
