/**
 * Datadog API Client
 * 
 * A comprehensive wrapper for Datadog's API client that implements
 * endpoints from the official Postman collection:
 * https://www.postman.com/datadog/datadog-s-public-workspace/collection/yp38wxl/datadog-api-collection
 * 
 * This module provides simplified access to commonly used Datadog API endpoints
 * including Synthetic Monitoring, Monitors, Dashboards, and Events.
 * 
 * Authentication is handled automatically using the api-key-validator.js utilities.
 */

'use strict';

const { client, v1, v2 } = require('@datadog/datadog-api-client');
const { 
  getDatadogApiKey, 
  getDatadogAppKey, 
  maskSensitiveData,
  validateDatadogEnvironment
} = require('./api-key-validator');

// Configure the default Datadog API client
const configureClient = () => {
  const environment = validateDatadogEnvironment();
  
  if (!environment.isValid) {
    throw new Error('Invalid Datadog environment: Missing or invalid API/APP keys');
  }
  
  const configuration = client.createConfiguration({
    authMethods: {
      apiKeyAuth: getDatadogApiKey(),
      appKeyAuth: getDatadogAppKey()
    },
  });
  
  return { configuration, environment };
};

/**
 * Error handler for Datadog API calls
 * @param {Error} error - The caught error
 * @param {string} context - Context description of where the error occurred
 * @returns {object} - Standardized error object
 */
const handleApiError = (error, context) => {
  const sanitizedError = {
    message: maskSensitiveData(error.message),
    context,
    statusCode: error.statusCode || 'Unknown',
    errorCode: error.code || 'Unknown',
    timestamp: new Date().toISOString()
  };
  
  console.error(`Datadog API Error [${context}]:`, sanitizedError.message);
  
  return {
    success: false,
    error: sanitizedError
  };
};

/**
 * Synthetic Monitoring API wrapper
 * Provides access to create, update, and manage synthetic tests
 */
class SyntheticsApi {
  constructor(configuration) {
    this.apiInstance = new v1.SyntheticsApi(configuration);
  }
  
  /**
   * Get all synthetic tests
   * @returns {Promise<object>} - List of synthetic tests
   */
  async getAllTests() {
    try {
      const response = await this.apiInstance.listTests();
      return {
        success: true,
        data: response
      };
    } catch (error) {
      return handleApiError(error, 'getAllTests');
    }
  }
  
  /**
   * Get a specific synthetic test by ID
   * @param {string} testId - The synthetic test ID
   * @returns {Promise<object>} - Synthetic test details
   */
  async getTest(testId) {
    try {
      const response = await this.apiInstance.getTest({ publicId: testId });
      return {
        success: true,
        data: response
      };
    } catch (error) {
      return handleApiError(error, `getTest(${testId})`);
    }
  }
  
  /**
   * Trigger a synthetic test run
   * @param {string} testId - The synthetic test ID
   * @returns {Promise<object>} - Triggered test result
   */
  async triggerTest(testId) {
    try {
      const response = await this.apiInstance.triggerTests({
        body: {
          tests: [{ public_id: testId }]
        }
      });
      return {
        success: true,
        data: response
      };
    } catch (error) {
      return handleApiError(error, `triggerTest(${testId})`);
    }
  }
  
  /**
   * Get synthetic test results
   * @param {string} testId - The synthetic test ID
   * @param {object} options - Options like from/to times, limit
   * @returns {Promise<object>} - Test results
   */
  async getTestResults(testId, options = {}) {
    try {
      const params = {
        publicId: testId,
        ...options
      };
      
      const response = await this.apiInstance.getTestResults(params);
      return {
        success: true,
        data: response
      };
    } catch (error) {
      return handleApiError(error, `getTestResults(${testId})`);
    }
  }
}

/**
 * Monitors API wrapper
 * Provides access to create, update, and manage monitors/alerts
 */
class MonitorsApi {
  constructor(configuration) {
    this.apiInstance = new v1.MonitorsApi(configuration);
  }
  
  /**
   * Get all monitors
   * @param {object} options - Filter options
   * @returns {Promise<object>} - List of monitors
   */
  async getAllMonitors(options = {}) {
    try {
      const response = await this.apiInstance.listMonitors(options);
      return {
        success: true,
        data: response
      };
    } catch (error) {
      return handleApiError(error, 'getAllMonitors');
    }
  }
  
