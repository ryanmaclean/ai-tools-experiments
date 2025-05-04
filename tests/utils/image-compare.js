/**
 * Image comparison utility using ImageMagick
 * 
 * This utility compares two images and calculates a difference percentage
 * suitable for visual regression testing.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

/**
 * Check if ImageMagick is installed
 * @returns {boolean} - True if ImageMagick is installed
 */
function isImageMagickInstalled() {
  try {
    execSync('which compare', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Compare two images using ImageMagick and return the difference percentage
 * @param {string} image1Path - Path to the first image
 * @param {string} image2Path - Path to the second image
 * @param {string} diffOutputPath - Path to save the difference image
 * @param {Object} options - Comparison options
 * @returns {number} - Difference percentage (0-100)
 */
function compareImagesWithImageMagick(image1Path, image2Path, diffOutputPath, options = {}) {
  const {
    metric = 'AE',  // Options: AE (absolute error), RMSE (root mean squared error), etc.
    highlight = 'red',
    lowlight = 'black',
    threshold = 0 // Threshold for considering pixels different
  } = options;
  
  // Check if the images exist
  if (!fs.existsSync(image1Path) || !fs.existsSync(image2Path)) {
    console.error(`One or both images don't exist:\n- ${image1Path}\n- ${image2Path}`);
    return 100; // Return 100% difference if images don't exist
  }
  
  // Check if ImageMagick is installed
  if (!isImageMagickInstalled()) {
    console.error('ImageMagick is not installed. Please install it to use the image comparison functionality.');
    return 100; // Return 100% difference if ImageMagick is not installed
  }
  
  try {
    // Ensure the output directory exists
    const diffDir = path.dirname(diffOutputPath);
    if (!fs.existsSync(diffDir)) {
      fs.mkdirSync(diffDir, { recursive: true });
    }
    
    // Build command with sophisticated options
    const compareCmd = [
      'compare',
      `-metric ${metric}`,
      `-highlight-color ${highlight}`,
      `-lowlight-color ${lowlight}`,
      threshold > 0 ? `-threshold ${threshold}%` : '',
      `"${image1Path}"`,
      `"${image2Path}"`,
      `"${diffOutputPath}"`
    ].filter(Boolean).join(' ');
    
    // Run ImageMagick compare - output goes to stderr
    const result = execSync(compareCmd, { encoding: 'utf8', stdio: 'pipe', shell: true });
    console.log('Compare command output:', result);
    
    // Since the AE value may have been captured in stdout (unlikely for ImageMagick), 
    // we'll calculate the difference using identify command
    
    // Get image dimensions of the first image to calculate percentage
    const dimensions = execSync(
      `identify -format "%[fx:w*h]" "${image1Path}"`,
      { encoding: 'utf8' }
    ).trim();
    
    // Get the difference pixels count
    // Alternative way to measure differences, using AE metric
    let pixelDifference;
    try {
      // Use ImageMagick to compare again, focusing just on the metric output
      const diffOutput = execSync(
        `compare -metric AE "${image1Path}" "${image2Path}" null: 2>&1`,
        { encoding: 'utf8', stdio: 'pipe', shell: true }
      );
      // Parse the numeric result from the output
      pixelDifference = parseInt(diffOutput.trim(), 10);
    } catch (error) {
      // ImageMagick often returns non-zero exit code when differences are found
      // but the pixel difference is still printed to stderr
      const stderr = error.stderr?.toString() || error.message;
      const match = stderr.match(/\d+/);
      if (match) {
        pixelDifference = parseInt(match[0], 10);
      } else {
        console.error('Error parsing pixel difference:', stderr);
        pixelDifference = 0;
      }
    }
    
    // Calculate percentage difference
    const totalPixels = parseInt(dimensions, 10) || 1; // Avoid division by zero
    const percentDifference = (pixelDifference / totalPixels) * 100;
    
    console.log(`Image comparison: ${percentDifference.toFixed(2)}% different (${pixelDifference} out of ${totalPixels} pixels)`);
    
    // Report to Datadog
    try {
      const ddApiKey = process.env.DD_API_KEY;
      
      if (ddApiKey) {
        axios.post(
          'https://api.datadoghq.com/api/v1/series',
          {
            series: [{
              metric: 'test.image.difference_percent',
              points: [[Math.floor(Date.now() / 1000), percentDifference]],
              type: 'gauge',
              tags: [
                `image1:${path.basename(image1Path)}`, 
                `image2:${path.basename(image2Path)}`,
                `env:${process.env.NODE_ENV || 'test'}`
              ]
            }]
          },
          { headers: { 'Content-Type': 'application/json', 'DD-API-KEY': ddApiKey } }
        );
      }
    } catch (error) {
      console.warn('Could not send metrics to Datadog:', error.message);
    }
    
    return percentDifference;
  } catch (error) {
    console.error('Error comparing images with ImageMagick:', error.message);
    if (error.stderr) {
      console.error('Error details:', error.stderr.toString());
    }
    return 100; // Return 100% difference on error
  }
}

/**
 * A simple fallback method using Node's built-in capabilities
 * when ImageMagick is not available
 */
function createBasicDiffImage(image1Path, image2Path, diffOutputPath) {
  console.warn('Using basic diff image creation (no comparison metrics available)');
  
  // Simply create a text file indicating comparison was attempted
  const content = `Comparison attempted between:\n${image1Path}\n${image2Path}\n\nAt: ${new Date().toISOString()}\n\nNote: ImageMagick was not available for comparison.`;
  
  fs.writeFileSync(diffOutputPath.replace(/\.png$/, '.txt'), content);
  
  return 50; // Return a default 50% difference when we can't calculate
}

/**
 * Wrapper function to compare images with fallback support
 */
function compareImages(image1Path, image2Path, diffOutputPath, options = {}) {
  if (isImageMagickInstalled()) {
    return compareImagesWithImageMagick(image1Path, image2Path, diffOutputPath, options);
  } else {
    console.warn('ImageMagick not installed. Using fallback comparison method.');
    return createBasicDiffImage(image1Path, image2Path, diffOutputPath);
  }
}

module.exports = {
  compareImages,
  compareImagesWithImageMagick,
  isImageMagickInstalled
};
