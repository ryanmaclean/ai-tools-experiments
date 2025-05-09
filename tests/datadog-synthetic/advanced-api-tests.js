/**
 * Advanced Datadog Synthetic API Tests
 * 
 * This file contains enhanced API tests that will be run by Datadog's synthetic monitoring.
 * These tests provide more comprehensive validation of API endpoints including data structure,
 * performance benchmarks, and error handling.
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = process.env.BASE_URL || 'https://ai-tools-lab.com';
const API_ENDPOINTS = {
  observations: '/api/observations',
  episodes: '/api/episodes',
  resources: '/api/resources',
  search: '/api/search'
};

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  fast: 500,    // Under 500ms is fast
  acceptable: 1000, // Under 1s is acceptable
  slow: 2000    // Under 2s is slow but tolerable
};

// Expected data structures
const DATA_STRUCTURES = {
  observations: {
    requiredFields: ['id', 'title', 'content', 'date'],
    arrayField: true
  },
  episodes: {
    requiredFields: ['id', 'episodeNumber', 'title', 'description', 'publishDate'],
    arrayField: true
  },
  resources: {
    requiredFields: ['id', 'resourceType', 'title', 'url'],
    arrayField: true
  }
};

// Helper function to check response status and content type
async function validateResponse(response) {
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/json');
}

// Helper to validate data structure
async function validateDataStructure(data, endpointName) {
  const structure = DATA_STRUCTURES[endpointName];
  if (!structure) return; // Skip if no structure defined
  
  // Check if response is an array when expected
  if (structure.arrayField) {
    expect(Array.isArray(data)).toBeTruthy();
    // If array is empty, can't validate further
    if (data.length === 0) return;
    
    // Validate the first item
    const item = data[0];
    for (const field of structure.requiredFields) {
      expect(item).toHaveProperty(field);
    }
  } else {
    // Validate as object
    for (const field of structure.requiredFields) {
      expect(data).toHaveProperty(field);
    }
  }
}

// Test suite for API endpoints with enhanced validation
test.describe('API Endpoints', () => {
  for (const [endpoint, path] of Object.entries(API_ENDPOINTS)) {
    // Skip search endpoint for basic tests (handled separately)
    if (endpoint === 'search') continue;
    
    test(`${endpoint} API returns valid data with correct structure`, async ({ request }) => {
      const startTime = Date.now();
      const response = await request.get(`${BASE_URL}${path}`);
      const responseTime = Date.now() - startTime;
      
      await validateResponse(response);
      const data = await response.json();
      
      // Validate data structure
      await validateDataStructure(data, endpoint);
      
      // Log performance metrics
      console.log(`${endpoint} API response time: ${responseTime}ms`);
      
      // Performance expectations
      if (responseTime < PERFORMANCE_THRESHOLDS.fast) {
        console.log(`✅ ${endpoint} API performance is fast`);
      } else if (responseTime < PERFORMANCE_THRESHOLDS.acceptable) {
        console.log(`ℹ️ ${endpoint} API performance is acceptable`);
      } else if (responseTime < PERFORMANCE_THRESHOLDS.slow) {
        console.log(`⚠️ ${endpoint} API performance is slow`);
      } else {
        console.log(`❌ ${endpoint} API performance exceeds thresholds`);
        // Only fail on extremely poor performance
        expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.slow * 1.5);
      }
    });
    
    // Test pagination if available
    test(`${endpoint} API supports pagination`, async ({ request }) => {
      // Try with limit=2 to test pagination
      const response = await request.get(`${BASE_URL}${path}?limit=2`);
      await validateResponse(response);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        // We expect either 2 or fewer items (if there aren't enough items total)
        expect(data.length).toBeLessThanOrEqual(2);
      }
    });
  }
});

// Test suite for search API
test.describe('Search API', () => {
  test('Search API returns results for valid query', async ({ request }) => {
    const searchTerm = 'automation'; // Use a term likely to be in content
    const response = await request.get(`${BASE_URL}${API_ENDPOINTS.search}?q=${searchTerm}`);
    
    await validateResponse(response);
    const data = await response.json();
    
    // Validate search response structure
    expect(data).toHaveProperty('results');
    expect(Array.isArray(data.results)).toBeTruthy();
    
    // Expect some metadata about the search
    expect(data).toHaveProperty('query');
    expect(data.query).toBe(searchTerm);
  });
  
  test('Search API handles empty queries gracefully', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_ENDPOINTS.search}?q=`);
    
    // Should still return 200 with empty results, not error
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    // Should have empty results array
    expect(data).toHaveProperty('results');
    expect(Array.isArray(data.results)).toBeTruthy();
  });
});

// Test suite for API workflow (multi-step process)
test.describe('API Workflow', () => {
  test('Can fetch episode and related resources in sequence', async ({ request }) => {
    // Step 1: Get all episodes
    const episodesResponse = await request.get(`${BASE_URL}${API_ENDPOINTS.episodes}`);
    await validateResponse(episodesResponse);
    const episodes = await episodesResponse.json();
    
    expect(Array.isArray(episodes)).toBeTruthy();
    expect(episodes.length).toBeGreaterThan(0);
    
    // Step 2: Get details for the first episode
    const firstEpisode = episodes[0];
    const episodeDetailResponse = await request.get(`${BASE_URL}${API_ENDPOINTS.episodes}/${firstEpisode.id}`);
    await validateResponse(episodeDetailResponse);
    const episodeDetail = await episodeDetailResponse.json();
    
    expect(episodeDetail).toHaveProperty('id');
    expect(episodeDetail.id).toBe(firstEpisode.id);
    
    // Step 3: Get resources related to this episode
    const resourcesResponse = await request.get(`${BASE_URL}${API_ENDPOINTS.episodes}/${firstEpisode.id}/resources`);
    await validateResponse(resourcesResponse);
    const resources = await resourcesResponse.json();
    
    // Resources should be an array (even if empty)
    expect(Array.isArray(resources)).toBeTruthy();
  });
});

// Test suite for error handling
test.describe('Error Handling', () => {
  test('Invalid endpoint returns 404', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/invalid`);
    expect(response.status()).toBe(404);
    
    // Verify error response format
    const errorData = await response.json();
    expect(errorData).toHaveProperty('error');
  });
  
  test('Invalid method returns 405', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_ENDPOINTS.observations}`);
    expect(response.status()).toBe(405);
  });
  
  test('Invalid parameters return appropriate error', async ({ request }) => {
    // Try to get a non-existent episode by ID
    const response = await request.get(`${BASE_URL}${API_ENDPOINTS.episodes}/999999`);
    expect(response.status()).toBe(404);
    
    // Error should have a helpful message
    const errorData = await response.json();
    expect(errorData).toHaveProperty('error');
    expect(errorData.error).toContain('not found');
  });
});
