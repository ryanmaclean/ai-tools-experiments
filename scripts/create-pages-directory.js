/**
 * Script to create a proper /pages directory structure for Netlify deployment
 * This ensures both test and production environments use identical URL patterns
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Simple logger that also logs to console for visibility
const logger = {
  info: (message) => {
    console.log(`[INFO] ${message}`);
    // Add Datadog logging here if needed in the future
  },
  error: (message) => {
    console.error(`[ERROR] ${message}`);
    // Add Datadog logging here if needed in the future
  }
};

// Paths
const DIST_DIR = path.join(__dirname, '../dist');
const PAGES_DIR = path.join(DIST_DIR, 'pages');
const EPISODES_DIR = path.join(DIST_DIR, 'episodes');

// Ensure directories exist
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.info(`Created directory: ${dirPath}`);
  }
}

// Copy files with proper structure
function copyFiles() {
  try {
    // 1. Create pages directory
    ensureDirectoryExists(PAGES_DIR);

    // 2. Copy main content pages to /pages directory (about, resources, observations)
    const mainPages = ['about.html', 'resources.html', 'observations.html'];
    logger.info('Copying main content pages to /pages directory...');
    
    mainPages.forEach(page => {
      const sourcePath = path.join(DIST_DIR, page);
      const targetPath = path.join(PAGES_DIR, page);
      
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, targetPath);
        logger.info(`✅ Copied ${page} to /pages directory`);
      } else {
        logger.error(`❌ Source file not found: ${sourcePath}`);
      }
    });

    // 3. Copy index.html to pages directory
    const indexSource = path.join(DIST_DIR, 'index.html');
    const indexTarget = path.join(PAGES_DIR, 'index.html');
    
    if (fs.existsSync(indexSource)) {
      fs.copyFileSync(indexSource, indexTarget);
      logger.info('✅ Copied index.html to /pages directory');
    } else {
      logger.error(`❌ Index file not found: ${indexSource}`);
    }

    // 4. Handle episodes - create /pages/epXX structure
    logger.info('Setting up episode content with /pages/epXX structure...');
    
    // Create /pages directories for episodes
    for (let i = 1; i <= 20; i++) {
      const paddedNum = i.toString().padStart(2, '0');
      const episodePage = `ep${paddedNum}`;
      const episodePageDir = path.join(PAGES_DIR, episodePage);
      ensureDirectoryExists(episodePageDir);
      
      // First check if we have the proper episode HTML file
      const episodeSource = path.join(EPISODES_DIR, `${episodePage}.html`);
      const episodeTarget = path.join(episodePageDir, 'index.html');
      
      if (fs.existsSync(episodeSource)) {
        fs.copyFileSync(episodeSource, episodeTarget);
        logger.info(`✅ Created /pages/${episodePage}/index.html from episode content`);
      } else {
        // Use placeholder if not available
        const placeholderContent = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Episode ${paddedNum} | AI Tools Lab</title>
          </head>
          <body>
            <main>
              <div class="episode-content">
                <h1>Episode ${paddedNum}: Coming Soon</h1>
                <p>This episode content will be available soon.</p>
                <p>This is a placeholder for episode ${paddedNum}.</p>
              </div>
            </main>
          </body>
          </html>
        `;
        
        fs.writeFileSync(episodeTarget, placeholderContent);
        logger.info(`⚠️ Created placeholder for /pages/${episodePage}/index.html`);
      }
    }

    logger.info('✅ Finished setting up /pages directory structure');
    return true;
  } catch (error) {
    logger.error(`❌ Error creating pages directory structure: ${error.message}`);
    console.error(error);
    return false;
  }
}

// Run the script
copyFiles();
