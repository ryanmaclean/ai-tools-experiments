# Terraform Configuration Requirements for Datadog Synthetic Tests

## Overview

This document outlines the requirements for properly configuring Terraform for Datadog synthetic tests. It should be followed when updating the test scripts to ensure proper implementation of visual and styling validations.

## Repository Information

**IMPORTANT**: This project is maintained in the **ryanmaclean/ai-tools-experiments** repository, not the jasonhand repository. All changes should be pushed to the ryanmaclean repository.

## Netlify Deployment

The Netlify test site (ai-tools-lab-tst.netlify.app) is deployed from the ryanmaclean/ai-tools-experiments repository. Changes need to be synced to this repository for Netlify deployments to reflect them.

**Build Hook URL**: https://api.netlify.com/build_hooks/6815aa2896ae6ddba51a8a30

## CSS Validation Requirements

All Datadog synthetic tests must include explicit CSS property validation:

1. **Header Styling Tests**
   - Background color verification: `var(--secondary-color, #93ACB5)`
   - Text color verification for navigation items
   - Proper z-index validation

2. **Element Positioning Tests**
   - Validate margins and padding for critical UI components
   - Check for proper alignment and positioning

3. **Font Styling Tests**
   - Font family consistency
   - Font size and weight validation

## Example Terraform Configuration

```hcl
resource "datadog_synthetics_test" "css_validation" {
  name    = "CSS Properties Validation - Header"
  type    = "browser"
  status  = "live"
  message = "Critical UI styling validation failed. Check header CSS properties."
  
  browser_step {
    name = "Verify header background color"
    type = "assertFromJavascript"
    params {
      value = <<-EOT
        const header = document.querySelector('header');
        const headerBgColor = window.getComputedStyle(header).backgroundColor;
        return headerBgColor === 'rgb(147, 172, 181)';
      EOT
    }
  }
}
```

## Key Validation Functions

Use these JavaScript functions in your Terraform configurations to validate styling properties:

```javascript
// Color validation
function validateColor(selector, property, expectedColor) {
  const element = document.querySelector(selector);
  const computedStyle = window.getComputedStyle(element);
  return computedStyle[property] === expectedColor;
}

// Position validation
function validatePosition(selector, expectedProps) {
  const element = document.querySelector(selector);
  const styles = window.getComputedStyle(element);
  
  return Object.entries(expectedProps).every(([prop, value]) => {
    return styles[prop] === value;
  });
}
```

## Critical Known Issues

1. GitHub Actions CI/CD workflow has persistent lint errors related to DD_API_KEY secret context
2. The environment variable `HANDLE_404_WARNINGS` replacing `SUPPRESS_404_WARNINGS` needs full implementation
3. Container networking configuration for test services needs verification
4. Cross-architecture compatibility needs testing on both ARM and x86

## Next Steps

1. Update all Terraform files to include CSS validation steps
2. Match test script changes to Terraform configurations
3. Run a complete test in the Docker environment to verify cross-architecture compatibility
4. Apply the Terraform configuration with actual Datadog credentials

```bash
cd terraform
terraform apply -var datadog_api_key=YOUR_DD_API_KEY -var datadog_app_key=YOUR_DD_APP_KEY
```
