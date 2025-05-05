# Build Performance Testing

This directory contains isolated build performance testing for comparing different bundlers (esbuild, Rspack, etc.) in various environments.

## Decision

After thorough testing and evaluation, we have decided to use Rspack as our primary bundler to replace esbuild. This decision was made based on:

1. Better build performance
2. Improved compatibility across architectures (AMD64/ARM64)
3. More consistent behavior in different environments (local, CI, production)

## Test Structure

- `tests/docker-build-test.js`: Docker-based build performance comparison tests
- Additional test files will be added as needed

## Running Tests

Tests should be run in isolation from the main application to avoid interference:

```bash
cd build-perf-testing
npm test
```

## Adding New Tests

When adding new build performance tests:
1. Create a new test file in the `tests` directory
2. Follow the existing pattern of measuring and comparing build times
3. Document any environment-specific requirements
4. Include both AMD64 and ARM64 test cases