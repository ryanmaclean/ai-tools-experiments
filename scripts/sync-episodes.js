/**
 * Episode Content Synchronization Script
 * 
 * Downloads episodes ep01-07.html from production and prepares them for Astro import.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  source: 'ai-tools-lab.com',
  outputDir: 'src/content/imported/episodes',
  mainOutputFile: 'src/content/imported/episodes.html',
  // Specific episode files to capture with proper naming convention
  episodes: [
    { path: '/pages/ep01.html', output: 'ep01.html' },
    { path: '/pages/ep02.html', output: 'ep02.html' },
    { path: '/pages/ep03.html', output: 'ep03.html' },
    { path: '/pages/ep04.html', output: 'ep04.html' },
    { path: '/pages/ep05.html', output: 'ep05.html' },
    { path: '/pages/ep06.html', output: 'ep06.html' },
    { path: '/pages/ep07.html', output: 'ep07.html' },
    // Alternative paths to try if the above don't work
    { path: '/pages/transcripts/ep01.html', output: 'ep01.html' },
    { path: '/pages/transcripts/ep02.html', output: 'ep02.html' },
    { path: '/pages/transcripts/ep03.html', output: 'ep03.html' },
    { path: '/pages/transcripts/ep04.html', output: 'ep04.html' },
    { path: '/pages/transcripts/ep05.html', output: 'ep05.html' },
    { path: '/pages/transcripts/ep06.html', output: 'ep06.html' },
    { path: '/pages/transcripts/ep07.html', output: 'ep07.html' },
    // Try without .html extension
    { path: '/pages/ep01', output: 'ep01.html' },
    { path: '/pages/ep02', output: 'ep02.html' },
    { path: '/pages/ep03', output: 'ep03.html' },
    { path: '/pages/ep04', output: 'ep04.html' },
    { path: '/pages/ep05', output: 'ep05.html' },
    { path: '/pages/ep06', output: 'ep06.html' },
    { path: '/pages/ep07', output: 'ep07.html' },
  ]
};

// Ensure output directory exists
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

// Extract main content by removing header, footer, and other site-specific elements
function extractMainContent(html) {
  // Start with complete document
  let content = html;
  
  // 1. First attempt to extract just the main content area if it exists
  const mainContentRegex = /<main[^>]*>([\s\S]*?)<\/main>/i;
  const mainMatch = content.match(mainContentRegex);
  
  if (mainMatch && mainMatch[1]) {
    // Use just the content inside <main> tags
    content = mainMatch[1];
  } else {
    // If no <main> tag, try to identify and remove common site elements
    
    // Remove doctype, html, head elements completely
    content = content.replace(/<!DOCTYPE[^>]*>/i, '');
    content = content.replace(/<html[^>]*>[\s\S]*?<body[^>]*>/i, '');
    content = content.replace(/<\/body>[\s\S]*?<\/html>/i, '');
    
    // Remove headers with various class names
    content = content.replace(/\s*<header[^>]*>[\s\S]*?<\/header>/gi, '');
    
    // Remove all navigation elements
    content = content.replace(/\s*<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
    
    // Remove footers with various class names
    content = content.replace(/\s*<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
    
    // Remove site-specific elements by class or ID
    [
      'site-header', 'header-container', 'main-nav', 'mobile-nav',
      'footer', 'site-footer', 'copyright', 'menu', 'search',
      'sidebar', 'newsletter', 'social-media',
      'cookie-notice', 'banner'
    ].forEach(selector => {
      const classRegex = new RegExp(`\\s*<[^>]*class=[^>]*${selector}[^>]*>[\\s\\S]*?<\\/[^>]*>`, 'gi');
      const idRegex = new RegExp(`\\s*<[^>]*id=[^>]*${selector}[^>]*>[\\s\\S]*?<\\/[^>]*>`, 'gi');
      content = content.replace(classRegex, '');
      content = content.replace(idRegex, '');
    });
  }
  
  // 2. Final cleanup regardless of extraction method
  
  // Remove any remaining scripts
  content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
  
  // Remove style tags
  content = content.replace(/<style[\s\S]*?<\/style>/gi, '');
  
  // Remove comments
  content = content.replace(/<!--[\s\S]*?-->/g, '');
  
  // Remove meta tags
  content = content.replace(/<meta[^>]*>/gi, '');
  
  // Remove link tags
  content = content.replace(/<link[^>]*>/gi, '');
  
  // Remove title tags
  content = content.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '');
  
  // Log that we've cleaned the content (for debugging)
  console.log('Content cleaned of headers/footers and site-specific elements');
  
  // Clean up any duplicate line breaks
  content = content.replace(/\n\s*\n/g, '\n');
  
  return content;
}

// Process each episode
async function processEpisodes() {
  console.log('Starting episode content synchronization...');
  
  // Track successfully downloaded episodes
  const downloadedEpisodes = [];
  const processedPaths = new Set(); // Track which output files we've already processed
  
  for (const episode of config.episodes) {
    // Skip if we've already processed this output file
    if (processedPaths.has(episode.output)) {
      continue;
    }
    
    try {
      console.log(`Attempting to download ${episode.path}...`);
      const html = await downloadContent(episode.path);
      
      console.log(`Processing ${episode.output}...`);
      const cleanContent = extractMainContent(html);
      
      // Save to file
      const outputPath = path.join(config.outputDir, episode.output);
      fs.writeFileSync(outputPath, cleanContent);
      
      // Add to successful downloads and mark as processed
      downloadedEpisodes.push({
        name: path.basename(episode.output, '.html'),
        path: outputPath,
        url: episode.path
      });
      processedPaths.add(episode.output);
      
      console.log(`\u2705 Saved ${outputPath}`);
    } catch (error) {
      // Just skip episodes that don't exist
      console.log(`\u26A0 Episode not found at ${episode.path}`);
    }
  }
  
  // Create episodes index with the episodes we found
  if (downloadedEpisodes.length > 0) {
    console.log(`\n\u2705 Found ${downloadedEpisodes.length} episodes`);
    
    // Create an index file for all episodes
    const episodesIndexContent = `<div class="episodes-container">
  <h1>Episodes</h1>
  <p>Select an episode to view:</p>
  <ul>
    ${downloadedEpisodes.map(ep => 
      `<li><a href="./episodes/${ep.name}.html">${ep.name}</a></li>`
    ).join('\n    ')}
  </ul>
</div>`;
    
    fs.writeFileSync(config.mainOutputFile, episodesIndexContent);
    console.log(`\u2705 Created episodes index: ${config.mainOutputFile}`);
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
    
    fs.writeFileSync(config.mainOutputFile, episodesContent);
    console.log(`\u2705 Created episodes placeholder: ${config.mainOutputFile}`);
  }
  
  console.log('\nEpisode content synchronization complete!');
  console.log(`Check ${config.outputDir} for individual episode files.`);
}

// Run the script
processEpisodes().catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
});
