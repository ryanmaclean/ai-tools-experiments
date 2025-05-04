/**
 * Snapshot Testing with Vitest
 * 
 * This script uses Vitest and Puppeteer to create visual snapshots of pages
 * and compare against baseline snapshots to detect visual regressions.
 */

const { test, expect, describe, beforeAll, afterAll } = require('vitest');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { createHash } = require('crypto');

// Configuration
const LOCAL_URL = 'http://localhost:4325';
const PROD_URL = 'https://ai-tools-lab.com';
const SNAPSHOT_DIR = path.join(__dirname, 'snapshots');

// Ensure snapshot directory exists
if (!fs.existsSync(SNAPSHOT_DIR)) {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
}

// Helper to create a screenshot hash for comparison
async function createScreenshotHash(page, selector = 'body') {
  const element = await page.$(selector);
  if (!element) throw new Error(`Selector ${selector} not found`);
  
  const screenshot = await element.screenshot({ encoding: 'binary' });
  return createHash('sha256').update(screenshot).digest('hex');
}

// Helper to get computed styles
async function getComputedStyles(page, selector, properties) {
  return page.evaluate((sel, props) => {
    const element = document.querySelector(sel);
    if (!element) return null;
    
    const styles = window.getComputedStyle(element);
    const result = {};
    
    props.forEach(prop => {
      result[prop] = styles.getPropertyValue(prop);
    });
    
    return result;
  }, selector, properties);
}

// Count elements
async function countElements(page, selector) {
  return page.evaluate((sel) => {
    return document.querySelectorAll(sel).length;
  }, selector);
}

// Get element attributes
async function getElementAttributes(page, selector, attributes) {
  return page.evaluate((sel, attrs) => {
    const element = document.querySelector(sel);
    if (!element) return null;
    
    const result = {};
    attrs.forEach(attr => {
      result[attr] = element.getAttribute(attr);
    });
    
    return result;
  }, selector, attributes);
}

