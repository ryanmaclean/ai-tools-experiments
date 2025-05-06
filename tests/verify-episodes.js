/**
 * Episode Pages Verification Script
 * 
 * Verifies that all episode pages can be loaded and that navigation works properly.
 * This script is meant to be run as part of post-deployment checks.
 */

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { datadogLogs } = require('@datadog/browser-logs');

// Logger setup for Datadog integration
function setupLogging() {
  if (process.env.DD_API_KEY) {
    datadogLogs.init({
      clientToken: process.env.DD_CLIENT_TOKEN || 'pub3ab714d81ea179c4cf78b41467d1090b',
      site: 'datadoghq.com',
      forwardErrorsToLogs: true,
      sampleRate: 100
    });
    return true;
  }
  return false;
}

// Environment configurations
const environments = {
  production: {
    name: 'Production',
    baseUrl: 'https://ai-tools-lab.com',
    pathPrefix: '/pages'
  },
  test: {
    name: 'Test',
    baseUrl: 'https://ai-tools-lab-tst.netlify.app',
    pathPrefix: '' // Test environment uses direct routes without prefix
  }
};

// Find all available episodes from the imported content
function getAvailableEpisodes() {
  const episodesDir = path.join(process.cwd(), 'src/content/imported/episodes');
  if (!fs.existsSync(episodesDir)) {
    return [];
  }
  
  return fs.readdirSync(episodesDir)
    .filter(file => file.startsWith('ep') && file.endsWith('.html'))
    .map(file => path.basename(file, '.html'));
}

// Main verification function
async function verifyEpisodes() {
  const loggingEnabled = setupLogging();
  console.log(`Datadog logging ${loggingEnabled ? 'enabled' : 'disabled'}`);
  
  const episodes = getAvailableEpisodes();
  console.log(`Found ${episodes.length} episodes to verify`);
  
  const results = {
    success: [],
    failure: []
  };
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Test each environment
  for (const [envKey, env] of Object.entries(environments)) {
    console.log(`\nTesting ${env.name} environment:`);
    
    try {
      // Check episodes index
      const episodesUrl = `${env.baseUrl}${env.pathPrefix}${envKey === 'production' ? '/episodes.html' : '/episodes'}`;
      console.log(`Checking episodes index at ${episodesUrl}`);
      await page.goto(episodesUrl);
      await page.waitForLoadState('networkidle');
      
      // Take screenshot of episodes index
      const indexScreenshot = path.join('test-results', `${envKey}-episodes-index.png`);
      await page.screenshot({ path: indexScreenshot, fullPage: true });
      console.log(`✅ Episodes index loaded successfully`);
      
      // Check individual episodes
      for (const episode of episodes) {
        const episodeUrl = `${env.baseUrl}${env.pathPrefix}${envKey === 'production' ? `/${episode}.html` : `/episodes/${episode}`}`;
        console.log(`Checking ${episode} at ${episodeUrl}`);
        
        try {
          await page.goto(episodeUrl);
          await page.waitForLoadState('networkidle');
          
          // Take screenshot of episode
          const episodeScreenshot = path.join('test-results', `${envKey}-${episode}.png`);
          await page.screenshot({ path: episodeScreenshot, fullPage: true });
          
          // Verify navigation
          const title = await page.title();
          if (title.includes('Episode')) {
            console.log(`✅ ${episode} loaded successfully`);
            results.success.push(`${env.name} - ${episode}`);
            
            // Log successful verification to Datadog
            if (loggingEnabled) {
              datadogLogs.logger.info(`Episode page verification successful`, {
                environment: env.name,
                episode: episode,
                url: episodeUrl
              });
            }
          } else {
            console.log(`❌ ${episode} failed: Incorrect title`);
            results.failure.push(`${env.name} - ${episode}: Incorrect title`);
            
            // Log failure to Datadog
            if (loggingEnabled) {
              datadogLogs.logger.error(`Episode page verification failed: Incorrect title`, {
                environment: env.name,
                episode: episode,
                url: episodeUrl,
                title: title
              });
            }
          }
        } catch (error) {
          console.log(`❌ ${episode} failed: ${error.message}`);
          results.failure.push(`${env.name} - ${episode}: ${error.message}`);
          
          // Log error to Datadog
          if (loggingEnabled) {
            datadogLogs.logger.error(`Episode page verification failed`, {
              environment: env.name,
              episode: episode,
              url: episodeUrl,
              error: error.message
            });
          }
        }
      }
    } catch (error) {
      console.log(`❌ Error checking ${env.name} environment: ${error.message}`);
      
      // Log error to Datadog
      if (loggingEnabled) {
        datadogLogs.logger.error(`Environment verification failed`, {
          environment: env.name,
          error: error.message
        });
      }
    }
  }
  
  await browser.close();
  
  // Print summary
  console.log('\n--- Episode Verification Summary ---');
  console.log(`✅ Successful: ${results.success.length}`);
  console.log(`❌ Failed: ${results.failure.length}`);
  
  if (results.failure.length > 0) {
    console.log('\nFailures:');
    results.failure.forEach(failure => console.log(`- ${failure}`));
  }
  
  // Return success if no failures
  return results.failure.length === 0;
}

// Run the verification
verifyEpisodes()
  .then(success => {
    console.log(`\nVerification ${success ? 'successful' : 'failed'}.`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Verification script error:', error);
    process.exit(1);
  });
