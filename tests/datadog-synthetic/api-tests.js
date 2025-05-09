/**
 * Datadog Synthetic API Tests
 * 
 * This file contains API tests that will be run by Datadog's synthetic monitoring.
 * These tests verify the health and functionality of our API endpoints.
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = process.env.BASE_URL || 'https://ai-tools-lab.com';
const API_ENDPOINTS = {
  observations: '/api/observations',
  episodes: '/api/episodes',
  resources: '/api/resources'
};

// Helper function to check response status and content type
async function validateResponse(response) {
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/json');
}

// Test suite for API endpoints
test.describe('API Endpoints', () => {
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

// Test suite for error handling
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

// Test suite for performance
test.describe('Performance', () => {
  test('API response time is within acceptable range', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get(`${BASE_URL}${API_ENDPOINTS.observations}`);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    await validateResponse(response);
    expect(responseTime).toBeLessThan(1000); // Response should be under 1 second
  });
}); 