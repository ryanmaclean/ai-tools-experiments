/**
 * Datadog APM (Application Performance Monitoring) Configuration
 * 
 * This file configures Datadog APM for Node.js applications.
 * It provides tracing and monitoring capabilities for our application.
 */

const tracer = require('dd-trace').init({
  // Service name for APM
  service: process.env.DD_SERVICE || 'ai-tools-lab',
  
  // Environment (production, staging, development)
  env: process.env.DD_ENV || 'production',
  
  // Version of the application
  version: process.env.DD_VERSION || '1.0.0',
  
  // Sampling rate (1.0 = 100% of requests)
  sampleRate: 1.0,
  
  // Log injection for correlating logs with traces
  logInjection: true,
  
  // Runtime metrics collection
  runtimeMetrics: true,
  
  // Profiling enabled
  profiling: true,
  
  // Debug mode (set to true for development)
  debug: process.env.NODE_ENV === 'development',
  
  // Tags to add to all spans
  tags: {
    'app.type': 'web',
    'app.framework': 'astro'
  }
});

// Export the tracer for use in other files
module.exports = tracer;

// Add custom span for specific operations
function createCustomSpan(name, fn) {
  return tracer.trace(name, {
    service: process.env.DD_SERVICE || 'ai-tools-lab',
    resource: name,
    type: 'web'
  }, fn);
}

// Export helper functions
module.exports = {
  tracer,
  createCustomSpan,
  
  // Helper function to wrap async functions with tracing
  async traceAsync(name, fn) {
    return createCustomSpan(name, async () => {
      try {
        return await fn();
      } catch (error) {
        // Add error information to the span
        tracer.scope().active().setTag('error', true);
        tracer.scope().active().setTag('error.message', error.message);
        tracer.scope().active().setTag('error.stack', error.stack);
        throw error;
      }
    });
  },
  
  // Helper function to wrap synchronous functions with tracing
  traceSync(name, fn) {
    return createCustomSpan(name, () => {
      try {
        return fn();
      } catch (error) {
        tracer.scope().active().setTag('error', true);
        tracer.scope().active().setTag('error.message', error.message);
        tracer.scope().active().setTag('error.stack', error.stack);
        throw error;
      }
    });
  }
}; 