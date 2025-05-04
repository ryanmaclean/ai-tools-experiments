/**
 * Datadog RUM Custom User Flow Tracking
 * 
 * This script adds detailed user flow tracking to enhance session replay capabilities
 * by providing better context for user interactions and frustration patterns.
 */

// This script will be loaded after the main DD_RUM initialization

/**
 * Initialize custom user flow tracking for Datadog RUM
 */
function initializeUserFlowTracking() {
  // Skip if Datadog RUM isn't available
  if (typeof window === 'undefined' || !window.DD_RUM) {
    console.warn('Datadog RUM not available for user flow tracking');
    return;
  }
  
  console.log('Initializing Datadog RUM user flow tracking');
  
  // ----------- Resource Cards Tracking -----------
  trackResourceCardInteractions();
  
  // ----------- Episode Navigation Tracking -----------
  trackEpisodeNavigation();
  
  // ----------- Search & Filter Tracking -----------
  trackSearchAndFilters();
  
  // ----------- Frustration Tracking -----------
  trackUserFrustrations();
  
  // ----------- Page Performance Tracking -----------
  trackPagePerformance();
}

/**
 * Track interactions with resource cards
 */
function trackResourceCardInteractions() {
  // Track clicks on resource cards
  document.addEventListener('click', (event) => {
    const resourceCard = event.target.closest('.resource-card');
    if (!resourceCard) return;
    
    const titleElement = resourceCard.querySelector('h2, h3');
    const title = titleElement ? titleElement.textContent.trim() : 'Unknown resource';
    const cardId = resourceCard.id || resourceCard.dataset.id || title.toLowerCase().replace(/\W+/g, '-');
    
    // Record the action
    window.DD_RUM.addAction('resource_card_click', {
      resource_title: title,
      resource_id: cardId,
      page: window.location.pathname
    });
  });
  
  // Track resource card thumbnail loading success/failure
  if (window.IntersectionObserver) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const card = entry.target;
          const img = card.querySelector('img');
          if (img) {
            // Check if image loaded or errored
            if (img.complete) {
              recordResourceCardImageState(card, img, !img.naturalWidth);
            } else {
              img.addEventListener('load', () => recordResourceCardImageState(card, img, false));
              img.addEventListener('error', () => recordResourceCardImageState(card, img, true));
            }
          }
          // Unobserve after checking
          observer.unobserve(card);
        }
      });
    }, { threshold: 0.1 });
    
    // Observe all resource cards
    document.querySelectorAll('.resource-card').forEach(card => {
      observer.observe(card);
    });
  }
}

/**
 * Record resource card image loading state
 */
function recordResourceCardImageState(card, img, hasError) {
  const titleElement = card.querySelector('h2, h3');
  const title = titleElement ? titleElement.textContent.trim() : 'Unknown resource';
  
  window.DD_RUM.addAction('resource_image_loaded', {
    resource_title: title,
    success: !hasError,
    src: img.src,
    timing: img.currentSrc ? performance.getEntriesByName(img.currentSrc)[0]?.duration : null
  });
}

/**
 * Track episode navigation interactions
 */
function trackEpisodeNavigation() {
  // Track episode card clicks
  document.addEventListener('click', (event) => {
    // Episode cards on index page
    const episodeCard = event.target.closest('.episode-card');
    if (episodeCard) {
      const episodeLink = episodeCard.querySelector('a');
      const episodeTitle = episodeCard.querySelector('h2, h3')?.textContent.trim() || 'Unknown episode';
      
      window.DD_RUM.addAction('episode_card_click', {
        episode_title: episodeTitle,
        episode_url: episodeLink?.href || window.location.href
      });
      return;
    }
    
    // Episode navigation (next/previous links)
    const navLink = event.target.closest('.episode-nav a');
    if (navLink) {
      window.DD_RUM.addAction('episode_navigation_click', {
        direction: navLink.classList.contains('next') ? 'next' : 'previous',
        target_url: navLink.href
      });
    }
  });
  
  // Track timestamp clicks in transcripts
  document.addEventListener('click', (event) => {
    const timestampLink = event.target.closest('.timestamp-link');
    if (timestampLink) {
      const timestamp = timestampLink.textContent.trim();
      window.DD_RUM.addAction('transcript_timestamp_click', {
        timestamp,
        video_url: timestampLink.href
      });
    }
  });
}

/**
 * Track search and filter interactions
 */
function trackSearchAndFilters() {
  // Track tag filter clicks
  document.addEventListener('click', (event) => {
    const tagFilter = event.target.closest('.tag-filter');
    if (tagFilter) {
      const tagName = tagFilter.textContent.trim();
      const isActive = tagFilter.classList.contains('active');
      
      window.DD_RUM.addAction('tag_filter_toggle', {
        tag_name: tagName,
        active: isActive,
        page: window.location.pathname
      });
    }
  });
  
  // Track search interactions
  const searchForms = document.querySelectorAll('form[role="search"], .search-form');
  searchForms.forEach(form => {
    form.addEventListener('submit', (event) => {
      const searchInput = form.querySelector('input[type="search"], input[type="text"]');
      const searchTerm = searchInput ? searchInput.value.trim() : '';
      
      if (searchTerm) {
        window.DD_RUM.addAction('search_submit', {
          search_term: searchTerm,
          page: window.location.pathname
        });
      }
    });
  });
}

/**
 * Track user frustration patterns
 */
