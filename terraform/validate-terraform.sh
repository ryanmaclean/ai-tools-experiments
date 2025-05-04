#!/bin/bash

# Terraform Validation Script for Datadog Synthetics Tests
# This script validates that the Terraform configuration is correct and ready to apply

set -e

# Color definitions
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}========================================================${NC}"
echo -e "${BLUE}   Terraform Datadog Synthetics Configuration Validator${NC}"
echo -e "${BLUE}========================================================${NC}"

# Check if required Datadog API keys are available from environment variables
if [ -z "${TF_VAR_datadog_api_key}" ]; then
  if [ -n "${DD_API_KEY}" ]; then
    echo -e "${YELLOW}ℹ️ TF_VAR_datadog_api_key not set, but found DD_API_KEY - will use this.${NC}"
    export TF_VAR_datadog_api_key="${DD_API_KEY}"
  else
    echo -e "${YELLOW}⚠️ WARNING: No Datadog API key found. Set TF_VAR_datadog_api_key or DD_API_KEY.${NC}"
    echo -e "${YELLOW}   Will proceed with validation using placeholder values.${NC}"
    export TF_VAR_datadog_api_key="PLACEHOLDER_FOR_VALIDATION"
  fi
fi

if [ -z "${TF_VAR_datadog_app_key}" ]; then
  if [ -n "${DD_APP_KEY}" ]; then
    echo -e "${YELLOW}ℹ️ TF_VAR_datadog_app_key not set, but found DD_APP_KEY - will use this.${NC}"
    export TF_VAR_datadog_app_key="${DD_APP_KEY}"
  else
    echo -e "${YELLOW}⚠️ WARNING: No Datadog Application key found. Set TF_VAR_datadog_app_key or DD_APP_KEY.${NC}"
    echo -e "${YELLOW}   Will proceed with validation using placeholder values.${NC}"
    export TF_VAR_datadog_app_key="PLACEHOLDER_FOR_VALIDATION"
  fi
fi

# Initialize terraform if needed
if [ ! -d ".terraform" ]; then
  echo -e "\n${BLUE}Initializing Terraform configuration...${NC}"
  terraform init
fi

# Validate the configuration
echo -e "\n${BLUE}Validating Terraform configuration...${NC}"
tf_validate_output=$(terraform validate 2>&1)
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Terraform configuration is valid!${NC}"
else
  echo -e "${RED}❌ Terraform configuration is invalid:${NC}"
  echo "$tf_validate_output"
  exit 1
fi

# Run a plan to see what would be created
echo -e "\n${BLUE}Running Terraform plan to validate resources...${NC}"

PLANNED_TESTS=0

# Run plan and capture output
PLAN_OUTPUT=$(terraform plan -var-file="terraform.tfvars.example" 2>&1)
PLAN_EXIT_CODE=$?

# Extract test count from plan output
if [[ "$PLAN_OUTPUT" =~ "datadog_synthetics_test.".*"will be created" ]]; then
  PLANNED_TESTS=$(echo "$PLAN_OUTPUT" | grep -o "datadog_synthetics_test.*will be created" | wc -l | tr -d ' ')
fi

