# ARM64 Docker Native Module Solution

## Problem Summary
Running Node.js applications in Docker containers on ARM64 architecture (like M1/M2 Macs) presents challenges with architecture-specific native modules. Specifically:

1. **ESBuild** - Version mismatches between binary and host versions
2. **Rollup** - Missing ARM64-specific modules required for compilation
3. **Docker Volume Mounts** - Overriding native modules with incompatible architecture versions

## Solution Implemented

Following industry best practices and applying the principle of simplicity, we implemented a comprehensive solution:

### 1. Robust Entrypoint Script

We created `docker-entrypoint.sh` that:

- Detects the exact ESBuild version used in the project
- Completely removes and reinstalls architecture-specific modules
- Verifies binary versions post-installation
- Provides detailed logging for monitoring in Datadog

### 2. Docker Configuration Updates

- Switched to official Node 22 images for better compatibility
- Adjusted volume mounts to prevent overriding native modules
- Added Datadog monitoring labels for containerized processes
- Used standard shell command execution pattern in Docker Compose

### 3. GitHub Actions CI/CD Improvements

- Fixed Datadog API key handling using GitHub's best practices for secrets
- Added explicit environment variable passing
- Improved conditional step execution based on secret availability

### 4. Test Verification

Created a comprehensive test script (`test-arm64-modules.sh`) that validates:

- ESBuild version detection and matching
- Rollup native module installation
- Container restart stability
- Application accessibility
- Build process success

## How It Works

The solution uses a two-pronged approach:

1. **Prevention**: Using official Node images with proper architecture support
2. **Detection & Correction**: The entrypoint script detects and fixes issues at runtime

When a container starts, the entrypoint script:
1. Checks if architecture-specific modules are present
2. Detects package versions to ensure exact matches
3. Rebuilds any missing or mismatched modules
4. Verifies successful installation before starting the application

## Testing

Successfully tested with:
- Clean container starts
- Container restarts
- Build processes
- Multiple architecture scenarios

## Security Considerations

- Datadog API keys are properly secured in environment variables
- No sensitive information is logged or exposed in container output
- CI/CD workflow uses GitHub Actions best practices for secrets management

## Documentation References

- [Docker Best Practices for Node.js](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [ESBuild Platform-specific Binaries](https://esbuild.github.io/getting-started/#install-platform-specific-binaries)
- [Datadog Docker Integration](https://docs.datadoghq.com/integrations/docker_daemon/)
- [GitHub Actions Secrets Management](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
