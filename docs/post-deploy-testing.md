# Post-Deployment Testing Guide

## Overview

This guide explains how to run post-deployment tests to verify that your application is working correctly in both test and production environments. The tests focus on two key areas:

1. Datadog RUM integration verification
2. Basic content accessibility

## Available Testing Scripts

### 1. Basic Post-Deployment Check

```bash
npm run post-deploy-check
```

This script performs basic validation of test and production environments:
- Verifies Datadog RUM integration
- Checks that critical navigation elements exist
- Takes screenshots for visual reference
- Logs results to Datadog (when API key is available)

### 2. Datadog RUM Verification

```bash
npm run verify-datadog
```

This script specifically focuses on verifying the Datadog RUM implementation:
- Checks for Datadog RUM script inclusion
- Verifies proper initialization of Datadog objects
- Detects potential duplicate initialization issues

## CI/CD Integration

### GitHub Actions Integration

To run these tests in GitHub Actions after deployment, add this to your workflow file:

```yaml
jobs:
  deploy-and-test:
    runs-on: ubuntu-latest
    steps:
      # Deployment steps here...
      
      - name: Wait for deployment to complete
        run: sleep 60 # Adjust based on your deployment time
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      
      - name: Run post-deployment tests
        run: npm run post-deploy-check
        env:
          DD_API_KEY: ${{ secrets.DD_API_KEY }}
```

### Netlify Build Plugin Integration

For Netlify deployments, you can use a post-deploy hook:

1. In your `netlify.toml` file, add:

```toml
[[plugins]]
package = "@netlify/plugin-functions-core"

[[plugins.inputs.postBuild]]
command = "npm run post-deploy-check"
```

2. Make sure to set the `DD_API_KEY` in your Netlify environment variables.

## Environment Variables

- `DD_API_KEY` - Your Datadog API key for logging test results
- `TEST_ENV` - Set to 'production' to focus tests on production environment

## Troubleshooting

### Test Failures

If tests fail, check:
1. Screenshot artifacts in the `test-results/` directory
2. Console output for specific error messages
3. Datadog logs for details on what failed

### Missing DD_RUM_INITIALIZED Flag in Production

This is a known issue that's currently being tracked. The test script treats it as a warning rather than a failure, but it should be addressed in a future update to prevent potential duplicate initialization.

## Adding New Tests

To add new checks to the post-deployment tests, modify `scripts/post-deploy-check.js` with additional test functions. Keep these principles in mind:

- Keep tests simple and focused
- Make sure they're stateless
- Log everything to Datadog
- Use minimal dependencies
- Provide clear error messages
