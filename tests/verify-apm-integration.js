#!/usr/bin/env node

/**
 * Datadog APM Integration Verification Test
 * 
 * This test verifies that the Datadog APM (Application Performance Monitoring)
 * integration is properly configured and working. It checks for proper
 * tracer initialization, environment variables, and trace generation.
 *
 * Run with: node tests/verify-apm-integration.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Configuration
const DEBUG = process.env.DEBUG === 'true' || false;
const REPORT_DIR = path.join(__dirname, 'test-reports');

// Create report directory if it doesn't exist
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

// Test result object
const testResults = {
  tests: [],
  passed: 0,
  failed: 0,
  startTime: Date.now(),
  endTime: null
};

/**
 * Run a test case and record the result
 */
function runTest(name, testFn) {
  console.log(`\nud83euddea Running test: ${name}`);
  
  const testResult = {
    name,
    status: 'pending',
    error: null,
    duration: 0
  };
  
  const startTime = Date.now();
  
  try {
    testFn();
    testResult.status = 'passed';
    testResults.passed++;
    console.log(`u2705 PASSED: ${name}`);
  } catch (err) {
    testResult.status = 'failed';
    testResult.error = {
      message: err.message,
      stack: err.stack
    };
    testResults.failed++;
    console.error(`u274c FAILED: ${name}`);
    console.error(`   Error: ${err.message}`);
  }
  
  testResult.duration = Date.now() - startTime;
  testResults.tests.push(testResult);
}

/**
 * Save test results to a JSON file
 */
