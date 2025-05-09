// Script to list all routes in the Astro project
const fs = require('fs');
const path = require('path');
const util = require('util');
const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);

// Define paths to check
const PAGES_DIR = path.join(__dirname, '../src/pages');

async function getFilesRecursively(dir) {
  const files = [];
  const dirents = await readdir(dir, { withFileTypes: true });
  
  for (const dirent of dirents) {
    const fullPath = path.join(dir, dirent.name);
    
    if (dirent.isDirectory()) {
      const subFiles = await getFilesRecursively(fullPath);
      files.push(...subFiles);
    } else if (fullPath.endsWith('.astro') || fullPath.endsWith('.mdx') || fullPath.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function generateRoutes() {
  const routes = [];
  const files = await getFilesRecursively(PAGES_DIR);
  
  for (const file of files) {
    // Convert file path to route
    let route = file.replace(PAGES_DIR, '').replace(/\\+/g, '/');
    
    // Handle index files
    route = route.replace(/\/index\.(astro|mdx|md)$/i, '/');
    
    // Handle other files
    route = route.replace(/\.(astro|mdx|md)$/i, '');
    
    // Handle dynamic routes
    if (route.includes('[') && route.includes(']')) {
      // Mark dynamic routes
      route = route.replace(/\[([^\]]+)\]/g, (_, param) => {
        if (param.startsWith('...')) {
          return `:${param.substring(3)}* (catch-all)`;
        }
        return `:${param} (dynamic)`;
      });
    }
    
    routes.push(route || '/');
  }
  
  return routes.sort();
}

async function main() {
  try {
    console.log('\n=== ASTRO ROUTES ===\n');
    const routes = await generateRoutes();
    
    routes.forEach(route => {
      console.log(`${route}`);
    });
    
    console.log(`\nTotal routes: ${routes.length}\n`);
  } catch (error) {
    console.error('Error listing routes:', error);
  }
}

main();
