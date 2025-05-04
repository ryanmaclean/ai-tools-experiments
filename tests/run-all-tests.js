/**
 * Comprehensive Test Runner
 * 
 * This script orchestrates the execution of all test types to provide
 * a complete validation of the AI Tools Lab implementation.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const TEST_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes timeout for each test type
const REPORT_DIR = path.join(__dirname, 'test-reports');

// Ensure report directory exists
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

// Test script paths
const testScripts = [
  {
    name: 'Visual Comparison',
    script: path.join(__dirname, 'visual-comparison-test.js'),
    reportFile: path.join(REPORT_DIR, 'visual-comparison-report.log')
  },
  {
    name: 'Snapshot',
    script: path.join(__dirname, 'snapshot-test.js'),
    reportFile: path.join(REPORT_DIR, 'snapshot-report.log'),
    runner: 'vitest', // This indicates we should use vitest to run this test
  },
  {
    name: 'Accessibility',
    script: path.join(__dirname, 'accessibility-test.js'),
    reportFile: path.join(REPORT_DIR, 'accessibility-report.log')
  },
  {
    name: 'Visual LLM',
    script: path.join(__dirname, 'visual-llm-test.js'),
    reportFile: path.join(REPORT_DIR, 'visual-llm-report.log')
  },
  {
    name: 'Comprehensive Site',
    script: path.join(__dirname, 'comprehensive-site-test.js'),
    reportFile: path.join(REPORT_DIR, 'comprehensive-site-report.log')
  }
];

/**
 * Execute a single test script and capture its output
 */
async function runTest(test) {
  console.log(`\n\n============================================`);
  console.log(`Starting ${test.name} Tests...`);
  console.log(`============================================\n`);
  
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let output = '';
    
    // Determine the command to run based on the test type
    let command, args;
    if (test.runner === 'vitest') {
      command = 'npx';
      args = ['vitest', 'run', test.script];
    } else {
      command = 'node';
      args = [test.script];
    }
    
    // Spawn the process
    const process = spawn(command, args);
    const timer = setTimeout(() => {
      process.kill();
      reject(new Error(`Test timed out after ${TEST_TIMEOUT_MS/1000} seconds`));
    }, TEST_TIMEOUT_MS);
    
    // Capture output
    process.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      console.log(chunk);
    });
    
    process.stderr.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      console.error(chunk);
    });
    
    process.on('close', (code) => {
      clearTimeout(timer);
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      const result = {
        test: test.name,
        exitCode: code,
        passed: code === 0,
        duration: `${duration.toFixed(2)} seconds`,
        output
      };
      
      // Save the output to a report file
      fs.writeFileSync(test.reportFile, 
        `Test: ${test.name}\n` +
        `Date: ${new Date().toISOString()}\n` +
        `Duration: ${duration.toFixed(2)} seconds\n` +
        `Exit Code: ${code}\n` +
        `Status: ${code === 0 ? 'PASSED' : 'FAILED'}\n\n` +
        `OUTPUT:\n${output}\n`);
      
      console.log(`\n${test.name} Tests ${code === 0 ? 'PASSED' : 'FAILED'} (${duration.toFixed(2)}s)`);
      resolve(result);
    });
    
    process.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Main function to run all tests in sequence
 */
