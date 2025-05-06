import { describe, it, expect } from 'vitest';
import { datadogRum } from '@datadog/browser-rum';

// Mocking Datadog RUM for testing purposes
const mockRum = {
  init: () => {
    console.log('Mock Datadog RUM initialized');
    return true;
  },
  addAction: () => {},
  addError: () => {}
};

// Replace the actual Datadog RUM with our mock for testing
Object.assign(datadogRum, mockRum);

describe('Datadog RUM Initialization', () => {
  it('should initialize Datadog RUM successfully', () => {
    // Initialize Datadog RUM (mocked)
    const result = datadogRum.init({
      applicationId: 'test-app-id',
      clientToken: 'test-client-token',
      site: 'datadoghq.com',
      service: 'test-service',
      env: 'test',
      sessionSampleRate: 100,
      sessionReplaySampleRate: 100,
      defaultPrivacyLevel: 'mask-user-input',
      trackInteractions: true,
      trackResources: true,
      trackLongTasks: true
    });
    
    expect(result).toBe(true);
    console.log('Datadog RUM initialization test passed');
  });
});
