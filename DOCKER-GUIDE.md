# Docker Configuration Guide

## Overview

This document provides detailed information about the Docker configuration used in the AI Tools Lab project, highlighting architecture compatibility considerations and proper environment variable usage.

**Repository Information**: This project is maintained in the **ryanmaclean/ai-tools-experiments** repository, not the jasonhand repository.

## Architecture Compatibility

The Docker configuration has been optimized to work across different processor architectures:

### Key Compatibility Features

1. **Cross-Architecture Support**
   - The `platform: linux/amd64` setting ensures consistent behavior across development environments
   - System-installed Chromium is used instead of Puppeteer's downloaded version for ARM compatibility

2. **Environment Variables in Dockerfile.dev**
   ```dockerfile
   ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
   ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
   ```
   - These settings ensure Puppeteer uses the system Chromium browser
   - Critical for ARM-based systems like Apple Silicon M1/M2

## Environment Variable Changes

### From Suppression to Handling

We've made a significant change in our approach to errors and warnings:

| Old Approach | New Approach |
|--------------|-------------|
| `SUPPRESS_404_WARNINGS=true` | `HANDLE_404_WARNINGS=true` |

This change reflects our commitment to properly address warnings rather than suppressing them. The new variable controls how 404 errors are categorized and reported in tests.

### Container Networking

We've updated the networking configuration to use Docker's internal DNS:

```yaml
# Proper networking configuration for Docker (uses Docker's internal hostname)
- TEST_URL=http://dev:4321
```

This enables proper communication between containers using service names instead of localhost.

## Running Tests in Docker

```bash
# Start the development environment
docker-compose up dev

# Run tests in a separate terminal
docker-compose up app

# Force rebuild all containers
docker-compose build --no-cache
docker-compose up dev
```

## Common Issues and Solutions

1. **Connection Refused Errors**
   - **Problem**: Tests cannot connect to the dev service
   - **Solution**: Ensure the dev service is fully started before running tests

2. **Chromium Failures on ARM**
   - **Problem**: Puppeteer can't find or run Chromium on ARM architecture
   - **Solution**: Verify the Dockerfile.dev has the correct Puppeteer environment variables

3. **Missing CSS Properties**
   - **Problem**: CSS validation tests fail even though elements exist
   - **Solution**: Ensure tests are querying the computed styles, not just checking element existence

## Future Improvements

1. Implement multi-stage builds to reduce image size
2. Add health checks to ensure services are ready before testing
3. Further optimize for ARM64 architecture for better cloud cost efficiency

## Testing Docker Configuration

Before pushing to the dev branch, verify:

1. Both dev and app services start successfully
2. Tests can connect to the dev service
3. CSS properties are correctly validated
4. 404 warnings are properly handled and reported
5. Configuration works on both x86 and ARM architectures
