#!/bin/bash

# Terraform Driver Script for Datadog Synthetics
# This script runs Terraform with proper environment variables
# and integrates with MCP Puppeteer, Vitest, and Ollama/Aider

set -e

# ANSI colors
RESET="\033[0m"
BOLD="\033[1m"
BLUE="\033[34m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"

# Banner
echo -e "${BLUE}${BOLD}TERRAFORM DATADOG SYNTHETICS DEPLOYMENT${RESET}"
echo -e "${BLUE}========================================${RESET}\n"

# Check for Datadog API credentials
if [ -z "$DD_API_KEY" ] || [ -z "$DD_APP_KEY" ]; then
  echo -e "${YELLOW}Datadog API credentials not found in environment variables.${RESET}"
  echo -e "${YELLOW}Please provide them now (they will not be stored permanently):${RESET}\n"
  
  if [ -z "$DD_API_KEY" ]; then
    read -sp "Enter Datadog API Key: " DD_API_KEY
    echo ""
    export DD_API_KEY
  fi
  
  if [ -z "$DD_APP_KEY" ]; then
    read -sp "Enter Datadog Application Key: " DD_APP_KEY
    echo ""
    export DD_APP_KEY
  fi
fi

# Choose environment
echo -e "\n${BLUE}Select environment to deploy tests:${RESET}"
echo "1) Production (ai-tools-lab.com)"
echo "2) Test (ai-tools-lab-tst.netlify.app)"
echo "3) Both"
read -p "Selection [3]: " ENV_CHOICE
ENV_CHOICE=${ENV_CHOICE:-3}

case $ENV_CHOICE in
  1) ENVIRONMENT="production" ;;
  2) ENVIRONMENT="test" ;;
  *) ENVIRONMENT="both" ;;
esac

echo -e "\n${GREEN}Selected environment: ${BOLD}${ENVIRONMENT}${RESET}\n"

# Create temporary tfvars file
TMP_TFVARS="terraform.tfvars.tmp"
cat > "$TMP_TFVARS" << EOF
datadog_api_key = "$DD_API_KEY"
datadog_app_key = "$DD_APP_KEY"
environment = "$ENVIRONMENT"
test_frequency = 300
notification_emails = ["team@ai-tools-lab.com"]
EOF

echo -e "${GREEN}Created temporary terraform.tfvars file${RESET}\n"

# Validate URLs in both environments first
echo -e "${BLUE}Validating URLs in both environments...${RESET}"
npm run synthetics:validate-dual

# Initialize Terraform
echo -e "\n${BLUE}Initializing Terraform...${RESET}"
terraform init

# Validate Terraform configuration
echo -e "\n${BLUE}Validating Terraform configuration...${RESET}"
terraform validate

# Plan Terraform changes
echo -e "\n${BLUE}Planning Terraform changes...${RESET}"
terraform plan -var-file="$TMP_TFVARS" -out="tfplan"

# Apply Terraform changes
echo -e "\n${BLUE}Apply Terraform changes? (y/n)${RESET}"
read -p "> " APPLY_CHANGES

if [[ $APPLY_CHANGES =~ ^[Yy] ]]; then
  echo -e "\n${BLUE}Applying Terraform changes...${RESET}"
  terraform apply "tfplan"
  
  # Run Vitest validation
  echo -e "\n${BLUE}Running Vitest validation...${RESET}"
  npm run synthetics:vitest
  
  # Check if Ollama is available
  if command -v ollama &> /dev/null; then
    echo -e "\n${BLUE}Checking for issues with Ollama...${RESET}"
    ISSUES=$(terraform output -json test_urls | jq -r 'to_entries[] | "\(.key): \(.value.production)"')
    
    ollama run llama3.2 << EOF
Help me analyze the following Datadog Synthetics test URLs for AI Tools Lab:

$ISSUES

Are there any potential issues or improvements I should make to these URL patterns?
EOF
  fi
else
  echo -e "\n${YELLOW}Terraform apply cancelled.${RESET}"
fi

# Clean up
echo -e "\n${BLUE}Cleaning up...${RESET}"
rm -f "$TMP_TFVARS" "tfplan"

echo -e "\n${GREEN}${BOLD}Terraform Datadog Synthetics deployment completed!${RESET}"
