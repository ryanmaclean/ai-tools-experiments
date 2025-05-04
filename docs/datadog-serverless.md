# Datadog Serverless Monitoring Setup

## Overview

This document describes how to set up and use Datadog monitoring for AWS Lambda functions in the AI Tools Lab project. Serverless monitoring provides visibility into function performance, errors, security issues, and more without requiring code changes.

## Features Enabled

- **Infrastructure Monitoring**: Complete visibility into your Lambda functions with performance metrics and vendor-backed integrations
- **Application Security (AppSec)**: Detection of attacks targeting your serverless applications
- **Profiling**: Performance analysis of your functions to identify bottlenecks and optimization opportunities

## Prerequisites

1. AWS credentials with access to the AWS Lambda service
2. Datadog API key
3. Node.js and npm installed

## Installation

The Datadog CLI has been installed globally using:

```bash
npm install -g @datadog/datadog-ci
```

## Configuration

The following Datadog configuration is used:

- **API Key**: Set via environment variable `DD_API_KEY`
- **Site**: `datadoghq.com`

## Instrumenting Lambda Functions

### Using the Automation Script

We've created an automation script to simplify the instrumentation process:

```bash
./scripts/instrument-lambda.sh
```

This script offers the following options:

1. List available Lambda functions
2. Instrument a specific Lambda function
3. Instrument all Lambda functions

### Manual Instrumentation

To manually instrument a Lambda function:

```bash
# First export your Datadog API key or set it in your environment
export DD_API_KEY=your_api_key_here

# Then run the instrumentation command
DD_SITE="datadoghq.com" datadog-ci lambda instrument --function YOUR_FUNCTION_NAME -i --appsec --profile
```

## URL Pattern Handling

Our serverless functions should handle both URL patterns used in our environments:

- Production site: `ai-tools-lab.com/pages/resource-name`
- Test site: `ai-tools-lab-tst.netlify.app/resource-name`

Lambda functions should check the origin domain and adjust paths accordingly.

## Verification

After instrumentation, invoke your Lambda functions a few times to send metrics, logs, and traces to Datadog:

```bash
aws lambda invoke --function-name YOUR_FUNCTION_NAME --payload '{}' response.json
```

## Viewing Serverless Data

After successful instrumentation, you can view your serverless monitoring data in the Datadog dashboard:

1. Go to [Datadog Serverless](https://app.datadoghq.com/functions)
2. Navigate to Functions list
3. Select your Lambda function to view detailed metrics

## Security Monitoring

Serverless AppSec monitoring will automatically detect:

- Code injection attacks
- Suspicious behavior patterns
- Potential data exfiltration
- Configuration vulnerabilities

All security findings will appear in the [Application Security Dashboard](https://app.datadoghq.com/security).

## Troubleshooting

If you encounter issues with serverless monitoring:

1. Verify AWS credentials have proper permissions
2. Check Lambda execution role has permissions to write Datadog metrics
3. Ensure the Datadog API key is correct
4. Verify Lambda function has been invoked after instrumentation

## References

- [Datadog Serverless Documentation](https://docs.datadoghq.com/serverless/)
- [Datadog Application Security for Serverless](https://docs.datadoghq.com/security/application_security/serverless/)
- [Datadog CLI Documentation](https://docs.datadoghq.com/serverless/guide/cli/)
