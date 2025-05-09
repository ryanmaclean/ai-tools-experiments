#!/usr/bin/env node

/**
 * Docker Network Optimization Verification Test
 * 
 * This test verifies that Docker networking has been properly optimized according to requirements:
 * 1. Custom network configuration with proper subnet and gateway
 * 2. Service aliases for improved name resolution
 * 3. Enhanced DNS settings and driver options
 * 4. Resource limits for improved security and performance
 *
 * Run with: node tests/verify-network-optimization.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const yaml = require('yaml'); // You may need to install this: npm install yaml

// Configuration
const TEST_TIMEOUT = 30000; // 30 seconds
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
  console.log(`\n🧪 Running test: ${name}`);
  
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
    console.log(`✅ PASSED: ${name}`);
  } catch (err) {
    testResult.status = 'failed';
    testResult.error = {
      message: err.message,
      stack: err.stack
    };
    testResults.failed++;
    console.error(`❌ FAILED: ${name}`);
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
  
  const reportFile = path.join(REPORT_DIR, `network-optimization-test-${Date.now()}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));
  console.log(`\n📊 Test results saved to: ${reportFile}`);
  console.log(`\n📋 Summary: ${testResults.summary}`);
}

/**
 * Parse and validate the docker-compose.yml file
 */
function parseDockerComposeFile() {
  const composeFilePath = path.join(__dirname, '..', 'docker-compose.yml');
  const composeFileExists = fs.existsSync(composeFilePath);
  
  if (!composeFileExists) {
    throw new Error('docker-compose.yml not found');
  }
  
  const composeFileContent = fs.readFileSync(composeFilePath, 'utf8');
  try {
    return yaml.parse(composeFileContent);
  } catch (err) {
    throw new Error(`Failed to parse docker-compose.yml: ${err.message}`);
  }
}

/**
 * Verify custom network configuration
 */
function verifyNetworkConfiguration() {
  const composeConfig = parseDockerComposeFile();
  
  // Check if networks section exists
  if (!composeConfig.networks || !composeConfig.networks['ai-tools-network']) {
    throw new Error('ai-tools-network configuration not found');
  }
  
  const network = composeConfig.networks['ai-tools-network'];
  
  // Check for bridge driver
  if (network.driver !== 'bridge') {
    throw new Error(`Expected bridge network driver, got ${network.driver}`);
  }
  
  // Check for IPAM configuration
  if (!network.ipam || !network.ipam.config || !network.ipam.config.length) {
    throw new Error('IPAM configuration not found or invalid');
  }
  
  // Check subnet
  const ipamConfig = network.ipam.config[0];
  if (!ipamConfig.subnet || !ipamConfig.subnet.includes('172.28.0.0')) {
    throw new Error(`Expected subnet 172.28.0.0/16, got ${ipamConfig.subnet || 'undefined'}`);
  }
  
  // Check for driver options
  if (!network.driver_opts) {
    throw new Error('Network driver options not found');
  }
  
  const requiredOptions = [
    'com.docker.network.bridge.name',
    'com.docker.network.bridge.enable_icc',
    'com.docker.network.bridge.enable_ip_masquerade'
  ];
  
  for (const option of requiredOptions) {
    if (!network.driver_opts[option]) {
      throw new Error(`Required driver option ${option} not found`);
    }
  }
  
  return true;
}

/**
 * Verify service DNS and alias configurations
 */
function verifyServiceNetworkSettings() {
  const composeConfig = parseDockerComposeFile();
  
  // Check for all services
  const services = ['app', 'dev', 'prod', 'datadog-agent'];
  
  for (const serviceName of services) {
    const service = composeConfig.services[serviceName];
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }
    
    // Check network config
    if (!service.networks || !service.networks['ai-tools-network']) {
      throw new Error(`Network configuration for ${serviceName} not found or invalid`);
    }
    
    // Check for aliases
    const networkConfig = service.networks['ai-tools-network'];
    if (!networkConfig.aliases || !networkConfig.aliases.length) {
      throw new Error(`Network aliases for ${serviceName} not found`);
    }
    
    const alias = networkConfig.aliases[0];
    if (!alias.includes('ai-tools.local')) {
      throw new Error(`Expected ai-tools.local alias for ${serviceName}, got ${alias}`);
    }
  }
  
  // Check for DNS settings in app and dev services
  const dnsServices = ['app', 'dev'];
  for (const serviceName of dnsServices) {
    const service = composeConfig.services[serviceName];
    if (!service.dns || !service.dns.length) {
      throw new Error(`DNS configuration for ${serviceName} not found`);
    }
    
    if (!service.dns.includes('8.8.8.8') && !service.dns.includes('1.1.1.1')) {
      throw new Error(`Expected public DNS servers in ${serviceName} configuration`);
    }
  }
  
  // Check for resource limits in prod service
  const prodService = composeConfig.services.prod;
  if (!prodService.mem_limit || !prodService.cpus) {
    throw new Error('Resource limits for prod service not found');
  }
  
  return true;
}

/**
 * Run all verification tests
 */
function runAllTests() {
  console.log('🌐 Starting Docker Network Optimization Verification Tests');
  
  runTest('Custom network configuration is properly set up', () => {
    assert.strictEqual(verifyNetworkConfiguration(), true, 'Network configuration validation failed');
  });
  
  runTest('Service network settings are properly configured', () => {
    assert.strictEqual(verifyServiceNetworkSettings(), true, 'Service network settings validation failed');
  });
  
  saveTestResults();
  
  // Exit with error code if any tests failed
  if (testResults.failed > 0) {
    process.exit(1);
  }
}

// Install yaml package if not already installed
try {
  require('yaml');
} catch (err) {
  console.log('Installing required yaml package...');
  execSync('npm install yaml --save-dev');
}

// Run the tests
runAllTests();
