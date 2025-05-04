# GitHub Actions Configuration Guide

## Overview

This document addresses critical issues with the GitHub Actions CI/CD workflow, specifically focusing on the proper handling of secrets and environment variables.

**Repository Information**: This project is maintained in the **ryanmaclean/ai-tools-experiments** repository, not the jasonhand repository.

## Current Issues With GitHub Actions

### Secret Context Handling Problems

The current workflow has several lint errors related to DD_API_KEY secret context:

1. Context access issues with the `${{ secrets.DD_API_KEY }}` expression
2. Improper conditional checks for secret existence
3. Unnecessary fallbacks to empty strings (`|| ''`)

## Correct Secret Handling in GitHub Actions

### The Problem with Direct Secret Checking

GitHub Actions doesn't allow direct checks on whether a secret exists in `if` conditions like this:

```yaml
# This causes lint errors
if: ${{ secrets.DD_API_KEY != '' }}
```

This is because GitHub treats the `secrets` context specially for security reasons.

### Recommended Solution

The correct approach is to use a pre-step to check for secret availability:

```yaml
- name: Check for Datadog API Key
  id: check-dd-key
  env:
    DD_API_KEY_ISSET: ${{ secrets.DD_API_KEY != '' }}
  run: |
    if [ "$DD_API_KEY_ISSET" = "true" ]; then
      echo "has_dd_key=true" >> $GITHUB_OUTPUT
    else
      echo "has_dd_key=false" >> $GITHUB_OUTPUT
    fi

- name: Configure Datadog Test Optimization
  id: datadog-test-visibility
  if: steps.check-dd-key.outputs.has_dd_key == 'true'
  uses: datadog/test-visibility-github-action@v2.0.4
  with:
    languages: js
    api_key: ${{ secrets.DD_API_KEY }}
    site: datadoghq.com
```

This approach properly handles the case where the secret might not be available.

## Handling Environment Variables in Test Steps

For test execution steps that need the Datadog API key:

```yaml
- name: Run tests
  if: steps.check-dd-key.outputs.has_dd_key == 'true'
  run: npm run test
  env:
    DD_API_KEY: ${{ secrets.DD_API_KEY }}
    DD_TEST_REPORT: 'true'
```

## Complete Fix for ci-cd.yml

The entire workflow file should be updated to follow this pattern for all steps that use the DD_API_KEY.

## Using GitHub Environments

Consider using GitHub Environments for better secret management:

```yaml
jobs:
  test:
    environment: production
    runs-on: ubuntu-latest
    steps:
      # Your steps here
```

This allows for environment-specific secrets and better control over when they're available.

## Additional Security Considerations

1. Use GitHub's secret masking to prevent accidental exposure
2. Consider rotating API keys regularly
3. Use least privilege API keys when possible

## Next Steps

1. Update the GitHub Actions workflow to implement these secret handling recommendations
2. Add proper conditional execution for steps that require secrets
3. Use GitHub Environments for deployment-specific secrets
4. Consider implementing secret rotation as part of the CI/CD pipeline
