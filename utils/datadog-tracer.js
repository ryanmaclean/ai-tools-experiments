/**
 * Datadog APM Tracer Initialization
 * 
 * This file initializes the Datadog APM tracer for Node.js applications.
 * It must be imported before any other modules in the application entry point.
 * 
 * Environment variables:
 * - DD_ENV: Environment name (development, test, production)
 * - DD_SERVICE: Service name for traces (default: 'ai-tools-lab')
 * - DD_VERSION: Application version (from package.json)
 * - DD_AGENT_HOST: Host where the Datadog Agent is running (default: 'datadog.ai-tools.local')
 * - DD_TRACE_ANALYTICS_ENABLED: Enable Trace Analytics (default: true)
 */

'use strict';

const tracer = require('dd-trace').init({
  // Using Docker internal hostname for the Datadog agent when in Docker
  hostname: process.env.DD_AGENT_HOST || 'datadog.ai-tools.local',
  
  // Set environment and service name based on environment variables or defaults
  env: process.env.DD_ENV || process.env.NODE_ENV || 'development',
  service: process.env.DD_SERVICE || 'ai-tools-lab',
  
  // Get version from package.json via environment variable
  version: process.env.DD_VERSION || process.env.npm_package_version || '1.0.0',
  
  // Enable analytics for APM
  analytics: process.env.DD_TRACE_ANALYTICS_ENABLED !== 'false',
  
  // Log configuration issues - helpful for troubleshooting
  debug: process.env.DD_TRACE_DEBUG === 'true',
  
  // Enable runtime metrics collection
  runtimeMetrics: true,
  
  // Set sampling priority
  sampleRate: 1,
  
  // Tag traces with common identifiers
  tags: {
    'env.type': process.env.NODE_ENV || 'development',
    'container.type': 'docker'
  },
});

// Configure specific integrations with sensible defaults
tracer.use('express', {
  // Add distributed tracing headers
  headers: ['x-request-id', 'x-correlation-id'],
  
  // Filter out health check and static asset paths from traces
  hooks: {
    request: (span, req, res) => {
      // Tag all spans with the request route for better analysis
      if (req.route) {
        span.setTag('route.path', req.route.path);
      }
      
      // Don't trace health checks or static assets to reduce noise
      if (req.path && (
        req.path.startsWith('/health') ||
        req.path.startsWith('/static') ||
        req.path.match(/\.(css|js|jpg|png|ico|svg)$/)
      )) {
        span.setTag('sampling.priority', 0);
      }
    }
  }
});

tracer.use('http', {
  // Track all outgoing HTTP requests
  splitByDomain: true
});

tracer.use('graphql', {
  // Depth of field resolution in GraphQL traces
  depth: 2
});

// Log successful initialization
console.log(`Datadog APM tracer initialized: env=${process.env.DD_ENV || process.env.NODE_ENV}, service=${process.env.DD_SERVICE || 'ai-tools-lab'}`);

module.exports = tracer;
