/**
 * Datadog Real User Monitoring (RUM) integration
 * 
 * This script initializes Datadog RUM for client-side monitoring
 * of performance, user sessions, and errors.
 */

import { datadogRum } from '@datadog/browser-rum';

// Initialize Datadog RUM
datadogRum.init({
    applicationId: '719fdc0f-589e-4c5a-bf1c-fa42f53208fd',
    clientToken: 'pub3ab714d81ea179c4cf78b41467d1090b',
    site: 'datadoghq.com',
    service: 'ai-tools-lab-tst',
    env: 'tst',
    sessionSampleRate: 100,
    sessionReplaySampleRate: 100,
    defaultPrivacyLevel: 'mask-user-input',
    
    // Add additional tracking for key user actions
    trackInteractions: true,
    
    // Track view time and resources
    trackResources: true,
    trackLongTasks: true
});

// Add custom user actions where needed
export const trackUserAction = (actionName, attributes = {}) => {
    datadogRum.addAction(actionName, attributes);
};

// Export the RUM instance for use in other components
export { datadogRum };
