<div align="center">

# AI Tools Lab - Experiment and Test Repository

<img src="public/images/ai-tools-lab-logo.webp" alt="AI Tools Lab Logo" width="150" />

_Advanced Monitoring and Testing Platform for AI Tools Experimentation_

</div>

## Recent Improvements

### Datadog RUM Integration and Synthetic Tests

- **Datadog RUM** (Real User Monitoring) has been successfully integrated using the CDN approach for better cross-platform compatibility
- **Synthetic Tests** have been updated to use the latest Datadog API format with proper assertion steps
- **Architecture-specific modules handling** has been implemented for better ARM64 compatibility
- **API Test Quota Management** implemented through test consolidation to stay within Datadog's 20-test quota

### Cross-Architecture Compatibility

- Added docker-entrypoint.sh script that detects architecture and ensures proper native modules for both ARM64 and x86
- Fixed environment variables handling in Docker configurations
- Improved native module handling for esbuild and rollup in different environments

> **Note:** Please see TODO.md for a complete list of remaining tasks and project priorities.

## Completed Tasks

- [x] Fix header CSS background color issue in synthetic tests
  - Fixed in Header.astro component by using `var(--secondary-color, #93ACB5)` for proper fallback
  - Enhanced both homepage.js and resources.js synthetic test templates with CSS property validation
  - Fixed CSS validation in the header and resource cards
  
- [x] Fix Docker build issues
  - Switched from Alpine to Ubuntu 24.04 for better native module compatibility
  - Updated Node.js to version 22.x (latest LTS as of May 2025)
  - Upgraded npm to version 11.3.0
  - Updated glob to version 11.0.2 and rimraf to version 6.0.1
  - Moved canvas to optionalDependencies and used --omit=optional for Docker builds
  - Added proper build dependencies for native modules
  - Fixed docker-compose.yml to remove obsolete version attribute
  
- [x] Updated Terraform for synthetic tests
  - Created css_validation_test.tf with proper CSS property validation
  - Fixed JavaScript syntax issues (replaced template literals with standard strings)
  - Fixed Terraform step types (changed from runJavascript to assertFromJavascript)
  - Test successfully validates header background color and text color
  
- [x] Fixed GitHub Actions workflow lint issues
  - Added fallback empty strings for all DD_API_KEY context variables
  - Added eslint disable comment for console statements in test files

## Running Tests with Docker

To run tests using the Docker environment:

```bash
# Make sure old containers are stopped
docker-compose down

# Start the test environment
docker-compose up -d test

# Run the tests
npm run synthetics:sequential
```

---

# AI Tools Lab 🧪

