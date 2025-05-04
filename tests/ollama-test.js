/**
 * Ollama API Testing Script
 * 
 * This script tests Ollama API connectivity in a progressive manner:
 * 1. Basic connectivity with smaller models
 * 2. Vision model capabilities
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Ollama API endpoints
const OLLAMA_BASE_URL = 'http://localhost:11434/api';
const OLLAMA_LIST_ENDPOINT = `${OLLAMA_BASE_URL}/tags`;
const OLLAMA_GENERATE_ENDPOINT = `${OLLAMA_BASE_URL}/generate`;

// Test image paths
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const TEST_IMAGE_PATH = path.join(SCREENSHOTS_DIR, 'resources-local.png');

async function testOllamaBasic() {
  console.log('\n=== BASIC OLLAMA CONNECTIVITY TEST ===');
  
  try {
    console.log('1. Checking available models...');
    const modelsResponse = await axios.get(OLLAMA_LIST_ENDPOINT);
    
    if (!modelsResponse.data || !modelsResponse.data.models) {
      throw new Error('Invalid response format from Ollama API');
    }
    
    const models = modelsResponse.data.models;
    console.log(`Available models (${models.length}):`, models.map(m => m.name).join(', '));
    
    // Find a small model to test with (preferably llama3.2 or similar)
    const testModel = models.find(m => m.name === 'llama3.2') || 
                      models.find(m => m.name.includes('llama')) || 
                      models[0];
    
    if (!testModel) {
      throw new Error('No suitable test model found');
    }
    
    console.log(`2. Testing text generation with model: ${testModel.name}...`);
    const generateResponse = await axios.post(OLLAMA_GENERATE_ENDPOINT, {
      model: testModel.name,
      prompt: 'Briefly explain what Astro.js is in one sentence.',
      stream: false
    }, {
      timeout: 30000
    });
    
    if (!generateResponse.data || !generateResponse.data.response) {
      throw new Error('Invalid generation response from Ollama API');
    }
    
    console.log('Text generation successful!');
    console.log('Response:', generateResponse.data.response);
    console.log('✅ Basic Ollama connectivity test PASSED');
    return true;
  } catch (error) {
    console.error('❌ Basic Ollama connectivity test FAILED:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

async function testOllamaVision() {
  console.log('\n=== OLLAMA VISION CAPABILITIES TEST ===');
  
  try {
    console.log('1. Checking for vision-capable models...');
    const modelsResponse = await axios.get(OLLAMA_LIST_ENDPOINT);
    
    if (!modelsResponse.data || !modelsResponse.data.models) {
      throw new Error('Invalid response format from Ollama API');
    }
    
    const models = modelsResponse.data.models;
    const visionModels = models.filter(m => 
      m.name.includes('vision') || m.name.includes('llava')
    );
    
    if (visionModels.length === 0) {
      console.log('No vision-capable models found. You may need to download one:');
      console.log('Run: ollama pull llama3.2-vision');
      return false;
    }
    
    console.log(`Vision-capable models found (${visionModels.length}):`, 
      visionModels.map(m => m.name).join(', '));
    
    // Use the first vision model found
    const visionModel = visionModels[0];
    console.log(`2. Testing vision capabilities with model: ${visionModel.name}...`);
    
    // Check if test image exists
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      console.log(`Test image not found at ${TEST_IMAGE_PATH}`);
      console.log('Creating a test screenshot...');
      // TODO: Create a test screenshot if needed
      if (!fs.existsSync(TEST_IMAGE_PATH)) {
        throw new Error('No test image available for vision test');
      }
    }
    
    // Convert image to base64
    const imageBase64 = fs.readFileSync(TEST_IMAGE_PATH, { encoding: 'base64' });
    console.log(`Image loaded: ${TEST_IMAGE_PATH} (${imageBase64.length} bytes in base64)`);
    
    const generateResponse = await axios.post(OLLAMA_GENERATE_ENDPOINT, {
      model: visionModel.name,
      prompt: 'Briefly describe what you see in this image.',
      images: [imageBase64],
      stream: false
    }, {
      timeout: 60000 // 1 minute timeout for vision processing
    });
    
    if (!generateResponse.data || !generateResponse.data.response) {
      throw new Error('Invalid vision generation response from Ollama API');
    }
    
    console.log('Vision test successful!');
    console.log('Response:', generateResponse.data.response);
    console.log('✅ Ollama vision capabilities test PASSED');
    return true;
  } catch (error) {
    console.error('❌ Ollama vision capabilities test FAILED:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

async function suggestModelDownload() {
  console.log('\n=== MODEL DOWNLOAD SUGGESTIONS ===');
  console.log('To download required models, run these commands:');
  console.log('1. For basic text model: ollama pull llama3.2');
  console.log('2. For vision capabilities: ollama pull llama3.2-vision');
  console.log('\nAfter downloading, restart the Ollama service and run this test again.');
}

async function main() {
  console.log('Starting Ollama API tests...');
  
  // Test 1: Basic Ollama connectivity
  const basicTestPassed = await testOllamaBasic();
  
  // Test 2: Vision capabilities (only if basic test passed)
  let visionTestPassed = false;
  if (basicTestPassed) {
    visionTestPassed = await testOllamaVision();
  }
  
  // Summary
  console.log('\n=== TEST SUMMARY ===');
  console.log(`Basic Ollama connectivity: ${basicTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  if (basicTestPassed) {
    console.log(`Ollama vision capabilities: ${visionTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  }
  
  // Suggest model downloads if needed
  if (!basicTestPassed || !visionTestPassed) {
    await suggestModelDownload();
  }
  
  // Exit with appropriate code
  process.exit(basicTestPassed && visionTestPassed ? 0 : 1);
}

// Run the main function
main();
