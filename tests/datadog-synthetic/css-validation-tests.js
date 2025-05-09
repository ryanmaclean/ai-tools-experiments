/**
 * Advanced CSS Validation Tests
 * 
 * This file contains comprehensive CSS validation tests for the AI Tools Lab project.
 * These tests verify proper styling, layout, and visual consistency across components and pages.
 * It includes checks for color schemes, typography, spacing, responsive design, and accessibility.
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = process.env.BASE_URL || 'https://ai-tools-lab.com';

// CSS Color palette for validation
const COLOR_PALETTE = {
  primary: {
    hex: '#1A365D',
    rgb: 'rgb(26, 54, 93)',
    rgba: 'rgba(26, 54, 93, 1)'
  },
  secondary: {
    hex: '#93ACB5', 
    rgb: 'rgb(147, 172, 181)',
    rgba: 'rgba(147, 172, 181, 1)'
  },
  accent: {
    hex: '#2A9D8F',
    rgb: 'rgb(42, 157, 143)',
    rgba: 'rgba(42, 157, 143, 1)'
  },
  background: {
    hex: '#F8F9FA',
    rgb: 'rgb(248, 249, 250)',
    rgba: 'rgba(248, 249, 250, 1)'
  },
  text: {
    dark: {
      hex: '#1A202C',
      rgb: 'rgb(26, 32, 44)',
      rgba: 'rgba(26, 32, 44, 1)'
    },
    light: {
      hex: '#FFFFFF',
      rgb: 'rgb(255, 255, 255)',
      rgba: 'rgba(255, 255, 255, 1)'
    }
  }
};

// Typography specifications
const TYPOGRAPHY = {
  fontFamilies: [
    'Inter',
    'system-ui',
    '-apple-system',
    'sans-serif'
  ],
  headingSizes: {
    h1: '2.5rem',  // 40px
    h2: '2rem',    // 32px
    h3: '1.5rem',  // 24px
    h4: '1.25rem', // 20px
    h5: '1rem',    // 16px
    h6: '0.875rem' // 14px
  },
  bodySize: '1rem', // 16px
  smallSize: '0.875rem' // 14px
};

// Helper: Check if a color matches any format in the palette
function isValidColor(actualColor, expectedColor) {
  if (!actualColor) return false;
  
  const normalizedActual = actualColor.toLowerCase().trim();
  return [
    expectedColor.hex.toLowerCase(),
    expectedColor.rgb.toLowerCase(),
    expectedColor.rgba.toLowerCase()
  ].some(color => normalizedActual === color);
}

// Helper: Format selector for better error messages
function formatSelector(selector) {
  return selector.replace(/\s+/g, ' ').trim();
}

// Helper: Validate element CSS properties
async function validateElementStyles(page, selector, expectedStyles) {
  const element = await page.$(selector);
  if (!element) {
    throw new Error(`Element not found: ${formatSelector(selector)}`);
  }
  
  const styles = await page.evaluate((el, props) => {
    const computedStyle = window.getComputedStyle(el);
    return props.reduce((result, prop) => {
      result[prop] = computedStyle.getPropertyValue(prop);
      return result;
    }, {});
  }, element, Object.keys(expectedStyles));
  
  const errors = [];
  
  for (const [property, expected] of Object.entries(expectedStyles)) {
    const actual = styles[property];
    let isValid = false;
    
    // Handle color properties specially
    if (property.includes('color') && typeof expected === 'object') {
      isValid = isValidColor(actual, expected);
      if (!isValid) {
        errors.push(`${property}: expected ${expected.hex}/${expected.rgb}, got ${actual}`);
      }
    } 
    // Handle font-family as array of acceptable values
    else if (property === 'font-family' && Array.isArray(expected)) {
      isValid = expected.some(font => actual.includes(font));
      if (!isValid) {
        errors.push(`${property}: expected one of [${expected.join(', ')}], got ${actual}`);
      }
    }
    // Regular string comparison for other properties
    else {
      isValid = actual === expected;
      if (!isValid) {
        errors.push(`${property}: expected ${expected}, got ${actual}`);
      }
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Style validation failed for ${formatSelector(selector)}:\n${errors.join('\n')}`);
  }
  
  return true;
}

// Test suite for Header component styles
test.describe('Header Component Styles', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle' });
  });

  test('Header has correct background color and text styles', async ({ page }) => {
    await validateElementStyles(page, 'header.site-header', {
      'background-color': COLOR_PALETTE.secondary,
      'color': COLOR_PALETTE.text.light,
      'padding': '1rem',
      'box-shadow': /rgba\(0, 0, 0, 0\.1\).*/ // Regex to match shadow with slight variations
    });
    
    // Check logo text/link
    await validateElementStyles(page, 'header .logo a', {
      'color': COLOR_PALETTE.text.light,
      'font-size': '1.5rem',
      'font-weight': '700',
      'text-decoration': 'none'
    });
    
    // Check navigation links
    await validateElementStyles(page, 'header nav a', {
      'color': COLOR_PALETTE.text.light,
      'text-decoration': 'none',
      'padding': '0.5rem 1rem',
      'font-weight': '500'
    });
  });
  
  test('Header is responsive and adapts to mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    
    // Check if mobile menu/hamburger is visible on small screens
    const menuButtonVisible = await page.evaluate(() => {
      const menuButton = document.querySelector('header .mobile-menu-button');
      return menuButton && window.getComputedStyle(menuButton).display !== 'none';
    });
    
    expect(menuButtonVisible).toBeTruthy();
    
    // Check if regular nav links are hidden on mobile
    const navLinksVisible = await page.evaluate(() => {
      const navLinks = document.querySelector('header nav');
      return navLinks && window.getComputedStyle(navLinks).display !== 'none';
    });
    
    // This could be true or false depending on implementation - we just log the result
    console.log(`Mobile: Nav links visibility: ${navLinksVisible}`);
  });
});