[![Netlify Status](https://api.netlify.com/api/v1/badges/94b1b695-e156-4836-9f22-aa64256e4d05/deploy-status)](https://app.netlify.com/sites/ai-tools-lab-tst/deploys)
[![Test Site](https://img.shields.io/badge/Test_Site-ai--tools--lab--tst.netlify.app-00C7B7?style=flat&logo=netlify)](https://ai-tools-lab-tst.netlify.app/)
[![Production](https://img.shields.io/badge/Production-ai--tools--lab.com-00C7B7?style=flat&logo=netlify)](https://ai-tools-lab.com/)
[![Datadog](https://img.shields.io/badge/Monitoring-Datadog-632CA6?style=flat&logo=datadog)](https://app.datadoghq.com/)

<a href="https://ai-tools-lab-tst.netlify.app/" target="_blank">
  <img src="https://github.com/user-attachments/assets/9e985980-4722-48d7-9cca-9caf4d3948d3" alt="AI Tools Lab Screenshot" width="600px" />
</a>

## About AI Tools Lab

AI Tools Lab provides ~30-40 minute recorded technical demonstrations of hands-on experiences with AI-related tooling for developers. The project aims to help teams navigate the rapidly evolving AI landscape through practical exploration and honest evaluation.

### Why AI Tools Lab Exists

As the definition of software development evolves with AI integration, our approach to developer advocacy must adapt accordingly. AI Tools Lab addresses this need by:

- **Hands-on Exploration**: Testing new AI tools in real development scenarios
- **Honest Evaluation**: Providing unfiltered feedback on tool effectiveness
- **Knowledge Sharing**: Creating accessible learning resources for the entire team
- **Collaborative Growth**: Building expertise together through shared experiments

### Mission & Goals

1. Educate and form evidence-based opinions on emerging AI technologies to better understand modern development challenges

2. Establish credibility as leaders in AI-enhanced engineering excellence and thought leadership

3. Share practical knowledge about new development approaches across all technical teams

4. Foster collaboration and collective learning among teammates

## Quick Start

This project contains the website for AI Tools Lab, a collection of experiments and resources related to AI tools.

### Prerequisites

- Node.js 22.x (latest LTS as of May 2025)
- npm 11.3.0 or higher
- Docker and Docker Compose (for running tests)
- Datadog account (for monitoring)

### Package Version Requirements

This project requires the following specific package versions to ensure compatibility:

- glob: ^9.3.5 (ensuring compatibility with Node.js modules)
- rimraf: ^6.0.1

The Docker images have been updated to use Ubuntu 24.04 for better compatibility with native Node.js modules, particularly for ARM architectures.

### Installation

```bash
# Clone the repository
git clone https://github.com/jasonhand/ai-tools-experiments.git
cd ai-tools-experiments

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration values
```

### Development

```bash
# Start the development server
npm run dev

# The site will be available at http://localhost:4321
```

### Testing

```bash
# Run sequential tests (recommended for local development)
npm run synthetics:sequential

# Run multithreaded tests (faster, used in CI/CD)
npm run synthetics:parallel

# Run component-specific tests
npm run test:components
```

### Deployment

The project is automatically deployed to Netlify when changes are pushed to the main branch.

```bash
# Manual deployment
npm run build
# Deploy using Netlify CLI (if installed)
npm run deploy
```

### Datadog Integration

Monitoring is provided through Datadog. Set your API key in the `.env` file:

```
DD_API_KEY=your_api_key_here
```

Activate various Datadog features:

```bash
# Run with Datadog Application Security
DD_APPSEC_ENABLED=true npm run dev

# Run with Datadog Profiler
DD_PROFILING_ENABLED=true npm run dev

# Run with minimal security monitoring (no APM)
DD_APM_TRACING_ENABLED=false DD_APPSEC_ENABLED=true npm run dev
```

## Directory Structure

- `src/`: Source files for the Astro project
  - `pages/`: Astro pages (routes)
    - `[slug].astro`: Dynamic route for episode pages
    - `index.astro`: Main page listing episodes
    - `resources.astro`: Resources page
    - `observations.astro`: Observations page
  - `content/`: Content files
    - `transcripts/`: HTML transcript files for episodes
  - `components/`: Reusable Astro components
  - `layouts/`: Page layouts
- `public/`: Static assets served at the root
  - `images/`: Image files used throughout the site
  - `styles.css`: Main stylesheet for the site
- `proxy/`: Netlify functions
  - `datadog-proxy.js`: Datadog monitoring proxy
- `script.js`: JavaScript functionality for Datadog monitoring
- `tests/`: Automated tests
  - `docker-build-test.js`: Puppeteer tests for Docker builds
  - `run-tests.sh`: Test runner script
- `terraform/`: Infrastructure as code for Datadog monitoring
  - `datadog_synthetics.tf`: Synthetic test definitions
  - `api_tests.tf`: API tests for episode pages

# AI Tools Lab - Datadog Synthetic Tests

This repository contains the configuration and verification scripts for Datadog synthetic tests across multiple environments.

## Environments

### Development (DEV)
- URL: https://ai-tools-lab-dev.netlify.app
- Build Command: `npm run build`
- Environment Variables:
  ```bash
  DD_SITE=datadoghq.com
  DD_ENV=development
  DD_VERSION=1.0.0
  ```
- Build Flags:
  ```bash
  netlify build --context=development \
    --build-command="npm run build" \
    --publish-dir="dist" \
    --functions-dir="netlify/functions" \
    --environment="DD_ENV=development"
  ```

### Test (TST)
- URL: https://ai-tools-lab-tst.netlify.app
- Build Command: `npm run build`
- Environment Variables:
  ```bash
  DD_SITE=datadoghq.com
  DD_ENV=test
  DD_VERSION=1.0.0
  ```
- Build Flags:
  ```bash
  netlify build --context=deploy-preview \
    --build-command="npm run build" \
    --publish-dir="dist" \
    --functions-dir="netlify/functions" \
    --environment="DD_ENV=test"
  ```

### Production (PRD)
- URL: https://ai-tools-lab.com
- Build Command: `npm run build`
- Environment Variables:
  ```bash
  DD_SITE=datadoghq.com
  DD_ENV=production
  DD_VERSION=1.0.0
  ```
- Build Flags:
  ```bash
  netlify build --context=production \
    --build-command="npm run build" \
    --publish-dir="dist" \
    --functions-dir="netlify/functions" \
    --environment="DD_ENV=production"
  ```

## Build Configuration

The project uses the following build configuration:

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[build.environment]
  DD_SITE = "datadoghq.com"
  DD_ENV = "development"
  DD_VERSION = "1.0.0"

[[build.plugins]]
  package = "./netlify/plugins/datadog-build-plugin"

[functions]
  node_bundler = "esbuild"
  external_node_modules = ["@datadog/browser-rum", "@datadog/browser-synthetics"]
```

## Test Components

The following components are verified across all environments:

1. API Tests
   - Health check endpoint
   - API endpoints validation
   - Response time monitoring

2. Browser Tests
   - Functionality verification
   - Responsive design testing
   - Navigation testing

3. Visual Regression Tests
   - Desktop view comparison
   - Mobile view comparison
   - Layout stability checks

4. Performance Tests
   - First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)
   - Time to Interactive (TTI)
   - Cumulative Layout Shift (CLS)

5. Security Tests
   - Security headers verification
   - Content Security Policy (CSP)
   - XSS protection

## Verification Process

To verify all synthetic tests:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the verification script:
   ```bash
   npm run verify:synthetics
   ```

The script will:
- Test each component across all environments
- Generate detailed verification reports
- Save results to `verification-results/verification-results.json`
- Provide a summary of verification status

## CSS Validation Testing

This project includes comprehensive CSS validation tests using Playwright to ensure visual consistency, proper styling, and accessibility across all components.

### Setting Up CSS Validation Tests

1. Install dependencies:
   ```bash
   npm install
   ```

2. Verify CSS validation tests are properly configured:
   ```bash
   npm run test:css
   ```

3. Run the CSS validation tests with Playwright:
   ```bash
   npx playwright test tests/datadog-synthetic/css-validation-tests.js
   ```

### CSS Validation Features

- **Comprehensive Property Testing**: Validates colors, typography, spacing, and layout properties
- **Accessibility Checks**: Ensures text contrast ratios meet WCAG standards
- **Responsive Design Validation**: Tests layout adaptability across mobile, tablet, and desktop viewports
- **Integration with Datadog**: CSS validation tests are managed through Terraform for Datadog synthetic monitoring

The CSS validation test results will be available in the `test-reports` directory.

## Application Performance Monitoring (APM)

This project uses Datadog APM to monitor application performance, track transactions, and identify bottlenecks across services.

### Setting Up Datadog APM

1. The required packages are already installed:
   ```bash
   # Already included in package.json
   npm install dd-trace
   ```

2. Verify the APM integration is properly configured:
   ```bash
   npm run test:apm
   ```

3. To enable APM in your local environment, ensure these environment variables are set in your `.env.local` file:
   ```
   DD_ENV=development  # or test, production
   DD_SERVICE=ai-tools-lab
   DD_VERSION=1.0.0    # Should match package.json version
   DD_API_KEY=your_datadog_api_key
   DD_APP_KEY=your_datadog_application_key
   ```

### APM Configuration

The APM tracer is initialized in `utils/datadog-tracer.js` and should be imported first in your application entry points. When running in Docker, it automatically connects to the Datadog agent.

### APM Features

- **Automatic Instrumentation**: Tracks Express routes, HTTP requests, and database queries
- **Custom Tagging**: Routes and services are tagged for better filtering in Datadog
- **Performance Analytics**: Identifies slow endpoints and bottlenecks
- **Error Tracking**: Captures and reports errors with stack traces
- **Distributed Tracing**: Follows requests across services

When running with Docker Compose, use the following command to ensure environment variables are properly loaded:
```bash
source ~/.zshrc && docker compose up --build
```

## Datadog API Integration

This project includes a comprehensive wrapper for the Datadog API client that implements endpoints from the official Postman collection.

### Setting Up Datadog API Client

1. The required packages are already installed:
   ```bash
   # Already included in package.json
   npm install @datadog/datadog-api-client
   ```

2. Verify the API integration is properly configured:
   ```bash
   npm run test:api
   ```

3. To use the API client in your code, import it from the utils directory:
   ```javascript
   const datadogApi = require('./utils/datadog-api-client');
   
   // Example: Get all synthetic tests
   async function getSyntheticTests() {
     const result = await datadogApi.synthetics.getAllTests();
     if (result.success) {
       console.log('Tests:', result.data);
     }
   }
   ```

### API Categories

The client provides access to these Datadog API categories from the Postman collection:

- **Synthetics API**: Create, manage, and trigger synthetic tests
- **Monitors API**: Configure and check monitoring alerts
- **Dashboards API**: Manage Datadog dashboards
- **Events API**: Send and query events

Each API response follows a consistent format with `success` flag and either `data` or `error` properties.

## Verification Results

The verification results include:
- Timestamp of verification
- Status for each environment
- Detailed test results for each component
- Pass/fail status for individual tests

## Environment-Specific Configurations

- Production: Stricter thresholds and more frequent checks
- Test: Moderate thresholds and regular checks
- Development: More lenient thresholds and less frequent checks

## Monitoring and Alerts

### Netlify CSS Validation Tests

This project includes a comprehensive Datadog synthetic test that validates CSS styling and visual consistency on the deployed Netlify site.

#### Setting Up Netlify CSS Validation

1. The test configuration is defined in Terraform:
   ```bash
   # View the test definition
   cat terraform/netlify_css_validation_test.tf
   ```

2. Deploy the test to Datadog programmatically:
   ```bash
   npm run deploy:css-test
   ```

3. Verify the test configuration is valid:
   ```bash
   npm run test:netlify-css
   ```

#### Visual Validation Features

- **Color Scheme Validation**: Ensures consistent colors across the site
- **Typography Validation**: Verifies fonts, sizes, and text styling
- **Responsive Design**: Tests layout on mobile, tablet, and desktop viewports
- **Accessibility Checks**: Validates WCAG contrast ratios and interactive elements
- **Automated Monitoring**: Runs every 15 minutes during business hours

The test automatically alerts the team when visual inconsistencies are detected in the production environment.

### Post-Deployment Test Triggering

This project implements automatic triggering of Datadog synthetic tests after deployment via the Datadog CLI.

#### How It Works

1. After a successful Netlify build, the post-build script (`scripts/netlify-postbuild.js`) runs automatically
2. This script triggers the Datadog CLI wrapper (`scripts/trigger-datadog-tests.js`) 
3. The CLI wrapper:  
   - Ensures the Datadog CLI is installed
   - Configures it with the project's API keys
   - Finds the CSS validation test by name
   - Triggers the test with deployment-specific variables
   - Posts a deployment event to the Datadog Events stream

#### Triggering Tests Manually

```bash
# Ensure environment variables are set
export DD_API_KEY=your_api_key
export DD_APP_KEY=your_app_key
export DEPLOY_ID=manual-trigger-123
export SITE_NAME=your-site-name

# Run the trigger script
node scripts/trigger-datadog-tests.js
```

#### Benefits of the CLI Approach

- **Security**: API keys are handled securely and never logged
- **Reliability**: Direct integration with Datadog's official CLI tool
- **Visibility**: Test results and deployment events are properly linked in Datadog
- **Extensibility**: Easy to add more test types to the trigger process


All synthetic tests are configured to:
- Run at specified intervals
- Trigger alerts on failures
- Create incidents in Datadog
- Generate performance reports

## Maintenance

To maintain the synthetic tests:
1. Regularly review and update test thresholds
2. Monitor test results and adjust configurations
3. Update baseline screenshots for visual regression tests
4. Review and update security headers as needed

## Troubleshooting

If tests fail:
1. Check the verification results for specific failures
2. Review the Datadog dashboard for detailed error information
3. Verify environment accessibility
4. Check for configuration changes that might affect tests

## Contributing

When adding new tests:
1. Add the test configuration to `terraform/datadog/synthetics.tf`
2. Update the verification script in `scripts/verify-synthetics.js`
3. Add appropriate test cases to the verification process
4. Update this documentation
