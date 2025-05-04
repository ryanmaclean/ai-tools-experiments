/**
 * Error Handler Initialization
 * 
 * This module is meant to be loaded with -r (--require) when starting Node.js
 * It automatically sets up global error handlers and initializes the Datadog tracer
 * before any other code runs.
 */

const path = require('path');

// Only initialize if USE_ERROR_LOGGER is set
if (process.env.USE_ERROR_LOGGER) {
  try {
    const {
      registerGlobalErrorHandlers,
      ErrorCategory,
      ErrorSeverity
    } = require('./datadog-error-logger');

    console.log('[Error Handler] Initializing global error handlers');
    
    // Register global error handlers
    registerGlobalErrorHandlers({
      exitOnUncaughtException: process.env.NODE_ENV === 'production',
      severity: ErrorSeverity.CRITICAL,
      metadata: {
        architecture: process.arch,
        environment: process.env.NODE_ENV || 'development',
        processName: path.basename(process.argv[1] || 'unknown')
      }
    });

    // Report startup success
    console.log('[Error Handler] Global error handlers initialized successfully');
  } catch (error) {
    console.error('[Error Handler] Failed to initialize error handlers:', error);
  }
}
