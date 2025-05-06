# Post-Deployment Testing TODO Checklist

## Current Site Differences (Priority Fixes)

1. **Page Title Differences**:
   - Test: "Home | AI Tools Lab | AI Tools Experiments"
   - Production: "Home | AI Tools Lab"
   - TODO: Standardize titles across environments

2. **Navigation Structure**:
   - Test has 9 navigation links
   - Production has 5 navigation links
   - TODO: Synchronize navigation structure

3. **Datadog Implementation**:
   - Test correctly sets DD_RUM_INITIALIZED flag
   - Production is missing this flag
   - TODO: Fix production implementation to match test

4. **URL Structure**:
   - Test uses direct routes (without /pages/ prefix)
   - Production uses /pages/ prefix
   - TODO: Standardize URL structure

## Content Synchronization Process

1. **Download Raw HTML** from each production page:
   ```bash
   # Create directories if needed
   mkdir -p src/content/imported
   
   # For each page, download raw HTML
   curl -s https://ai-tools-lab.com/pages/ > src/content/imported/home.html
   curl -s https://ai-tools-lab.com/pages/resources > src/content/imported/resources.html
   curl -s https://ai-tools-lab.com/pages/observations > src/content/imported/observations.html
   curl -s https://ai-tools-lab.com/pages/episodes > src/content/imported/episodes.html
   curl -s https://ai-tools-lab.com/pages/about > src/content/imported/about.html
   ```

2. **Strip Headers and Footers** from each HTML file:
   - Remove `<header>` through `</header>` sections
   - Remove `<footer>` through `</footer>` sections
   - Maintain main content only

3. **Import Using Astro**:
   - Create Astro pages that import content:
   
   ```astro
   ---
   // src/pages/resources.astro
   import MainLayout from '../layouts/MainLayout.astro';
   import { readFile } from 'node:fs/promises';
   
   // Import content directly
   const htmlContent = await readFile('src/content/imported/resources.html', 'utf-8');
   ---
   
   <MainLayout title="Resources | AI Tools Lab">
     <div set:html={htmlContent} />
   </MainLayout>
   ```

4. **Use Glob Pattern** for multiple imports:
   ```astro
   ---
   // For dynamic routing with consistent patterns
   export async function getStaticPaths() {
     const pages = ['resources', 'observations', 'about'];
     return pages.map(page => ({
       params: { slug: page },
       props: { page }
     }));
   }
   
   const { page } = Astro.props;
   const htmlContent = await import(`../content/imported/${page}.html?raw`);
   ---
   ```

## Pre-Deployment Preparation

- [ ] Ensure Datadog credentials are set (DD_API_KEY, DD_APPLICATION_ID, DD_CLIENT_TOKEN)
- [ ] Verify `client-scripts.js` has proper Datadog initialization with DD_RUM_INITIALIZED flag
- [ ] Run `check-datadog-rum.js` script to verify configuration files

## Deployment Verification

- [ ] Run post-deployment tests with: `npm run post-deploy-check`
- [ ] Verify screenshots in test-results directory for visual consistency
- [ ] Verify Datadog logging shows successful test results
- [ ] Run content integrity verification with: `npm run verify-content-integrity`
- [ ] Verify no duplicate HTML files exist across directories
- [ ] Confirm no HTML content contains header or footer elements

## Specific Content Checks

- [ ] Verify home page loads in both environments (test & production)
- [ ] Check navigation links work consistently with proper URL patterns
- [ ] Ensure Datadog RUM is properly initialized in both environments
- [ ] Verify page titles match expectations across environments

## Known Issues to Monitor

- [ ] DD_RUM_INITIALIZED flag missing in production environment
  - Current status: Warning only, does not cause test failure
  - TODO: Fix in `client-scripts.js` for consistent behavior

## Additional Tests to Implement

- [ ] Test content imports for about, observations, resources pages
- [ ] Verify CSS loads properly across all pages
- [ ] Check responsive design on mobile viewport sizes
- [ ] Validate the sitemap for proper indexing

## Post-Test Actions

- [ ] Check Datadog dashboard for RUM events from test runs
- [ ] Document any discrepancies between test and production environments
- [ ] Update this checklist with new test requirements

---

**Last Test Run**: _Date_
**Test Result**: _Pass/Fail_
**Tester**: _Name_

## Notes from Last Test Run:

_Add notes here..._
