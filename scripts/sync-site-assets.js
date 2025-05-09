#!/usr/bin/env node

/**
 * Site Asset Synchronization Script
 * 
 * Downloads all assets (HTML, CSS, JS, images) from the production site
 * using wget mirroring capabilities.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  source: 'ai-tools-lab.com',
  outputDir: path.join(__dirname, '../public'),
  tempDir: path.join(__dirname, '../.mirror-temp'),
  wgetOptions: [
    '--mirror',                  // Mirror the site structure
    '--convert-links',           // Convert links to local
    '--adjust-extension',        // Add .html where needed
    '--page-requisites',         // Get JS, CSS, images needed for pages
    '--no-parent',               // Don't follow links to parent directory
    '--no-host-directories',     // Don't create host directory
    '--include-directories=/pages,/images,/styles,/scripts,/js', // Include these directories
    '--accept=html,css,js,jpg,jpeg,png,gif,webp,ico,svg,woff,woff2,ttf,eot', // Get these file types
    '--tries=3',                 // Retry 3 times
    '--wait=1',                  // Wait 1 second between retrievals
    '--random-wait',             // Add random wait to avoid overloading server
    '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36"',
    '--no-check-certificate',    // Don't check SSL certificates (for local testing)
  ]
};

// Simple logger with colors
const logger = {
  info: (message) => console.log(`\x1b[34m[INFO]\x1b[0m ${message}`),
  success: (message) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${message}`),
  error: (message) => console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`),
  warning: (message) => console.log(`\x1b[33m[WARNING]\x1b[0m ${message}`)
};

/**
 * Ensure directories exist
 */
function ensureDirectories() {
  if (!fs.existsSync(config.tempDir)) {
    fs.mkdirSync(config.tempDir, { recursive: true });
    logger.info(`Created temporary directory: ${config.tempDir}`);
  }
  
  // Make sure output directory exists
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
    logger.info(`Created output directory: ${config.outputDir}`);
  }
}

/**
 * Download all site assets using wget
 */
function downloadSiteAssets() {
  try {
    logger.info(`Starting download of all assets from ${config.source}...`);
    
    // Change to temp directory
    process.chdir(config.tempDir);
    
    // Build wget command
    const wgetCommand = `wget ${config.wgetOptions.join(' ')} https://${config.source}`;
    
    // Execute wget command
    logger.info(`Executing: ${wgetCommand}`);
    execSync(wgetCommand, { stdio: 'inherit' });
    
    logger.success('Download completed successfully');
    return true;
  } catch (error) {
    logger.error(`Error downloading assets: ${error.message}`);
    return false;
  }
}

/**
 * Copy assets to public directory with proper structure
 */
function copyAssetsToPublic() {
  try {
    logger.info('Copying assets to public directory...');
    
    // Copy specific asset types to their respective directories
    
    // 1. CSS files
    const cssFiles = findFiles(config.tempDir, ['.css']);
    for (const file of cssFiles) {
      const targetPath = path.join(config.outputDir, path.basename(file));
      fs.copyFileSync(file, targetPath);
      logger.info(`Copied CSS: ${path.basename(file)}`);
    }
    
    // 2. JavaScript files
    const jsFiles = findFiles(config.tempDir, ['.js']);
    const jsDir = path.join(config.outputDir, 'js');
    if (!fs.existsSync(jsDir)) fs.mkdirSync(jsDir, { recursive: true });
    
    for (const file of jsFiles) {
      const targetPath = path.join(jsDir, path.basename(file));
      fs.copyFileSync(file, targetPath);
      logger.info(`Copied JS: ${path.basename(file)}`);
    }
    
    // 3. Image files
    const imageFiles = findFiles(config.tempDir, ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']);
    const imgDir = path.join(config.outputDir, 'images');
    if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
    
    for (const file of imageFiles) {
      const targetPath = path.join(imgDir, path.basename(file));
      fs.copyFileSync(file, targetPath);
      logger.info(`Copied image: ${path.basename(file)}`);
    }
    
    // 4. Font files
    const fontFiles = findFiles(config.tempDir, ['.woff', '.woff2', '.ttf', '.eot']);
    const fontDir = path.join(config.outputDir, 'fonts');
    if (!fs.existsSync(fontDir)) fs.mkdirSync(fontDir, { recursive: true });
    
    for (const file of fontFiles) {
      const targetPath = path.join(fontDir, path.basename(file));
      fs.copyFileSync(file, targetPath);
      logger.info(`Copied font: ${path.basename(file)}`);
    }
    
    // 5. Favicon
    const faviconFiles = findFiles(config.tempDir, ['.ico']);
    for (const file of faviconFiles) {
      const targetPath = path.join(config.outputDir, path.basename(file));
      fs.copyFileSync(file, targetPath);
      logger.info(`Copied favicon: ${path.basename(file)}`);
    }
    
    logger.success('Assets copied to public directory successfully');
    return true;
  } catch (error) {
    logger.error(`Error copying assets: ${error.message}`);
    return false;
  }
}

/**
 * Find files with specific extensions in a directory (recursive)
 */
function findFiles(directory, extensions) {
  let results = [];
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Recursively search subdirectories
      results = results.concat(findFiles(filePath, extensions));
    } else {
      // Check if file has one of the target extensions
      const ext = path.extname(file).toLowerCase();
      if (extensions.includes(ext)) {
        results.push(filePath);
      }
    }
  }
  
  return results;
}

/**
 * Clean up temporary files
 */
function cleanUp() {
  try {
    logger.info('Cleaning up temporary files...');
    fs.rmSync(config.tempDir, { recursive: true, force: true });
    logger.success('Temporary files removed successfully');
    return true;
  } catch (error) {
    logger.warning(`Error cleaning up temp files: ${error.message}`);
    return false;
  }
}

/**
 * Main function to run the script
 */
async function main() {
  try {
    // Initial setup
    logger.info('Starting site asset synchronization');
    
    // 1. Ensure directories exist
    ensureDirectories();
    
    // 2. Download all site assets using wget
    if (!downloadSiteAssets()) {
      throw new Error('Asset download failed');
    }
    
    // 3. Copy assets to public directory
    if (!copyAssetsToPublic()) {
      throw new Error('Asset copying failed');
    }
    
    // 4. Clean up temporary files
    cleanUp();
    
    logger.success('Site asset synchronization completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error(`Site asset synchronization failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main().catch(error => {
    logger.error(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}

// Export functions for testing
module.exports = {
  downloadSiteAssets,
  copyAssetsToPublic,
  findFiles
};
