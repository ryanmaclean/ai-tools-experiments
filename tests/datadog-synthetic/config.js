/**
 * Datadog Synthetic Test Configuration
 * 
 * This file contains configuration for Datadog synthetic tests,
 * including test locations, thresholds, and monitoring settings.
 */

module.exports = {
  // Test locations
  locations: {
    production: {
      url: 'https://ai-tools-lab.com',
      name: 'Production',
      region: 'us-east-1'
    },
    test: {
      url: 'https://ai-tools-lab-tst.netlify.app',
      name: 'Test',
      region: 'us-east-1'
    }
  },

  // Performance thresholds
  thresholds: {
    responseTime: {
      warning: 1000,  // 1 second
      critical: 3000  // 3 seconds
    },
    availability: {
      warning: 99.9,  // 99.9%
      critical: 99.5  // 99.5%
    },
    errorRate: {
      warning: 0.1,   // 0.1%
      critical: 0.5   // 0.5%
    }
  },

  // Test intervals
  intervals: {
    api: '5m',       // Run API tests every 5 minutes
    browser: '15m',  // Run browser tests every 15 minutes
    visual: '30m'    // Run visual tests every 30 minutes
  },

  // Monitoring settings
  monitoring: {
    // Alert conditions
    alerts: {
      responseTime: {
        query: 'avg(last_5m):avg:synthetics.http.response_time{*} > 1000',
        message: 'High response time detected in synthetic tests'
      },
      errorRate: {
        query: 'avg(last_5m):sum:synthetics.http.errors{*}.as_count() / sum:synthetics.http.requests{*}.as_count() > 0.001',
        message: 'High error rate detected in synthetic tests'
      },
      availability: {
        query: 'avg(last_5m):sum:synthetics.http.availability{*} < 0.999',
        message: 'Low availability detected in synthetic tests'
      }
    },

    // Dashboard settings
    dashboards: {
      main: {
        title: 'Synthetic Monitoring Overview',
        description: 'Overview of all synthetic tests across environments',
        widgets: [
          {
            type: 'timeseries',
            title: 'Response Time',
            query: 'avg:synthetics.http.response_time{*}'
          },
          {
            type: 'timeseries',
            title: 'Error Rate',
            query: 'sum:synthetics.http.errors{*}.as_count() / sum:synthetics.http.requests{*}.as_count()'
          },
          {
            type: 'timeseries',
            title: 'Availability',
            query: 'avg:synthetics.http.availability{*}'
          }
        ]
      },
      environment: {
        title: 'Environment Comparison',
        description: 'Compare metrics between production and test environments',
        widgets: [
          {
            type: 'timeseries',
            title: 'Response Time by Environment',
            query: 'avg:synthetics.http.response_time{*} by {env}'
          },
          {
            type: 'timeseries',
            title: 'Error Rate by Environment',
            query: 'sum:synthetics.http.errors{*}.as_count() / sum:synthetics.http.requests{*}.as_count() by {env}'
          }
        ]
      }
    }
  },

  // Test tags
  tags: {
    production: ['env:production', 'service:ai-tools-lab'],
    test: ['env:test', 'service:ai-tools-lab'],
    common: ['type:synthetic', 'framework:playwright']
  }
}; 