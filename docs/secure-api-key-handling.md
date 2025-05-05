# Secure API Key Handling

This document outlines the approach to securely handle Datadog API keys and other sensitive credentials in the AI Tools Lab project.

## Key Security Principles

1. **No credentials in source code**: API keys, tokens, and other secrets are never committed to the repository.
2. **Environment variables only**: All sensitive values are accessed via environment variables.
3. **Serverless proxying**: Client-side code never has direct access to API keys.
4. **GitHub Secrets**: CI/CD workflows access credentials via GitHub Secrets.
5. **Build-time injection**: Client configurations are generated at build time, not runtime.
6. **Masking in logs**: Automatic masking prevents accidental leaks in logs.
7. **Automated key rotation**: Datadog API keys are automatically rotated on a schedule using Netlify Functions.

## Credential Types and Storage Locations

| Credential | Purpose | Storage Location | Rotation Strategy |
|------------|---------|------------------|-------------------|
| Datadog API Key | Server-side access to Datadog API | Netlify Environment Variables, GitHub Secrets | Automatic monthly rotation |
| Datadog APP Key | Datadog application authentication | Netlify Environment Variables, GitHub Secrets | Automatic monthly rotation |
| Datadog Client Token | Browser RUM | GitHub Secrets, Netlify Environment Variables | Manual rotation |
| Datadog RUM Application ID | Browser RUM | GitHub Secrets, Netlify Environment Variables | No rotation needed |

## Automated Key Rotation System

For enhanced security, we've implemented an automated key rotation system for Datadog API keys:

1. **Rotation Schedule**: Keys are automatically rotated on the 1st of every month.
2. **Netlify Function**: A serverless function handles the entire rotation process:
   - Creates a new API key via Datadog API
   - Notifies administrators of the new key
   - Stores the new key (administrators must update Netlify environment variables)
   - Deletes the old API key from Datadog

3. **Seamless Rotation**: The system ensures zero downtime during rotation by:
   - Creating the new key before deleting the old one
   - Providing notification for manual updates to Netlify environment
   - Proper error handling with notifications if anything fails

4. **Implementation Details**:
   - Uses Netlify's built-in scheduled functions capability
   - Fully integrated with existing Netlify-based architecture
   - Simple, maintainable approach with no external dependencies

## Setup Instructions

The key rotation system uses Netlify Functions and is automatically deployed with the site. All configuration is handled through Netlify's environment variables:

1. Ensure `DD_API_KEY` and `DD_APP_KEY` are set in Netlify environment variables
2. Add `NOTIFICATION_WEBHOOK_URL` to receive alerts about key rotations (optional)
3. Deploy the site - the scheduled function will be automatically registered

## Manual Key Rotation

In case manual rotation is needed:

1. Generate a new API key in the Datadog dashboard
2. Update the key in GitHub Secrets and Netlify Environment Variables
3. Rebuild and redeploy applications
4. Delete the old API key from Datadog

## Security Incident Response

If you suspect a key has been compromised:

1. Immediately rotate the affected key using the manual process
2. Report the incident to the security team
3. Monitor for unusual activity
4. Review access logs for the compromised period

## Best Practices for Developers

1. Never print or log API keys
2. Always access keys via environment variables
3. Use the proxy server for client-side API requests
4. Report any security concerns immediately

## Implementation Details

### 1. GitHub Actions Workflows

GitHub Actions workflows access secrets via the `${{ secrets.SECRET_NAME }}` syntax and pass them to the build environment as environment variables. They are automatically masked in logs.

```yaml
- name: Build Astro site
  run: npm run build
  env:
    DD_API_KEY: ${{ secrets.DD_API_KEY }}
    DD_APP_KEY: ${{ secrets.DD_APP_KEY }}
    DD_CLIENT_TOKEN: ${{ secrets.DD_CLIENT_TOKEN }}
    DD_RUM_APP_ID: ${{ secrets.DD_RUM_APP_ID }}
```

### 2. Client-Side Configuration

Instead of embedding credentials in client-side code, we generate a configuration file during the build process:

```js
// src/js/datadog-config.js (auto-generated at build time)
export const DATADOG_CONFIG = {
  applicationId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  clientToken: 'pubxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  site: 'datadoghq.com',
  service: 'ai-tools-lab',
  env: 'production',
  version: '1.0.0',
  // No API keys are stored in the frontend code
}
```

Only the RUM Client Token and Application ID are included in client-side code, which are designed by Datadog to be public and have limited scope.

### 3. Netlify Functions for API Access and Key Rotation

For operations requiring API keys, we use Netlify Functions that run server-side:

```js
// netlify/functions/datadog-proxy.js
exports.handler = async function(event, context) {
  // Get API keys securely from environment variables
  const DD_API_KEY = process.env.DD_API_KEY;
  
  // Send to Datadog securely from the server side
  const response = await fetch('https://http-intake.logs.datadoghq.com/api/v2/logs', {
    headers: {
      'DD-API-KEY': DD_API_KEY,
    },
    // ...
  });
  
  // Return success, masking any sensitive data
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
};
```

We also have a scheduled function for key rotation (see `netlify/functions/datadog-key-rotation.js`).

### 4. Terraform Deployment

Terraform is configured to use environment variables for credentials:

```hcl
# provider configuration in terraform/main.tf
provider "datadog" {
  api_key = var.datadog_api_key  # From environment variable TF_VAR_datadog_api_key
  app_key = var.datadog_app_key  # From environment variable TF_VAR_datadog_app_key
}
```

We provide a helper script (`scripts/run-terraform.sh`) that securely loads environment variables from a local `.env` file and sets the appropriate Terraform variables without printing them.

## Developer Workflow

1. Create a `.env` file locally (not committed to Git) with your development credentials
2. Use `npm run dev` which loads these environment variables
3. For Terraform operations, use `./scripts/run-terraform.sh`

## Monitoring and Security Alerts

We have implemented the following safeguards:

1. **Credential rotation**: API keys are rotated monthly.
2. **Usage monitoring**: Unusual API key usage triggers alerts.
3. **Secret scanning**: GitHub's secret scanning prevents accidental credential commits.
4. **Rate limiting**: API endpoints are rate-limited to prevent abuse.
5. **Rotation alerts**: Notifications are sent when keys are rotated or rotation fails.

## Additional Resources

- [Datadog Security Best Practices](https://docs.datadoghq.com/account_management/api-app-keys/)
- [Netlify Environment Variables](https://docs.netlify.com/configure-builds/environment-variables/)
- [Netlify Functions](https://docs.netlify.com/functions/overview/) 
- [Netlify Scheduled Functions](https://docs.netlify.com/functions/scheduled-functions/)
- [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Terraform Environment Variables](https://developer.hashicorp.com/terraform/cli/config/environment-variables) 