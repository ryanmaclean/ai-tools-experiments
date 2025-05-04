#!/usr/bin/env node

/**
 * Build Tools Benchmark Script
 * 
 * This script compares performance of various build tools across architectures
 * to help determine the best option for our project requirements.
 * 
 * Enhanced with Datadog error logging and improved Rspack support
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const util = require('util');

// Import error logger if available
let errorLogger;
try {
  errorLogger = require('../utils/datadog-error-logger');
} catch (error) {
  console.warn('Datadog error logger not available. Using standard error handling.');
  errorLogger = null;
}

// Promisify exec for async/await usage
const execPromise = util.promisify(exec);

// ANSI colors for output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Configuration
const CONFIG = {
  outputFile: 'build-tools-benchmark-results.json',
  tempDir: path.join(os.tmpdir(), 'build-tools-benchmark'),
  iterations: 3, // Run each test multiple times to get average
  testFiles: 100, // Number of test files to generate
  testsPerFile: 10 // Number of simple components per file
};

// Build tools to test
const BUILD_TOOLS = [
  {
    name: 'esbuild',
    install: 'npm install --no-save esbuild',
    buildCmd: 'node ./node_modules/.bin/esbuild src/index.js --bundle --outfile=dist/bundle.js',
    category: 'Fast bundlers (non-JS)',
    architecture: ['x64', 'arm64']
  },
  {
    name: 'webpack',
    install: 'npm install --no-save webpack webpack-cli',
    configSetup: createWebpackConfig,
    buildCmd: 'node ./node_modules/.bin/webpack --mode production',
    category: 'Traditional bundlers',
    architecture: ['x64', 'arm64']
  },
  {
    name: 'rollup',
    install: 'npm install --no-save rollup @rollup/plugin-node-resolve @rollup/plugin-commonjs',
    configSetup: createRollupConfig,
    buildCmd: 'node ./node_modules/.bin/rollup -c',
    category: 'Traditional bundlers',
    architecture: ['x64', 'arm64']
  },
  {
    name: 'vite',
    install: 'npm install --no-save vite',
    buildCmd: 'node ./node_modules/.bin/vite build',
    configSetup: createViteConfig,
    category: 'Modern dev tools',
    architecture: ['x64', 'arm64']
  },
  {
    name: 'rolldown',
    install: 'npm install --no-save @rolldown/node',
    configSetup: createRolldownConfig,
    buildCmd: 'node -e "const { rolldown } = require(\'@rolldown/node\'); rolldown({ input: \'src/index.js\', output: { file: \'dist/bundle.js\', format: \'iife\' } }).then(() => console.log(\'Rolldown build complete\'))"',
    category: 'Rust-based bundlers',
    architecture: ['x64', 'arm64']
  },
  // rspack/rsbuild requires a bit more setup so including conditionally below
];

// Try to add Rust-based tools if available (may not work on all systems)
try {
  // Check if we can install rspack which is newer
  execSync('npm info @rspack/core version', { stdio: 'ignore' });
  
  BUILD_TOOLS.push({
    name: 'rspack',
    install: 'npm install --no-save @rspack/core @rspack/cli',
    configSetup: createRspackConfig,
    buildCmd: 'node ./node_modules/.bin/rspack build',
    category: 'Rust-based bundlers',
    architecture: ['x64', 'arm64']
  });
} catch (e) {
  // Rspack not available, skip it
}

// Build results
const results = {
  environment: {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    cpus: os.cpus().length,
    memory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + ' GB',
    date: new Date().toISOString()
  },
  tools: {},
  summary: ''
};

// Logging utility
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  let color = COLORS.reset;
  
  switch (type) {
    case 'error':
      color = COLORS.red;
      break;
    case 'success':
      color = COLORS.green;
      break;
    case 'warning':
      color = COLORS.yellow;
      break;
    case 'info':
      color = COLORS.blue;
      break;
    case 'result':
      color = COLORS.magenta;
      break;
    case 'highlight':
      color = COLORS.cyan;
      break;
  }
  
  console.log(`${color}[${timestamp}] ${message}${COLORS.reset}`);
}

// Create webpack config file
function createWebpackConfig() {
  const configContent = `
module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: require('path').resolve(__dirname, 'dist'),
  },
  mode: 'production',
};
`;

  fs.writeFileSync('webpack.config.js', configContent);
}

// Create rollup config file
function createRollupConfig() {
  const configContent = `
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/bundle.js',
    format: 'iife',
  },
  plugins: [nodeResolve(), commonjs()]
};
`;

  fs.writeFileSync('rollup.config.js', configContent);
}

// Create rspack config file
function createRspackConfig() {
  const configContent = `
module.exports = {
  entry: {
    main: './src/index.js'
  },
  output: {
    filename: 'bundle.js',
    path: require('path').resolve(__dirname, 'dist'),
  },
  mode: 'production',
};
`;

  fs.writeFileSync('rspack.config.js', configContent);
}

// Create vite config file
function createViteConfig() {
  const configContent = `
export default {
  build: {
    lib: {
      entry: 'src/index.js',
      formats: ['iife'],
      name: 'bundle',
      fileName: 'bundle'
    },
    outDir: 'dist'
  }
};
`;

  fs.writeFileSync('vite.config.js', configContent);
}

// Create rolldown config file
function createRolldownConfig() {
  const configContent = `
module.exports = {
  input: 'src/index.js',
  output: {
    file: 'dist/bundle.js',
    format: 'iife'
  }
};
`;

  fs.writeFileSync('rolldown.config.js', configContent);
}

// Generate test files
function generateTestFiles() {
  log('Generating test files...');
  
  // Create src directory
  if (!fs.existsSync('src')) {
    fs.mkdirSync('src', { recursive: true });
  }
  
  // Create component files
  for (let i = 1; i <= CONFIG.testFiles; i++) {
    const componentContent = generateComponentFile(i);
    fs.writeFileSync(`src/component${i}.js`, componentContent);
  }
  
  // Create index file that imports all components
  let indexContent = '';
  
  for (let i = 1; i <= CONFIG.testFiles; i++) {
    indexContent += `import { Component${i} } from './component${i}.js';\n`;
  }
  
  indexContent += '\n// Initialize components\n';
  indexContent += 'const components = [\n';
  
  for (let i = 1; i <= CONFIG.testFiles; i++) {
    indexContent += `  Component${i},\n`;
  }
  
  indexContent += '];\n\n';
  indexContent += 'export default components;\n';
  
  fs.writeFileSync('src/index.js', indexContent);
  
  log(`Generated ${CONFIG.testFiles} test files with ${CONFIG.testFiles * CONFIG.testsPerFile} components`, 'success');
}

// Generate a single component file
function generateComponentFile(fileIndex) {
  let content = '';
  
  for (let i = 1; i <= CONFIG.testsPerFile; i++) {
    const componentIndex = (fileIndex - 1) * CONFIG.testsPerFile + i;
    content += `
// Component definition ${componentIndex}
class ComponentImpl${componentIndex} {
  constructor(name = 'Component ${componentIndex}') {
    this.name = name;
    this.initialized = false;
    this.data = {
      id: ${componentIndex},
      createdAt: new Date(),
      properties: {
        visible: true,
        position: { x: ${Math.random() * 100}, y: ${Math.random() * 100} },
        dimensions: { width: ${Math.random() * 200 + 100}, height: ${Math.random() * 200 + 100} }
      }
    };
  }

  initialize() {
    this.initialized = true;
    return this;
  }

  render() {
    return \`<div class="component" data-id="\${this.data.id}">\${this.name}</div>\`;
  }

  getData() {
    return this.data;
  }
}
`;
  }
  
  // Export a single component from this file
  content += `
// Export main component
export const Component${fileIndex} = new ComponentImpl${fileIndex * CONFIG.testsPerFile}().initialize();
`;
  
  return content;
}

// Setup test environment
function setupTestEnvironment() {
  log('Setting up test environment...');
  
  // Create temp directory if it doesn't exist
  if (!fs.existsSync(CONFIG.tempDir)) {
    fs.mkdirSync(CONFIG.tempDir, { recursive: true });
  }
  
  // Change to temp directory
  process.chdir(CONFIG.tempDir);
  
  // Create package.json
  const packageJson = {
    name: 'build-tools-benchmark',
    version: '1.0.0',
    description: 'Benchmark for JavaScript build tools',
    private: true
  };
  
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  
  // Create dist directory
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }
  
  log('Test environment setup complete', 'success');
}

// Run benchmark for a specific tool
async function benchmarkTool(tool) {
  log(`Benchmarking ${tool.name}...`);
  
  const toolResults = {
    name: tool.name,
    category: tool.category,
    installTime: 0,
    buildTimes: [],
    averageBuildTime: 0,
    errors: []
  };
  
  try {
    // Install the tool
    const installStartTime = Date.now();
    log(`Installing ${tool.name}...`, 'info');
    execSync(tool.install, { stdio: 'ignore' });
    toolResults.installTime = Date.now() - installStartTime;
    log(`${tool.name} installed in ${toolResults.installTime}ms`, 'success');
    
    // Setup config if needed
    if (tool.configSetup) {
      tool.configSetup();
    }
    
    // Run build multiple times
    for (let i = 1; i <= CONFIG.iterations; i++) {
      log(`Build iteration ${i}/${CONFIG.iterations}...`, 'info');
      
      const buildStartTime = Date.now();
      
      try {
        execSync(tool.buildCmd, { stdio: 'ignore' });
        const buildTime = Date.now() - buildStartTime;
        toolResults.buildTimes.push(buildTime);
        log(`Build completed in ${buildTime}ms`, 'success');
      } catch (error) {
        const buildTime = Date.now() - buildStartTime;
        toolResults.buildTimes.push(buildTime);
        toolResults.errors.push(error.message);
        log(`Build failed: ${error.message}`, 'error');
      }
    }
    
    // Calculate average build time
    if (toolResults.buildTimes.length > 0) {
      toolResults.averageBuildTime = Math.round(
        toolResults.buildTimes.reduce((sum, time) => sum + time, 0) / toolResults.buildTimes.length
      );
    }
    
    // Check if the build was successful by looking at the output
    if (fs.existsSync('dist/bundle.js')) {
      toolResults.successful = true;
      toolResults.outputSize = fs.statSync('dist/bundle.js').size;
      log(`Output bundle size: ${formatBytes(toolResults.outputSize)}`, 'info');
    } else {
      toolResults.successful = false;
      log('No output bundle found', 'error');
    }
    
  } catch (error) {
    toolResults.errors.push(error.message);
    log(`Error benchmarking ${tool.name}: ${error.message}`, 'error');
  }
  
  // Store results
  results.tools[tool.name] = toolResults;
  
  return toolResults;
}

// Format bytes to human-readable format
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Generate summary
function generateSummary() {
  log('Generating summary...', 'info');
  
  let summary = `\n${COLORS.magenta}=== Build Tools Benchmark Results ===${COLORS.reset}\n\n`;
  summary += `Platform: ${results.environment.platform} (${results.environment.arch})\n`;
  summary += `Node.js: ${results.environment.nodeVersion}\n`;
  summary += `CPUs: ${results.environment.cpus}\n`;
  summary += `Memory: ${results.environment.memory}\n\n`;
  
  // Group tools by category
  const categories = {};
  
  Object.values(results.tools).forEach(tool => {
    if (!categories[tool.category]) {
      categories[tool.category] = [];
    }
    
    categories[tool.category].push(tool);
  });
  
  // Sort tools by average build time in each category
  Object.keys(categories).forEach(category => {
    categories[category].sort((a, b) => a.averageBuildTime - b.averageBuildTime);
  });
  
  // Display results by category
  Object.keys(categories).forEach(category => {
    summary += `${COLORS.cyan}${category}:${COLORS.reset}\n`;
    
    categories[category].forEach((tool, index) => {
      const mark = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      const status = tool.successful ? `${COLORS.green}✓${COLORS.reset}` : `${COLORS.red}✗${COLORS.reset}`;
      const buildTime = tool.averageBuildTime ? `${tool.averageBuildTime}ms` : 'N/A';
      const size = tool.outputSize ? formatBytes(tool.outputSize) : 'N/A';
      
      summary += `${mark} ${status} ${tool.name.padEnd(10)} Build: ${buildTime.padEnd(8)} Bundle: ${size}\n`;
    });
    
    summary += '\n';
  });
  
  // Architecture compatibility section
  summary += `${COLORS.cyan}Architecture Compatibility:${COLORS.reset}\n`;
  summary += `Current Architecture: ${results.environment.arch}\n\n`;
  
  Object.values(results.tools).forEach(tool => {
    const compatibleArchs = BUILD_TOOLS.find(t => t.name === tool.name)?.architecture || [];
    const archInfo = compatibleArchs.map(arch => {
      if (arch === results.environment.arch) {
        return `${COLORS.green}${arch} (current)${COLORS.reset}`;
      }
      return arch;
    }).join(', ');
    
    summary += `${tool.name.padEnd(10)} Supports: ${archInfo}\n`;
  });
  
  // Performance ranking
  const allTools = Object.values(results.tools)
    .filter(tool => tool.successful)
    .sort((a, b) => a.averageBuildTime - b.averageBuildTime);
  
  if (allTools.length > 0) {
    summary += `\n${COLORS.cyan}Overall Performance Ranking:${COLORS.reset}\n`;
    
    allTools.forEach((tool, index) => {
      const mark = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const percent = index === 0 ? '100%' : `${Math.round((allTools[0].averageBuildTime / tool.averageBuildTime) * 100)}%`;
      
      summary += `${mark} ${tool.name.padEnd(10)} ${tool.averageBuildTime}ms (${percent} relative speed)\n`;
    });
  }
  
  // Save summary to results
  results.summary = summary.replace(/\x1b\[[0-9;]*m/g, ''); // Remove ANSI color codes
  
  // Display summary
  console.log(summary);
}

// Save results to file
function saveResults() {
  try {
    const originalDir = path.resolve(__dirname);
    const resultsPath = path.join(originalDir, CONFIG.outputFile);
    
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    log(`Results saved to ${resultsPath}`, 'success');
  } catch (error) {
    log(`Error saving results: ${error.message}`, 'error');
  }
}

// Main function
async function main() {
  log('Starting build tools benchmark', 'highlight');
  
  try {
    // Backup current directory
    const originalDir = process.cwd();
    
    // Setup test environment
    setupTestEnvironment();
    
    // Generate test files
    generateTestFiles();
    
    // Run benchmarks for each tool
    for (const tool of BUILD_TOOLS) {
      await benchmarkTool(tool);
    }
    
    // Generate summary
    generateSummary();
    
    // Save results
    saveResults();
    
    // Return to original directory
    process.chdir(originalDir);
    
    log('Benchmark completed', 'highlight');
    
  } catch (error) {
    log(`Unexpected error: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  log(`Unexpected error: ${error.message}`, 'error');
  process.exit(1);
});
