const fs = require('fs');
const path = require('path');
const pagesDir = path.join(__dirname, 'pages');

// Get all episode files
const episodeFiles = fs.readdirSync(pagesDir)
  .filter(file => file.startsWith('ep') && file.endsWith('.html'));

console.log(`Found ${episodeFiles.length} episode files to process`);

episodeFiles.forEach(file => {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Extract the episode number from the filename (e.g., 'ep01.html' -> '01')
  const episodeMatch = file.match(/ep(\d+)\.html/);
  if (!episodeMatch) return;
  
  // Replace YouTube thumbnail URLs with local paths
  const modifiedContent = content.replace(
    /<img src="https:\/\/img\.youtube\.com\/vi\/[^\/]+\/maxresdefault\.jpg" alt="Episode (\d+) Thumbnail">/g,
    (match, epNum) => {
      // Format the episode number with leading zero if needed
      const formattedEpNum = epNum.padStart(2, '0');
      return `<img src="../images/thumbnails/ep${formattedEpNum}.png" alt="Episode ${epNum} Thumbnail">`;
    }
  );
  
  if (content !== modifiedContent) {
    fs.writeFileSync(filePath, modifiedContent, 'utf8');
    console.log(`Updated thumbnails in ${file}`);
  } else {
    console.log(`No changes needed for ${file}`);
  }
});

console.log('Thumbnail update complete!'); 