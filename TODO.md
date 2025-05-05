# AI Tools Experiment Project TODO

## Environment Alignment and Upgrade Tasks

Our goal is to make the test environment match the production environment while migrating to Astro v5. All recommendations are based on official documentation.

### Docker Configuration

- [x] Switch from Ubuntu base image to official Node 22 images in all Dockerfiles
- [x] Update npm to v11.3.0 across all environments
- [x] Configure Dockerfiles to properly handle native module builds
- [x] Add proper build dependencies for Puppeteer in test and dev environments
- [x] Fix ARM64 architecture native module issues with Rollup and ESBuild (tested and verified)
- [x] Create entrypoint script to ensure correct cross-architecture compatibility (tested and verified)
- [x] Add comprehensive testing for ARM64 native modules in Docker environment
- [x] Fix GitHub Actions workflow for proper Datadog API key handling
- [x] Verify Docker configurations using [Docker best practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/) for Node.js applications (verified: smaller base images, non-root user, direct node execution)
- [x] Ensure multi-stage builds are implemented where appropriate per [Docker docs](https://docs.docker.com/build/building/multi-stage/) (verified: 1.39GB production image vs 2.32GB dev image)
- [x] Create development and production Docker Compose configurations that match Netlify environments (verified: NETLIFY=true and CONTEXT=production present)
- [ ] Verify proper `HANDLE_404_WARNINGS` environment variable functionality
- [ ] Further optimize container networking configuration

### GitHub Actions and CI/CD Workflow
- [ ] Fix lint errors related to DD_API_KEY secret context handling
- [ ] Improve environment variable handling in conditional steps

### Monitoring and Datadog Integration

- [x] Create scripts to send Docker build logs to Datadog
- [x] Implement log checking for deprecated package warnings
- [ ] Configure proper RUM (Real User Monitoring) based on [Datadog RUM documentation](https://docs.datadoghq.com/real_user_monitoring/browser/)
- [ ] Set up API testing with Datadog synthetic monitoring per [official documentation](https://docs.datadoghq.com/synthetics/api_tests/)
- [ ] Implement browser tests using proper CSS validation techniques
- [ ] Configure Datadog APM for Node.js applications following [official instructions](https://docs.datadoghq.com/tracing/trace_collection/dd_libraries/nodejs/)
- [ ] Integrate Datadog API collection from Postman (https://www.postman.com/datadog/datadog-s-public-workspace/collection/yp38wxl/datadog-api-collection)
- [ ] Verify RUM data is properly collected in Datadog dashboard

### Dependency Management

- [x] Update glob to v9.3.5
- [x] Update rimraf to v6.0.1
- [x] Replace deprecated inflight package with lru-cache
- [x] Add resolutions/overrides in package.json to handle transitive dependencies

### ARM64 Compatibility Implementation Strategy

#### Fix ESBuild Version Mismatch
- [x] Detect installed version

### Netlify Deployment and Testing

- [x] Create comprehensive post-deployment test suite using Vitest
- [x] Implement Netlify post-build verification script to diagnose dependency issues
- [x] Update GitHub Actions workflow to handle environment variables properly
- [x] Configure Netlify environment to use the same Docker entrypoint script for build consistency
- [ ] Apply Terraform configuration with actual Datadog credentials
  ```bash
  cd terraform
  terraform apply -var datadog_api_key=YOUR_DD_API_KEY -var datadog_app_key=YOUR_DD_APP_KEY
  ```
- [ ] Fix dependency installation failures in Netlify builds
- [ ] Create Netlify-specific build script that properly handles ARM64 dependencies
- [ ] Update netlify.toml configuration to avoid using docker-entrypoint.sh in build process

#### Cross-Architecture Compatibility Testing
- [x] Test native module dependency installation on local x64 environment (Docker)
- [x] Test native module dependency installation on local ARM64 environment (macOS)
- [x] Write test script to verify Rollup loads correctly regardless of architecture
- [x] Document architecture-specific differences between local and Netlify environments

#### Architecture Assumptions & Verification
- [x] Verify Netlify build environment is indeed x64-based (run architecture detection)
- [x] Test if npm bug #4828 affects Netlify x64 environment or only local ARM64 development
- [x] Test if symlinks for native modules work consistently in both environments
- [x] Document proper approach for supporting both architectures in one codebase

#### Datadog Monitoring & Deployment Verification
- [x] Set up basic Datadog API test to verify credentials and connectivity
- [ ] Create Datadog synthetic test with visual CSS validation for Netlify site
- [ ] Implement post-deployment hook to trigger Datadog synthetic tests
- [ ] Configure Datadog dashboard to visualize deployment success metrics
- [ ] Set up alerting for native module dependency failures in Netlify
- [x] Remove existing modules to prevent conflicts
- [x] Install exact matching version with architecture-specific binaries
- [x] Verify binary version matches package version
- [x] Implement secure API key handling with automated rotation using Netlify Functions

#### Docker Configuration Improvements
- [x] Use official Node images for better architecture support
- [x] Properly configure Docker Compose commands
- [x] Fix working directory issues with shell-based execution

#### Verification & Testing
- [x] Create test script covering all failure scenarios
- [x] Implement proper logging for Datadog monitoring
- [x] Test multiple container restart scenarios

#### Documentation & Maintenance
- [x] Add detailed technical documentation explaining approach
- [x] Update TODO list with verified items
- [x] Create reusable test script for ongoing verification
- [x] Document reference materials and official patterns used
- [ ] Implement package.json settings to ensure compatibility with [Node.js 22 features](https://nodejs.org/en/blog/release/v22.0.0)
- [ ] Review all dependencies for Astro v5 compatibility per [Astro upgrade guide](https://docs.astro.build/en/guides/upgrade-to/v5/)
- [ ] Document the correct HTML structure requirements
- [ ] Add component validation to CI process
- [ ] Update README with component validation instructions

### Path and URL Inconsistencies
- [ ] Fix inconsistent URLs between test and production:
     - Production: `https://ai-tools-lab.com/pages/observations`
     - Test: `https://ai-tools-lab-tst.netlify.app/observations`
- [ ] Diagnose why all 17 API Episode Page Tests are failing
- [ ] Create consistent paths between test and production environments
- [ ] Create consistent HTML structure between test and production
- [ ] Avoid URL pattern workarounds in test scripts
- [ ] Implement proper environment-aware testing

### Critical Project Priorities

> **HIGHEST PRIORITY: API Key Security**
- [ ] 1. Add patterns to .gitignore for Datadog configuration:
  ```
  # Datadog configuration
  .env.datadog
  **/datadog.config.js
  **/*.env*
  !.env.example
  ```
- [ ] 2. Implement pre-commit hook to check for API keys:
  - Create .git/hooks/pre-commit script
  - Add patterns for Datadog API keys
  - Test with sample API keys
  - Document bypass procedure for legitimate cases
- [ ] 4. Set up secret scanning service in CI/CD pipeline:
  - Configure GitHub secret scanning
  - Add Datadog API key patterns
  - Set up immediate notifications
  - Create incident response procedure

**THIS IS A CRITICAL SECURITY ISSUE - DO NOT SKIP THESE STEPS**

✅ **Completed Actions:**
- Repository history cleaned of sensitive data (including Terraform files)
- Verified no API keys remain in .tf, .tfvars files
- All API key references now use environment variables



> **HIGH PRIORITY 1: Error Handling Strategy**
   - [ ] Address all existing build errors directly rather than suppressing them
   - [ ] Fix GitHub Actions workflow DD_API_KEY context access errors in CI/CD configuration
   - [ ] Resolve syntax errors in datadog-sequential-test.js (missing commas, try/catch blocks)
   - [ ] Create detailed logging for all build stages in Datadog
   - [ ] Document known error patterns and proper resolution steps
   - [ ] Implement error notification system via Datadog
   - [ ] Add error recovery procedures to documentation

> **HIGH PRIORITY 2: Production Stability First**
   - [x] Ensure all changes maintain production environment uptime
   - [ ] Implement canary deployments for testing changes in limited production scope
   - [ ] Create automated rollback triggers based on error thresholds
   - [ ] Set up Datadog downtime alerts for production environment
   - [ ] Implement progressive rollout strategy for all infrastructure changes
   - [ ] Add production health dashboard in Datadog
   - [ ] Document incident response procedures
   
3. **Build Integrity**
   - [ ] Fix all current build failures before introducing new features
   - [ ] Implement pre-commit hook that runs full build verification
   - [ ] Block merges to main branch if builds fail
   - [ ] Add detailed build validation steps to CI pipeline
   
4. **Environment Promotion Flow**
   - [ ] Complete all test environment fixes before promoting to development
   - [ ] Create standard verification checklist for environment promotion
   - [ ] Implement automated promotion tests with Netlify CLI and Datadog CLI
   - [ ] Document the complete promotion workflow with necessary approvals
   
5. **Security and API Key Management**
   - [x] Implement Datadog SCA scans at all stages (pre-commit, post-commit, pre-push, post-push, pre-deploy)
   - [x] Set up secret scanning to prevent API key leakage
   - [x] Create zero-tolerance policy document for API key management
   - [x] Migrate sensitive values to Netlify environment variables
   - [x] Add Datadog security monitoring for unauthorized access attempts
   - [x] Implement automated API key rotation system using Netlify Functions and scheduled jobs
   - [x] Create comprehensive documentation on secure API key handling
   - [x] Add verification test script for key rotation system
   - [ ] Add notification webhook configuration for key rotation events
   - [ ] Implement automatic GitHub Actions secret updates post-rotation

#### Build Performance Testing and Optimization

> Note: Build performance testing has been moved to a separate project to avoid conflicting with the main application testing. The decision has been made to use Rspack for improved build performance.

- [x] Benchmark and document Rspack performance compared to alternatives
- [x] Decision made: Use Rspack as primary bundler replacement for esbuild

## Critical: Site Content Mismatch

- [ ] Fix content mismatch between https://ai-tools-lab.com and https://ai-tools-lab-tst.netlify.app
  - [ ] Compare and sync HTML content from production site
  - [ ] Verify all pages and routes match
  - [ ] Re-run all tests to ensure functionality
  - [ ] Update Astro v5 templates to match production styling

## Decision
- [ ] Create new repository `build-perf-testing` for isolated build performance testing
- [ ] Move existing build comparison tests to new repository
- [ ] Document build performance testing methodology

#### Rspack Migration Strategy

- [ ] Create POC branch with Rspack configuration equivalent to current ESBuild setup
- [ ] Update Docker configuration to properly support Rspack in all environments
- [ ] Modify CI/CD pipeline to use Rspack for builds
- [ ] Create comprehensive test suite for validating Rspack output matches ESBuild
- [ ] Document Rspack-specific configuration details and plugin usage
- [ ] Address any ARM64/x64 compatibility issues in Rspack setup
- [ ] Verify production build output size and performance metrics
- [ ] Train team on Rspack configuration and troubleshooting

#### Additional Build Tool Research

- [ ] Continue monitoring Rolldown development for future adoption when stable
- [ ] Evaluate Bazel for potential long-term enterprise build solution
- [ ] Document migration path from Rspack to Bazel if justified by project scale

### Astro v5 Migration

- [ ] Upgrade Astro to v5 following the [official migration guide](https://docs.astro.build/en/guides/upgrade-to/v5/)
- [ ] Update configuration in astro.config.mjs for v5 compatibility
- [ ] Refactor code to use new Astro v5 APIs and features
- [ ] Test all components with Astro v5's new rendering system
- [ ] Implement [Astro v5 View Transitions](https://docs.astro.build/en/guides/view-transitions/) for improved UX

### Netlify Configuration

- [ ] Create or update netlify.toml to specify build settings that match Docker environments
- [ ] Configure Node.js version in Netlify to match Docker (v22.x) using [Netlify dependency management](https://docs.netlify.com/configure-builds/manage-dependencies/)
- [ ] Set appropriate environment variables in Netlify to match Docker configuration
- [ ] Implement build hooks for testing per [Netlify build hooks documentation](https://docs.netlify.com/configure-builds/build-hooks/)
- [ ] Ensure proper caching configurations per [Netlify build caching docs](https://docs.netlify.com/configure-builds/setting-cache-control-headers/)

### Testing Infrastructure

- [ ] Update test configuration to work with Docker and Netlify environments
- [ ] Ensure consistent path handling between test and production environments
- [ ] Implement visual regression testing with proper browser automation
- [ ] Update Datadog synthetic tests using Terraform for both structural and visual validations
- [ ] Create comprehensive test documentation for future developers

## Verification Steps

1. Build and run all Docker environments locally to verify configuration
2. Test Astro v5 components in Docker environment
3. Verify build process in Netlify matches local Docker results
4. Confirm Datadog integration is properly capturing metrics
5. Run all automated tests against both environments to ensure parity

## References

- [Docker Documentation](https://docs.docker.com/)
- [Node.js Documentation](https://nodejs.org/docs/latest-v22.x/api/)
- [Astro Documentation](https://docs.astro.build/)
- [Netlify Documentation](https://docs.netlify.com/)
- [Datadog Documentation](https://docs.datadoghq.com/)

> Note: Always verify assumptions against official documentation when implementing these changes. This TODO list should be updated as tasks are completed or new requirements emerge.
