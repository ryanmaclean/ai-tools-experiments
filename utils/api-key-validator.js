/**
 * API Key Validator
 * 
 * Provides standardized utilities for validating and safely accessing API keys.
 * This helps prevent hardcoded keys, ensures consistent patterns,
 * and properly handles secret context in various environments.
 */

/**
 * Validates a Datadog API key format
 * @param {string} key - The API key to validate
 * @returns {boolean} - Whether the key format is valid
 */
function isValidDatadogApiKey(key) {
  if (!key || typeof key !== 'string') return false;
  
  // Datadog API keys are 32-character hexadecimal strings
  return /^[a-f0-9]{32}$/i.test(key);
}

/**
 * Safely access the Datadog API key from environment variables
 * @returns {string|null} - The API key or null if not found/invalid
 */
function getDatadogApiKey() {
  // Check for the key in multiple possible environment variable names
  const key = process.env.DD_API_KEY || 
              process.env.DATADOG_API_KEY || 
              process.env.TF_VAR_datadog_api_key;
  
  // Validate the key format before returning
  return isValidDatadogApiKey(key) ? key : null;
}

/**
 * Safely access the Datadog Application key from environment variables
 * @returns {string|null} - The app key or null if not found/invalid
 */
function getDatadogAppKey() {
  // Check for the key in multiple possible environment variable names
  const key = process.env.DD_APP_KEY || 
              process.env.DATADOG_APP_KEY || 
              process.env.TF_VAR_datadog_app_key;
  
  // Validate if we have a key
  if (!key || typeof key !== 'string') {
    return null;
  }
  
  // Datadog APP keys are 40-character hexadecimal strings
  if (/^[a-f0-9]{40}$/i.test(key)) {
    return key;
  }
  
  return null;
}

/**
 * Mask sensitive values in logs or error messages
 * @param {string} text - The text that might contain sensitive data
 * @returns {string} - Text with sensitive data masked
 */
function maskSensitiveData(text) {
  if (!text) return text;
  
  // Replace potential API keys (32 hex chars) with a masked version
  let masked = text.replace(/([a-f0-9]{24})([a-f0-9]{8})/gi, (match, p1, p2) => {
    // Keep first 4 and last 4 characters, mask the rest
    const firstFour = p1.substring(0, 4);
    const lastFour = p2.substring(4);
    return `${firstFour}${'*'.repeat(24)}${lastFour}`;
  });
  
  // Replace potential APP keys (40 hex chars)
  masked = masked.replace(/([a-f0-9]{32})([a-f0-9]{8})/gi, (match, p1, p2) => {
    // Keep first 4 and last 4 characters, mask the rest
    const firstFour = p1.substring(0, 4);
    const lastFour = p2.substring(4);
    return `${firstFour}${'*'.repeat(32)}${lastFour}`;
  });
  
  return masked;
}

/**
 * Check if the environment has valid Datadog configuration
 * @returns {Object} - Object containing validation results
 */
function validateDatadogEnvironment() {
  const apiKey = getDatadogApiKey();
  const appKey = getDatadogAppKey();
  
  // Simple validation function for APP key
  function isValidDatadogAppKey(key) {
    return !!key && typeof key === 'string' && /^[a-f0-9]{40}$/i.test(key);
  }
  
  return {
    hasApiKey: !!apiKey,
    hasAppKey: !!appKey,
    isValid: !!apiKey && !!appKey,
    apiKeyValid: isValidDatadogApiKey(apiKey),
    appKeyValid: isValidDatadogAppKey(appKey)
  };
}

module.exports = {
  isValidDatadogApiKey,
  getDatadogApiKey,
  getDatadogAppKey,
  maskSensitiveData,
  validateDatadogEnvironment
};
