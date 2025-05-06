/**
 * Complete Content Synchronization Script
 * 
 * Downloads all pages and episodes from production and prepares them for Astro import:
 * - Removes headers and footers from all content
 * - Organizes content for easy Astro imports
 * - Ensures navigation consistency
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  source: 'ai-tools-lab.com',
  outputDir: 'src/content/imported',
  // Main pages
  pages: [
    { path: '/pages/', output: 'home.html', title: 'Home' },
    { path: '/pages/resources', output: 'resources.html', title: 'Resources' },
    { path: '/pages/observations', output: 'observations.html', title: 'Observations' },
    { path: '/pages/about', output: 'about.html', title: 'About' },
  ],
  // Episodes - Generate dynamically for all episodes from ep01 to ep20
  episodes: Array.from({ length: 20 }, (_, i) => {
    const num = i + 1;
    const paddedNum = num.toString().padStart(2, '0');
    return {
      path: `/pages/ep${paddedNum}.html`, 
      output: `ep${paddedNum}.html`, 
      title: `Episode ${num}`
    };
  })
};

// Ensure output directories exist
function ensureDirectories() {
  // Main directory
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
    console.log(`Created directory: ${config.outputDir}`);
  }
  
  // Episodes directory
  const episodesDir = path.join(config.outputDir, 'episodes');
  if (!fs.existsSync(episodesDir)) {
    fs.mkdirSync(episodesDir, { recursive: true });
    console.log(`Created directory: ${episodesDir}`);
  }
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
  
  // Remove navigation
  content = content.replace(/\s*<nav[\s\S]*?<\/nav>/gi, '');
  
  // Remove footer
  content = content.replace(/\s*<footer[\s\S]*?<\/footer>/gi, '');
  
  // Clean up any script tags (optional)
  content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
  
  return content;
}

// Process main pages
async function processMainPages() {
  console.log('\nProcessing main pages...');
  const downloadedPages = [];
  
  for (const page of config.pages) {
    try {
      console.log(`Downloading ${page.path}...`);
      const html = await downloadContent(page.path);
      
      console.log(`Processing ${page.output}...`);
      const cleanContent = extractMainContent(html);
      
      // Save to file
      const outputPath = path.join(config.outputDir, page.output);
      fs.writeFileSync(outputPath, cleanContent);
      
      downloadedPages.push({
        name: path.basename(page.output, '.html'),
        title: page.title,
        path: outputPath
      });
      
      console.log(`\u2705 Saved ${outputPath}`);
    } catch (error) {
      console.error(`\u274c Error processing ${page.path}:`, error.message);
    }
  }
  
  return downloadedPages;
}

// Process episode pages
async function processEpisodes() {
  console.log('\nProcessing episodes...');
  const downloadedEpisodes = [];
  
  for (const episode of config.episodes) {
    try {
      console.log(`Downloading ${episode.path}...`);
      const html = await downloadContent(episode.path);
      
      console.log(`Processing ${episode.output}...`);
      const cleanContent = extractMainContent(html);
      
      // Save to file in episodes directory
      const outputPath = path.join(config.outputDir, 'episodes', episode.output);
      fs.writeFileSync(outputPath, cleanContent);
      
      downloadedEpisodes.push({
        name: path.basename(episode.output, '.html'),
        title: episode.title,
        path: outputPath
      });
      
      console.log(`\u2705 Saved ${outputPath}`);
    } catch (error) {
      console.error(`\u274c Error processing ${episode.path}:`, error.message);
    }
  }
  
  // Create episodes index
  if (downloadedEpisodes.length > 0) {
    console.log(`\u2705 Found ${downloadedEpisodes.length} episodes`);
    
    // Create an index file for all episodes
    const episodesIndexContent = `<div class="episodes-container">
  <h1>Episodes</h1>
  <p>Select an episode to view:</p>
  <ul>
    ${downloadedEpisodes.map(ep => 
      `<li><a href="/episodes/${ep.name}">${ep.title}</a></li>`
    ).join('\n    ')}
  </ul>
</div>`;
    
    const indexPath = path.join(config.outputDir, 'episodes.html');
    fs.writeFileSync(indexPath, episodesIndexContent);
    console.log(`\u2705 Created episodes index: ${indexPath}`);
  }
  
  return downloadedEpisodes;
}

// Generate Astro route templates
function generateAstroRoutes(pages, episodes) {
  console.log('\nGenerating Astro route templates...');
  const astroTemplatesDir = path.join('src', 'pages');
  
  if (!fs.existsSync(astroTemplatesDir)) {
    fs.mkdirSync(astroTemplatesDir, { recursive: true });
  }
  
  // Generate main page templates
  for (const page of pages) {
    if (page.name === 'home') {
      continue; // Skip home page as it's handled separately
    }
    
    const template = `---
// src/pages/${page.name}.astro
import MainLayout from '../layouts/MainLayout.astro';
import { readFile } from 'node:fs/promises';

// Import content directly
const htmlContent = await import('../content/imported/${page.name}.html?raw');
---

<MainLayout title="${page.title} | AI Tools Lab">
  <div set:html={htmlContent.default} />
</MainLayout>`;
    
    // Don't actually write the file, just show the template
    console.log(`Template for ${page.name}.astro:`);
    console.log('----------------------------------');
    console.log(template);
    console.log('----------------------------------\n');
  }
  
  // Generate episode dynamic route template
  const episodeTemplate = `---
// src/pages/episodes/[episode].astro
import MainLayout from '../../layouts/MainLayout.astro';

export function getStaticPaths() {
  return [
    ${episodes.map(ep => `{ params: { episode: '${ep.name}' } }`).join(',\n    ')}
  ];
}

const { episode } = Astro.params;
const content = await import('../../content/imported/episodes/' + episode + '.html?raw');
---

<MainLayout title="Episode | AI Tools Lab">
  <div set:html={content.default} />
</MainLayout>`;

  console.log('Template for episodes/[episode].astro:');
  console.log('----------------------------------');
  console.log(episodeTemplate);
  console.log('----------------------------------');
}

// Main function to run everything
async function syncAllContent() {
  console.log('Starting content synchronization...');
  
  // Setup directories
  ensureDirectories();
  
  // Process content
  const pages = await processMainPages();
  const episodes = await processEpisodes();
  
  // Generate templates
  generateAstroRoutes(pages, episodes);
  
  console.log('\nContent synchronization complete!');
  console.log('All content has been downloaded and processed.');
  console.log(`Main pages: ${config.outputDir}/*.html`);
  console.log(`Episodes: ${config.outputDir}/episodes/*.html`);
}

// Run the script
syncAllContent().catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
});
