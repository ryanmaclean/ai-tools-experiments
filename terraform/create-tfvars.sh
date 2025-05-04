#!/bin/bash

# Create terraform.tfvars securely

set -e

# Check for existing credentials in environment
if [ -z "$DD_API_KEY" ] || [ -z "$DD_APP_KEY" ]; then
  echo "Datadog API credentials not found in environment variables."
  echo "Please provide them now (they will not be stored in your command history):"
  
  if [ -z "$DD_API_KEY" ]; then
    read -sp "Enter Datadog API Key: " DD_API_KEY
    echo ""
  fi
  
  if [ -z "$DD_APP_KEY" ]; then
    read -sp "Enter Datadog Application Key: " DD_APP_KEY
    echo ""
  fi
fi

# Create tfvars file
cat > terraform.tfvars << EOT
datadog_api_key = "${DD_API_KEY}"
datadog_app_key = "${DD_APP_KEY}"

# Testing environment (production or test)
environment = "both"

# Test frequency (5 minutes)
test_frequency = 300

# Notification emails
notification_emails = ["team@ai-tools-lab.com"]
EOT

echo "Created terraform.tfvars with your credentials"
echo "Running terraform validate..."

terraform validate
