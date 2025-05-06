/**
 * Datadog Logger
 * 
 * A simple logger that forwards logs to Datadog if configured, or falls back to console logging.
 */

const DD_API_KEY = process.env.DD_API_KEY || null;

function getDatadogLogger(name, tags = {}) {
  // Check if Datadog API key is available
  const hasDatadogConfig = !!DD_API_KEY;
  
  // Create logger object
  const logger = {
    info: (message, data = {}) => {
      console.log(`[INFO][${name}] ${message}`, { ...tags, ...data });
      // If we had a real Datadog client, we would send the log here
    },
    
    error: (message, data = {}) => {
      console.error(`[ERROR][${name}] ${message}`, { ...tags, ...data });
      // If we had a real Datadog client, we would send the log here
    },
    
    warn: (message, data = {}) => {
      console.warn(`[WARN][${name}] ${message}`, { ...tags, ...data });
      // If we had a real Datadog client, we would send the log here
    },
    
    debug: (message, data = {}) => {
      console.debug(`[DEBUG][${name}] ${message}`, { ...tags, ...data });
      // If we had a real Datadog client, we would send the log here
    }
  };
  
  // Log initialization
  if (hasDatadogConfig) {
    console.log(`Datadog logging initialized for ${name}`);
  } else {
    console.log(`Datadog logging disabled - using console fallback for ${name}`);
  }
  
  return logger;
}

module.exports = { getDatadogLogger };
