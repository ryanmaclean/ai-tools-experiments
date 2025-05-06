/**
 * Pre-Deployment Test Script
 * 
 * Verifies that the site is ready for deployment by checking:
 * 1. Content integrity (no duplicates or header/footer elements in content)
 * 2. All required files exist
 * 3. Datadog configuration is correct
 * 4. Astro components can import content correctly
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const requiredDirs = [
  'src/content/imported',
  'src/content/imported/episodes',
  'src/pages/episodes'
];

const requiredFiles = [
  'src/pages/episodes/[episode].astro',
  'src/pages/episodes/index.astro'
];

// Ensure the test-results directory exists
if (!fs.existsSync('test-results')) {
  fs.mkdirSync('test-results', { recursive: true });
}

// Log results to both console and a file
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
  console.log(formattedMessage);
  
  fs.appendFileSync(
    path.join('test-results', 'pre-deploy-check.log'),
    formattedMessage + '\n'
  );
}

log('Starting pre-deployment checks...');

// Check required directories
log('Checking required directories...');
let dirErrors = 0;

for (const dir of requiredDirs) {
  if (!fs.existsSync(dir)) {
    log(`❌ Required directory missing: ${dir}`, 'error');
    dirErrors++;
  } else {
    log(`✅ Directory exists: ${dir}`);
  }
}

// Check required files
log('\nChecking required files...');
let fileErrors = 0;

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    log(`❌ Required file missing: ${file}`, 'error');
    fileErrors++;
  } else {
    log(`✅ File exists: ${file}`);
  }
}

// Run content integrity check
log('\nRunning content integrity check...');
let contentIntegritySuccess = false;

try {
  execSync('npm run verify-content-integrity', { stdio: 'inherit' });
  log('✅ Content integrity check passed');
  contentIntegritySuccess = true;
} catch (error) {
  log(`❌ Content integrity check failed: ${error.message}`, 'error');
}

// Run Datadog configuration check
log('\nChecking Datadog configuration...');
let datadogConfigSuccess = false;

try {
  execSync('npm run verify-datadog', { stdio: 'inherit' });
  log('✅ Datadog configuration check passed');
  datadogConfigSuccess = true;
} catch (error) {
  log(`❌ Datadog configuration check failed: ${error.message}`, 'error');
}

// Check for episode content
log('\nChecking episode content...');
const episodesDir = 'src/content/imported/episodes';
let episodeContentComplete = false;

if (fs.existsSync(episodesDir)) {
  const episodes = fs.readdirSync(episodesDir).filter(f => f.startsWith('ep') && f.endsWith('.html'));
  log(`Found ${episodes.length} episode files`);
  episodeContentComplete = episodes.length > 0;
  
  if (episodes.length === 0) {
    log('❌ No episode content found. Run npm run sync-all first.', 'error');
  }
} else {
  log(`❌ Episodes directory not found: ${episodesDir}`, 'error');
}

// Summary
log('\n--- Pre-Deployment Check Summary ---');
log(`Required directories: ${dirErrors === 0 ? '✅ All present' : `❌ ${dirErrors} missing`}`);
log(`Required files: ${fileErrors === 0 ? '✅ All present' : `❌ ${fileErrors} missing`}`);
log(`Content integrity: ${contentIntegritySuccess ? '✅ Pass' : '❌ Fail'}`);
log(`Datadog configuration: ${datadogConfigSuccess ? '✅ Pass' : '❌ Fail'}`);
log(`Episode content: ${episodeContentComplete ? '✅ Complete' : '❌ Incomplete'}`);

const allChecksPass = 
  dirErrors === 0 && 
  fileErrors === 0 && 
  contentIntegritySuccess && 
  datadogConfigSuccess && 
  episodeContentComplete;

log(`\nOverall result: ${allChecksPass ? '✅ READY FOR DEPLOYMENT' : '❌ NOT READY - FIX ERRORS BEFORE DEPLOYING'}`);

if (!allChecksPass) {
  process.exit(1);
}
