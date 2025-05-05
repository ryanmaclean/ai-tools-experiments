# Build Performance Testing

This directory contains all build performance testing for comparing different bundlers (esbuild, Rspack, etc.) in various environments. All build performance related code has been consolidated here to keep it separate from the main application.

## Directory Structure

```
build-perf-testing/
├── docker/           # Docker configuration for build testing
├── results/          # Test results and benchmarks
└── scripts/          # Test implementation files
```

## Available Tests

1. `build-tools-benchmark.js` - Main benchmark suite for comparing different bundlers
2. `performance-strategy.js` - Performance testing strategy implementation

## Running Tests

### Using Docker (Recommended)

```bash
# Run all bundler benchmarks
cd docker
docker-compose run --rm build-benchmark

# Run Rspack-specific benchmarks
docker-compose run --rm rspack-benchmark
```

### Local Development

```bash
# Install dependencies
npm install

# Run benchmarks
node scripts/build-tools-benchmark.js
```

## Results

Benchmark results are saved to `results/build-tools-benchmark-results.json`. This file contains:
- Individual build times for each tool
- Average build times
- Bundle size information
- Architecture compatibility details

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