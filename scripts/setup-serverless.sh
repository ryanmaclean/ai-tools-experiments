#!/bin/bash

# Datadog Serverless Monitoring Setup Script
# This script helps set up Datadog monitoring for AWS Lambda functions

# ANSI colors for terminal output
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "\n${BLUE}DATADOG SERVERLESS MONITORING SETUP${NC}"
echo -e "${BLUE}===================================${NC}\n"

# Function to securely set up Datadog API key
setup_api_key() {
  # Check if API key is already in environment
  if [ -z "$DD_API_KEY" ]; then
    echo -e "${YELLOW}No Datadog API key found in environment.${NC}"
    echo -e "${YELLOW}Do you want to:${NC}"
    echo "1. Enter API key now (not saved)"
    echo "2. Add API key to .env file (local only)"
    echo "3. Skip (you'll need to provide it later)"
    echo -e "\nEnter your choice [1-3]: "
    read -r choice
    
    case $choice in
      1)
        echo -e "\nEnter your Datadog API key: "
        read -r DD_API_KEY
        export DD_API_KEY
        echo -e "${GREEN}API key set for this session.${NC}"
        ;;
      2)
        echo -e "\nEnter your Datadog API key: "
        read -r api_key
        
        # Check if .env file exists
        if [ -f ".env" ]; then
          # Check if DD_API_KEY already exists in .env
          if grep -q "DD_API_KEY=" .env; then
            # Replace existing entry
            sed -i "" "s/DD_API_KEY=.*/DD_API_KEY=$api_key/" .env
          else
            # Append new entry
            echo "DD_API_KEY=$api_key" >> .env
          fi
        else
          # Create new .env file
          echo "DD_API_KEY=$api_key" > .env
        fi
        
        # Add .env to .gitignore if not already there
        if [ -f ".gitignore" ]; then
          if ! grep -q "\.env" .gitignore; then
            echo ".env" >> .gitignore
          fi
        else
          echo ".env" > .gitignore
        fi
        
        # Export the API key for this session
        export DD_API_KEY=$api_key
        echo -e "${GREEN}API key saved to .env file and set for this session.${NC}"
        echo -e "${YELLOW}Note: .env has been added to .gitignore to prevent accidental commits.${NC}"
        ;;
      3)
        echo -e "${YELLOW}Skipping API key setup. You will need to export DD_API_KEY when using Datadog CLI.${NC}"
        ;;
      *)
        echo -e "${RED}Invalid choice. Skipping API key setup.${NC}"
        ;;
    esac
  else
    echo -e "${GREEN}Using Datadog API key from environment.${NC}"
  fi
}

# Function to install Datadog CLI if not installed
install_datadog_cli() {
  if ! command -v datadog-ci &> /dev/null; then
    echo -e "${YELLOW}Datadog CLI not found. Installing...${NC}"
    npm install -g @datadog/datadog-ci
    echo -e "${GREEN}Datadog CLI installed successfully.${NC}"
  else
    echo -e "${GREEN}Datadog CLI already installed: $(datadog-ci --version)${NC}"
  fi
}

# Function to check AWS CLI and credentials
check_aws_setup() {
  if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI not found. Please install it to proceed.${NC}"
    echo -e "Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    return 1
  fi
  
  echo -e "${BLUE}Checking AWS credentials...${NC}"
  if ! aws sts get-caller-identity &>/dev/null; then
    echo -e "${RED}AWS credentials not configured.${NC}"
    echo -e "${YELLOW}Would you like to configure AWS credentials now? (y/n)${NC}"
    read -r setup_aws
    
    if [[ $setup_aws == "y" || $setup_aws == "Y" ]]; then
      aws configure
      if ! aws sts get-caller-identity &>/dev/null; then
        echo -e "${RED}Failed to configure AWS credentials. Please try again manually.${NC}"
        return 1
      fi
    else
      echo -e "${YELLOW}Skipping AWS setup. You will need valid AWS credentials to instrument Lambda functions.${NC}"
      return 1
    fi
  fi
  
  echo -e "${GREEN}AWS credentials verified successfully.${NC}"
  return 0
}

# Function to list Lambda functions
list_lambda_functions() {
  echo -e "\n${BLUE}Retrieving Lambda functions...${NC}"
  aws lambda list-functions --query "Functions[].{Name:FunctionName, Runtime:Runtime, Memory:MemorySize, Timeout:Timeout}" --output table
}

# Function to instrument a Lambda function
instrument_lambda() {
  local function_name=$1
  
  if [ -z "$DD_API_KEY" ]; then
    echo -e "${RED}Error: Datadog API key not set. Please export DD_API_KEY first.${NC}"
    return 1
  fi
  
  echo -e "\n${BLUE}Instrumenting Lambda function: ${YELLOW}${function_name}${NC}"
  datadog-ci lambda instrument \
    --function "$function_name" \
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

# Main function to run the script
main() {
  # Install Datadog CLI if needed
  install_datadog_cli
  
  # Setup API key
  setup_api_key
  
  # Check AWS setup
  check_aws_setup
  if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Continuing with limited functionality due to AWS credential issues.${NC}"
  fi
  
  # Main menu
  while true; do
    echo -e "\n${BLUE}DATADOG SERVERLESS MONITORING MENU${NC}"
    echo -e "${BLUE}=================================${NC}"
    echo "1. List available Lambda functions"
    echo "2. Instrument a specific Lambda function"
    echo "3. View Datadog CLI version"
    echo "4. Exit"
    echo -e "\nEnter your choice [1-4]: "
    read -r choice
    
    case $choice in
      1) list_lambda_functions ;;
      2) 
        echo -e "\nEnter the Lambda function name: "
        read -r function_name
        instrument_lambda "$function_name"
        ;;
      3) datadog-ci --version ;;
      4) echo -e "\n${GREEN}Exiting Datadog Serverless setup. Goodbye!${NC}"; exit 0 ;;
      *) echo -e "\n${RED}Invalid choice. Please try again.${NC}" ;;
    esac
  done
}

# Run the main function
main
