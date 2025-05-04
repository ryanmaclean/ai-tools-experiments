#!/bin/bash

# Environment-Variable Driven Terraform Apply Script
# This script ensures sensitive credentials are never stored in files
# and properly handles URL patterns between environments

set -e

# ANSI colors
RESET="\033[0m"
BOLD="\033[1m"
BLUE="\033[34m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"

# Banner
echo -e "${BLUE}${BOLD}DATADOG SYNTHETICS TERRAFORM DEPLOYMENT${RESET}"
echo -e "${BLUE}========================================${RESET}\n"

# Check if TF_VAR_ environment variables exist, prompt if not
if [ -z "$TF_VAR_datadog_api_key" ]; then
  echo -e "${YELLOW}Datadog API Key not found in environment variables.${RESET}"
  read -sp "Enter Datadog API Key (it will be stored only in the TF_VAR_datadog_api_key environment variable): " TF_VAR_datadog_api_key
  echo ""
  export TF_VAR_datadog_api_key
fi

if [ -z "$TF_VAR_datadog_app_key" ]; then
  echo -e "${YELLOW}Datadog Application Key not found in environment variables.${RESET}"
  read -sp "Enter Datadog Application Key (it will be stored only in the TF_VAR_datadog_app_key environment variable): " TF_VAR_datadog_app_key
  echo ""
  export TF_VAR_datadog_app_key
fi

# Verify URL patterns in the Terraform configuration
echo -e "\n${BLUE}Verifying URL patterns between environments...${RESET}"
echo -e "${YELLOW}Production site (ai-tools-lab.com) uses '/pages/' prefix for most routes${RESET}"
echo -e "${YELLOW}Test site (ai-tools-lab-tst.netlify.app) has mixed patterns${RESET}\n"

# Run dual-environment validator first to ensure URLs are accessible
echo -e "${BLUE}Validating URLs in both environments...${RESET}"
PROJECT_ROOT="$(cd .. && pwd)"
cd "$PROJECT_ROOT"
npm run synthetics:validate-dual
cd "$PROJECT_ROOT/terraform"

# Validate Terraform configuration
echo -e "\n${BLUE}Validating Terraform configuration...${RESET}"
terraform validate

# Plan with environment variables
echo -e "\n${BLUE}Planning Terraform changes...${RESET}"
terraform plan -out=tfplan

# Confirm before applying
echo -e "\n${YELLOW}Ready to apply Terraform configuration to create/update Datadog Synthetics tests.${RESET}"
read -p "Do you want to continue with the apply? (y/n): " CONTINUE

if [[ $CONTINUE =~ ^[Yy] ]]; then
  echo -e "\n${BLUE}Applying Terraform changes...${RESET}"
  terraform apply tfplan
  
  # Use MCP Puppeteer for visual validation
  echo -e "\n${BLUE}Running visual validation with MCP Puppeteer...${RESET}"
  cd ..
  npm run synthetics:mcp-visual
  
  # Trigger Netlify build to ensure changes are reflected
  echo -e "\n${BLUE}Triggering Netlify build to reflect changes...${RESET}"
  curl -X POST -d {} https://api.netlify.com/build_hooks/6815aa2896ae6ddba51a8a30
  
  echo -e "\n${GREEN}${BOLD}Datadog Synthetics tests have been deployed successfully!${RESET}"
  echo -e "${GREEN}Netlify build has been triggered to reflect changes.${RESET}"
  echo -e "${YELLOW}Remember to check both production and test environments to ensure consistency.${RESET}"
else
  echo -e "\n${YELLOW}Terraform apply cancelled.${RESET}"
fi

# Clean up temporary files
rm -f tfplan

echo -e "\n${BLUE}Done!${RESET}"