// Test suite for Card component styles
test.describe('Card Component Styles', () => {
  test('Resource cards have correct styling', async ({ page }) => {
    // Go to resources page
    await page.goto(`${BASE_URL}/pages/resources`, { waitUntil: 'networkidle' });
    
    await validateElementStyles(page, '.card', {
      'background-color': COLOR_PALETTE.background,
      'border-radius': '0.5rem',
      'box-shadow': /rgba\(0, 0, 0, 0\.1\).*/, // Regex to match shadow with slight variations
      'padding': '1.5rem',
      'margin-bottom': '1.5rem'
    });
    
    // Card title
    await validateElementStyles(page, '.card h3', {
      'color': COLOR_PALETTE.text.dark,
      'font-size': TYPOGRAPHY.headingSizes.h3,
      'font-weight': '600',
      'margin-bottom': '0.5rem'
    });
  });
});

// Test suite for Footer component styles
test.describe('Footer Component Styles', () => {
  test('Footer has correct styling and layout', async ({ page }) => {
    await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle' });
    
    await validateElementStyles(page, 'footer', {
      'background-color': COLOR_PALETTE.primary,
      'color': COLOR_PALETTE.text.light,
      'padding': '2rem 0',
      'text-align': 'center'
    });
    
    await validateElementStyles(page, 'footer a', {
      'color': COLOR_PALETTE.text.light
    });
  });
});

// Test suite for Typography
test.describe('Typography Styles', () => {
  test('Headings have correct font sizes and styles', async ({ page }) => {
    await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle' });
    
    // Check for each heading level
    for (let i = 1; i <= 6; i++) {
      const headingExists = await page.$(`h${i}`);
      if (headingExists) {
        await validateElementStyles(page, `h${i}`, {
          'font-size': TYPOGRAPHY.headingSizes[`h${i}`],
          'font-family': TYPOGRAPHY.fontFamilies,
          'line-height': '1.2'
        });
      }
    }
  });
  
  test('Body text has correct font size and styles', async ({ page }) => {
    await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle' });
    
    await validateElementStyles(page, 'p', {
      'font-size': TYPOGRAPHY.bodySize,
      'font-family': TYPOGRAPHY.fontFamilies,
      'line-height': '1.5'
    });
  });
});

