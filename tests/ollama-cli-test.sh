#!/bin/bash

# Ollama CLI Test Script
# Tests basic functionality and vision capabilities using the CLI

echo "=== OLLAMA CLI TEST SCRIPT ==="
echo "Testing if Ollama is running..."

# Check if Ollama is running
if ! pgrep -x "ollama" > /dev/null; then
  echo "❌ Ollama is not running. Please start it with 'ollama serve'"
  exit 1
fi

echo "✅ Ollama is running"

# List available models
echo "\nListing available models:"
ollama list

# Test basic model
echo "\nTesting basic text generation with llama3.2..."
echo "Prompt: What is Astro.js?" | ollama run llama3.2 --nowordwrap 2>/dev/null || echo "❌ Failed to run llama3.2"

# Test if vision model is available
echo "\nChecking if vision model is available..."
if ollama list | grep -q "llama3.2-vision"; then
  echo "✅ Vision model (llama3.2-vision) is available"
  
  # Create a simple test for vision capabilities
  echo "\nPreparing to test vision capabilities..."
  SCREENSHOT_PATH="./tests/screenshots/resources-local.png"
  
  if [ -f "$SCREENSHOT_PATH" ]; then
    echo "Using screenshot: $SCREENSHOT_PATH"
    echo "This would test vision capabilities, but CLI doesn't support image input directly."
    echo "For a real vision test, use the Ollama API with image base64 encoding."
  else
    echo "❌ Test screenshot not found at $SCREENSHOT_PATH"
  fi
else
  echo "❌ Vision model not found. Consider running: ollama pull llama3.2-vision"
fi

echo "\n=== TEST COMPLETE ==="