async function runAllTests() {
  console.log('Starting comprehensive test suite...');
  console.log(`Tests will be run in this order: ${testScripts.map(t => t.name).join(', ')}`);
  console.log('Reports will be saved to:', REPORT_DIR);
  
  const results = [];
  const startTime = Date.now();
  
  // Run test scripts in sequence
  for (const test of testScripts) {
    try {
      const result = await runTest(test);
      results.push(result);
    } catch (error) {
      console.error(`Error running ${test.name} Tests:`, error.message);
      results.push({
        test: test.name,
        exitCode: 1,
        passed: false,
        error: error.message
      });
    }
  }
  
  // Generate summary report
  const endTime = Date.now();
  const totalDuration = (endTime - startTime) / 1000;
  
  const summary = {
    totalTests: results.length,
    passedTests: results.filter(r => r.passed).length,
    failedTests: results.filter(r => !r.passed).length,
    totalDuration: `${totalDuration.toFixed(2)} seconds`,
    testResults: results.map(r => ({
      test: r.test,
      passed: r.passed,
      exitCode: r.exitCode,
      duration: r.duration || 'N/A',
      error: r.error || null
    }))
  };
  
  // Save summary report
  fs.writeFileSync(
    path.join(REPORT_DIR, 'summary-report.json'),
    JSON.stringify(summary, null, 2)
  );
  
  // Generate HTML report for easy reading
  const htmlReport = generateHtmlReport(summary, results);
  fs.writeFileSync(
    path.join(REPORT_DIR, 'test-report.html'),
    htmlReport
  );
  
  // Print summary to console
  console.log('\n\n============================================');
  console.log('Test Suite Summary');
  console.log('============================================');
  console.log(`Total Tests: ${summary.totalTests}`);
  console.log(`Passed: ${summary.passedTests}`);
  console.log(`Failed: ${summary.failedTests}`);
  console.log(`Total Duration: ${summary.totalDuration}`);
  console.log('\nTest Results:');
  
  results.forEach((result) => {
    console.log(`- ${result.test}: ${result.passed ? '✅ PASSED' : '❌ FAILED'}${result.error ? ` (${result.error})` : ''}`);
  });
  
  console.log('\nDetailed reports saved to:', REPORT_DIR);
  console.log('HTML report available at:', path.join(REPORT_DIR, 'test-report.html'));
  
  // Return exit code based on test results
  return summary.failedTests === 0 ? 0 : 1;
}

/**
 * Generate an HTML report from test results
 */
function generateHtmlReport(summary, results) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Tools Lab Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; }
    header { text-align: center; margin-bottom: 30px; }
    h1 { color: #2c3e50; }
    .summary { background-color: #f8f9fa; border-radius: 5px; padding: 20px; margin-bottom: 30px; }
    .summary-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6; }
    .summary-item:last-child { border-bottom: none; }
    .tests { margin-top: 40px; }
    .test-card { background-color: #fff; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); padding: 20px; margin-bottom: 20px; }
    .test-header { display: flex; justify-content: space-between; margin-bottom: 15px; }
    .test-name { font-size: 1.2rem; font-weight: bold; }
    .pass { color: #28a745; }
    .fail { color: #dc3545; }
    .test-details { display: grid; grid-template-columns: 120px auto; gap: 10px; }
    .label { font-weight: bold; }
    .timestamp { color: #6c757d; text-align: right; font-size: 0.85rem; margin-top: 20px; }
  </style>
</head>
<body>
  <header>
    <h1>AI Tools Lab Test Report</h1>
    <p>Generated on ${new Date().toLocaleString()}</p>
  </header>
  
  <div class="summary">
    <h2>Summary</h2>
    <div class="summary-item">
      <span>Total Tests:</span>
      <span>${summary.totalTests}</span>
    </div>
    <div class="summary-item">
      <span>Passed Tests:</span>
      <span class="pass">${summary.passedTests}</span>
    </div>
    <div class="summary-item">
      <span>Failed Tests:</span>
      <span class="fail">${summary.failedTests}</span>
    </div>
    <div class="summary-item">
      <span>Total Duration:</span>
      <span>${summary.totalDuration}</span>
    </div>
  </div>
  
  <div class="tests">
    <h2>Test Results</h2>
    ${results.map(result => `
      <div class="test-card">
        <div class="test-header">
          <div class="test-name">${result.test}</div>
          <div class="${result.passed ? 'pass' : 'fail'}">${result.passed ? '✅ PASSED' : '❌ FAILED'}</div>
        </div>
        <div class="test-details">
          <div class="label">Duration:</div>
          <div>${result.duration || 'N/A'}</div>
          
          <div class="label">Exit Code:</div>
          <div>${result.exitCode}</div>
          
          ${result.error ? `
          <div class="label">Error:</div>
          <div class="fail">${result.error}</div>
          ` : ''}
        </div>
        <div class="timestamp">Report file: <a href="${path.basename(testScripts.find(t => t.name === result.test).reportFile)}" target="_blank">${path.basename(testScripts.find(t => t.name === result.test).reportFile)}</a></div>
      </div>
    `).join('')}
  </div>
</body>
</html>`;
}

// Run the test suite
runAllTests().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  console.error('Unhandled error running tests:', error);
  process.exit(1);
});