function trackUserFrustrations() {
  // Track repeated clicks in same area (rage clicks)
  let clickHistory = [];
  let clickTimeout;
  
  document.addEventListener('click', (event) => {
    const { clientX, clientY } = event;
    const now = Date.now();
    
    // Add click to history with timestamp and coordinates
    clickHistory.push({ x: clientX, y: clientY, time: now });
    
    // Only keep clicks from the last 3 seconds
    clickHistory = clickHistory.filter(click => now - click.time < 3000);
    
    // Check for rage clicks (3+ clicks in similar area within 3 seconds)
    if (clickHistory.length >= 3) {
      // Check if clicks are in similar area (within 30 pixels)
      const similarAreaClicks = clickHistory.filter(click => {
        return Math.abs(click.x - clientX) < 30 && Math.abs(click.y - clientY) < 30;
      });
      
      if (similarAreaClicks.length >= 3) {
        // Avoid duplicate rage click reports by using a timeout
        clearTimeout(clickTimeout);
        clickTimeout = setTimeout(() => {
          const target = event.target;
          const targetDesc = getElementDescription(target);
          
          window.DD_RUM.addAction('rage_click_detected', {
            click_count: similarAreaClicks.length,
            target_element: targetDesc,
            page: window.location.pathname,
            selector: getCssSelector(target)
          });
          
          // Reset after reporting
          clickHistory = [];
        }, 500);
      }
    }
  });
  
  // Track dead clicks (clicks on non-interactive elements)
  document.addEventListener('click', (event) => {
    const target = event.target;
    
    // Skip if the element is interactive
    if (isInteractiveElement(target)) return;
    
    // Check parent elements up to 3 levels for interactive elements
    let parent = target.parentElement;
    let interactiveParentFound = false;
    for (let i = 0; i < 3; i++) {
      if (!parent) break;
      if (isInteractiveElement(parent)) {
        interactiveParentFound = true;
        break;
      }
      parent = parent.parentElement;
    }
    
    // Report dead click if no interactive parent found
    if (!interactiveParentFound) {
      window.DD_RUM.addAction('dead_click_detected', {
        target_element: getElementDescription(target),
        page: window.location.pathname,
        selector: getCssSelector(target)
      });
    }
  });
}

/**
 * Track page performance metrics
 */
function trackPagePerformance() {
  // Track when page is fully loaded
  window.addEventListener('load', () => {
    // Capture navigation timing
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      const domContentLoadedTime = timing.domContentLoadedEventEnd - timing.navigationStart;
      
      window.DD_RUM.addTiming('page_load_complete', loadTime);
      window.DD_RUM.addTiming('dom_content_loaded', domContentLoadedTime);
      
      // Add page context
      window.DD_RUM.addRumGlobalContext('page_load_time_ms', loadTime);
    }
  });
  
  // Track client-side navigation for SPAs
  let lastPathname = window.location.pathname;
  
  // Use the appropriate navigation observer based on browser support
  if ('navigation' in window.performance) {
    // Modern browsers: PerformanceNavigationTiming
    window.addEventListener('popstate', () => {
      const currentPathname = window.location.pathname;
      if (currentPathname !== lastPathname) {
        window.DD_RUM.addAction('client_side_navigation', {
          from: lastPathname,
          to: currentPathname
        });
        lastPathname = currentPathname;
      }
    });
  }
}

// ========= Helper Functions =========

/**
 * Check if an element is interactive
 */
function isInteractiveElement(element) {
  if (!element) return false;
  
  // Check tag name
  const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'DETAILS', 'SUMMARY'];
  if (interactiveTags.includes(element.tagName)) return true;
  
  // Check role attribute
  const interactiveRoles = ['button', 'link', 'checkbox', 'menuitem', 'tab', 'radio', 'switch'];
  const role = element.getAttribute('role');
  if (role && interactiveRoles.includes(role)) return true;
  
  // Check if element has click handlers
  // Note: This is a basic check and not 100% reliable
  return (element.onclick != null || element.getAttribute('onclick') != null);
}

/**
 * Get a human-readable description of an element
 */
function getElementDescription(element) {
  if (!element) return 'unknown';
  
  // Try to get the most meaningful descriptor
  const text = element.innerText || element.textContent;
  const trimmedText = text ? text.trim().substring(0, 50) : '';
  const id = element.id ? `#${element.id}` : '';
  const classes = element.className && typeof element.className === 'string' ? `.${element.className.split(' ').join('.')}` : '';
  const tagName = element.tagName ? element.tagName.toLowerCase() : '';
  
  if (trimmedText) return `${tagName}:"${trimmedText}"`;
  if (id) return `${tagName}${id}`;
  if (classes) return `${tagName}${classes}`;
  return tagName;
}

/**
 * Get a CSS selector for an element
 */
function getCssSelector(element) {
  if (!element) return '';
  
  let selector = '';
  let currentElement = element;
  
  while (currentElement && currentElement !== document.body) {
    let elementSelector = currentElement.tagName.toLowerCase();
    
    if (currentElement.id) {
      elementSelector += `#${currentElement.id}`;
      selector = elementSelector + (selector ? ` > ${selector}` : '');
      break;
    } else {
      const classes = Array.from(currentElement.classList).join('.');
      if (classes) {
        elementSelector += `.${classes}`;
      }
      
      // Add position if needed
      const parent = currentElement.parentElement;
      if (parent && !currentElement.id) {
        const siblings = Array.from(parent.children).filter(child => 
          child.tagName === currentElement.tagName
        );
        
        if (siblings.length > 1) {
          const index = siblings.indexOf(currentElement) + 1;
          elementSelector += `:nth-child(${index})`;
        }
      }
      
      selector = elementSelector + (selector ? ` > ${selector}` : '');
      currentElement = currentElement.parentElement;
    }
    
    // Limit selector depth to prevent extremely long selectors
    if (selector.split(' > ').length >= 4) {
      break;
    }
  }
  
  return selector;
}

// Initialize when the DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeUserFlowTracking);
} else {
  initializeUserFlowTracking();
}

export default initializeUserFlowTracking;
