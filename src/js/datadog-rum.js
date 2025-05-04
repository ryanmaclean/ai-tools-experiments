/**
 * Datadog Real User Monitoring (RUM) and Session Replay integration
 * 
 * This file initializes Datadog RUM with session replay for comprehensive
 * user experience monitoring, performance tracking, and debugging.
 */

import { datadogRum } from '@datadog/browser-rum';

/**
 * Initialize Datadog RUM with Session Replay
 * 
 * Configuration is environment-aware and uses privacy settings
 * to mask sensitive user inputs automatically.
 */
function initDatadogRum() {
  // Only initialize in production or if explicitly enabled in development
  const isDev = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1';
  
  // Allow testing in development with a special flag
  const forceRumInDev = window.localStorage.getItem('DD_RUM_DEV') === 'true';
  
  if (isDev && !forceRumInDev) {
    console.log('Datadog RUM disabled in development mode');
    // Create a stub for development so calls don't fail
    window.DD_RUM = {
      init: () => console.log('DD_RUM.init called in dev mode'),
      startSessionReplayRecording: () => console.log('DD_RUM.startSessionReplayRecording called in dev mode'),
      addRumGlobalContext: () => console.log('DD_RUM.addRumGlobalContext called in dev mode'),
      setUser: () => console.log('DD_RUM.setUser called in dev mode'),
      addAction: () => console.log('DD_RUM.addAction called in dev mode'),
      addError: () => console.log('DD_RUM.addError called in dev mode'),
      startView: () => console.log('DD_RUM.startView called in dev mode'),
      addTiming: () => console.log('DD_RUM.addTiming called in dev mode')
    };
    return;
  }
  
  try {
    datadogRum.init({
      applicationId: '__DATADOG_APPLICATION_ID__', // Will be replaced during build
      clientToken: '__DATADOG_CLIENT_TOKEN__',     // Will be replaced during build
      site: 'datadoghq.com',
      service: 'ai-tools-lab',
      env: isDev ? 'development' : 'production',
      version: '1.0.0',
      sessionSampleRate: 100,
      sessionReplaySampleRate: 20,  // Record 20% of sessions for replay
      trackUserInteractions: true,  // Track clicks, taps, and input changes
      trackResources: true,          // Track resources (images, fonts, etc.)
      trackLongTasks: true,          // Track tasks that take >50ms
      defaultPrivacyLevel: 'mask-user-input',
      trackFrustrations: true,       // Track rage clicks, error clicks, etc.
    });
    
    // Start session replay recording
    datadogRum.startSessionReplayRecording();
    
    // Add global context that will be attached to all RUM events
    datadogRum.addRumGlobalContext('app_version', '1.0.0');
    datadogRum.addRumGlobalContext('theme', document.documentElement.dataset.theme || 'light');
    
    // Add core web vitals tracking
    trackCoreWebVitals();
    
    // Add custom user actions tracking
    trackCustomUserActions();
    
    // Expose globally for debugging and custom usage
    window.DD_RUM = datadogRum;
    
    console.log('Datadog RUM initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Datadog RUM:', error);
  }
}

/**
 * Track Core Web Vitals metrics and report them to Datadog
 */
function trackCoreWebVitals() {
  if (typeof web_vitals === 'undefined') {
    console.warn('web-vitals library not loaded, skipping Core Web Vitals tracking');
    return;
  }
  
  try {
    // Import the necessary web-vitals functions
    const { onCLS, onFID, onLCP, onTTFB, onINP } = web_vitals;
    
    // Track Cumulative Layout Shift
    onCLS(metric => {
      datadogRum.addTiming('cls', metric.value);
    });
    
    // Track First Input Delay
    onFID(metric => {
      datadogRum.addTiming('fid', metric.value);
    });
    
    // Track Largest Contentful Paint
    onLCP(metric => {
      datadogRum.addTiming('lcp', metric.value);
    });
    
    // Track Time to First Byte
    onTTFB(metric => {
      datadogRum.addTiming('ttfb', metric.value);
    });
    
    // Track Interaction to Next Paint (responsiveness)
    onINP(metric => {
      datadogRum.addTiming('inp', metric.value);
    });
    
    console.log('Core Web Vitals tracking initialized');
  } catch (error) {
    console.warn('Error setting up Core Web Vitals tracking:', error);
  }
}

/**
 * Track custom user actions and frustration signals
 */
function trackCustomUserActions() {
  // Track episode navigation
  document.addEventListener('click', event => {
    const target = event.target.closest('.episode-card a, .episode-nav a');
    if (target) {
      const episodeName = target.textContent.trim() || 'unknown episode';
      datadogRum.addAction('navigate_to_episode', {
        episode_name: episodeName,
        episode_url: target.href
      });
    }
  });
  
  // Track resource card interactions
  document.addEventListener('click', event => {
    const resourceCard = event.target.closest('.resource-card');
    if (resourceCard) {
      const resourceTitle = resourceCard.querySelector('h2, h3')?.textContent.trim() || 'unknown resource';
      datadogRum.addAction('view_resource', {
        resource_title: resourceTitle
      });
    }
  });
  
  // Track timestamp clicks in transcripts
  document.addEventListener('click', event => {
    const timestampLink = event.target.closest('.timestamp-link');
    if (timestampLink) {
      const timestamp = timestampLink.textContent.trim();
      datadogRum.addAction('timestamp_click', {
        timestamp,
        video_url: timestampLink.href
      });
    }
  });
  
  // Track tag filter usage
  document.addEventListener('click', event => {
    const tagFilter = event.target.closest('.tag-filter');
    if (tagFilter) {
      const tagName = tagFilter.textContent.trim();
      const isActive = tagFilter.classList.contains('active');
      datadogRum.addAction('toggle_tag_filter', {
        tag_name: tagName,
        active: isActive
      });
    }
  });
  
  // Track form submissions
  document.addEventListener('submit', event => {
    const form = event.target;
    const formId = form.id || form.getAttribute('name') || 'unknown_form';
    datadogRum.addAction('form_submit', {
      form_id: formId
    });
  });
  
  console.log('Custom user actions tracking initialized');
}

// Initialize when the DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDatadogRum);
} else {
  initDatadogRum();
}

// Export the initialization function for use in other modules
export default initDatadogRum;
