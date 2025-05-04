/**
 * Utility to fetch HTML from production site for importing into Astro components
 */

export async function fetchHtmlFromProd(path, selector = 'body') {
  try {
    const prodUrl = `https://ai-tools-lab.com${path}`;
    console.log(`Fetching HTML from: ${prodUrl}`);
    
    const response = await fetch(prodUrl);
    if (!response.ok) {
      console.error(`Failed to fetch from ${prodUrl}: ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    
    // Use DOMParser to extract specific elements if running in browser
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const element = doc.querySelector(selector);
      return element ? element.innerHTML : null;
    }
    
    // For server-side, return full HTML
    return html;
  } catch (error) {
    console.error('Error fetching production HTML:', error);
    return null;
  }
}

// Fallback HTML content for components
export const fallbackContent = {
  header: `
    <header class="site-header">
      <div class="container header-content-container">
        <div class="logo">
          <img src="/images/ai-tools-lab-logo.webp" alt="AI Tools Lab Logo" class="site-logo">
          <a href="/">AI Tools Lab</a>
        </div>
        <nav class="main-nav">
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/resources">Resources</a></li>
            <li><a href="/observations">Observations</a></li>
            <li><a href="/about">About</a></li>
          </ul>
        </nav>
      </div>
    </header>
  `,
  footer: `
    <footer>
      <div class="container">
        <div class="footer-content">
          <div class="footer-logo">
            <img src="/images/ai-tools-lab-logo.png" alt="AI Tools Lab Logo" class="footer-logo-img">
            <div>
              <h2>AI Tools Lab</h2>
              <p>Exploring the landscape of AI tools and technologies</p>
            </div>
          </div>
          <div class="footer-links">
            <h3>Quick Links</h3>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/resources">Resources</a></li>
              <li><a href="/observations">Observations</a></li>
              <li><a href="/about">About</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; 2025 AI Tools Lab. All rights reserved.</p>
        </div>
      </div>
    </footer>
  `,
  resourceCard: `
    <div class="resource-card">
      <h3>Example Resource</h3>
      <p>This is a fallback resource card example</p>
      <div class="resource-meta">
        <span class="category">AI</span>
        <span class="date">2025</span>
      </div>
    </div>
  `
};
