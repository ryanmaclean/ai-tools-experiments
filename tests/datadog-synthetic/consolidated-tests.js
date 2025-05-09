/**
 * Consolidated Datadog Synthetic Tests
 * 
 * This file combines all synthetic tests (API, browser, visual, performance)
 * into a single organized test suite.
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = process.env.BASE_URL || 'https://ai-tools-lab.com';
const API_ENDPOINTS = {
  observations: '/api/observations',
  episodes: '/api/episodes',
  resources: '/api/resources'
};

// CSS validation rules
const CSS_RULES = {
  fonts: {
    primary: 'Inter, system-ui, -apple-system, sans-serif',
    secondary: 'system-ui, -apple-system, sans-serif'
  },
  colors: {
    primary: '#0070f3',
    secondary: '#666666',
    background: '#ffffff',
    text: '#333333'
  },
  layout: {
    maxWidth: '1200px',
    containerPadding: '0 1rem'
  }
};

// Helper functions
async function validateResponse(response) {
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/json');
}

async function validateCSS(element, properties) {
  const computedStyle = await element.evaluate(el => {
    const style = window.getComputedStyle(el);
    return {
      fontFamily: style.fontFamily,
      color: style.color,
      backgroundColor: style.backgroundColor,
      maxWidth: style.maxWidth,
      padding: style.padding
    };
  });

  for (const [property, value] of Object.entries(properties)) {
    expect(computedStyle[property]).toBe(value);
  }
}

// API Tests
test.describe('API Tests', () => {
  test.describe('Endpoints', () => {
    test('Observations API returns valid data', async ({ request }) => {
      const response = await request.get(`${BASE_URL}${API_ENDPOINTS.observations}`);
      await validateResponse(response);
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('Episodes API returns valid data', async ({ request }) => {
      const response = await request.get(`${BASE_URL}${API_ENDPOINTS.episodes}`);
      await validateResponse(response);
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('Resources API returns valid data', async ({ request }) => {
      const response = await request.get(`${BASE_URL}${API_ENDPOINTS.resources}`);
      await validateResponse(response);
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });
  });

  test.describe('Error Handling', () => {
    test('Invalid endpoint returns 404', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/invalid`);
      expect(response.status()).toBe(404);
    });

    test('Invalid method returns 405', async ({ request }) => {
      const response = await request.post(`${BASE_URL}${API_ENDPOINTS.observations}`);
      expect(response.status()).toBe(405);
    });
  });
});

// Browser Tests
test.describe('Browser Tests', () => {
  test.describe('Visual Appearance', () => {
    test('Header has correct styling', async ({ page }) => {
      await page.goto(BASE_URL);
      const header = await page.locator('header');
      
      await validateCSS(header, {
        backgroundColor: CSS_RULES.colors.background,
        maxWidth: CSS_RULES.layout.maxWidth
      });
    });

    test('Navigation links have correct styling', async ({ page }) => {
      await page.goto(BASE_URL);
      const navLinks = await page.locator('nav a');
      
      for (const link of await navLinks.all()) {
        await validateCSS(link, {
          color: CSS_RULES.colors.primary,
          fontFamily: CSS_RULES.fonts.primary
        });
      }
    });

    test('Main content has correct layout', async ({ page }) => {
      await page.goto(BASE_URL);
      const main = await page.locator('main');
      
      await validateCSS(main, {
        maxWidth: CSS_RULES.layout.maxWidth,
        padding: CSS_RULES.layout.containerPadding
      });
    });
  });

  test.describe('Responsive Design', () => {
    test('Mobile layout is correct', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);
      
      const header = await page.locator('header');
      const computedStyle = await header.evaluate(el => {
        return window.getComputedStyle(el).flexDirection;
      });
      
      expect(computedStyle).toBe('column');
    });

    test('Desktop layout is correct', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(BASE_URL);
      
      const header = await page.locator('header');
      const computedStyle = await header.evaluate(el => {
        return window.getComputedStyle(el).flexDirection;
      });
      
      expect(computedStyle).toBe('row');
    });
  });

  test.describe('Accessibility', () => {
    test('Images have alt text', async ({ page }) => {
      await page.goto(BASE_URL);
      const images = await page.locator('img');
      
      for (const img of await images.all()) {
        const alt = await img.getAttribute('alt');
        expect(alt).toBeTruthy();
      }
    });

    test('Links have descriptive text', async ({ page }) => {
      await page.goto(BASE_URL);
      const links = await page.locator('a');
      
      for (const link of await links.all()) {
        const text = await link.textContent();
        expect(text.trim()).toBeTruthy();
      }
    });
  });
});

// Performance Tests
test.describe('Performance Tests', () => {
  test.describe('API Performance', () => {
    test('API response time is within acceptable range', async ({ request }) => {
      const startTime = Date.now();
      const response = await request.get(`${BASE_URL}${API_ENDPOINTS.observations}`);
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      await validateResponse(response);
      expect(responseTime).toBeLessThan(1000); // Response should be under 1 second
    });
  });

  test.describe('Browser Performance', () => {
    test('Page load time is within acceptable range', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(BASE_URL);
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      expect(loadTime).toBeLessThan(3000); // Page should load in under 3 seconds
    });

    test('First contentful paint is within acceptable range', async ({ page }) => {
      await page.goto(BASE_URL);
      const fcp = await page.evaluate(() => {
        return performance.getEntriesByName('first-contentful-paint')[0].startTime;
      });
      
      expect(fcp).toBeLessThan(1000); // FCP should be under 1 second
    });
  });
}); 