/**
 * Simple Ollama API Test with Extended Timeout
 */

const axios = require('axios');

// Ollama API endpoint
const OLLAMA_GENERATE_URL = 'http://localhost:11434/api/generate';

// Test function with much longer timeout
async function testOllama() {
  console.log('Testing Ollama API with extended timeout...');
  console.log('Using model: llama3.2');
  
  try {
    console.log('Sending request to Ollama API...');
    const startTime = Date.now();
    
    const response = await axios.post(OLLAMA_GENERATE_URL, {
      model: 'llama3.2',
      prompt: 'Hello, can you respond with a very short greeting?',
      stream: false
    }, {
      timeout: 120000 // 2 minute timeout
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`✅ Response received in ${duration.toFixed(2)} seconds!`);
    console.log('Response:', response.data.response);
    return true;
  } catch (error) {
    console.error('❌ Error testing Ollama API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received. Request:', error.request);
    }
    return false;
  }
}

// Run the test
testOllama();
