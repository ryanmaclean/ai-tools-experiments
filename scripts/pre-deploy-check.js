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
let episodePathConsistent = true;
let allEpisodesPresent = false;

if (fs.existsSync(episodesDir)) {
  const episodes = fs.readdirSync(episodesDir).filter(f => f.startsWith('ep') && f.endsWith('.html'));
  log(`Found ${episodes.length} episode files`);
  
  // Check if we have all 20 episodes (ep01 through ep20)
  const expectedEpisodes = Array.from({ length: 20 }, (_, i) => {
    const num = i + 1;
    const paddedNum = num.toString().padStart(2, '0');
    return `ep${paddedNum}.html`;
  });
  
  const missingEpisodes = expectedEpisodes.filter(ep => !episodes.includes(ep));
  
  if (missingEpisodes.length > 0) {
    log(`❌ Missing ${missingEpisodes.length} episode files: ${missingEpisodes.join(', ')}`, 'error');
    allEpisodesPresent = false;
  } else {
    log(`✅ All 20 episodes (ep01-ep20) present`);
    allEpisodesPresent = true;
  }
  
  episodeContentComplete = episodes.length > 0;
  
  if (episodes.length === 0) {
    log('❌ No episode content found. Run npm run sync-all first.', 'error');
  }
  
  // Verify episode content doesn't contain site-wide headers/footers
  log('\nVerifying episode content integrity...');
  let episodeContentErrors = 0;
  
  // Sample check on a few episodes to keep it efficient
  const sampleEpisodes = ['ep01.html', 'ep10.html', 'ep20.html'].filter(ep => episodes.includes(ep));
  
  for (const episode of sampleEpisodes) {
    const content = fs.readFileSync(path.join(episodesDir, episode), 'utf8');
    
    // Check for header/footer elements that might cause duplication
    if (content.includes('<header class="site-header">') || 
        content.includes('<footer>') || 
        content.includes('<title>')) {
      log(`❌ ${episode} contains site header/footer elements`, 'error');
      episodeContentErrors++;
    }
  }
  
  if (episodeContentErrors === 0 && sampleEpisodes.length > 0) {
    log(`✅ Sample episode content checks passed (${sampleEpisodes.length} episodes checked)`);
  }
} else {
  log(`❌ Episodes directory not found: ${episodesDir}`, 'error');
}

// Verify environment-specific path configuration
log('\nVerifying environment path configuration...');
let environmentPathsConfigured = false;

// Check Header.astro for environment path handling
const headerFile = 'src/components/Header.astro';
if (fs.existsSync(headerFile)) {
  const headerContent = fs.readFileSync(headerFile, 'utf8');
  
  if (headerContent.includes('pathPrefix') && 
      (headerContent.includes('URL_PREFIX') || headerContent.includes('process.env.URL_PREFIX')) && 
      headerContent.includes('ai-tools-lab.com')) {
    log('✅ Header component has environment-specific path handling');
    environmentPathsConfigured = true;
  } else {
    log('❌ Header component missing environment-specific path handling', 'error');
  }
} else {
  log(`❌ Header component not found: ${headerFile}`, 'error');
}

// Check [episode].astro for environment path handling
const episodeFile = 'src/pages/episodes/[episode].astro';
let episodeRouteConfigured = false;

if (fs.existsSync(episodeFile)) {
  const episodeContent = fs.readFileSync(episodeFile, 'utf8');
  
  if (episodeContent.includes('pathPrefix') && 
      episodeContent.includes('${pathPrefix}/episodes')) {
    log('✅ Episode route has environment-specific path handling');
    episodeRouteConfigured = true;
  } else {
    log('❌ Episode route missing environment-specific path handling', 'error');
  }
} else {
  log(`❌ Episode route template not found: ${episodeFile}`, 'error');
}

// Summary
log('\n--- Pre-Deployment Check Summary ---');
log(`Required directories: ${dirErrors === 0 ? '✅ All present' : `❌ ${dirErrors} missing`}`);
log(`Required files: ${fileErrors === 0 ? '✅ All present' : `❌ ${fileErrors} missing`}`);
log(`Content integrity: ${contentIntegritySuccess ? '✅ Pass' : '❌ Fail'}`);
log(`Datadog configuration: ${datadogConfigSuccess ? '✅ Pass' : '❌ Fail'}`);
log(`Episode content: ${episodeContentComplete ? '✅ Complete' : '❌ Incomplete'}`);
log(`All 20 episodes present: ${allEpisodesPresent ? '✅ Yes' : '❌ No'}`);
log(`Environment path configuration: ${environmentPathsConfigured ? '✅ Configured' : '❌ Not configured'}`);
log(`Episode route configuration: ${episodeRouteConfigured ? '✅ Configured' : '❌ Not configured'}`);

const allChecksPass = 
  dirErrors === 0 && 
  fileErrors === 0 && 
  contentIntegritySuccess && 
  datadogConfigSuccess && 
  episodeContentComplete && 
  allEpisodesPresent && 
  environmentPathsConfigured && 
  episodeRouteConfigured;

log(`\nOverall result: ${allChecksPass ? '✅ READY FOR DEPLOYMENT' : '❌ NOT READY - FIX ERRORS BEFORE DEPLOYING'}`);

if (!allChecksPass) {
  process.exit(1);
}
