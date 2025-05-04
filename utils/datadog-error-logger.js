/**
 * Datadog Error Logger
 * 
 * A centralized error handling and logging utility for Datadog integration.
 * This utility helps standardize error reporting across the application and
 * ensures all errors are properly formatted for Datadog's logs and metrics.
 */

// Import necessary Datadog libraries
let tracer = null;
let metrics = null;

// Initialize Datadog tracer and metrics if API key is available
try {
  // Use conditional require to handle environments where Datadog isn't available
  if (process.env.DD_API_KEY || process.env.DATADOG_API_KEY) {
    // Initialize tracer for APM
    tracer = require('dd-trace').init({
      logInjection: true, // Correlate logs with traces
      analytics: true,   // Enable App Analytics
      runtimeMetrics: true, // Enable runtime metrics collection
      profiling: true,   // Enable code profiling
      env: process.env.NODE_ENV || 'development',
      service: process.env.DD_SERVICE || 'ai-tools'
    });
    
    // Initialize metrics for custom metrics
    const StatsD = require('hot-shots');
    metrics = new StatsD({
      prefix: 'ai_tools.',
      globalTags: {
        env: process.env.NODE_ENV || 'development',
        service: process.env.DD_SERVICE || 'ai-tools',
        version: process.env.npm_package_version || '1.0.0'
      }
    });
    
    console.log('Datadog tracer and metrics initialized successfully');
  }
} catch (error) {
  console.warn('Datadog initialization failed. Errors will only be logged locally.', error.message);
  tracer = null;
  metrics = null;
}

/**
 * Error severity levels
 */
const ErrorSeverity = {
  CRITICAL: 'critical',   // Application crashes, data loss
  ERROR: 'error',         // Runtime errors that need immediate attention
  WARNING: 'warning',     // Issues that don't prevent operation but need attention
  INFO: 'info',           // Informational messages about error patterns
  DEBUG: 'debug'          // Detailed debugging information
};

/**
 * Error categories for better organization in Datadog
 */
const ErrorCategory = {
  BUILD: 'build',               // Build-time errors
  DEPENDENCY: 'dependency',     // Dependency-related errors (missing modules, version conflicts)
  NETWORK: 'network',           // Network request errors
  DATABASE: 'database',         // Database errors
  API: 'api',                   // API errors
  RENDERING: 'rendering',       // Frontend rendering errors
  AUTHENTICATION: 'auth',       // Authentication errors
  VALIDATION: 'validation',     // Data validation errors
  PLATFORM: 'platform',         // Platform-specific errors (ARM64, x64)
  UNKNOWN: 'unknown'            // Uncategorized errors
};

/**
 * Log an error to Datadog and console
 * 
 * @param {Error|string} error - The error object or message
 * @param {Object} options - Options for the error log
 * @param {string} options.category - Error category (use ErrorCategory constants)
 * @param {string} options.severity - Error severity (use ErrorSeverity constants)
 * @param {Object} options.metadata - Additional metadata about the error
 * @param {string} options.source - Source of the error (file, function, component)
 * @param {boolean} options.notify - Whether to trigger a notification in Datadog
 * @param {string} options.metricNamespace - Custom namespace for metrics 
 * @returns {string} - The error ID for reference
 */
const logError = (error, options = {}) => {
  // Generate a unique error ID for reference
  const errorId = generateErrorId();
  
  // Parse options with defaults
  const {
    category = ErrorCategory.UNKNOWN,
    severity = ErrorSeverity.ERROR,
    metadata = {},
    source = '',
    notify = severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.ERROR,
    metricNamespace = 'errors'
  } = options;
  
  // Format the error message
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : new Error().stack;
  
  // Create a structured log object for Datadog
  const logObject = {
    timestamp: new Date().toISOString(),
    errorId,
    message: errorMessage,
    category,
    severity,
    source,
    stack: errorStack,
    metadata: {
      ...metadata,
      platform: process.platform,
      architecture: process.arch,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      netlify: process.env.NETLIFY === 'true' ? true : false
    },
    notify
  };
  
  // Log to console with appropriate formatting based on severity
  logToConsole(logObject);
  
  // If Datadog tracer is available, log to Datadog
  if (tracer) {
    logToDatadog(logObject);
  }
  
  // If metrics are available, track error metrics
  if (metrics) {
    // Increment error count by category and severity
    metrics.increment(`${metricNamespace}.count`, 1, [
      `category:${category}`,
      `severity:${severity}`,
      `source:${source || 'unknown'}`
    ]);
    
    // Track error distribution stats
    if (error instanceof Error && error.code) {
      metrics.increment(`${metricNamespace}.by_code`, 1, [`error_code:${error.code}`]);
    }
    
    // For rate-limiting purposes, we create a distribution of errors over time
    // This helps identify error spikes or patterns
    metrics.distribution(`${metricNamespace}.rate`, 1, [
      `category:${category}`,
      `severity:${severity}`
    ]);
  }
  
  return errorId;
};

