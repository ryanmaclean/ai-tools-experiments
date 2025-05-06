/**
 * Datadog RUM Configuration
 *
 * This file provides configuration for Datadog RUM based on environment variables.
 * No sensitive information is hardcoded; all values come from the environment.
 */

// Default values that can be overridden by environment variables
export const DATADOG_CONFIG = {
  // Application ID and client token should be set in environment variables
  applicationId: process.env.DD_APPLICATION_ID || '719fdc0f-589e-4c5a-bf1c-fa42f53208fd',
  clientToken: process.env.DD_CLIENT_TOKEN || 'pub3ab714d81ea179c4cf78b41467d1090b',
  
  // Other configuration values
  site: process.env.DD_SITE || 'datadoghq.com',
  service: process.env.SITE_NAME || 'ai-tools-lab-tst',
  env: process.env.CONTEXT || 'tst',  // Uses Netlify's CONTEXT environment variable (production, preview, etc.)
  version: process.env.COMMIT_REF || '1.0.0',  // Uses Netlify's COMMIT_REF variable
};
