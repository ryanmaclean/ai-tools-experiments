# Datadog Monitoring for AI Tools Lab

## Overview

This document explains how Datadog monitoring is set up for the AI Tools Lab project, with a focus on the Synthetic tests that validate critical components on our website. Understanding these tests will help ensure that your code changes don't break the monitoring.

## Critical Components

Datadog monitoring relies on the presence of three critical components on our site:

1. **Header** - Must be present on all pages with either:
   - `<header>` tag, or
   - Element with class `.site-header`

2. **Footer** - Must be present on all pages with either:
   - `<footer>` tag, or 
   - Element with class `.site-footer`

3. **Resource Cards** - Must be present on the resources page with either:
   - Elements with class `.resource-card`, or
   - Elements with class containing "resource"

## URL Pattern Differences

> **⚠️ Important:** The production site and test site use different URL patterns!

- **Production site (ai-tools-lab.com)** uses `/pages/` prefix:
  - Example: `https://ai-tools-lab.com/pages/resources`

- **Test site (ai-tools-lab-tst.netlify.app)** uses direct paths:
  - Example: `https://ai-tools-lab-tst.netlify.app/resources`

Our monitoring and testing tools handle both patterns for maximum compatibility.

## Pre-commit Validation

To prevent breaking Datadog monitoring, we've implemented pre-commit hooks that validate these components before allowing commits.

The validation process:

1. Checks for the presence of the header on the homepage
2. Checks for the presence of the footer on the homepage
3. Checks for resource cards on the resources page
4. Validates URL pattern handling

If any of these checks fail, your commit will be rejected with specific error messages.

### Running Validation Manually

You can manually run the component validation with:

```bash
npm run test:components
```

For more comprehensive validation (including Datadog API checks):

```bash
npm run precommit:full
```

## Component Implementation Guidelines

### Header Component

The header must have the proper semantic HTML structure. Always use:

```astro
<header class="site-header">
  <!-- Header content here -->
</header>
```

### Footer Component

The footer must have the proper semantic HTML structure. Always use:

```astro
<footer class="site-footer">
  <!-- Footer content here -->
</footer>
```

### Resource Cards

Resource cards on the resources page must use the `.resource-card` class:

```astro
<div class="resource-card">
  <!-- Resource card content here -->
</div>
```

## Deployment Considerations

### Environment-Specific Information

- **Test Environment**: Deployed from the `ryanmaclean/ai-tools-experiments` repository to `ai-tools-lab-tst.netlify.app`
- **Production Environment**: Deployed from the `jasonhand/ai-tools-experiments` repository to `ai-tools-lab.com`

Changes need to be synced to both repositories to be reflected in both environments.

### Netlify Build Hooks

You can trigger builds programmatically using the Netlify build hook URL: 
`https://api.netlify.com/build_hooks/6815aa2896ae6ddba51a8a30`

## Troubleshooting

If your Datadog tests are failing, check:

1. **Component Structure** - Make sure header, footer, and resource cards have the correct HTML structure and class names
2. **URL Patterns** - Verify that URLs work with both patterns (`/pages/resource` and `/resource`)
3. **Visual Verification** - Use the browser preview to visually confirm components are rendering properly
4. **Server-Side Rendering** - Ensure components aren't relying on browser-only APIs during SSR

### Common Issues

- **"Header is missing on homepage"** - Check that the Header component is properly imported in MainLayout.astro and has the correct class
- **"Footer is missing on homepage"** - Check that the Footer component is properly imported in MainLayout.astro and has the correct class
- **"No resource cards found on resources page"** - Verify that the resource cards have the `.resource-card` class and are rendering properly

## Related Files

These files are important for Datadog monitoring and should not be deleted or modified without careful consideration:

- `/proxy/datadog-proxy.js` - Handles proxying of Datadog API requests
- `/script.js` - Contains Datadog monitoring initialization code
- `/src/components/Header.astro` - Header component with required structure
- `/src/components/Footer.astro` - Footer component with required structure
- `/src/components/ResourceCard.astro` - Resource card component
- `/tests/datadog-component-validator.js` - Component validation script
- `/hooks/pre-commit` - Pre-commit hook that runs validation

## Further Reading

- [Datadog Synthetics Documentation](https://docs.datadoghq.com/synthetics/)
- [Astro Component Documentation](https://docs.astro.build/en/core-concepts/astro-components/)
- [Netlify Redirects Documentation](https://docs.netlify.com/routing/redirects/)