/**
 * Log to console with color-coding and formatting based on severity
 */
const logToConsole = (logObject) => {
  const {
    timestamp,
    errorId,
    message,
    category,
    severity,
    source,
    stack,
    metadata
  } = logObject;
  
  // Define color codes for different severity levels
  const colors = {
    critical: '\x1b[41m\x1b[37m', // White on red background
    error: '\x1b[31m',           // Red
    warning: '\x1b[33m',         // Yellow
    info: '\x1b[36m',            // Cyan
    debug: '\x1b[90m',           // Gray
    reset: '\x1b[0m'             // Reset
  };
  
  // Format the console output
  const color = colors[severity] || colors.reset;
  const reset = colors.reset;
  
  console.log(`${color}[${timestamp}][${severity.toUpperCase()}][${category}]${reset} ${message}`);
  console.log(`${color}Error ID:${reset} ${errorId}`);
  
  if (source) {
    console.log(`${color}Source:${reset} ${source}`);
  }
  
  if (Object.keys(metadata).length > 0) {
    console.log(`${color}Metadata:${reset}`, metadata);
  }
  
  // Only log stack trace for debug and error levels
  if (severity === ErrorSeverity.DEBUG || severity === ErrorSeverity.ERROR || severity === ErrorSeverity.CRITICAL) {
    console.log(`${color}Stack:${reset}\n${stack}`);
  }
  
  console.log('\n'); // Add space between error logs
};

/**
 * Log to Datadog using APM and logs
 */
const logToDatadog = (logObject) => {
  try {
    const {
      message,
      category,
      severity,
      source,
      errorId,
      metadata,
      notify
    } = logObject;
    
    // Get active span if available
    const span = tracer.scope().active();
    
    if (span) {
      // Add error information to the current span
      span.addTags({
        'error.type': category,
        'error.msg': message,
        'error.stack': logObject.stack,
        'error.id': errorId,
        'error.source': source || 'unknown',
        'error.severity': severity
      });
      
      // Add all metadata as tags
      Object.entries(metadata).forEach(([key, value]) => {
        // Convert complex objects to strings
        const tagValue = typeof value === 'object' ? 
          JSON.stringify(value) : 
          String(value);
        
        span.setTag(`error.metadata.${key}`, tagValue);
      });
      
      // Mark span as error for non-warning severities
      if (severity !== ErrorSeverity.WARNING && severity !== ErrorSeverity.INFO) {
        span.setTag('error', true);
      }
    }
    
    // For critical errors, also log a Datadog event for immediate notification
    if (notify && (severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.ERROR)) {
      // This would normally use the Datadog API client to post an event
      // In this implementation, we're just logging the intent
      console.log(`[DATADOG EVENT] Would trigger a Datadog event for ${errorId}`);
    }
  } catch (error) {
    // Avoid infinite recursion by using console directly
    console.error('Failed to log to Datadog:', error);
  }
};

/**
 * Generate a unique error ID
 */
const generateErrorId = () => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substr(2, 5);
  return `err_${timestamp}_${randomPart}`;
};

/**
 * Wraps a function with error logging
 * 
 * @param {Function} fn - The function to wrap
 * @param {Object} options - Error logging options
 * @returns {Function} - The wrapped function
 */
const wrapWithErrorLogging = (fn, options = {}) => {
  return async function(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      logError(error, {
        source: fn.name || 'anonymous function',
        ...options
      });
      throw error; // Re-throw to maintain original behavior
    }
  };
};

/**
 * Create an error handler middleware for Express
 */