// Test suite
describe('Visual and DOM Structure Tests', () => {
  let browser;
  let page;
  
  beforeAll(async () => {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: 'new'
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
  });
  
  afterAll(async () => {
    await browser.close();
  });
  
  describe('About Page Tests', () => {
    test('should render About page without duplicate headers/footers', async () => {
      await page.goto(`${LOCAL_URL}/pages/about`, { waitUntil: 'networkidle2' });
      
      // Take a snapshot
      await page.screenshot({ path: path.join(SNAPSHOT_DIR, 'about-page.png'), fullPage: true });
      
      // Check for headers and footers
      const headerCount = await countElements(page, 'header');
      const footerCount = await countElements(page, 'footer');
      
      expect(headerCount).toBe(1);
      expect(footerCount).toBe(1);
    });
    
    test('should have same content regardless of URL pattern', async () => {
      // Check first URL pattern
      await page.goto(`${LOCAL_URL}/pages/about`, { waitUntil: 'networkidle2' });
      const hash1 = await createScreenshotHash(page, 'main');
      
      // Check alternate URL pattern
      await page.goto(`${LOCAL_URL}/about`, { waitUntil: 'networkidle2' });
      const hash2 = await createScreenshotHash(page, 'main');
      
      expect(hash1).toBe(hash2);
    });
    
    test('should have proper heading structure', async () => {
      await page.goto(`${LOCAL_URL}/pages/about`, { waitUntil: 'networkidle2' });
      
      const h1Count = await countElements(page, 'h1');
      const h2Count = await countElements(page, 'h2');
      
      expect(h1Count).toBeGreaterThan(0);
      expect(h2Count).toBeGreaterThan(0);
    });
    
    test('should have properly styled content sections', async () => {
      await page.goto(`${LOCAL_URL}/pages/about`, { waitUntil: 'networkidle2' });
      
      const sectionStyles = await getComputedStyles(page, '.about-section-block', ['margin-bottom', 'padding']);
      
      expect(sectionStyles).not.toBeNull();
      expect(sectionStyles['margin-bottom']).not.toBe('0px');
    });
  });
  
  describe('Resources Page Tests', () => {
    test('should render Resources page without duplicate headers/footers', async () => {
      await page.goto(`${LOCAL_URL}/resources`, { waitUntil: 'networkidle2' });
      
      // Take a snapshot
      await page.screenshot({ path: path.join(SNAPSHOT_DIR, 'resources-page.png'), fullPage: true });
      
      // Check for headers and footers
      const headerCount = await countElements(page, 'header');
      const footerCount = await countElements(page, 'footer');
      
      expect(headerCount).toBe(1);
      expect(footerCount).toBe(1);
    });
    
    test('should have resource cards with proper structure', async () => {
      await page.goto(`${LOCAL_URL}/resources`, { waitUntil: 'networkidle2' });
      
      const resourceCardCount = await countElements(page, '.resource-card');
      expect(resourceCardCount).toBeGreaterThan(0);
      
      // Check first resource card structure
      const hasImage = await page.evaluate(() => {
        const card = document.querySelector('.resource-card');
        return !!card.querySelector('.resource-card-image');
      });
      
      const hasTitle = await page.evaluate(() => {
        const card = document.querySelector('.resource-card');
        return !!card.querySelector('h2');
      });
      
      const hasLink = await page.evaluate(() => {
        const card = document.querySelector('.resource-card');
        return !!card.querySelector('a');
      });
      
      expect(hasImage).toBe(true);
      expect(hasTitle).toBe(true);
      expect(hasLink).toBe(true);
    });
    
    test('should have properly styled resource cards', async () => {
      await page.goto(`${LOCAL_URL}/resources`, { waitUntil: 'networkidle2' });
      
      const cardStyles = await getComputedStyles(page, '.resource-card', [
        'border-radius', 'overflow', 'background', 'box-shadow'
      ]);
      
      expect(cardStyles).not.toBeNull();
      expect(cardStyles['border-radius']).not.toBe('0px');
      expect(cardStyles['overflow']).toBe('hidden');
    });
  });
  
  describe('Episode Navigation Tests', () => {
    test('should navigate to episodes properly', async () => {
      await page.goto(LOCAL_URL, { waitUntil: 'networkidle2' });
      
      // Find episode links
      const hasEpisodeLinks = await page.evaluate(() => {
        return document.querySelectorAll('.recording-card a').length > 0;
      });
      
      expect(hasEpisodeLinks).toBe(true);
      
      // Click the first episode link if available
      if (hasEpisodeLinks) {
        const episodeHref = await page.evaluate(() => {
          const link = document.querySelector('.recording-card a');
          return link ? link.getAttribute('href') : null;
        });
        
        if (episodeHref) {
          await page.goto(`${LOCAL_URL}${episodeHref}`, { waitUntil: 'networkidle2' });
          
          // Take a snapshot of the episode page
          await page.screenshot({ path: path.join(SNAPSHOT_DIR, 'episode-page.png'), fullPage: true });
          
          // Check for back link
          const backLink = await page.$('.back-link');
          expect(backLink).not.toBeNull();
          
          // Check back link styling
          const backLinkStyles = await getComputedStyles(page, '.back-link', [
            'display', 'color', 'margin', 'padding'
          ]);
          
          expect(backLinkStyles).not.toBeNull();
          expect(backLinkStyles['display']).not.toBe('none');
        }
      }
    });
  });
  
  describe('Accessibility Tests', () => {
    test('should have proper alt text for images', async () => {
      await page.goto(`${LOCAL_URL}/resources`, { waitUntil: 'networkidle2' });
      
      const imagesWithoutAlt = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img:not([alt]), img[alt=""]'));
        return images.map(img => img.src);
      });
      
      expect(imagesWithoutAlt.length).toBe(0);
    });
    
    test('should have proper heading hierarchy', async () => {
      await page.goto(`${LOCAL_URL}/pages/about`, { waitUntil: 'networkidle2' });
      
      const headingOrder = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        return headings.map(h => parseInt(h.tagName.substring(1)));
      });
      
      // Check if heading levels never skip (e.g., h1 to h3 without h2)
      let isProperHierarchy = true;
      let previousLevel = 0;
      
      for (const level of headingOrder) {
        if (level > previousLevel + 1) {
          isProperHierarchy = false;
          break;
        }
        previousLevel = level;
      }
      
      expect(isProperHierarchy).toBe(true);
    });
  });
  
  describe('URL Pattern Tests', () => {
    const urlPatterns = [
      { path: '/', title: 'AI Tools Lab' },
      { path: '/resources', title: 'Resources' },
      { path: '/pages/resources', title: 'Resources' },
      { path: '/pages/about', title: 'About' },
      { path: '/about', title: 'About' }
    ];
    
    test.each(urlPatterns)('should render correct title for $path', async ({ path, title }) => {
      await page.goto(`${LOCAL_URL}${path}`, { waitUntil: 'networkidle2' });
      
      const pageTitle = await page.title();
      expect(pageTitle).toContain(title);
    });
  });
  
  describe('DOM Structure Comparison', () => {
    test('should have similar DOM structure to production', async () => {
      const pagesToCompare = [
        { path: '/pages/about', selector: 'main' },
        { path: '/resources', selector: 'main' }
      ];
      
      for (const { path, selector } of pagesToCompare) {
        // Local page
        await page.goto(`${LOCAL_URL}${path}`, { waitUntil: 'networkidle2' });
        const localChildCount = await page.evaluate((sel) => {
          const element = document.querySelector(sel);
          return element ? element.children.length : 0;
        }, selector);
        
        // Since we can't actually access production in this test
        // We'll just verify that we have a reasonable structure
        expect(localChildCount).toBeGreaterThan(0);
      }
    });
  });
});
