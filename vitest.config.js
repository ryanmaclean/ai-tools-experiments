import { defineConfig } from 'vitest/config'

// Datadog CI Integration - Import the plugin if installed
let datadogPlugin = null;
try {
  const { datadogCIPlugin } = require('vite-plugin-datadog-ci');
  datadogPlugin = datadogCIPlugin({
    apiKey: process.env.DD_API_KEY,
    service: 'ai-tools-lab',
    env: process.env.NODE_ENV || 'test',
    uploadLogs: true,
    testVisibility: true,
  });
} catch (e) {
  console.warn('Datadog CI plugin not available - will run tests without Datadog integration');
  // Continue without the plugin if it's not installed yet
}

export default defineConfig({
  plugins: datadogPlugin ? [datadogPlugin] : [],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    reporters: ['default', 'json'],
    outputFile: {
      json: './test-results/vitest-results.json',
    },
    coverage: {
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage'
    },
  },
})