const createErrorHandlerMiddleware = (options = {}) => {
  return (err, req, res, next) => {
    const errorId = logError(err, {
      source: `${req.method} ${req.path}`,
      metadata: {
        requestId: req.id,
        userId: req.user?.id,
        params: req.params,
        query: req.query
      },
      ...options
    });
    
    // Send error response
    res.status(err.status || 500).json({
      error: {
        message: process.env.NODE_ENV === 'production' ? 
          'An error occurred' : 
          err.message,
        errorId,
        status: err.status || 500
      }
    });
  };
};

/**
 * Register global unhandled error handlers
 */
const registerGlobalErrorHandlers = (options = {}) => {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logError(error, {
      severity: ErrorSeverity.CRITICAL,
      category: ErrorCategory.UNKNOWN,
      source: 'uncaughtException',
      ...options
    });
    
    // Allow the process to exit after logging
    if (options.exitOnUncaughtException !== false) {
      process.exit(1);
    }
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logError(reason instanceof Error ? reason : new Error(String(reason)), {
      severity: ErrorSeverity.CRITICAL,
      category: ErrorCategory.UNKNOWN,
      source: 'unhandledRejection',
      ...options
    });
  });
  
  // Log when the process is about to exit
  process.on('exit', (code) => {
    if (code !== 0) {
      logError(`Process exited with code ${code}`, {
        severity: ErrorSeverity.WARNING,
        category: ErrorCategory.UNKNOWN,
        source: 'process.exit'
      });
    }
  });
};

/**
 * Known error patterns and their solutions
 */
const knownErrorPatterns = [
  {
    pattern: /Cannot find module '@rollup\/rollup-([\w-]+)'/i,
    category: ErrorCategory.DEPENDENCY,
    solution: 'Architecture-specific Rollup module is missing. Run the fix-rollup-native-modules.sh script.',
    documentationUrl: 'https://github.com/npm/cli/issues/4828'
  },
  {
    pattern: /Cannot find module '@esbuild\/([\w-]+)'/i,
    category: ErrorCategory.DEPENDENCY,
    solution: 'Architecture-specific ESBuild module is missing. Run the fix-rollup-native-modules.sh script.',
    documentationUrl: 'https://github.com/evanw/esbuild/issues/1453'
  },
  {
    pattern: /EACCES: permission denied/i,
    category: ErrorCategory.PLATFORM,
    solution: 'Permission issue. Check file and directory permissions, or run with sudo if appropriate.',
    documentationUrl: 'https://docs.netlify.com/configure-builds/troubleshooting-tips/'
  },
  {
    pattern: /\[rspack\]/i,
    category: ErrorCategory.BUILD,
    solution: 'Rspack build error. Check the specific error message for details.',
    documentationUrl: 'https://www.rspack.dev/docs/en/guide/errors'
  },
  {
    pattern: /invalid host\/origin header/i,
    category: ErrorCategory.NETWORK,
    solution: 'Cross-origin issue. Add the missing origin to the allowed origins list.',
    documentationUrl: 'https://docs.astro.build/en/guides/troubleshooting/'
  }
];

/**
 * Check if an error matches any known patterns and return solution info
 * 
 * @param {Error|string} error - The error to check
 * @returns {Object|null} - Solution information if found, null otherwise
 */
const getErrorSolution = (error) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  for (const { pattern, category, solution, documentationUrl } of knownErrorPatterns) {
    if (pattern.test(errorMessage)) {
      return { category, solution, documentationUrl };
    }
  }
  
  return null;
};

/**
 * Log an error with solution information if available
 * 
 * @param {Error|string} error - The error to log
 * @param {Object} options - Logging options
 * @returns {string} - The error ID
 */
const logErrorWithSolution = (error, options = {}) => {
  const solution = getErrorSolution(error);
  
  if (solution) {
    return logError(error, {
      category: solution.category,
      metadata: {
        solution: solution.solution,
        documentationUrl: solution.documentationUrl,
        ...options.metadata
      },
      ...options
    });
  }
  
  return logError(error, options);
};

module.exports = {
  ErrorSeverity,
  ErrorCategory,
  logError,
  wrapWithErrorLogging,
  createErrorHandlerMiddleware,
  registerGlobalErrorHandlers,
  logErrorWithSolution,
  getErrorSolution,
  knownErrorPatterns
};
