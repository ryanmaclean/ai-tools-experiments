# Project TODO List

## Overarching Goals & Principles

This document outlines tasks to achieve the following primary goals for the AI Tools Lab repository:

*   **G1: Showcase AI Tools and Workflows:** Develop a site that effectively demonstrates innovative AI tools and practical workflows.
*   **G2: Test Faster Content Workflows with GenAI:** Implement and evaluate content creation and management processes leveraging Generative AI.
*   **G3: Deploy to Newer Infrastructure:** Modernize the deployment infrastructure, including Astro v5, updated Docker configurations, and Netlify deployment.
*   **G4: Comprehensive Datadog Monitoring:** Integrate Datadog thoroughly for monitoring all aspects of the application and infrastructure.

**Key Principles:**
*   **API Key Security is Paramount:** Implement and maintain robust security measures for all API keys and sensitive credentials.
*   **Maintain Production Stability:** Ensure all changes prioritize the stability and uptime of any production environments.
*   **Adopt Astro v5 Best Practices:** Follow official documentation and community best practices for Astro v5 development.
*   **Iterative Improvement:** This TODO list is a living document; tasks will be refined, added, or removed as the project evolves.

---

## G1: Showcase AI Tools and Workflows

- [ ] Define and develop initial showcase content for AI Tools & Workflows (Goal Ref: G1)
- [ ] Design site structure and navigation for optimal showcasing of AI tools and workflows (Goal Ref: G1)
- [ ] Fix site content mismatches between production/test environments to ensure accurate showcase (Goal Ref: G1, G3)
    - [ ] Compare and sync HTML content from production site (if applicable)
    - [ ] Verify all pages and routes match for showcase content
    - [ ] Update Astro v5 templates to match production styling for consistent showcase
- [ ] Implement a centralized resource path handler for all assets (CSS, images, scripts) for showcase consistency (Goal Ref: G1, G3)
- [ ] Refactor inline styles to use external stylesheets with environment-aware paths (Goal Ref: G1, G3)
- [ ] Evaluate Strapi as a headless CMS for managing showcase content and potentially integrating with GenAI workflows (Goal Ref: G1, G2)

---

## G2: Test Faster Content Workflows with GenAI

- [ ] Implement content workflow from Descript to YouTube and MD to MDX for documentation/showcase (Goal Ref: G2)
    - [ ] Use Descript for recording/editing content and auto-transcription
    - [ ] Configure direct publishing to YouTube from Descript
    - [ ] Automate export of transcriptions as Markdown (MD) from Descript
    - [ ] Develop process to convert MD to MDX with frontmatter and interactive components for Astro
    - [ ] Integrate MDX files as documentation/showcase pages in Astro
    - [ ] Automate content updates and monitor workflow (potentially with Datadog - G4)
    - [ ] Establish spot-checking process for video transcriptions (homophones, tech terminology)
- [ ] Evaluate Otter.ai as an alternative/complement to Descript for AI-powered transcription in the content workflow (Goal Ref: G2)
- [ ] Explore and document integration of other GenAI tools for content generation, ideation, or improvement relevant to the showcase (Goal Ref: G2)
- [ ] Leverage Astro's content-focused features for documentation and showcase pages (Goal Ref: G2, G3)
    - [ ] Adopt Astro's zero-JavaScript approach for content-focused pages
    - [ ] Integrate Markdown/MDX files as pages
    - [ ] Utilize TailwindCSS (if chosen) with Astro for styling
- [ ] Implement Content Synchronization and Verification Roadmap items: (Goal Ref: G2)
    - [ ] Deploy latest content changes to test environment
    - [ ] Verify environment-specific path handling for content
    - [ ] Run link verification on deployed test environment for content
    - [ ] (Consider) Create admin UI for viewing content synchronization status
    - [ ] (Consider) Implement selective content synchronization
    - [ ] (Consider) Add support for previewing content changes
    - [ ] (Consider) Create rollback capability for content updates

---

## G3: Deploy to Newer Infrastructure (Astro v5, Docker, Netlify)