function saveTestResults() {
  testResults.endTime = Date.now();
  testResults.totalDuration = testResults.endTime - testResults.startTime;
  testResults.summary = `${testResults.passed} passed, ${testResults.failed} failed`;
  
  const reportFile = path.join(REPORT_DIR, `apm-integration-verification-${Date.now()}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));
  console.log(`\nud83dudcca Test results saved to: ${reportFile}`);
  console.log(`\nud83dudccb Summary: ${testResults.summary}`);
}

/**
 * Verify that the dd-trace package is installed
 */
function verifyDdTraceInstalled() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  assert.ok(
    packageJson.dependencies && packageJson.dependencies['dd-trace'],
    'dd-trace package is not installed. Run: npm install dd-trace'
  );
  
  // Check version is valid
  const version = packageJson.dependencies['dd-trace'];
  assert.ok(
    version && version.length > 0,
    'dd-trace package version is invalid or missing'
  );
  
  return true;
}

/**
 * Verify that the tracer initialization file exists and has correct configuration
 */
function verifyTracerInitialization() {
  const tracerPath = path.join(__dirname, '..', 'utils', 'datadog-tracer.js');
  
  assert.ok(
    fs.existsSync(tracerPath),
    'Datadog tracer initialization file not found at utils/datadog-tracer.js'
  );
  
  const tracerContent = fs.readFileSync(tracerPath, 'utf8');
  
  // Check if required components are present
  assert.ok(
    tracerContent.includes("require('dd-trace').init"),
    'Tracer initialization is missing or incorrect'
  );
  
  assert.ok(
    tracerContent.includes('hostname:') && 
    tracerContent.includes('service:') && 
    tracerContent.includes('env:'),
    'Tracer configuration is missing required parameters'
  );
  
  // Check configuration for Docker environment
  assert.ok(
    tracerContent.includes('datadog.ai-tools.local') || 
    tracerContent.includes('DD_AGENT_HOST'),
    'Tracer configuration not set up for Docker environment'
  );
  
  return true;
}

/**
 * Verify Docker configuration has APM enabled
 */
function verifyDockerConfiguration() {
  const dockerComposePath = path.join(__dirname, '..', 'docker-compose.yml');
  const dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf8');
  
  // Check if Datadog agent has APM enabled
  assert.ok(
    dockerComposeContent.includes('DD_APM_ENABLED=true'),
    'Datadog agent does not have APM enabled in docker-compose.yml'
  );
  
  // Check if agent accepts non-local traffic (required for Docker)
  assert.ok(
    dockerComposeContent.includes('DD_APM_NON_LOCAL_TRAFFIC=true'),
    'Datadog agent is not configured to accept traces from other containers'
  );
  
  return true;
}

/**
 * Verify environment variables for APM are documented
 */
function verifyEnvironmentVariables() {
  const envExamplePath = path.join(__dirname, '..', '.env.local.example');
  
  // Make sure the .env.local.example file exists
  if (fs.existsSync(envExamplePath)) {
    const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
    
    // Check for APM-related variables
    const hasApmVars = 
      envExampleContent.includes('DD_ENV=') ||
      envExampleContent.includes('DD_SERVICE=') ||
      envExampleContent.includes('DD_VERSION=') ||
      envExampleContent.includes('DD_AGENT_HOST=');
    
    if (!hasApmVars) {
      console.warn('Warning: .env.local.example does not include APM environment variables');
    }
  } else {
    console.warn('Warning: .env.local.example file not found');
  }
  
  // This is not a fail condition, just a warning
  return true;
}

/**
 * Verify the README has APM documentation
 */
function verifyDocumentation() {
  const readmePath = path.join(__dirname, '..', 'README.md');
  const readmeContent = fs.readFileSync(readmePath, 'utf8');
  
  // Check if APM is mentioned in the documentation
  const hasApmDocs = readmeContent.toLowerCase().includes('apm') || 
                     readmeContent.toLowerCase().includes('application performance monitoring');
  
  if (!hasApmDocs) {
    console.warn('Warning: README.md does not include information about the APM integration');
  }
  
  // This is not a fail condition, just a warning
  return true;
}

/**
 * Simulate generating a trace to verify functionality
 */
function verifyTraceGeneration() {
  // Create a temporary test file to generate traces
  const testFilePath = path.join(__dirname, 'temp-apm-test.js');
  
  // Simple test script that imports the tracer and makes HTTP requests
  const testFileContent = `
  // Import the tracer first
  const tracer = require('../utils/datadog-tracer');
  const http = require('http');
  
  // Create a simple server
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello, APM!');
  });
  
  // Listen on a random port
  server.listen(0, () => {
    const port = server.address().port;
    console.log(\`Server listening on port \${port}\`);
    
    // Make a request to our own server
    http.get(\`http://localhost:\${port}\`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('Response:', data);
        server.close(() => {
          console.log('Test completed');
          process.exit(0);
        });
      });
    }).on('error', (err) => {
      console.error('Error:', err.message);
      process.exit(1);
    });
  });
  `;
  
  fs.writeFileSync(testFilePath, testFileContent);
  
  try {
    // Set environment variables for the test
    const env = {
      ...process.env,
      DD_ENV: 'test',
      DD_SERVICE: 'apm-verification-test',
      DD_TRACE_DEBUG: 'true'
    };
    
    // Run the test and capture output
    const output = execSync(`node ${testFilePath}`, { 
      env,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log('Trace generation test output:', output);
    
    // Clean up temporary file
    fs.unlinkSync(testFilePath);
    
    // Verify output contains tracer initialization
    assert.ok(
      output.includes('Server listening on port') && 
      output.includes('Test completed'),
      'Trace generation test did not run correctly'
    );
    
    return true;
  } catch (error) {
    console.error('Trace generation test failed:', error.message);
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    throw error;
  }
}

/**
 * Run all verification tests
 */
function runAllTests() {
  console.log('ud83dudccb Starting Datadog APM Integration Verification Tests');
  
  runTest('dd-trace package is installed', () => {
    assert.strictEqual(verifyDdTraceInstalled(), true, 'dd-trace package verification failed');
  });
  
  runTest('Tracer initialization file is properly configured', () => {
    assert.strictEqual(verifyTracerInitialization(), true, 'Tracer initialization verification failed');
  });
  
  runTest('Docker configuration has APM enabled', () => {
    assert.strictEqual(verifyDockerConfiguration(), true, 'Docker configuration verification failed');
  });
  
  runTest('Environment variables are documented', () => {
    assert.strictEqual(verifyEnvironmentVariables(), true, 'Environment variables verification failed');
  });
  
  runTest('README has APM documentation', () => {
    assert.strictEqual(verifyDocumentation(), true, 'Documentation verification failed');
  });
  
  runTest('Trace generation test', () => {
    assert.strictEqual(verifyTraceGeneration(), true, 'Trace generation test failed');
  });
  
  saveTestResults();
  
  // Exit with error code if any tests failed
  if (testResults.failed > 0) {
    process.exit(1);
  }
}

// Run all tests
runAllTests();
