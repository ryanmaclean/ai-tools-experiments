#!/bin/bash

# Datadog Lambda Instrumentation Script
# This script instruments AWS Lambda functions with Datadog monitoring

# ANSI colors for terminal output
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "\n${BLUE}DATADOG LAMBDA INSTRUMENTATION${NC}"
echo -e "${BLUE}==================================${NC}\n"

# Get Datadog API key from environment variable or prompt user
if [ -z "$DD_API_KEY" ]; then
  echo -e "${YELLOW}Datadog API key not found in environment.${NC}"
  echo -e "${YELLOW}Please enter your Datadog API key:${NC} "
  read -r DD_API_KEY
fi

# Set Datadog site
DD_SITE="datadoghq.com"

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &>/dev/null; then
  echo -e "${RED}ERROR: AWS credentials not configured.${NC}"
  echo -e "${YELLOW}Please configure AWS credentials with Lambda access before running this script.${NC}"
  echo -e "Run 'aws configure' to set up credentials.\n"
  exit 1
fi

# Function to list available Lambda functions
list_functions() {
  echo -e "${BLUE}Retrieving available Lambda functions...${NC}"
  aws lambda list-functions --query "Functions[].FunctionName" --output table
}

# Function to instrument a specific Lambda function
instrument_function() {
  local function_name=$1
  
  echo -e "\n${BLUE}Instrumenting Lambda function: ${YELLOW}${function_name}${NC}"
  
  # Run Datadog CLI command with specified options
  DD_API_KEY=$DD_API_KEY DD_SITE=$DD_SITE datadog-ci lambda instrument \
    --function $function_name \
    -i \
    --appsec \
    --profile
  
  local exit_code=$?
  if [ $exit_code -eq 0 ]; then
    echo -e "\n${GREEN}Successfully instrumented Lambda function: ${function_name}${NC}"
  else
    echo -e "\n${RED}Failed to instrument Lambda function: ${function_name}${NC}"
    echo -e "${YELLOW}Please check the error message above and try again.${NC}"
  fi
  
  return $exit_code
}

# Function to instrument all Lambda functions
instrument_all_functions() {
  echo -e "${BLUE}Retrieving all Lambda functions...${NC}"
  local functions=$(aws lambda list-functions --query "Functions[].FunctionName" --output text)
  
  if [ -z "$functions" ]; then
    echo -e "${YELLOW}No Lambda functions found in this AWS account.${NC}"
    return 1
  fi
  
  local success_count=0
  local total_count=0
  
  for func in $functions; do
    instrument_function "$func"
    if [ $? -eq 0 ]; then
      ((success_count++))
    fi
    ((total_count++))
  done
  
  echo -e "\n${BLUE}INSTRUMENTATION SUMMARY${NC}"
  echo -e "${BLUE}=======================${NC}"
  echo -e "Total functions: ${total_count}"
  echo -e "Successfully instrumented: ${success_count}"
  echo -e "Failed: $((total_count - success_count))"
  
  if [ $success_count -eq $total_count ]; then
    echo -e "\n${GREEN}All Lambda functions successfully instrumented!${NC}"
  else
    echo -e "\n${YELLOW}Some Lambda functions could not be instrumented. Please check the logs above.${NC}"
  fi
}

# Main menu
show_menu() {
  echo -e "\n${BLUE}MENU${NC}"
  echo -e "${BLUE}====${NC}"
  echo "1. List available Lambda functions"
  echo "2. Instrument a specific Lambda function"
  echo "3. Instrument all Lambda functions"
  echo "4. Exit"
  echo -e "\nEnter your choice [1-4]: "
  read -r choice
  
  case $choice in
    1) list_functions; show_menu ;;
    2)
      echo -e "\nEnter the Lambda function name: "
      read -r function_name
      instrument_function "$function_name"
      show_menu
      ;;
    3) instrument_all_functions; show_menu ;;
    4) echo -e "\n${GREEN}Exiting. Goodbye!${NC}"; exit 0 ;;
    *) echo -e "\n${RED}Invalid choice. Please try again.${NC}"; show_menu ;;
  esac
}

# Display instructions
echo -e "${YELLOW}This script will help you instrument your AWS Lambda functions with Datadog monitoring.${NC}"
echo -e "${YELLOW}It uses the following configuration:${NC}"
echo -e "  - API Key: ${DD_API_KEY}"
echo -e "  - Datadog Site: ${DD_SITE}"
echo -e "  - Features: Infrastructure Monitoring, Application Security, Profiling"

# Start the menu
show_menu
