/**
 * Ollama-powered visual analysis utility
 * 
 * This utility uses Ollama's vision capabilities to analyze visual differences
 * between screenshots for intelligent regression testing.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');

/**
 * Check if Ollama is running and available
 * @returns {boolean}
 */
function isOllamaAvailable() {
  try {
    execSync('curl -s http://localhost:11434/api/version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Ensure the LLaVA model is available in Ollama
 * @returns {boolean}
 */
async function ensureLlavaModelAvailable() {
  if (!isOllamaAvailable()) {
    console.warn('Ollama is not running');
    return false;
  }
  
  try {
    // Check if llava model is available
    const response = await axios.get('http://localhost:11434/api/tags');
    const models = response.data.models || [];
    
    if (models.some(model => model.name.includes('llava'))) {
      return true;
    }
    
    // If not available, attempt to pull the model
    console.log('LLaVA model not found. Attempting to pull it...');
    execSync('ollama pull llava:latest', { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.warn('Failed to check or pull LLaVA model:', error.message);
    return false;
  }
}

/**
 * Read an image file as base64
 * @param {string} imagePath - Path to image file
 * @returns {string|null} - Base64 encoded image or null if file doesn't exist
 */
function readImageAsBase64(imagePath) {
  if (!fs.existsSync(imagePath)) {
    console.warn(`Image does not exist: ${imagePath}`);
    return null;
  }
  
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
  } catch (error) {
    console.error(`Error reading image ${imagePath}:`, error.message);
    return null;
  }
}

/**
 * Analyze visual differences using Ollama's vision capabilities
 * @param {string} image1Path - Path to the first image (local screenshot)
 * @param {string} image2Path - Path to the second image (production screenshot)
 * @param {string} diffImagePath - Path to the difference image
 * @returns {Promise<Object>} - Analysis results
 */
async function analyzeVisualDifferences(image1Path, image2Path, diffImagePath) {
  if (!isOllamaAvailable()) {
    return {
      differenceScore: 50,
      significantDifferences: false,
      diffElements: [{ 
        element: 'unknown', 
        location: 'unknown', 
        description: 'Ollama is not available for analysis' 
      }],
      recommendations: ['Install and start Ollama for visual ML analysis']
    };
  }
  
  try {
    await ensureLlavaModelAvailable();
    
    // Read images as base64
    const image1Base64 = readImageAsBase64(image1Path);
    const image2Base64 = readImageAsBase64(image2Path);
    const diffBase64 = readImageAsBase64(diffImagePath);
    
    if (!image1Base64 || !image2Base64) {
      throw new Error('One or more images could not be read');
    }
    
    // Create Ollama API request
    console.log('Analyzing visual differences with Ollama...');
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'llava:latest',
      prompt: `Compare these two screenshots and the difference image. 
               The first image is the local environment, the second is production, and the third shows differences.
               Identify specific UI elements that differ, their locations, and the nature of the differences.
               Format the response as JSON with these fields:
               - differenceScore: number from 0-100 where 0 is identical and 100 is completely different
               - significantDifferences: boolean indicating if differences impact functionality
               - diffElements: array of objects with {element, location, description}
               - recommendations: array of suggestions to fix differences`,
      images: [
        `data:image/png;base64,${image1Base64}`,
        `data:image/png;base64,${image2Base64}`,
        diffBase64 ? `data:image/png;base64,${diffBase64}` : null
      ].filter(Boolean),
      stream: false
    });
    
    // Parse the result into JSON
    const analysisText = response.data.response;
    let analysis;
    
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/) || 
                        analysisText.match(/{[\s\S]*}/);
      
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : analysisText;
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.warn('Could not parse Ollama response as JSON:', parseError.message);
      console.log('Raw response:', analysisText);
      
      // Create a simplified analysis if parsing fails
      analysis = {
        differenceScore: 50, // Default to 50% if we can't parse
        significantDifferences: true,
        diffElements: [{ 
          element: 'unknown', 
          location: 'unknown', 
          description: 'Could not parse analysis results' 
        }],
        recommendations: ['Manual review required due to parsing error'],
        rawAnalysis: analysisText
      };
    }
    
    // Write analysis to file
    const outputPath = path.join(
      path.dirname(diffImagePath), 
      `${path.basename(diffImagePath, '.png')}-analysis.json`
    );
    
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    
    // Report to Datadog
    try {
      const ddApiKey = process.env.DD_API_KEY;
      
      if (ddApiKey) {
        await axios.post(
          'https://api.datadoghq.com/api/v1/series',
          {
            series: [{
              metric: 'test.visual.ollama_difference_score',
              points: [[Math.floor(Date.now() / 1000), analysis.differenceScore]],
              type: 'gauge',
              tags: [
                `image1:${path.basename(image1Path)}`, 
                `image2:${path.basename(image2Path)}`,
                `significant:${analysis.significantDifferences}`,
                `env:${process.env.NODE_ENV || 'test'}`
              ]
            }]
          },
          { headers: { 'Content-Type': 'application/json', 'DD-API-KEY': ddApiKey } }
        );
        
        // Also send events for significant differences
        if (analysis.significantDifferences) {
          await axios.post(
            'https://api.datadoghq.com/api/v1/events',
            {
              title: `Visual Test: Significant differences detected`,
              text: `Differences found in ${path.basename(image1Path)} vs production.\n${analysis.diffElements.map(d => `- ${d.element}: ${d.description}`).join('\n')}`,
              alert_type: 'warning',
              tags: ['test:visual', `env:${process.env.NODE_ENV || 'test'}`]
            },
            { headers: { 'Content-Type': 'application/json', 'DD-API-KEY': ddApiKey } }
          );
        }
      }
    } catch (error) {
      console.warn('Could not send metrics to Datadog:', error.message);
    }
    
    return analysis;
  } catch (error) {
    console.error('Error analyzing images with Ollama:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    
    return {
      differenceScore: 100,
      significantDifferences: true,
      diffElements: [{ 
        element: 'error', 
        location: 'unknown', 
        description: `Analysis failed: ${error.message}` 
      }],
      recommendations: ['Fix Ollama connection or configuration']
    };
  }
}

module.exports = {
  analyzeVisualDifferences,
  isOllamaAvailable,
  ensureLlavaModelAvailable
};
