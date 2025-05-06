/**
 * Content Synchronization Script
 * 
 * Downloads HTML from production and prepares it for Astro import.
 * - Downloads raw HTML from production pages
 * - Strips headers and footers
 * - Creates clean content files for import
 *
 * Usage: node scripts/sync-content.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration - minimal and straightforward
const config = {
  source: 'ai-tools-lab.com',
  pages: [
    { path: '/pages/', output: 'home' },
    { path: '/pages/resources', output: 'resources' },
    { path: '/pages/observations', output: 'observations' },
    { path: '/pages/about', output: 'about' },
  ],
  outputDir: 'src/content/imported'
};

// Additional function to find and download individual episodes
async function downloadEpisodes() {
  console.log('\nSearching for individual episodes...');
  
  // Create episodes directory
  const episodesDir = path.join(config.outputDir, 'episodes');
  if (!fs.existsSync(episodesDir)) {
    fs.mkdirSync(episodesDir, { recursive: true });
    console.log(`Created directory: ${episodesDir}`);
  }
  
  // Create a main episodes index file
  const episodesIndexPath = path.join(config.outputDir, 'episodes.html');
  
  // Episode paths to try - this is based on common URL patterns
  const episodePatterns = [
    // Try checking for numbered episodes
    ...Array.from({ length: 10 }, (_, i) => `/pages/episode-${i + 1}`),
    
    // Try checking for transcripts
    ...Array.from({ length: 10 }, (_, i) => `/pages/transcript-${i + 1}`),
    
    // Try checking for episode slugs
    '/pages/episode-introduction',
    '/pages/episode-getting-started',
    '/pages/episode-advanced-topics',
    
    // Try checking date-based episodes
    '/pages/episode-2025-01',
    '/pages/episode-2025-02',
    '/pages/episode-2025-03',
    '/pages/episode-2025-04',
    '/pages/episode-2025-05',
  ];
  
  // Track successfully downloaded episodes
  const downloadedEpisodes = [];
  
  // Try to download each episode
  for (const episodePath of episodePatterns) {
    try {
      console.log(`Checking for episode at ${episodePath}...`);
      const html = await downloadContent(episodePath);
      
      // Get episode name from path
      const episodeName = path.basename(episodePath);
      console.log(`Processing episode: ${episodeName}`);
      
      // Clean the content
      const cleanContent = extractMainContent(html);
      
      // Save to file in episodes directory
      const outputPath = path.join(episodesDir, `${episodeName}.html`);
      fs.writeFileSync(outputPath, cleanContent);
      
      // Add to successful downloads
      downloadedEpisodes.push({
        name: episodeName,
        path: outputPath,
        url: episodePath
      });
      
      console.log(`✅ Saved episode: ${outputPath}`);
    } catch (error) {
      // Just skip episodes that don't exist
      // console.log(`Episode not found at ${episodePath}`);
    }
  }
  
  // Create episodes index with the episodes we found
  if (downloadedEpisodes.length > 0) {
    console.log(`✅ Found ${downloadedEpisodes.length} episodes`);
    
    // Create an index file for all episodes
    const episodesIndexContent = `<div class="episodes-container">
  <h1>Episodes</h1>
  <p>Select an episode to view:</p>
  <ul>
    ${downloadedEpisodes.map(ep => `<li><a href="./episodes/${ep.name}.html">${ep.name}</a></li>`).join('
    ')}
  </ul>
</div>`;
    
    fs.writeFileSync(episodesIndexPath, episodesIndexContent);
    console.log(`✅ Created episodes index: ${episodesIndexPath}`);
  } else {
    // Create a placeholder if we didn't find any episodes
    const episodesContent = `<div class="episodes-container">
  <h1>Episodes</h1>
  <p>Episodes content will be available soon.</p>
  <ul>
    <li>Episode 1: Introduction</li>
    <li>Episode 2: Getting Started</li>
    <li>Episode 3: Advanced Topics</li>
  </ul>
</div>`;
    
    fs.writeFileSync(episodesIndexPath, episodesContent);
    console.log(`✅ Created episodes placeholder: ${episodesIndexPath}`);
  }
}

// Ensure directory exists
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
  console.log(`Created directory: ${config.outputDir}`);
}

// Download content from a URL
function downloadContent(url) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: config.source,
      path: url,
      method: 'GET'
    };
    
    const req = https.request(options, res => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`Request failed with status code ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', error => reject(error));
    req.end();
  });
}

// Extract main content by removing header and footer
function extractMainContent(html) {
  // Remove header
  let content = html.replace(/\s*<header[\s\S]*?<\/header>/gi, '');
  // Remove footer
  content = content.replace(/\s*<footer[\s\S]*?<\/footer>/gi, '');
  // Clean up any script tags (optional)
  content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
  return content;
}

// Process each page
async function processPages() {
  console.log('Starting content synchronization...');
  
  for (const page of config.pages) {
    try {
      console.log(`Downloading ${page.path}...`);
      const html = await downloadContent(page.path);
      
      console.log(`Processing ${page.output}...`);
      const cleanContent = extractMainContent(html);
      
      // Save to file
      const outputPath = path.join(config.outputDir, `${page.output}.html`);
      fs.writeFileSync(outputPath, cleanContent);
      
      console.log(`✅ Saved ${outputPath}`);
    } catch (error) {
      console.error(`❌ Error processing ${page.path}:`, error.message);
    }
  }
  
  // Create episodes placeholder since it's not available in production
  createEpisodesPlaceholder();
  
  console.log('\nContent synchronization complete!');
  console.log('Next steps:');
  console.log('1. Review the HTML files in src/content/imported/');
  console.log('2. Create or update Astro pages to import this content');
  console.log('   See docs/post-deploy-todo.md for detailed instructions');
}

// Run the script
processPages().catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
});
