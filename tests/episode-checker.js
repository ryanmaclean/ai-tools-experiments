// Episode checker script using Puppeteer
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Ensure screenshots directory exists
const screenshotsDir = path.join(__dirname, 'episode-screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Helper function to determine the port to use
async function getServerPort() {
  // Default port
  const DEFAULT_PORT = 4321;
  
  // Check for PORT environment variable
  if (process.env.PORT) {
    console.log(`Using port from environment variable: ${process.env.PORT}`);
    return process.env.PORT;
  }
  
  // Check for port argument
  const portArg = process.argv.find(arg => arg.startsWith('--port='));
  if (portArg) {
    const port = parseInt(portArg.split('=')[1], 10);
    console.log(`Using port from command line argument: ${port}`);
    return port;
  }
  
  // Try to detect running Astro server
  return new Promise((resolve) => {
    exec('lsof -i -P | grep LISTEN | grep node', (error, stdout) => {
      if (stdout) {
        const portMatch = stdout.match(/:43[0-9]{2}/g);
        if (portMatch && portMatch.length > 0) {
          const detectedPort = parseInt(portMatch[0].substring(1), 10);
          console.log(`Detected existing Astro server on port: ${detectedPort}`);
          return resolve(detectedPort);
        }
      }
      console.log(`No server detected, using default port: ${DEFAULT_PORT}`);
      return resolve(DEFAULT_PORT);
    });
  });
}

async function checkEpisodes() {
  console.log('Starting episode check...');
  
  // Get the port to use
  const port = await getServerPort();
  const baseUrl = `http://localhost:${port}`;
  console.log(`Using base URL: ${baseUrl}`);
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate to homepage
    console.log('Navigating to homepage...');
    await page.goto(baseUrl, { waitUntil: 'networkidle2' });
    
    // Get all episode links
    const episodeLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('.recording-card a'));
      return links.map(link => link.href);
    });
    
    console.log(`Found ${episodeLinks.length} episode links`);
    
    // Create a results object to store our findings
    const results = {
      totalEpisodes: episodeLinks.length,
      checkedEpisodes: 0,
      successfulEpisodes: 0,
      failedEpisodes: [],
      episodeDetails: []
    };
    
    // Check each episode
    for (let i = 0; i < episodeLinks.length; i++) {
      const episodeUrl = episodeLinks[i];
      const episodeId = episodeUrl.split('/').pop();
      
      console.log(`\nChecking episode ${i+1}/${episodeLinks.length}: ${episodeId}`);
      
      try {
        // Navigate to episode page
        await page.goto(episodeUrl, { waitUntil: 'networkidle2' });
        
        // Take screenshot
        await page.screenshot({ path: path.join(screenshotsDir, `episode-${episodeId}.png`) });
        
        // Check for critical elements
        const title = await page.$('h1');
        const titleText = title ? await page.evaluate(el => el.textContent, title) : 'No title found';
        
        const backLink = await page.$('.back-link');
        const transcriptContent = await page.$('.transcript-body-content');
        
        // Check if transcript content has actual content
        const contentText = transcriptContent ? 
          await page.evaluate(el => el.textContent.trim(), transcriptContent) : '';
        
        const hasContent = contentText.length > 50; // Arbitrary threshold to check if there's meaningful content
        
        // Check for common HTML elements that should be in transcript
        const htmlElements = {
          videoContainer: await page.$('.video-container'),
          episodeContent: await page.$('.episode-content'),
          jumpToSection: await page.$('.chapter-markers'),
          transcript: await page.$('.transcript')
        };
        
        // Find resources section using JavaScript evaluation instead of CSS selector
        const hasResourcesSection = await page.evaluate(() => {
          // Look for h2 headers containing 'Resources' text
          const headers = Array.from(document.querySelectorAll('h2'));
          const resourcesHeader = headers.find(h => h.textContent.includes('Resources'));
          
          // Also check for takeaways list as alternative
          const takeawaysList = document.querySelector('ul.takeaways');
          
          return (resourcesHeader !== undefined) || (takeawaysList !== null);
        });
        
        // Evaluate iframe exists for potential video embeds
        const hasIframe = await page.evaluate(() => {
          return document.querySelectorAll('iframe').length > 0;
        });
        
        // Check for transcript timestamps (evidence of proper formatting)
        const hasTimestamps = await page.evaluate(() => {
          return document.querySelectorAll('.transcript-timestamp').length > 0;
        });
        
        // Check for images (thumbnails, etc)
        const hasImages = await page.evaluate(() => {
          return document.querySelectorAll('img').length > 0;
        });
        
        const contentStructureScore = Object.values(htmlElements).filter(Boolean).length;
        
        const episodeResult = {
          id: episodeId,
          url: episodeUrl,
          title: titleText,
          hasBackLink: !!backLink,
          hasTranscriptContent: !!transcriptContent,
          hasSubstantialContent: hasContent,
          contentLength: contentText.length,
          contentStructure: {
            hasVideoContainer: !!htmlElements.videoContainer,
            hasEpisodeContent: !!htmlElements.episodeContent,
            hasJumpToSection: !!htmlElements.jumpToSection,
            hasResourcesSection: hasResourcesSection,
            hasTranscriptSection: !!htmlElements.transcript,
            hasIframe: hasIframe,
            hasTimestamps: hasTimestamps,
            hasImages: hasImages,
            structureScore: Object.values(htmlElements).filter(Boolean).length + (hasResourcesSection ? 1 : 0)
          },
          status: (!!title && !!backLink && !!transcriptContent && hasContent) ? 'success' : 'issues'
        };
        
        results.episodeDetails.push(episodeResult);
        results.checkedEpisodes++;
        
        if (episodeResult.status === 'success') {
          results.successfulEpisodes++;
        } else {
          results.failedEpisodes.push(episodeId);
        }
        
        console.log(`- Title: ${titleText}`);
        console.log(`- Has back link: ${!!backLink}`);
        console.log(`- Has transcript content: ${!!transcriptContent}`);
        console.log(`- Has substantial content: ${hasContent} (${contentText.length} chars)`);
        console.log(`- Content structure:`);
        console.log(`  - Video container: ${!!htmlElements.videoContainer}`);
        console.log(`  - Episode content: ${!!htmlElements.episodeContent}`);
        console.log(`  - Jump to section: ${!!htmlElements.jumpToSection}`);
        console.log(`  - Resources section: ${hasResourcesSection}`);
        console.log(`  - Transcript section: ${!!htmlElements.transcript}`);
        console.log(`  - Has iframe: ${hasIframe}`);
        console.log(`  - Has timestamps: ${hasTimestamps}`);
        console.log(`  - Has images: ${hasImages}`);
        console.log(`  - Structure score: ${Object.values(htmlElements).filter(Boolean).length + (hasResourcesSection ? 1 : 0)}/5`);
        console.log(`- Status: ${episodeResult.status}`);
        
      } catch (error) {
        console.error(`Error checking episode ${episodeId}:`, error);
        results.failedEpisodes.push(episodeId);
        results.episodeDetails.push({
          id: episodeId,
          url: episodeUrl,
          error: error.message,
          status: 'error'
        });
      }
    }
    
    // Save results to JSON file
    fs.writeFileSync(
      path.join(__dirname, 'episode-check-results.json'), 
      JSON.stringify(results, null, 2)
    );
    
    console.log('\nEpisode check completed!');
    console.log(`Total episodes: ${results.totalEpisodes}`);
    console.log(`Successfully checked: ${results.successfulEpisodes}`);
    console.log(`Episodes with issues: ${results.failedEpisodes.length}`);
    
    if (results.failedEpisodes.length > 0) {
      console.log('Episodes with issues:', results.failedEpisodes.join(', '));
    }
    
    return results;
  } catch (error) {
    console.error('Error during episode check:', error);
    return { error: error.message };
  } finally {
    await browser.close();
  }
}

// Run the check
checkEpisodes().then(results => {
  if (results.error || (results.failedEpisodes && results.failedEpisodes.length > 0)) {
    console.warn('Some episodes have issues. Check the results JSON file for details.');
    // Don't exit with error code as we want to continue the process
  }
});
