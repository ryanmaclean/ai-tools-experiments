const fs = require('fs');
const path = require('path');
const TOML = require('@iarna/toml');

describe('Netlify Configuration Tests', () => {
  const netlifyConfigPath = path.join(process.cwd(), 'netlify.toml');
  let netlifyConfig;
  let parsedConfig;

  beforeAll(() => {
    // Read the netlify.toml file
    netlifyConfig = fs.readFileSync(netlifyConfigPath, 'utf8');
    try {
      parsedConfig = TOML.parse(netlifyConfig);
    } catch (error) {
      console.error('Failed to parse TOML:', error);
      throw error;
    }
  });

  test('netlify.toml exists and is readable', () => {
    expect(fs.existsSync(netlifyConfigPath)).toBe(true);
    expect(netlifyConfig).toBeTruthy();
  });

  test('netlify.toml has valid TOML syntax', () => {
    expect(() => TOML.parse(netlifyConfig)).not.toThrow();
  });

  test('netlify.toml has required sections', () => {
    expect(parsedConfig.build).toBeDefined();
    expect(parsedConfig.build.environment).toBeDefined();
    expect(parsedConfig.build.lifecycle).toBeDefined();
    expect(parsedConfig.context.production).toBeDefined();
    expect(parsedConfig.context.test).toBeDefined();
    expect(parsedConfig.context['deploy-preview']).toBeDefined();
    expect(parsedConfig.context['branch-deploy']).toBeDefined();
    expect(parsedConfig.dev).toBeDefined();
    expect(parsedConfig.functions).toBeDefined();
  });

  test('netlify.toml has required environment variables', () => {
    const envVars = parsedConfig.build.environment;
    expect(envVars.NODE_VERSION).toBeDefined();
    expect(envVars.NPM_FLAGS).toBeDefined();
    expect(envVars.NETLIFY).toBeDefined();
    expect(envVars.DD_SITE).toBeDefined();
    expect(envVars.DD_ENV).toBeDefined();
    expect(envVars.DD_VERSION).toBeDefined();
  });

  test('netlify.toml has required redirects', () => {
    const redirects = parsedConfig.redirects;
    expect(redirects).toBeDefined();
    expect(Array.isArray(redirects)).toBe(true);

    const redirectPaths = redirects.map(r => r.from);
    expect(redirectPaths).toContain('/about');
    expect(redirectPaths).toContain('/resources');
    expect(redirectPaths).toContain('/observations');
    expect(redirectPaths).toContain('/pages/*');
    expect(redirectPaths).toContain('/api/*');
    expect(redirectPaths).toContain('/*');
  });

  test('netlify.toml has security headers', () => {
    const headers = parsedConfig.headers;
    expect(headers).toBeDefined();
    expect(headers[0].values).toBeDefined();

    const headerValues = headers[0].values;
    expect(headerValues['Access-Control-Allow-Origin']).toBeDefined();
    expect(headerValues['X-Frame-Options']).toBeDefined();
    expect(headerValues['X-Content-Type-Options']).toBeDefined();
    expect(headerValues['Referrer-Policy']).toBeDefined();
    expect(headerValues['Content-Security-Policy']).toBeDefined();
  });

  test('netlify.toml has proper environment conditions', () => {
    const redirects = parsedConfig.redirects;
    const conditions = redirects
      .filter(r => r.conditions)
      .map(r => r.conditions.host);

    expect(conditions).toContain('ai-tools-lab.com');
    expect(conditions).toContain('ai-tools-lab-tst.netlify.app');
  });

  test('netlify.toml has proper build plugin configuration', () => {
    const plugins = parsedConfig.build.plugins;
    expect(plugins).toBeDefined();
    expect(Array.isArray(plugins)).toBe(true);
    expect(plugins[0].package).toBe('./netlify/plugins/datadog-build-plugin');
  });

  test('netlify.toml has proper functions configuration', () => {
    const functions = parsedConfig.functions;
    expect(functions).toBeDefined();
    expect(functions.node_bundler).toBe('esbuild');
    expect(Array.isArray(functions.external_node_modules)).toBe(true);
    expect(functions.external_node_modules).toContain('@datadog/browser-rum');
    expect(functions.external_node_modules).toContain('@datadog/browser-synthetics');
  });
}); 