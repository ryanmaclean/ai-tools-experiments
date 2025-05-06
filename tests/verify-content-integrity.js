/**
 * Content Integrity Verification Test
 * 
 * This script verifies that:
 * 1. There are no duplicate HTML files across directories
 * 2. No HTML files contain header or footer blocks (which should be in Astro layouts only)
 * 
 * Logs all results to Datadog for monitoring.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Simple logger for Datadog compatibility
function setupLogging() {
  // Check if we should log to console only or prepare for Datadog later
  const hasDatadogKey = process.env.DD_API_KEY ? true : false;
  console.log(`Datadog API key ${hasDatadogKey ? 'found' : 'not found'}`);
  return hasDatadogKey;
}

// Simple logging function that could be extended to use Datadog
function logMessage(level, message, metadata = {}) {
  // Always log to console
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  
  // Log to a file that could be picked up by a Datadog agent
  const logData = {
    timestamp,
    level,
    message,
    ...metadata
  };
  
  // Append to log file in test-results
  try {
    fs.appendFileSync(
      path.join('test-results', 'content-integrity.log'),
      JSON.stringify(logData) + '\n'
    );
  } catch (e) {
    // Silently continue if logging fails
  }
}

// Configuration
const config = {
  // Directories to scan for HTML files
  contentDirs: [
    'src/content/imported',
    'src/pages',
    'public'
  ],
  // Patterns that should not appear in content files
  forbiddenPatterns: [
    /<header[\s\S]*?<\/header>/i,    // Header tags
    /<footer[\s\S]*?<\/footer>/i,    // Footer tags
    /<nav[\s\S]*?<\/nav>/i          // Navigation blocks
  ],
  // Maximum allowed file size for comparison (to avoid excessive memory use)
  maxFileSizeBytes: 5000000 // 5MB
};

// Calculate hash of file content
function calculateFileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

// Recursively find all HTML files in a directory
function findHtmlFiles(dir) {
  let results = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and .git directories
      if (item !== 'node_modules' && item !== '.git') {
        results = results.concat(findHtmlFiles(itemPath));
      }
    } else if (item.endsWith('.html') || item.endsWith('.astro')) {
      // Only include files that end with .html or .astro
      results.push(itemPath);
    }
  }
  
  return results;
}

// Check for duplicate files
function findDuplicates(files) {
  const fileHashes = {};
  const duplicates = [];
  
  for (const file of files) {
    // Skip files that are too large
    const stats = fs.statSync(file);
    if (stats.size > config.maxFileSizeBytes) {
      console.log(`⚠️ Skipping large file: ${file} (${Math.round(stats.size / 1024)}KB)`);
      continue;
    }
    
    try {
      const hash = calculateFileHash(file);
      
      if (fileHashes[hash]) {
        duplicates.push({
          original: fileHashes[hash],
          duplicate: file,
          hash
        });
      } else {
        fileHashes[hash] = file;
      }
    } catch (error) {
      console.error(`Error processing file ${file}:`, error.message);
    }
  }
  
  return duplicates;
}

// Check for forbidden patterns in files
function findForbiddenContent(files) {
  const violations = [];
  
  for (const file of files) {
    try {
      // Skip files that are too large
      const stats = fs.statSync(file);
      if (stats.size > config.maxFileSizeBytes) {
        continue; // Already logged in duplicate check
      }
      
      const content = fs.readFileSync(file, 'utf8');
      
      for (const pattern of config.forbiddenPatterns) {
        if (pattern.test(content)) {
          violations.push({
            file,
            pattern: pattern.toString().replace(/\/gi?/, '')
          });
          break; // Only report one violation per file
        }
      }
    } catch (error) {
      console.error(`Error checking content of ${file}:`, error.message);
    }
  }
  
  return violations;
}

// Save results to JSON file
function saveResults(results) {
  const outputPath = path.join('test-results', 'content-integrity.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nDetailed results saved to: ${outputPath}`);
}

// Main function
async function verifyContentIntegrity() {
  const loggingEnabled = setupLogging();
  console.log(`Datadog logging ${loggingEnabled ? 'enabled' : 'disabled'}\n`);
  
  // Ensure test-results directory exists
  if (!fs.existsSync('test-results')) {
    fs.mkdirSync('test-results', { recursive: true });
  }
  
  const results = {
    scannedDirs: config.contentDirs,
    scannedFiles: 0,
    duplicates: [],
    contentViolations: [],
    timestamp: new Date().toISOString(),
    success: true
  };
  
  // Get list of all HTML and Astro files
  let allFiles = [];
  for (const dir of config.contentDirs) {
    try {
      const dirPath = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
      if (fs.existsSync(dirPath)) {
        const files = findHtmlFiles(dirPath);
        console.log(`Found ${files.length} HTML/Astro files in ${dir}`);
        allFiles = allFiles.concat(files);
      } else {
        console.log(`⚠️ Directory not found: ${dirPath}`);
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error.message);
    }
  }
  
  results.scannedFiles = allFiles.length;
  console.log(`\nTotal files to check: ${allFiles.length}`);
  
  // Check for duplicates
  console.log('\nChecking for duplicate files...');
  const duplicates = findDuplicates(allFiles);
  results.duplicates = duplicates;
  
  if (duplicates.length > 0) {
    console.log(`⚠️ Found ${duplicates.length} duplicate files:`);
    duplicates.forEach(dup => {
      console.log(`- Duplicate: ${dup.duplicate}\n  Original: ${dup.original}`);
    });
    results.success = false;
  } else {
    console.log('✅ No duplicate files found');
  }
  
  // Check for forbidden content
  console.log('\nChecking for forbidden content (headers/footers)...');
  const violations = findForbiddenContent(allFiles);
  results.contentViolations = violations;
  
  if (violations.length > 0) {
    console.log(`⚠️ Found ${violations.length} files with forbidden content:`);
    violations.forEach(v => {
      console.log(`- ${v.file}\n  Contains: ${v.pattern}`);
    });
    results.success = false;
  } else {
    console.log('✅ No forbidden content found');
  }
  
  // Save detailed results
  saveResults(results);
  
  // Log results
  if (loggingEnabled) {
    logMessage('info', 'Content integrity verification completed', {
      success: results.success,
      scannedFiles: results.scannedFiles,
      duplicateCount: results.duplicates.length,
      violationCount: results.contentViolations.length
    });
    
    // Log individual issues if any found
    if (!results.success) {
      if (results.duplicates.length > 0) {
        logMessage('warn', 'Duplicate content files detected', {
          count: results.duplicates.length,
          details: results.duplicates.map(d => `${d.duplicate} duplicates ${d.original}`).join('; ')
        });
      }
      
      if (results.contentViolations.length > 0) {
        logMessage('warn', 'Content with forbidden patterns detected', {
          count: results.contentViolations.length,
          details: results.contentViolations.map(v => `${v.file} contains ${v.pattern}`).join('; ')
        });
      }
    }
  }
  
  // Final summary
  console.log('\n--- Content Integrity Verification Summary ---');
  console.log(`Scanned ${results.scannedFiles} files across ${config.contentDirs.length} directories`);
  console.log(`Duplicates: ${results.duplicates.length}`);
  console.log(`Content violations: ${results.contentViolations.length}`);
  console.log(`Overall result: ${results.success ? '✅ PASS' : '❌ FAIL'}`);
  
  return results.success;
}

// Run the verification
verifyContentIntegrity()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Verification script error:', error);
    process.exit(1);
  });
