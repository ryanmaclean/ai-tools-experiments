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
  if (typeof window !== 'undefined' && window.DD_RUM) {
    window.DD_RUM.init({
      clientToken: 'pub501e7bdae51f592b13b33adf351655a3',
      applicationId: 'db2aad17-02cf-4e95-bee7-09293dd29f1a',
      site: 'datadoghq.com',
      service: 'ai-tools-lab',
      env: window.location.hostname.includes('localhost') ? 'development' : 'production',
      version: '1.0.0',
      sessionSampleRate: 100,
      sessionReplaySampleRate: 20,
      trackUserInteractions: true,
      trackResources: true,
      trackLongTasks: true,
      trackFrustrations: true,
      defaultPrivacyLevel: 'mask-user-input'
    });
    
    window.DD_RUM.startSessionReplayRecording();
    window.DD_RUM.addRumGlobalContext('app_version', '1.0.0');
    
    if (typeof window.performance !== 'undefined') {
      const paintEntries = window.performance.getEntriesByType('paint');
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      if (fcp) {
        window.DD_RUM.addTiming('first_contentful_paint', fcp.startTime);
      }
      
      if (window.performance.timing) {
        const timing = window.performance.timing;
        window.DD_RUM.addTiming('dom_interactive', timing.domInteractive - timing.navigationStart);
        window.DD_RUM.addTiming('dom_complete', timing.domComplete - timing.navigationStart);
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