  /**
   * Get a specific monitor by ID
   * @param {number} monitorId - The monitor ID
   * @returns {Promise<object>} - Monitor details
   */
  async getMonitor(monitorId) {
    try {
      const response = await this.apiInstance.getMonitor({ monitorId });
      return {
        success: true,
        data: response
      };
    } catch (error) {
      return handleApiError(error, `getMonitor(${monitorId})`);
    }
  }
  
  /**
   * Get monitor status and history
   * @param {number} monitorId - The monitor ID
   * @returns {Promise<object>} - Monitor status/history
   */
  async getMonitorStatus(monitorId) {
    try {
      const params = {
        monitorId,
        groupStates: 'all'
      };
      
      const response = await this.apiInstance.getMonitorStateByCounts(params);
      return {
        success: true,
        data: response
      };
    } catch (error) {
      return handleApiError(error, `getMonitorStatus(${monitorId})`);
    }
  }
}

/**
 * Dashboards API wrapper
 * Provides access to create, update, and manage dashboards
 */
class DashboardsApi {
  constructor(configuration) {
    this.apiInstance = new v1.DashboardsApi(configuration);
  }
  
  /**
   * Get all dashboards
   * @returns {Promise<object>} - List of dashboards
   */
  async getAllDashboards() {
    try {
      const response = await this.apiInstance.listDashboards();
      return {
        success: true,
        data: response
      };
    } catch (error) {
      return handleApiError(error, 'getAllDashboards');
    }
  }
  
  /**
   * Get a specific dashboard by ID
   * @param {string} dashboardId - The dashboard ID
   * @returns {Promise<object>} - Dashboard details
   */
  async getDashboard(dashboardId) {
    try {
      const response = await this.apiInstance.getDashboard({ dashboardId });
      return {
        success: true,
        data: response
      };
    } catch (error) {
      return handleApiError(error, `getDashboard(${dashboardId})`);
    }
  }
}

/**
 * Events API wrapper
 * Provides access to post and query events
 */
class EventsApi {
  constructor(configuration) {
    this.apiInstance = new v1.EventsApi(configuration);
  }
  
  /**
   * Post an event to Datadog
   * @param {object} eventData - Event data
   * @returns {Promise<object>} - Created event
   */
  async postEvent(eventData) {
    try {
      const params = {
        body: {
          title: eventData.title,
          text: eventData.text,
          tags: eventData.tags || [],
          alertType: eventData.alertType || 'info',
          priority: eventData.priority || 'normal',
          host: eventData.host,
          aggregationKey: eventData.aggregationKey,
          sourceTypeName: eventData.sourceTypeName || 'api'
        }
      };
      
      const response = await this.apiInstance.createEvent(params);
      return {
        success: true,
        data: response
      };
    } catch (error) {
      return handleApiError(error, 'postEvent');
    }
  }
  
  /**
   * Get events matching query parameters
   * @param {object} options - Query options
   * @returns {Promise<object>} - Events matching criteria
   */
  async getEvents(options = {}) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const params = {
        start: options.start || (now - 3600), // Default to last hour
        end: options.end || now,
        priority: options.priority,
        sources: options.sources,
        tags: options.tags,
        unaggregated: options.unaggregated
      };
      
      const response = await this.apiInstance.listEvents(params);
      return {
        success: true,
        data: response
      };
    } catch (error) {
      return handleApiError(error, 'getEvents');
    }
  }
}

/**
 * Main Datadog API client that provides access to all API categories
 */
class DatadogApiClient {
  constructor() {
    try {
      const { configuration, environment } = configureClient();
      this.configuration = configuration;
      this.environment = environment;
      
      // Initialize API category clients
      this.synthetics = new SyntheticsApi(configuration);
      this.monitors = new MonitorsApi(configuration);
      this.dashboards = new DashboardsApi(configuration);
      this.events = new EventsApi(configuration);
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Datadog API client:', error.message);
      this.isInitialized = false;
      this.initError = error.message;
    }
  }
  
  /**
   * Check if the API client is properly initialized
   * @returns {boolean} - Initialization status
   */
  isReady() {
    return this.isInitialized;
  }
  
  /**
   * Get initialization status with details
   * @returns {object} - Initialization status and details
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      error: this.initError || null,
      environment: this.environment || null
    };
  }
}

// Export a singleton instance
const datadogApi = new DatadogApiClient();

module.exports = datadogApi;
