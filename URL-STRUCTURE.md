# Standardized URL Structure

## Overview

To ensure consistency between test and production environments, we've standardized all URL paths to follow the `/pages/` prefix pattern.

## Key Structure

- Main content pages: `/pages/about`, `/pages/resources`, `/pages/observations`
- Episodes: `/pages/ep01` through `/pages/ep20` (zero-padded, two-digit format)
- Home page: `/` and `/pages/`

## Implementation Details

This standardization involves several key components:

1. **Build Process**:
   - The post-build script `create-pages-directory.js` ensures all content is properly structured
   - Episodes use the pattern `/pages/ep01/index.html`
   
2. **Redirects**:
   - Legacy episode URLs (`/episodes/ep1`) redirect to new format (`/pages/ep01`)
   - Old production patterns (`/pages/episodes/ep01`) redirect to new format (`/pages/ep01`)
   
3. **Content Loading**:
   - All Astro components use a consistent import path: `../content/imported/`
   - Content sync process maintains the proper structure

## Verification

The `verify-links` command checks both environments to ensure all URLs are consistent and working correctly. Run it after any deployment:

```bash
npm run verify-links
```

## Datadog Monitoring

Datadog RUM is configured to track URL consistency and page loads in both environments. It uses environment detection to properly tag metrics:

- Test environment: `ai-tools-lab-tst.netlify.app` → tagged as 'staging'
- Production: `ai-tools-lab.com` → tagged as 'production'

## Troubleshooting

If links are broken or redirects not working:

1. Verify the URL structure in the affected page
2. Check the redirects in `netlify.toml`
3. Run `npm run sync-all` to ensure content is properly synced
4. Run `npm run verify-content-integrity` to check for structural issues
