[![Netlify Status](https://api.netlify.com/api/v1/badges/94b1b695-e156-4836-9f22-aa64256e4d05/deploy-status)](https://app.netlify.com/sites/ai-tools-lab-tst/deploys)

[![Netlify](https://ai-tools-lab-tst.netlify.app/)](https://ai-tools-lab-tst.netlify.app/)

![image](https://github.com/user-attachments/assets/9e985980-4722-48d7-9cca-9caf4d3948d3)

# What is This? 

~30-40 minute recorded technical demonstrations of hands-on (early or first) experiences with AI-related tooling for developers.

# Why do This?

Helping the team and beyond to navigate the AI era by leading discussions, demos, and observations that are grounded in curiosity and honest experiences that can be shared in order to remain leaders, not laggers, through this transition.

# Why Now?

What it means to be a developer is is changing rapidly. Therefore, what it means to be a developer advocate is changing rapidly.

# Goals

1. To educate ourselves and form opinions on new (AI-related) technologies, tools, and processes in order to better understand today's challenges, solutions, and current thinking in order to be a better advocate for the modern developer

2. Build credibility and reputation as leaders in engineering excellence as it relates to AI developer tools and thought leadership

3. Educate team about new technology and approaches in our space

4. Collaboration with teammates

# AI Tools Lab

This project contains the website for AI Tools Lab, a collection of experiments and resources related to AI tools.

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

## Running Locally

### Using Astro Dev Server

To run the website locally using the Astro development server:

```bash
npm install  # Install dependencies
npm run dev  # Start development server
```

Then open your browser to http://localhost:4321

### Using Docker

Alternatively, you can run the website using Docker with our enhanced development environment:

```bash
# Start the development environment with hot-reloading
./scripts/docker-start.sh

# OR manually with docker-compose
docker-compose up dev
```

This will build and serve the site with hot-reloading at http://localhost:4321 (or higher port if 4321 is in use).

#### Docker Development Features

- **Hot-Reloading**: Changes to your source files are immediately reflected in the browser
- **Multiple Service Modes**:
  - `dev`: Development mode with hot-reloading (`docker-compose up dev`)
  - `prod`: Production preview mode (`docker-compose up prod` or `./scripts/docker-start.sh --prod`)
- **Port Range**: Supports Astro's automatic port shifting (4321-4325)
- **Optimized Volumes**: Prevents node_modules and dist from being overwritten
- **Helper Scripts**:
  - `./scripts/docker-start.sh`: Start the development environment
  - `./scripts/docker-start.sh --prod`: Start the production preview
  - `./scripts/docker-start.sh --rebuild`: Force rebuild of images
  - `./scripts/docker-cleanup.sh`: Clean up Docker resources

#### Docker Environment Management

```bash
# Force rebuild of development environment
./scripts/docker-start.sh --rebuild

# Run in production preview mode
./scripts/docker-start.sh --prod

# Clean up Docker resources
./scripts/docker-cleanup.sh

# Deep clean (removes all project images)
./scripts/docker-cleanup.sh --all
```

### Running Tests

To run the automated tests:

```bash
./tests/run-tests.sh
```

This will build the Docker container, run the Puppeteer tests, and trigger a Netlify deployment if tests pass.

#### Using Docker for Consistent Testing

For the most reliable testing environment, always use Docker when running tests:

```bash
# Start Docker container
docker-compose up -d

# Run tests against the Docker container
node tests/comprehensive-site-test.js --port=4321
```

This ensures consistent testing across different machines and environments.

#### Browser Preview

The comprehensive test script now includes improved visual validation that works well with the browser preview tool. This helps you visually verify the site's appearance while automated tests run in the background.

#### Improved Testing Framework

* **Dynamic Port Detection**: The test script now automatically detects the correct port being used by the Astro server
* **Enhanced Error Reporting**: Clear visual indicators (✅, ❌, ⚠️) and detailed error messages
* **Robust Navigation**: Uses direct navigation patterns instead of click+wait for more reliable testing
* **Better Error Handling**: Properly distinguishes between warnings and critical errors

### Git Hooks

This project includes Git hooks to automate testing after commits:

- **post-commit**: Automatically runs tests after each commit to ensure code quality

To install the Git hooks, run either:

```bash
# Using the shell script directly
./hooks/install-hooks.sh

# Or using npm
npm run install-hooks
```

This will copy the hooks to your local `.git/hooks` directory and make them executable.

You can also run the episode tests manually with:

```bash
npm run test-episodes
```

## Adding New Content

### New Episodes

To add a new episode:
1. Create a new HTML file in the `src/content/transcripts/` directory named `epXX.html` (where XX is the episode number)
2. The episode will automatically appear in the episode listing on the homepage

### New Resources

To add new resources to the resource library:
1. Update the resource cards in `src/pages/resources.astro`
2. Add any needed thumbnails to the `public/images/thumbnails/` directory

## Contributing

Contributions to improve the site are welcome! Please submit a pull request with your proposed changes.

## Extended Development Tools

The project includes custom tools to enhance development workflows:

### Windsurf Custom Rules

The repository includes a `windsurfrules.json` file containing custom rules for the Windsurf linter. These rules help ensure code follows the strategic roadmap goals and best practices:

- **Data Source Consistency**: Detects data duplication across the codebase
- **Visual Test Outdated**: Identifies when visual test screenshots need updating
- **Resource Extraction**: Reminds about extracting data from HTML to JS
- **Image Optimization**: Suggests optimizing large images and converting to modern formats
- **Astro 5.0+ Features**: Recommends implementing View Transitions API
- **Datadog Integration**: Ensures proper monitoring configuration
- **Content Collections**: Suggests migrating HTML content to Astro Content Collections

### MCP Servers for AI Assistance

The project includes Model Context Protocol (MCP) servers in the `tools/` directory that extend Claude's capabilities:

- **Datadog Monitor**: Integrates with Datadog API for synthetic tests and RUM configuration
- **Image Optimizer**: Provides tools for optimizing and converting images
- **Ollama Visual Analyzer**: Uses Ollama for visual analysis of screenshots and UI elements
- **Astro Content Manager**: Helps manage and migrate Astro content
- **Performance Analyzer**: Analyzes Core Web Vitals and website performance

To set up these tools, see the instructions in `tools/README.md`.

# Strategic Roadmap

This section outlines the current project roadmap with prioritized tasks and improvement plans.

## 1. Foundation (P0, Q2 2025)

### 1.1 Sequential Web Testing
- **Objective**: Replace multiple Datadog API tests with a single comprehensive sequential web test
- **Key Results**:
  - [ ] Implement end-to-end flow validation using Puppeteer
  - [ ] Test critical components (header, footer, resource cards) in a single test
  - [ ] Handle URL pattern differences between test and production environments
  - [ ] Run tests in Docker for consistent environment
  - [ ] Integrate with pre-commit hooks and CI/CD pipeline

### 1.2 Testing Infrastructure Reliability
- **Objective**: Ensure visual testing produces consistent, reliable results
- **Key Results**:
  - [ ] Capture new production site screenshots for baseline comparisons
  - [ ] Update test scripts to use new screenshots
  - [ ] Achieve <5% false positive rate in visual testing

### 1.3 Data Source Consolidation
- **Objective**: Eliminate data duplication and establish single sources of truth
- **Key Results**:
  - [ ] Complete extraction of resource data from HTML to JavaScript (see `src/data/resources.js` TODO)
  - [ ] Refactor resources.astro to use only the JS data source
  - [ ] Implement automated validation to ensure data integrity

### 1.4 Application Security for Serverless
- **Objective**: Implement Datadog Application Security for serverless components
- **Key Results**:
  - [ ] Set up Datadog serverless security monitoring
  - [ ] Configure custom instrumentation for Lambda functions
  - [ ] Implement security scanning for serverless components
  - [ ] Add protection against common serverless vulnerabilities (injection, etc.)
  - [ ] Integrate security findings with existing monitoring dashboard
  - [ ] Set up alerting for critical serverless security issues

### 1.5 CI/CD Pipeline Stability
- **Objective**: Create consistent, reproducible build and test environments
- **Key Results**:
  - [ ] Create Dockerfile.test with all dependencies (Node.js, ImageMagick, etc.)
  - [ ] Build docker-compose-test.yml with Ollama and Datadog services
  - [ ] Achieve 99% build success rate in CI pipeline

## 2. Observability (P1, Q3 2025)

### 2.1 Comprehensive Monitoring
- **Objective**: Implement end-to-end visibility into application performance
- **Key Results**:
  - [ ] Configure element-level analysis for precise visual comparison
  - [ ] Implement advanced selector-based element comparison
  - [ ] Create visual element maps for critical UI components

### 2.2 Unified Service Monitoring
- **Objective**: Establish holistic view of system performance
- **Key Results**:
  - [ ] Set up cross-service tracing between Astro SSR and APIs
  - [ ] Configure end-to-end latency monitoring across the entire stack
  - [ ] Enable correlated errors between frontend and backend

### 2.3 Feature Flagging System
- **Objective**: Enable controlled rollout of new features
- **Key Results**:
  - [ ] Implement feature flag SDK for client-side and server-side features
  - [ ] Set up A/B testing for resource card layouts
  - [ ] Configure targeted rollouts based on user segments

## 3. Performance Optimization (P1, Q4 2025)

### 3.1 Asset Optimization
- **Objective**: Reduce page load times by 50%
- **Key Results**:
  - [ ] Address network payload size (target: 30% reduction)
  - [ ] Properly size images contributing to LCP
  - [ ] Convert images to next-gen formats (WebP/AVIF)

### 3.2 Core Web Vitals Improvement
- **Objective**: Achieve "Good" rating on all Core Web Vitals
- **Key Results**:
  - [ ] Optimize Largest Contentful Paint (<2.5s)
  - [ ] Improve Cumulative Layout Shift (<0.1)
  - [ ] Enhance First Input Delay (<100ms)

### 3.3 Build Optimization
- **Objective**: Reduce build times by 40%
- **Key Results**:
  - [ ] Implement multi-stage Docker builds
  - [ ] Optimize layer caching for faster builds
  - [ ] Add BuildKit capabilities via BuildX

## 4. Modern Architecture (P2, 2026)

### 4.1 Astro 5.0+ Migration
- **Objective**: Leverage latest Astro capabilities for improved UX
- **Key Results**:
  - [ ] Implement View Transitions API for smooth page navigation
  - [ ] Add `<ViewTransitions />` component to MainLayout.astro
  - [ ] Configure transition animations between episode pages

### 4.2 Content Management Modernization
- **Objective**: Improve content type safety and management
- **Key Results**:
  - [ ] Migrate transcript HTML files to Content Collections
  - [ ] Create a `transcripts` collection with appropriate schema
  - [ ] Update [slug].astro to use Content Collections API

### 4.3 Image System Overhaul
- **Objective**: Implement modern image delivery system
- **Key Results**:
  - [ ] Replace static image references with `<Image />` component
  - [ ] Configure optimal formats with appropriate dimensions
  - [ ] Add proper loading strategies (eager for above-fold, lazy for below)

## 5. Developer Experience (P2, Ongoing)

### 5.1 Tooling Modernization
- **Objective**: Reduce development friction and improve productivity
- **Key Results**:
  - [ ] Evaluate Bun as Node.js/npm replacement
  - [ ] Test Bun for faster dependency installation
  - [ ] Create Bun-optimized Dockerfile variant

### 5.2 Documentation Enhancement
- **Objective**: Ensure comprehensive, up-to-date documentation
- **Key Results**:
  - [ ] Document architecture decisions and patterns
  - [ ] Create onboarding guide for new developers
  - [ ] Implement automated documentation for component API

### 5.3 Docker Improvements
- **Objective**: Enhance Docker development environment
- **Key Results**:
  - [ ] Implement multi-stage builds to reduce image size by 50-60%
  - [ ] Add health checks and graceful shutdown to Docker configurations
  - [ ] Optimize for ARM64 architecture for better cloud cost efficiency

## Success Metrics

The success of this roadmap will be measured by:

1. **Reliability**: 99.9% uptime, <1% test flakiness
2. **Performance**: 90+ PageSpeed score, <2s LCP
3. **Developer Velocity**: 30% reduction in time-to-first-PR for new contributors
4. **User Experience**: 20% improvement in session duration and pages per visit

_Note: This roadmap replaces the previous TODO.md file. All planned tasks have been consolidated here to provide a clearer, more strategic overview of the project's direction._
