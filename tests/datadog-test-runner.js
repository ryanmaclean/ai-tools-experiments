#!/usr/bin/env node

/**
 * Datadog Test Runner
 * Multithreaded test framework with Datadog integration for optimal test reliability
 * 
 * Features:
 * - Runs tests in parallel using worker threads
 * - Integrates deeply with Datadog for monitoring and reporting
 * - Reduces flaky tests through improved retries and stability mechanisms
 * - Provides consistent testing across environments
 */

const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Datadog tracing (if available)
let tracer;
try {
  // Use dynamic import to avoid crashing if dd-trace isn't installed
  tracer = require('dd-trace').init({
    logInjection: true,
    analytics: true,
    profiling: true,
    appsec: true
  });
  console.log('✅ Datadog tracing initialized');
} catch (e) {
  console.log('⚠️ Datadog tracing not available:', e.message);
  console.log('Running tests without Datadog APM integration');
}

// Configuration
const CONFIG = {
  // Maximum number of parallel tests to run
  // Default to CPU cores - 1 (leave one core free for system operations)
  maxWorkers: process.env.MAX_WORKERS ? parseInt(process.env.MAX_WORKERS) : Math.max(1, os.cpus().length - 1),
  // Maximum test retries before considering a test failed
  maxRetries: process.env.MAX_RETRIES ? parseInt(process.env.MAX_RETRIES) : 2,
  // Test timeout in milliseconds
  testTimeout: process.env.TEST_TIMEOUT ? parseInt(process.env.TEST_TIMEOUT) : 60000,
  // Default base URL for tests
  baseUrl: process.env.TEST_URL || 'http://localhost:4321',
  // Debug mode
  debug: process.env.DEBUG === 'true',
  // Datadog reporting
  datadogReporting: process.env.DD_TEST_REPORT === 'true' || true,
  // Test directories
  outputDirs: {
    reports: path.join(__dirname, 'reports'),
    screenshots: path.join(__dirname, 'screenshots'),
    traces: path.join(__dirname, 'traces')
  }
};

