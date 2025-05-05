/**
 * Datadog Real User Monitoring (RUM) and Session Replay integration
 * 
 * This file initializes Datadog RUM with session replay for comprehensive
 * user experience monitoring, performance tracking, and debugging.
 */

import { datadogRum } from '@datadog/browser-rum';
import { DATADOG_CONFIG } from './datadog-config';

/**
 * Initialize Datadog RUM client if configuration is available
 * No API keys are directly embedded in this file - they come from the build process
 * and are stored only in environment variables and GitHub Secrets
 */
export function initDatadogRum() {
  // Only initialize if we have the required configuration
  if (DATADOG_CONFIG.clientToken && DATADOG_CONFIG.applicationId) {
    try {
      datadogRum.init({
        applicationId: DATADOG_CONFIG.applicationId,
        clientToken: DATADOG_CONFIG.clientToken,
        site: DATADOG_CONFIG.site || 'datadoghq.com',
        service: DATADOG_CONFIG.service || 'ai-tools-lab',
        env: DATADOG_CONFIG.env || 'production',
        version: DATADOG_CONFIG.version || '1.0.0',
        sessionSampleRate: 100,
        sessionReplaySampleRate: 20,
        trackUserInteractions: true,
        trackResources: true,
        trackLongTasks: true,
        defaultPrivacyLevel: 'mask-user-input'
      });
      
      // Add global metadata
      datadogRum.addRumGlobalContext('app', {
        framework: 'astro',
        isProduction: process.env.NODE_ENV === 'production',
        viewport: `${window.innerWidth}x${window.innerHeight}`
      });
      
      console.log('✅ Datadog RUM initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Datadog RUM:', error);
      // Send error to server-side logging via the proxy
      sendErrorToProxy({
        message: 'Failed to initialize Datadog RUM',
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  } else {
    console.warn('⚠️ Datadog RUM configuration incomplete - skipping initialization');
    return false;
  }
}

/**
 * Send errors to the server-side proxy which will forward to Datadog
 * This avoids exposing API keys on the client side
 */
function sendErrorToProxy(errorData) {
  const proxyUrl = '/api/datadog';
  
  // Only attempt in production environments that have the proxy
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{
        message: 'Client Error',
        ddsource: 'browser-rum',
        service: DATADOG_CONFIG.service || 'ai-tools-lab',
        hostname: window.location.hostname,
        status: 'error',
        error: errorData
      }])
    }).catch(err => {
      // Silent fail - we don't want to cause additional errors
      console.warn('Failed to send error to logging proxy', err);
    });
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

// Auto-initialize when included if window is available
if (typeof window !== 'undefined') {
  // Wait for DOM content to be loaded
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initDatadogRum();
  } else {
    document.addEventListener('DOMContentLoaded', initDatadogRum);
  }
}

export default { initDatadogRum };
