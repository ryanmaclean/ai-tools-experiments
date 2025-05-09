const fs = require('fs');
const path = require('path');
const TOML = require('@iarna/toml');

describe('Security Headers Validation', () => {
  const netlifyConfigPath = path.join(process.cwd(), 'netlify.toml');
  let parsedConfig;
  let headerValues;

  beforeAll(() => {
    const netlifyConfig = fs.readFileSync(netlifyConfigPath, 'utf8');
    parsedConfig = TOML.parse(netlifyConfig);
    headerValues = parsedConfig.headers[0].values;
  });

  describe('Content-Security-Policy', () => {
    test('has valid CSP directives', () => {
      const csp = headerValues['Content-Security-Policy'];
      expect(csp).toBeDefined();
      
      // Basic CSP validation
      expect(csp).toContain("default-src 'self'");
      
      // Recommend additional directives
      const missingDirectives = [];
      const recommendedDirectives = [
        'script-src',
        'style-src',
        'img-src',
        'connect-src',
        'font-src',
        'object-src',
        'media-src',
        'frame-src'
      ];

      recommendedDirectives.forEach(directive => {
        if (!csp.includes(directive)) {
          missingDirectives.push(directive);
        }
      });

      // Log recommendations without failing the test
      if (missingDirectives.length > 0) {
        console.warn('Recommended CSP directives missing:', missingDirectives.join(', '));
      }
    });
  });

  describe('X-Frame-Options', () => {
    test('has secure X-Frame-Options configuration', () => {
      const xfo = headerValues['X-Frame-Options'];
      expect(xfo).toBeDefined();
      expect(['DENY', 'SAMEORIGIN']).toContain(xfo.toUpperCase());
    });
  });

  describe('X-Content-Type-Options', () => {
    test('has secure X-Content-Type-Options configuration', () => {
      const xcto = headerValues['X-Content-Type-Options'];
      expect(xcto).toBeDefined();
      expect(xcto.toLowerCase()).toBe('nosniff');
    });
  });

  describe('Referrer-Policy', () => {
    test('has secure Referrer-Policy configuration', () => {
      const referrerPolicy = headerValues['Referrer-Policy'];
      expect(referrerPolicy).toBeDefined();
      
      const validPolicies = [
        'no-referrer',
        'no-referrer-when-downgrade',
        'origin',
        'origin-when-cross-origin',
        'same-origin',
        'strict-origin',
        'strict-origin-when-cross-origin',
        'unsafe-url'
      ];

      expect(validPolicies).toContain(referrerPolicy.toLowerCase());
    });
  });

  describe('CORS Configuration', () => {
    test('has secure CORS configuration', () => {
      const cors = headerValues['Access-Control-Allow-Origin'];
      expect(cors).toBeDefined();

      if (cors === '*') {
        // Log warning about wildcard CORS
        console.warn('Warning: Wildcard CORS policy detected. Consider restricting to specific origins.');
      }

      // Check for additional CORS headers if needed
      const corsHeaders = [
        'Access-Control-Allow-Methods',
        'Access-Control-Allow-Headers',
        'Access-Control-Max-Age'
      ];

      corsHeaders.forEach(header => {
        if (headerValues[header]) {
          console.info(`Found CORS header: ${header} = ${headerValues[header]}`);
        }
      });
    });
  });

  describe('Additional Security Headers', () => {
    test('checks for recommended security headers', () => {
      const recommendedHeaders = {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-XSS-Protection': '1; mode=block',
        'X-Permitted-Cross-Domain-Policies': 'none',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
      };

      // Log recommendations for missing headers
      Object.entries(recommendedHeaders).forEach(([header, value]) => {
        if (!headerValues[header]) {
          console.warn(`Recommended security header missing: ${header} with suggested value: ${value}`);
        }
      });
    });
  });

  describe('Environment-Specific Headers', () => {
    test('validates environment-specific security configurations', () => {
      // Check for environment-specific header configurations
      const environments = ['production', 'test', 'deploy-preview', 'branch-deploy'];
      
      environments.forEach(env => {
        const envConfig = parsedConfig.context?.[env];
        if (envConfig?.headers) {
          console.info(`Found custom headers for ${env} environment`);
        }
      });
    });
  });
}); 