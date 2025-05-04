#!/bin/bash

# Script to apply Datadog synthetic tests using Terraform
# Uses environment variables for authentication

set -e

# Check if environment variables are set
if [ -z "$DD_API_KEY" ] || [ -z "$DD_APP_KEY" ]; then
  echo "Error: DD_API_KEY and DD_APP_KEY environment variables must be set"
  exit 1
fi

# Change to the terraform directory
cd "$(dirname "$0")/../terraform"

# Export variables for Terraform
export TF_VAR_datadog_api_key="$DD_API_KEY"
export TF_VAR_datadog_app_key="$DD_APP_KEY"

# Run Terraform
echo "Initializing Terraform..."
terraform init

echo "\nValidating Terraform configuration..."
terraform validate

echo "\nPlanning Terraform changes..."
terraform plan -out=tfplan

echo "\nApplying Terraform changes..."
terraform apply -auto-approve tfplan

echo "\nVerifying synthetic tests in Datadog..."
cd ..
node ./hooks/verify-datadog-synthetics.js
