# Post-Deploy Testing Framework

This directory contains a comprehensive post-deployment testing framework that automatically verifies consistency between test and production environments.

## Key Features

- **Visual Consistency Verification**: Compares pages across environments to ensure they look identical
- **URL Structure Testing**: Confirms that URL routing works correctly in both environments
- **Datadog RUM Verification**: Checks that Datadog RUM detects the correct environment
- **Comprehensive Logging**: All test results are logged to Datadog for observability

## Design Principles

This framework follows these key principles:

- **Stateless**: No persistent state between test runs
- **Minimal Dependencies**: Only requires Playwright
- **Datadog Integration**: All test metrics are captured in Datadog
- **Simple Design**: Easy to maintain and extend

## Usage

```bash
# Install dependencies
npm install

# Run post-deploy tests
npm run test:post-deploy

# Run with specific browser
npm run test:post-deploy:chrome

# Run tests against production only
TEST_ENV=production npm run test:post-deploy
```

## Extending the Tests

To add more pages to test, simply extend the `pagePaths` array in `tests/post-deploy-visual-comparison.js`.

## CI/CD Integration

These tests can be integrated into your CI/CD pipeline by adding a step after deployment:

```yaml
- name: Run post-deploy tests
  run: npm run test:post-deploy
  env:
    DD_API_KEY: ${{ secrets.DD_API_KEY }}
```

Test results will be automatically reported to Datadog and available in the Datadog dashboard.
