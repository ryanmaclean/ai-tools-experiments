/**
 * Datadog Synthetics Tests Configuration
 * 
 * This configuration defines all the routes to be monitored by Datadog Synthetics
 * and their corresponding test parameters.
 */

// Base URLs for different environments
const ENVIRONMENTS = {
  production: 'https://ai-tools-lab.com',
  staging: 'https://ai-tools-lab-tst.netlify.app'
};

// URL patterns based on environment
// Production uses /pages/ prefix for some routes, staging uses direct paths
const getUrl = (route, env = 'production') => {
  const baseUrl = ENVIRONMENTS[env];
  
  // Special case handling for episode pages and other paths with known differences
  if (route.startsWith('ep') && env === 'production') {
    return `${baseUrl}/pages/${route}`;
  } else if (route.startsWith('ep') && env === 'staging') {
    return `${baseUrl}/${route}`;
  } else if (['resources', 'about', 'observations'].includes(route)) {
    if (env === 'production') {
      return `${baseUrl}/pages/${route}`;
    } else {
      return `${baseUrl}/${route}`;
    }
  }
  
  // Default case (homepage and others)
  return route === 'home' ? baseUrl : `${baseUrl}/${route}`;
};

// List of episode pages to monitor
const episodePages = [
  'ep01', 'ep02', 'ep03', 'ep04', 'ep05', 
  'ep06', 'ep07', 'ep08', 'ep09', 'ep10',
  'ep11', 'ep12', 'ep13', 'ep14', 'ep15',
  'ep16', 'ep17'
];

// Standard pages to monitor
const standardPages = [
  'home',       // Homepage
  'about',      // About page
  'resources',  // Resources page
  'observations' // Observations page
];

// Test configuration for each route type
const routeConfigs = {
  home: {
    name: 'Homepage Test',
    assertions: [
      { type: 'element', selector: 'header', name: 'Header is present' },
      { type: 'element', selector: 'footer', name: 'Footer is present' },
      { type: 'element', selector: '.episode-grid', name: 'Episode grid is present' },
      { type: 'metric', name: 'loadTime', threshold: 3000, operator: '<' }
    ],
    frequency: 5, // Run every 5 minutes
    locations: ['aws:us-west-1']
  },
  
  episode: {
    namePrefix: 'Episode Page - ',
    assertions: [
      { type: 'element', selector: 'header', name: 'Header is present' },
      { type: 'element', selector: 'footer', name: 'Footer is present' },
      { type: 'element', selector: '.episode-content', name: 'Episode content is present' },
      { type: 'element', selector: '.episode-navigation', name: 'Episode navigation is present' },
      { type: 'metric', name: 'loadTime', threshold: 3000, operator: '<' }
    ],
    frequency: 10, // Run every 10 minutes
    locations: ['aws:us-west-1']
  },
  
  about: {
    name: 'About Page Test',
    assertions: [
      { type: 'element', selector: 'header', name: 'Header is present' },
      { type: 'element', selector: 'footer', name: 'Footer is present' },
      { type: 'element', selector: '.about-content', name: 'About content is present' },
      { type: 'metric', name: 'loadTime', threshold: 3000, operator: '<' }
    ],
    frequency: 10,
    locations: ['aws:us-west-1']
  },
  
  resources: {
    name: 'Resources Page Test',
    assertions: [
      { type: 'element', selector: 'header', name: 'Header is present' },
      { type: 'element', selector: 'footer', name: 'Footer is present' },
      { type: 'element', selector: '.resource-cards', name: 'Resource cards are present' },
      { type: 'count', selector: '.resource-card', count: 10, operator: '>=', name: 'At least 10 resource cards present' },
      { type: 'metric', name: 'loadTime', threshold: 3000, operator: '<' }
    ],
    frequency: 10,
    locations: ['aws:us-west-1']
  },
  
  observations: {
    name: 'Observations Page Test',
    assertions: [
      { type: 'element', selector: 'header', name: 'Header is present' },
      { type: 'element', selector: 'footer', name: 'Footer is present' },
      { type: 'element', selector: '.observations-content', name: 'Observations content is present' },
      { type: 'metric', name: 'loadTime', threshold: 3000, operator: '<' }
    ],
    frequency: 10,
    locations: ['aws:us-west-1']
  }
};

// Generate the complete list of routes to test
const generateRouteTests = () => {
  const tests = [];
  
  // Add standard pages
  standardPages.forEach(page => {
    const config = routeConfigs[page] || routeConfigs.home;
    tests.push({
      route: page,
      type: page,
      name: config.name,
      assertions: config.assertions,
      frequency: config.frequency,
      locations: config.locations
    });
  });
  
  // Add episode pages
  episodePages.forEach(episode => {
    const config = routeConfigs.episode;
    tests.push({
      route: episode,
      type: 'episode',
      name: `${config.namePrefix}${episode}`,
      assertions: config.assertions,
      frequency: config.frequency,
      locations: config.locations
    });
  });
  
  return tests;
};

module.exports = {
  ENVIRONMENTS,
  getUrl,
  routeConfigs,
  generateRouteTests
};