// Test suite for Accessibility
test.describe('Accessibility Requirements', () => {
  test('Text has sufficient contrast ratio', async ({ page }) => {
    await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle' });
    
    const contrastRatios = await page.evaluate(() => {
      function luminance(r, g, b) {
        const a = [r, g, b].map(v => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
      }
      
      function contrastRatio(rgb1, rgb2) {
        const lum1 = luminance(rgb1[0], rgb1[1], rgb1[2]);
        const lum2 = luminance(rgb2[0], rgb2[1], rgb2[2]);
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        return (brightest + 0.05) / (darkest + 0.05);
      }
      
      function getRGB(color) {
        // Simple helper to get RGB values from computed style
        const div = document.createElement('div');
        div.style.color = color;
        document.body.appendChild(div);
        const computed = window.getComputedStyle(div).color;
        document.body.removeChild(div);
        
        const match = computed.match(/rgb\(([\d]+),\s*([\d]+),\s*([\d]+)\)/);
        if (match) {
          return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
        }
        return [0, 0, 0]; // Fallback
      }
      
      const results = [];
      const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, a, span, li, label');
      
      textElements.forEach(element => {
        const style = window.getComputedStyle(element);
        const textColor = style.color;
        const bgColor = style.backgroundColor;
        
        // Only test if background is actually a color (not transparent)
        if (bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
          const textRGB = getRGB(textColor);
          const bgRGB = getRGB(bgColor);
          const ratio = contrastRatio(textRGB, bgRGB);
          
          results.push({
            element: element.tagName.toLowerCase(),
            textColor,
            bgColor,
            ratio,
            passes: ratio >= 4.5 // WCAG AA requirement for normal text
          });
        }
      });
      
      return results;
    });
    
    // Log contrast ratio results
    console.log('Contrast ratio test results:');
    contrastRatios.forEach(result => {
      console.log(`${result.element}: ${result.ratio.toFixed(2)} (${result.passes ? 'Pass' : 'Fail'})`);
    });
    
    // Ensure at least some elements were tested
    expect(contrastRatios.length).toBeGreaterThan(0);
    
    // Calculate percentage of passing elements
    const passingElements = contrastRatios.filter(r => r.passes).length;
    const passingPercentage = (passingElements / contrastRatios.length) * 100;
    
    console.log(`Passing elements: ${passingElements}/${contrastRatios.length} (${passingPercentage.toFixed(2)}%)`);
    
    // Test passes if at least 90% of elements have sufficient contrast
    expect(passingPercentage).toBeGreaterThanOrEqual(90);
  });
});

// Test suite for Responsive Design
test.describe('Responsive Design', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1280, height: 800 }
  ];
  
  for (const viewport of viewports) {
    test(`Layout adapts correctly to ${viewport.name} viewport`, async ({ page }) => {
      // Set viewport size
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // Go to homepage
      await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle' });
      
      // Check if container width adapts
      const containerWidth = await page.evaluate(() => {
        const container = document.querySelector('.container') || document.querySelector('main');
        return container ? window.getComputedStyle(container).maxWidth : null;
      });
      
      console.log(`Container width on ${viewport.name}: ${containerWidth}`);
      
      // Verify no horizontal overflow
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });
      
      expect(hasHorizontalOverflow).toBeFalsy();
      
      // Check for specific mobile/desktop elements
      if (viewport.name === 'Mobile') {
        // Check for hamburger menu or mobile-specific elements
        const mobileElementExists = await page.evaluate(() => {
          return !!document.querySelector('.mobile-menu, .hamburger, .mobile-nav');
        });
        
        // This test is informational - it passes either way since some sites might not have mobile-specific elements
        console.log(`Mobile-specific elements present: ${mobileElementExists}`);
      }
    });
  }
});
