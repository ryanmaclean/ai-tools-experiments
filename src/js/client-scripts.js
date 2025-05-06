// All client-side scripts moved here to avoid SSR problems

// Mobile navigation toggle
export function setupMobileNav() {
  const hamburger = document.querySelector('.hamburger-menu');
  const mobileNav = document.querySelector('.mobile-nav');
  const overlay = document.querySelector('.overlay');

  if (hamburger && mobileNav && overlay) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileNav.classList.toggle('open');
      overlay.classList.toggle('active');
      document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
    });

    overlay.addEventListener('click', () => {
      hamburger.classList.remove('active');
      mobileNav.classList.remove('open');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    });

    // Close mobile nav on link click
    const navLinks = mobileNav.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        mobileNav.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }
}

// Initialize Datadog RUM
export function setupDatadogRUM() {
  // Import Datadog config from window global or use local config
  const { DATADOG_CONFIG } = typeof window !== 'undefined' && window.datadogConfig || {};
  
  // Check if Datadog RUM is already initialized to prevent duplicate initialization
  if (typeof window !== 'undefined' && window.DD_RUM && !window.DD_RUM_INITIALIZED && 
      DATADOG_CONFIG && DATADOG_CONFIG.applicationId && DATADOG_CONFIG.clientToken) {
    
    // Get environment from centralized config or fallback to local function
    const environment = DATADOG_CONFIG.getEnvironment ? DATADOG_CONFIG.getEnvironment() : getEnvironment();
    
    // Initialize Datadog RUM with values from centralized configuration
    window.DD_RUM.init({
      applicationId: DATADOG_CONFIG.applicationId,
      clientToken: DATADOG_CONFIG.clientToken,
      site: DATADOG_CONFIG.site || 'datadoghq.com',
      service: DATADOG_CONFIG.service || 'ai-tools-lab',
      env: environment,
      version: DATADOG_CONFIG.version || '1.0.0',
      sessionSampleRate: 100,
      sessionReplaySampleRate: 20,
      trackResources: true,
      trackLongTasks: true,
      trackUserInteractions: true,
      defaultPrivacyLevel: 'mask-user-input'
    });

    // Set the initialized flag to prevent duplicate initializations
    window.DD_RUM_INITIALIZED = true;
    console.log(`Datadog RUM initialized in ${environment} environment`);
  }
  
  // Track performance metrics even if Datadog RUM is already initialized
  if (typeof window !== 'undefined' && window.DD_RUM && window.DD_RUM_INITIALIZED && typeof window.performance !== 'undefined') {
    const paintEntries = window.performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    
    if (fcp && window.DD_RUM) {
      window.DD_RUM.addTimingToPageLoad('first-contentful-paint', fcp.startTime);
    }
  }  
  if (window.performance.timing) {
    const timing = window.performance.timing;
    window.DD_RUM.addTiming('dom_interactive', timing.domInteractive - timing.navigationStart);
    window.DD_RUM.addTiming('dom_complete', timing.domComplete - timing.navigationStart);
  } else if (window.DD_RUM && window.DD_RUM_INITIALIZED) {
    // If already initialized, just add performance metrics
    if (typeof window.performance !== 'undefined') {
      const paintEntries = window.performance.getEntriesByType('paint');
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      if (fcp) {
        window.DD_RUM.addTiming('first_contentful_paint', fcp.startTime);
      }
    }
  }
}

// Easter egg functionality
export function setupEasterEgg() {
  const easterEgg = document.getElementById('easter-egg');
  const modal = document.getElementById('easter-egg-modal');
  const closeBtn = document.querySelector('.easter-egg-close');
  
  if (!easterEgg || !modal || !closeBtn) return;
  
  // Show modal when Pi symbol is clicked
  easterEgg.addEventListener('click', function() {
    modal.style.display = 'flex';
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
  });
  
  // Close modal when X is clicked
  closeBtn.addEventListener('click', function() {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  });
  
  // Close modal when clicking outside of it
  modal.addEventListener('click', function(event) {
    if (event.target === modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
    }
  });
}

// Initialize all client-side features
export function initClientFeatures() {
  document.addEventListener('DOMContentLoaded', () => {
    setupMobileNav();
    setupDatadogRUM();
    setupEasterEgg();
  });
}
