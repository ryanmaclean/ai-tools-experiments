/**
 * Netlify Function for Datadog Monitoring
 * 
 * This function handles Datadog monitoring for Netlify deployments,
 * including deployment verification and synthetic test triggering.
 * 
 * It specifically targets the CSS validation test for the Netlify site
 * to ensure visual consistency across deployments.
 */

// Import our custom Datadog API client
const datadogApi = require('../../utils/datadog-api-client');

// Constants for CSS validation test
const CSS_VALIDATION_TEST_NAME = 'Netlify CSS Validation';

/**
 * Trigger the CSS validation synthetic test for Netlify
 * @returns {Promise<object>} Result of the test trigger operation
 */
async function triggerCssValidationTest() {
  try {
    if (!datadogApi.isReady()) {
      console.error('Datadog API client not initialized:', datadogApi.getStatus());
      return {
        success: false,
        error: 'Datadog API client not initialized'
      };
    }
    
    // First get all tests to find our CSS validation test
    const testsResponse = await datadogApi.synthetics.getAllTests();
    
    if (!testsResponse.success) {
      console.error('Failed to retrieve tests:', testsResponse.error);
      return testsResponse;
    }
    
    // Find the CSS validation test by name
    const cssValidationTest = testsResponse.data.tests.find(test => 
      test.name && test.name.includes(CSS_VALIDATION_TEST_NAME)
    );
    
    if (!cssValidationTest) {
      console.error(`CSS validation test '${CSS_VALIDATION_TEST_NAME}' not found`);
      return {
        success: false,
        error: `CSS validation test '${CSS_VALIDATION_TEST_NAME}' not found`
      };
    }
    
    console.log(`Found CSS validation test: ${cssValidationTest.name} (${cssValidationTest.public_id})`);
    
    // Trigger the specific CSS validation test
    const triggerResponse = await datadogApi.synthetics.triggerTest(cssValidationTest.public_id);
    
    if (triggerResponse.success) {
      console.log(`Successfully triggered CSS validation test ${cssValidationTest.public_id}`);
    } else {
      console.error(`Failed to trigger CSS validation test:`, triggerResponse.error);
    }
    
    return triggerResponse;
  } catch (error) {
    console.error('Failed to trigger CSS validation test:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Check the status of a deployment
 * @param {string} deploymentId - The deployment ID to check
 * @returns {Promise<boolean>} - Whether the deployment is successful
 */
async function checkDeploymentStatus(deploymentId) {
  try {
    if (!datadogApi.isReady()) {
      console.error('Datadog API client not initialized');
      return false;
    }
    
    // Get monitors with the deployment tag
    const monitorsResponse = await datadogApi.monitors.getAllMonitors({
      tags: [`deployment:${deploymentId}`]
    });
    
    if (!monitorsResponse.success) {
      console.error('Failed to retrieve monitors:', monitorsResponse.error);
      return false;
    }
    
    if (!monitorsResponse.data.monitors || monitorsResponse.data.monitors.length === 0) {
      console.log(`No monitors found for deployment ${deploymentId}`);
      return true; // No monitors means no failures
    }
    
    // Check if all monitors are in the OK state
    const allOk = monitorsResponse.data.monitors.every(
      monitor => monitor.overall_state === 'OK'
    );
    
    console.log(`Deployment ${deploymentId} monitor status: ${allOk ? 'OK' : 'Not OK'}`);
    return allOk;
  } catch (error) {
    console.error('Failed to check deployment status:', error);
    return false;
  }
}

/**
 * Netlify function handler for Datadog monitoring
 */
exports.handler = async function(event, context) {
  console.log('Datadog monitor function invoked', { 
    httpMethod: event.httpMethod,
    path: event.path,
    headers: Object.keys(event.headers || {})
  });
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { deploymentId, type, siteName, deploySha } = body;
    
    console.log('Processing deployment event', { deploymentId, type, siteName });

    // Record the deployment event in Datadog
    if (datadogApi.isReady() && deploymentId) {
      await datadogApi.events.postEvent({
        title: `Netlify Deployment: ${type}`,
        text: `Deployment ${deploymentId} for site ${siteName || 'unknown'} - Event: ${type}`,
        tags: [`deployment:${deploymentId}`, 'netlify', `site:${siteName || 'unknown'}`, `sha:${deploySha || 'unknown'}`],
        alertType: 'info',
        aggregationKey: `netlify-deploy-${deploymentId}`
      });
    }

    // Handle different types of monitoring events
    switch (type) {
      case 'deployment_start':
        // Create a monitor for this deployment if it doesn't exist
        if (datadogApi.isReady()) {
          const monitorResponse = await datadogApi.monitors.createMonitor({
            name: `Deployment ${deploymentId} Monitor`,
            type: 'synthetic alert',
            query: `avg(last_5m):avg:synthetics.http.response_time{deployment:${deploymentId}} > 1000`,
            message: `Deployment ${deploymentId} performance alert for site ${siteName || 'unknown'}`,
            tags: [`deployment:${deploymentId}`, 'netlify', `site:${siteName || 'unknown'}`]
          });
          
          console.log('Created deployment monitor', monitorResponse.success ? 
            { monitorId: monitorResponse.data?.id } : 
            { error: monitorResponse.error });
        }
        
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            success: true, 
            message: 'Deployment monitoring started' 
          })
        };

      case 'deployment_complete':
        console.log(`Processing completed deployment ${deploymentId}`);
        
        // Trigger the CSS validation test specifically
        const cssTestResult = await triggerCssValidationTest();
        const deploymentStatus = await checkDeploymentStatus(deploymentId);
        
        // Return detailed response about test trigger
        return {
          statusCode: cssTestResult.success && deploymentStatus ? 200 : 500,
          body: JSON.stringify({
            success: cssTestResult.success && deploymentStatus,
            cssValidation: {
              success: cssTestResult.success,
              testId: cssTestResult.success ? cssTestResult.data?.trigger_id : null,
              error: cssTestResult.success ? null : cssTestResult.error
            },
            deploymentStatus: deploymentStatus,
            timestamp: new Date().toISOString()
          })
        };

      case 'deployment_failed':
        // Record the failure in Datadog
        if (datadogApi.isReady()) {
          await datadogApi.events.postEvent({
            title: `Netlify Deployment Failed`,
            text: `Deployment ${deploymentId} for site ${siteName || 'unknown'} failed`,
            tags: [`deployment:${deploymentId}`, 'netlify', `site:${siteName || 'unknown'}`, 'failure'],
            alertType: 'error',
            aggregationKey: `netlify-deploy-${deploymentId}`
          });
        }
        
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            success: true, 
            message: 'Deployment failure recorded' 
          })
        };

      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ 
            error: 'Invalid event type', 
            receivedType: type 
          })
        };
    }

  } catch (error) {
    console.error('Error in Datadog monitoring function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message || 'Unknown error' 
      })
    };
  }
}; 