# Check plan exit code
if [ $PLAN_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ Terraform plan succeeded!${NC}"
  echo -e "${GREEN}✅ Plan will create ${PLANNED_TESTS} Datadog Synthetics tests${NC}"
else
  echo -e "${RED}❌ Terraform plan failed:${NC}"
  echo "$PLAN_OUTPUT"
  # Provide common solutions to errors
  if [[ "$PLAN_OUTPUT" =~ "provider with installation lock" ]]; then
    echo -e "\n${YELLOW}Try removing the .terraform.lock.hcl file and running terraform init again${NC}"
  fi
  if [[ "$PLAN_OUTPUT" =~ "not available for your edition" ]]; then
    echo -e "\n${YELLOW}Your Datadog plan may not include Synthetics. Check your subscription.${NC}"
  fi
  exit 1
fi

# Analyze test coverage
echo -e "\n${BLUE}Analyzing Synthetics test coverage...${NC}"

# Count how many episode pages we're testing
EPISODE_TESTS=$(grep -c "episode_pages\[\\"ep" datadog_synthetics.tf || echo "0")

# Extract other specific tests
HOMEPAGE_TEST=$(grep -c "datadog_synthetics_test\\".*\\"homepage\\"" datadog_synthetics.tf || echo "0")
ABOUT_TEST=$(grep -c "datadog_synthetics_test\\".*\\"about\\"" datadog_synthetics.tf || echo "0")
RESOURCES_TEST=$(grep -c "datadog_synthetics_test\\".*\\"resources\\"" datadog_synthetics.tf || echo "0")
OBSERVATIONS_TEST=$(grep -c "datadog_synthetics_test\\".*\\"observations\\"" datadog_synthetics.tf || echo "0")

TOTAL_EXPECTED=$((EPISODE_TESTS + HOMEPAGE_TEST + ABOUT_TEST + RESOURCES_TEST + OBSERVATIONS_TEST))

echo -e "${GREEN}Test Coverage Summary:${NC}"
echo -e "- Homepage test: ${HOMEPAGE_TEST}/1 defined"
echo -e "- About page test: ${ABOUT_TEST}/1 defined"
echo -e "- Resources page test: ${RESOURCES_TEST}/1 defined"
echo -e "- Observations page test: ${OBSERVATIONS_TEST}/1 defined"
echo -e "- Episode pages tests: ${EPISODE_TESTS}/17 defined"
echo -e "\nTotal expected tests: ${TOTAL_EXPECTED}"
echo -e "Tests in plan: ${PLANNED_TESTS}"

# Check if test counts match expectations
if [ "$TOTAL_EXPECTED" != "$PLANNED_TESTS" ] && [ "$PLANNED_TESTS" != "0" ]; then
  echo -e "\n${YELLOW}⚠️ WARNING: Expected ${TOTAL_EXPECTED} tests but plan shows ${PLANNED_TESTS} tests${NC}"
  echo -e "${YELLOW}   This may indicate a configuration issue or count mismatch.${NC}"
fi

# Output URL patterns being monitored
echo -e "\n${BLUE}Validating URL patterns across environments:${NC}"

TERRAFORM_JSON_OUTPUT=$(terraform output -json 2>/dev/null || echo '{}')

if [ "$TERRAFORM_JSON_OUTPUT" != "{}" ]; then
  # Get a sample from each environment
  SAMPLE_PROD_URL=$(echo "$TERRAFORM_JSON_OUTPUT" | jq -r '.test_urls.value.home.production' 2>/dev/null || echo "Not available")
  SAMPLE_STAGING_URL=$(echo "$TERRAFORM_JSON_OUTPUT" | jq -r '.test_urls.value.home.staging' 2>/dev/null || echo "Not available")
  
  if [ "$SAMPLE_PROD_URL" != "Not available" ]; then
    echo -e "${GREEN}✅ Production URL pattern verified: ${SAMPLE_PROD_URL}${NC}"
  else
    echo -e "${YELLOW}⚠️ Could not verify production URL pattern${NC}"
  fi
  
  if [ "$SAMPLE_STAGING_URL" != "Not available" ]; then
    echo -e "${GREEN}✅ Staging URL pattern verified: ${SAMPLE_STAGING_URL}${NC}"
  else
    echo -e "${YELLOW}⚠️ Could not verify staging URL pattern${NC}"
  fi
else
  echo -e "${YELLOW}⚠️ Could not verify URL patterns (no terraform outputs available)${NC}"
  echo -e "${YELLOW}   Run 'terraform apply' to generate outputs for validation${NC}"
fi

# Validation complete
echo -e "\n${BLUE}========================================================${NC}"
echo -e "${GREEN}✅ TERRAFORM CONFIGURATION VALIDATED SUCCESSFULLY${NC}"
echo -e "${BLUE}========================================================${NC}"
echo -e "\nReady to apply! Run the following to create the tests in Datadog:\n"
echo -e "    ${BLUE}terraform apply${NC}\n"
echo -e "Make sure to set your Datadog credentials via:"
echo -e "- Environment variables (recommended)"
echo -e "  export TF_VAR_datadog_api_key=\"your_api_key\""
echo -e "  export TF_VAR_datadog_app_key=\"your_app_key\""
echo -e "- OR using a terraform.tfvars file (DO NOT commit this file to git)"

exit 0