// Ensure output directories exist
Object.values(CONFIG.outputDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Test Suite Manager
 * Handles running tests in parallel and collecting results
 */
class TestSuiteManager {
  constructor(config) {
    this.config = config;
    this.activeWorkers = 0;
    this.testQueue = [];
    this.results = [];
    this.errors = [];
    this.startTime = Date.now();
  }

  /**
   * Add a test module to the queue
   * @param {string} testModule - Path to test module
   * @param {object} testParams - Test parameters
   */
  queueTest(testModule, testParams = {}) {
    this.testQueue.push({ testModule, testParams, retries: 0 });
    return this;
  }

  /**
   * Run all queued tests
   * @returns {Promise<boolean>} - True if all tests passed
   */
  async runTests() {
    console.log(`\n🚀 Starting test suite with ${this.testQueue.length} tests`);
    console.log(`📊 Using ${this.config.maxWorkers} parallel workers\n`);

    let success = true;

    // Start processing the queue
    while (this.testQueue.length > 0 || this.activeWorkers > 0) {
      // Start new workers if we have capacity and tests to run
      while (
        this.activeWorkers < this.config.maxWorkers && 
        this.testQueue.length > 0
      ) {
        const test = this.testQueue.shift();
        this.startWorker(test);
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Generate final report
    const duration = Date.now() - this.startTime;
    const report = {
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length,
        duration: duration,
        timestamp: new Date().toISOString()
      },
      results: this.results,
      errors: this.errors,
      config: {
        ...this.config,
        // Don't include functions in the report
        tracer: tracer ? 'initialized' : 'not available'
      }
    };

    // Save report to file
    const reportFile = path.join(
      this.config.outputDirs.reports, 
      `parallel-test-report-${Date.now()}.json`
    );
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    // Print summary
    this.printSummary(report, reportFile);

    // Send to Datadog if enabled
    if (this.config.datadogReporting && tracer) {
      try {
        this.sendToDatadog(report);
      } catch (e) {
        console.error('Failed to send report to Datadog:', e);
      }
    }

    return report.summary.failed === 0;
  }

  /**
   * Start a worker thread for a test
   * @param {object} test - Test configuration
   */
  startWorker(test) {
    this.activeWorkers++;
    const workerId = this.activeWorkers;
    const span = tracer && tracer.startSpan('test.run', {
      resource: path.basename(test.testModule),
      tags: {
        'test.name': path.basename(test.testModule, '.js'),
        'test.attempt': test.retries + 1,
        'test.params': JSON.stringify(test.testParams)
      }
    });

    console.log(`🧵 [Worker ${workerId}] Starting ${path.basename(test.testModule)} (attempt ${test.retries + 1}/${this.config.maxRetries + 1})`);

    const worker = new Worker(test.testModule, {
      workerData: {
        ...test.testParams,
        baseUrl: this.config.baseUrl,
        debug: this.config.debug,
        testTimeout: this.config.testTimeout,
        workerId: workerId
      }
    });

    worker.on('message', (result) => {
      if (span) {
        span.setTag('test.success', result.success);
        span.setTag('test.duration', result.duration);
        if (!result.success && result.error) {
          span.setTag('error', true);
          span.setTag('error.message', result.error.message || 'Unknown error');
          span.setTag('error.stack', result.error.stack || 'No stack trace');
        }
      }

      if (result.success) {
        console.log(`✅ [Worker ${workerId}] Completed ${path.basename(test.testModule)}`);
        this.results.push({
          ...result,
          testModule: test.testModule,
          worker: workerId,
          retries: test.retries
        });
      } else {
        console.error(`❌ [Worker ${workerId}] Failed ${path.basename(test.testModule)}:`, result.error?.message || 'Unknown error');
        
        // Check if we should retry
        if (test.retries < this.config.maxRetries) {
          console.log(`🔄 [Worker ${workerId}] Retrying ${path.basename(test.testModule)} (${test.retries + 1}/${this.config.maxRetries})`);
          this.testQueue.push({
            ...test,
            retries: test.retries + 1
          });
        } else {
          console.error(`❌ [Worker ${workerId}] Exhausted retries for ${path.basename(test.testModule)}`);
          this.results.push({
            ...result,
            testModule: test.testModule,
            worker: workerId,
            retries: test.retries
          });
          this.errors.push({
            testModule: test.testModule,
            error: result.error,
            worker: workerId,
            retries: test.retries
          });
        }
      }
    });

    worker.on('error', (error) => {
      if (span) {
        span.setTag('error', true);
        span.setTag('error.message', error.message || 'Unknown error');
        span.setTag('error.stack', error.stack || 'No stack trace');
        span.setTag('test.success', false);
      }

      console.error(`❌ [Worker ${workerId}] Error in ${path.basename(test.testModule)}:`, error);
      
      // Check if we should retry
      if (test.retries < this.config.maxRetries) {
        console.log(`🔄 [Worker ${workerId}] Retrying ${path.basename(test.testModule)} (${test.retries + 1}/${this.config.maxRetries})`);
        this.testQueue.push({
          ...test,
          retries: test.retries + 1
        });
      } else {
        console.error(`❌ [Worker ${workerId}] Exhausted retries for ${path.basename(test.testModule)}`);
        this.results.push({
          testModule: test.testModule,
          success: false,
          worker: workerId,
          retries: test.retries,
          error: {
            message: error.message,
            stack: error.stack
          }
        });
        this.errors.push({
          testModule: test.testModule,
          error: {
            message: error.message,
            stack: error.stack
          },
          worker: workerId,
          retries: test.retries
        });
      }
    });

    worker.on('exit', (code) => {
      this.activeWorkers--;
      if (span) span.finish();

      if (code !== 0 && !this.results.find(r => 
        r.testModule === test.testModule && 
        r.worker === workerId
      )) {
        // Worker exited with non-zero code and we don't have a result
        // This might happen if the worker crashed without sending a message
        console.error(`❌ [Worker ${workerId}] Crashed with code ${code}`);
        
        // Check if we should retry
        if (test.retries < this.config.maxRetries) {
          console.log(`🔄 [Worker ${workerId}] Retrying ${path.basename(test.testModule)} (${test.retries + 1}/${this.config.maxRetries})`);
          this.testQueue.push({
            ...test,
            retries: test.retries + 1
          });
        } else {
          console.error(`❌ [Worker ${workerId}] Exhausted retries for ${path.basename(test.testModule)}`);
          this.results.push({
            testModule: test.testModule,
            success: false,
            worker: workerId,
            retries: test.retries,
            error: {
              message: `Worker exited with code ${code}`,
              stack: 'No stack trace available'
            }
          });
          this.errors.push({
            testModule: test.testModule,
            error: {
              message: `Worker exited with code ${code}`,
              stack: 'No stack trace available'
            },
            worker: workerId,
            retries: test.retries
          });
        }
      }
    });
  }

  /**
   * Print a summary of the test results
   * @param {object} report - Test report
   * @param {string} reportFile - Path to the report file
   */
  printSummary(report, reportFile) {
    const { summary } = report;
    const durationSeconds = Math.round(summary.duration / 1000);
    const durationMinutes = Math.floor(durationSeconds / 60);
    const remainingSeconds = durationSeconds % 60;

    console.log('\n📊 TEST SUMMARY:');
    console.log('========================');
    console.log(`Total Tests: ${summary.total}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Duration: ${durationMinutes}m ${remainingSeconds}s`);
    console.log(`Result: ${summary.failed === 0 ? '✅ PASS' : '❌ FAIL'}`);
    console.log('========================');
    
    if (summary.failed > 0) {
      console.log('\n❌ FAILURES:');
      this.errors.forEach((error, i) => {
        console.log(`${i + 1}. ${path.basename(error.testModule)} (after ${error.retries} retries)`);
        console.log(`   Error: ${error.error.message}`);
      });
    }
    
    console.log(`\nFull report saved to: ${reportFile}`);
  }

  /**
   * Send test results to Datadog
   * @param {object} report - Test report
   */
  sendToDatadog(report) {
    if (!tracer) return;

    try {
      const span = tracer.startSpan('test.report');
      span.setTag('test.total', report.summary.total);
      span.setTag('test.passed', report.summary.passed);
      span.setTag('test.failed', report.summary.failed);
      span.setTag('test.duration', report.summary.duration);
      span.setTag('test.success', report.summary.failed === 0);

      // Add detailed results for each test
      report.results.forEach((result, i) => {
        span.setTag(`test.${i}.name`, path.basename(result.testModule, '.js'));
        span.setTag(`test.${i}.success`, result.success);
        span.setTag(`test.${i}.retries`, result.retries);
        if (!result.success && result.error) {
          span.setTag(`test.${i}.error`, result.error.message || 'Unknown error');
        }
      });

      span.finish();
      console.log('✅ Test results sent to Datadog');
    } catch (e) {
      console.error('Failed to send results to Datadog:', e);
    }
  }
}

// Main function
async function main() {
  try {
    // Create test suite manager
    const testManager = new TestSuiteManager(CONFIG);
    
    // Queue tests - in a real implementation, these could be discovered dynamically
    testManager.queueTest(path.join(__dirname, 'modules/header-test.js'));
    testManager.queueTest(path.join(__dirname, 'modules/footer-test.js'));
    testManager.queueTest(path.join(__dirname, 'modules/resources-test.js'));
    testManager.queueTest(path.join(__dirname, 'modules/observations-test.js'));
    testManager.queueTest(path.join(__dirname, 'modules/navigation-test.js'));
    testManager.queueTest(path.join(__dirname, 'modules/mobile-test.js'));

    // Run all tests
    const success = await testManager.runTests();
    
    // Exit with appropriate code
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('Fatal error in test runner:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('Unhandled error in main:', err);
    process.exit(1);
  });
}

module.exports = { TestSuiteManager };