### Astro v5 Migration & Best Practices
- [ ] Upgrade Astro to v5 (Goal Ref: G3)
    - [ ] Follow the [official migration guide](https://docs.astro.build/en/guides/upgrade-to/v5/)
    - [ ] Update configuration in `astro.config.mjs` for v5 compatibility
    - [ ] Refactor code to use new Astro v5 APIs and features
    - [ ] Test all components with Astro v5's new rendering system
- [ ] Implement [Astro v5 View Transitions](https://docs.astro.build/en/guides/view-transitions/) for improved UX (Goal Ref: G3, G1)
- [ ] Follow the [Astro Project Structure Guide](https://docs.astro.build/en/guides/project-structure/) (Goal Ref: G3)
- [ ] Keep only standard Astro directories (`src/pages/`, `src/components/`, `src/layouts/`, `public/`) (Goal Ref: G3)
- [ ] Place static assets in `public/`, not `src/` (Goal Ref: G3)
- [ ] Remove legacy, unused, or non-standard directories and files from `src/` (Goal Ref: G3)
- [ ] Keep Astro configuration minimal (`astro.config.mjs`, `tsconfig.json`, essential integrations) (Goal Ref: G3)
- [ ] Use recommended `.gitignore` and `.env` patterns (Goal Ref: G3)
- [ ] Document custom scripts and project structure in README (Goal Ref: G3)
- [ ] Review all dependencies for Astro v5 compatibility (Goal Ref: G3)
- [ ] Implement package.json settings for Node.js 22 features (Goal Ref: G3)

### Docker Configuration
- [ ] Verify proper Docker operations and container management (Goal Ref: G3)
- [ ] Investigate `HANDLE_404_WARNINGS` environment variable: define purpose and confirm relevance (Goal Ref: G3, G4)
- [ ] Further optimize container networking configuration (Goal Ref: G3)

### NPM, Package Management & Dependencies
- [ ] Remove unused dependencies and devDependencies from `package.json` (Goal Ref: G3)
- [ ] Remove unused scripts from `package.json` (Goal Ref: G3)
- [ ] Regenerate `package-lock.json` after cleanup (`rm package-lock.json && npm install`) (Goal Ref: G3)
- [ ] Run `npm audit fix` and address any remaining vulnerabilities (Goal Ref: G3)
- [ ] Ensure only packages actually used are included (Goal Ref: G3)
- [ ] Use latest Astro v5 and plugin versions (Goal Ref: G3)
- [ ] Remove legacy, test, or infra dependencies not needed for Astro v5 (Goal Ref: G3)
- [ ] Keep `package.json` fields concise and accurate (Goal Ref: G3)
- [ ] Use only officially supported Astro plugins and integrations (Goal Ref: G3)

### CI/CD, Build Integrity & Deployment
- [ ] [URGENT] Fix GitHub Actions workflow DD_API_KEY context access errors (Goal Ref: G3, G4)
- [ ] Improve environment variable handling in conditional CI/CD steps (Goal Ref: G3)
- [ ] Fix all current build failures before introducing new features (Goal Ref: G3)
- [ ] Implement pre-commit hook that runs full build verification (Goal Ref: G3)
- [ ] Block merges to main branch if builds fail (Goal Ref: G3)
- [ ] Add detailed build validation steps to CI pipeline (Goal Ref: G3)
- [ ] Complete all test environment fixes before promoting to development (Goal Ref: G3)
- [ ] Create standard verification checklist for environment promotion (Goal Ref: G3)
- [ ] Implement automated promotion tests with Netlify CLI and Datadog CLI (Goal Ref: G3, G4)
- [ ] Document the complete promotion workflow with necessary approvals (Goal Ref: G3)
- [ ] Fix dependency installation failures in Netlify builds (Goal Ref: G3)
- [ ] Decide and implement consistent Netlify build execution strategy (with or without `docker-entrypoint.sh`) (Goal Ref: G3)
    <!-- REVIEW: Original tasks contradicted: "Configure Netlify environment to use the same Docker entrypoint script" vs "Update netlify.toml configuration to avoid using docker-entrypoint.sh". This needs a decision. -->
- [ ] (Consider for future) Implement canary deployments for testing changes (Goal Ref: G3)
- [ ] (Consider for future) Create automated rollback triggers based on error thresholds (Goal Ref: G3)
- [ ] (Consider for future) Implement progressive rollout strategy for infrastructure changes (Goal Ref: G3)

### Netlify Configuration
- [ ] Create or update `netlify.toml` to specify build settings that match Docker environments (Goal Ref: G3)
- [ ] Configure Node.js version in Netlify to match Docker (v22.x) (Goal Ref: G3)
- [ ] Set appropriate environment variables in Netlify to match Docker configuration (Goal Ref: G3)
- [ ] Implement Netlify build hooks for testing (Goal Ref: G3)
- [ ] Ensure proper Netlify caching configurations (Goal Ref: G3)

### Build Performance & Tools
- [ ] Decide and implement strategy for build performance testing (e.g., separate repo or integrated) (Goal Ref: G3)
    <!-- REVIEW: Confirm if separating build performance testing into a new repo is still the plan. -->
    - [ ] If separate repo: Create new repository `build-perf-testing`
    - [ ] Move existing build comparison tests (if any)
    - [ ] Document build performance testing methodology
- [ ] Rspack Investigation for Astro (Goal Ref: G3)
    - [ ] Re-evaluate feasibility of Rspack as a bundler for Astro, considering Astro's use of Vite (which uses esbuild/Rollup). Direct replacement is unlikely.
    - [ ] Investigate if Rspack can be integrated with an Astro project in any capacity (e.g., for specific non-core bundling tasks).
    - [ ] Create a POC branch to test any potential limited integration if a viable path is identified.
    - [ ] Document findings on Rspack's compatibility and potential use cases (or lack thereof) with Astro.
- [ ] Additional Build Tool Research (Goal Ref: G3)
    - [ ] Continue monitoring Rolldown development (Vite's potential future Rust-based bundler).
    - [ ] (Consider for future) Evaluate Bazel for potential long-term enterprise build solution if project scales significantly.
        <!-- REVIEW: Is Bazel evaluation relevant for the current project scale and complexity? -->
    - [ ] Research other bundlers or build optimization techniques compatible with Astro/Vite.

### Path, URL, and ARM64 Compatibility
- [ ] Fix inconsistent URLs between test and production (e.g., `/pages/observations` vs `/observations`) (Goal Ref: G3)
- [ ] Diagnose why API Episode Page Tests might be failing (related to paths or data) (Goal Ref: G3, G1)
- [ ] Create consistent paths between test and production environments (Goal Ref: G3)
- [ ] Avoid URL pattern workarounds in test scripts; implement proper environment-aware testing (Goal Ref: G3)
- [ ] Create Netlify-specific build script that properly handles ARM64 dependencies (if necessary beyond standard Astro/Vite capabilities) (Goal Ref: G3)

### Helm <!-- REVIEW: Is Helm still in scope for Netlify deployment? These tasks may be irrelevant. -->
- [ ] Test the Helm chart using `helm/test-helm.sh` to confirm all resources deploy and are ready (Goal Ref: G3)
- [ ] Review and update `helm/README.md` for usage and security notes (Goal Ref: G3)

### Cloudflare Integration Evaluation
- [ ] Evaluate Cloudflare services (e.g., Pages, Workers, R2, CDN, Security) for enhancing or complementing the Netlify-based infrastructure (Goal Ref: G3)
- [ ] If specific Cloudflare services are adopted, develop an integration plan (Goal Ref: G3)

---

## G4: Comprehensive Datadog Monitoring

### Core Datadog Setup & Integration
- [ ] [URGENT] Ensure secure handling of `DD_API_KEY` and `DD_APP_KEY` in all environments (CI, Netlify, local) (Goal Ref: G4, G3)
- [ ] Configure proper RUM (Real User Monitoring) based on [Datadog RUM documentation](https://docs.datadoghq.com/real_user_monitoring/browser/) (Goal Ref: G4)
- [ ] Verify RUM data is properly collected in Datadog dashboard (Goal Ref: G4)
- [ ] Create scripts to send Docker build logs to Datadog (Goal Ref: G4)
- [ ] Implement log checking for deprecated package warnings in Datadog (Goal Ref: G4)
- [ ] Configure Datadog APM for Node.js applications following [official instructions](https://docs.datadoghq.com/tracing/trace_collection/dd_libraries/nodejs/) (Goal Ref: G4)
- [ ] Set up API testing with Datadog synthetic monitoring (Goal Ref: G4)
    <!-- REVIEW: Original task mentioned Terraform. If not using Terraform, adapt to use Datadog UI/API/other tools. -->
- [ ] Implement browser tests using proper CSS validation techniques within Datadog Synthetics or other tools (Goal Ref: G4, G1)
- [ ] Create Datadog synthetic test with visual CSS validation for Netlify site (Goal Ref: G4, G1)
- [ ] Implement post-deployment hook to trigger Datadog synthetic tests (Goal Ref: G4, G3)
- [ ] Configure Datadog dashboard to visualize deployment success metrics (Goal Ref: G4)
- [ ] Set up Datadog downtime alerts for production environment (Goal Ref: G4)
- [ ] Add production health dashboard in Datadog (Goal Ref: G4)
- [ ] Set up alerting for native module dependency failures in Netlify (Goal Ref: G4, G3)
- [ ] Create detailed logging for all build stages in Datadog (Goal Ref: G4, G3)
- [ ] Document known error patterns and proper resolution steps, potentially in Datadog notebooks (Goal Ref: G4)
- [ ] Implement error notification system via Datadog (Goal Ref: G4)
- [ ] Resolve syntax errors in `datadog-sequential-test.js` if script is still relevant for monitoring (Goal Ref: G4)
    <!-- REVIEW: Is this file still in use? If so, are these errors still present? -->
- [ ] (Consider) Integrate Datadog API collection from Postman (Goal Ref: G4)
    <!-- REVIEW: Is this integration still desired or relevant? -->

### Security Monitoring with Datadog
- [ ] [URGENT] Add Datadog patterns to `.gitignore` for local Datadog configurations (e.g. `.env.datadog`) (Goal Ref: G4, G3)
- [ ] [URGENT] Implement pre-commit hook to check for API keys (including Datadog keys) (Goal Ref: G4, G3)
- [ ] [URGENT] Set up GitHub secret scanning for Datadog API key patterns (Goal Ref: G4, G3)
- [ ] Implement Datadog SCA (Software Composition Analysis) scans at all relevant stages (Goal Ref: G4, G3)
- [ ] Add Datadog security monitoring for unauthorized access attempts (Goal Ref: G4)
- [ ] [URGENT] Verify automated API key rotation system (e.g., using Netlify Functions) is implemented, functional, and secure, or implement it. (Goal Ref: G4, G3)
    <!-- REVIEW: Original task was [x] but also had a REVIEW. Confirm status. -->
    - [ ] Create/verify comprehensive documentation on secure API key handling.
    - [ ] Create/verify verification test script for key rotation system.
    - [ ] (If applicable) Add notification webhook for key rotation events.
    - [ ] (If applicable) Implement automatic GitHub Actions secret updates post-rotation.

---

## Pre-Deployment / Release Checklist (Consolidated from Verification Steps)

- [ ] All Docker environments build and run locally.
- [ ] Astro v5 components tested in Docker environment.
- [ ] Build process in Netlify matches local Docker results.
- [ ] Datadog integration properly capturing metrics (RUM, logs, APM if set up).
- [ ] `node scripts/check-datadog-rum.js` (if script exists and is relevant) runs successfully.
- [ ] Consistent environment detection (staging/production) verified.
- [ ] Datadog dashboard events tagged with correct environment.
- [ ] All automated tests (Vitest, Playwright, etc.) pass against target environment.
- [ ] `npm run pre-deploy-check` (if script exists) runs successfully.
- [ ] `npm run verify-links` (if script exists) runs successfully.
- [ ] All [URGENT] security tasks related to API keys are addressed.
- [ ] Relevant documentation (READMEs, etc.) updated.

---

## References

- [Docker Documentation](https://docs.docker.com/)
- [Node.js Documentation](https://nodejs.org/docs/latest-v22.x/api/)
- [Astro Documentation](https://docs.astro.build/)
- [Astro for Docs](https://astrofordocs.vercel.app/)
- [Netlify Documentation](https://docs.netlify.com/)
- [Datadog Documentation](https://docs.datadoghq.com/)

> NOTE: Always verify assumptions against official documentation when implementing these changes. This TODO list should be updated as tasks are completed or new requirements emerge.
