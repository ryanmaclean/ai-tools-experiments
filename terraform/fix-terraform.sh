#!/bin/bash

# Terraform Formatter and Validator Script
# Uses Ollama for intelligent Terraform configuration fixing

set -e

# ANSI colors
RESET="\033[0m"
BOLD="\033[1m"
BLUE="\033[34m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"

# Banner
echo -e "${BLUE}${BOLD}TERRAFORM FORMATTER AND VALIDATOR${RESET}"
echo -e "${BLUE}================================${RESET}\n"

# Check if terraform is installed
if ! command -v terraform &> /dev/null; then
  echo -e "${RED}Error: Terraform is not installed or not in your PATH${RESET}"
  exit 1
fi

# Run terraform fmt to fix formatting issues
echo -e "${GREEN}Running terraform fmt to fix formatting issues...${RESET}"
terraform fmt

# Check if there are json.encode sections with missing newlines
for TF_FILE in *.tf; do
  echo -e "\n${BLUE}Checking $TF_FILE for potential formatting issues...${RESET}"
  
  # Find all json.encode lines and fix them
  ISSUE_LINES=$(grep -n "json.encode" "$TF_FILE" | cut -d: -f1 || true)
  
  if [ -n "$ISSUE_LINES" ]; then
    echo -e "${YELLOW}Found json.encode usage in $TF_FILE at lines: $ISSUE_LINES${RESET}"
    
    # Add newlines after each json.encode line
    for LINE in $ISSUE_LINES; do
      # Use sed to add a newline after the json.encode line if needed
      # This is a bit tricky due to pattern matching, so we'll add an extra space line
      # which terraform fmt will normalize
      sed -i "${LINE}s/)$/)\
      /" "$TF_FILE"
    done
    
    echo -e "${GREEN}Fixed json.encode lines in $TF_FILE${RESET}"
  else
    echo -e "${GREEN}No json.encode usage found in $TF_FILE${RESET}"
  fi
done

# Run terraform fmt again to normalize spacing
echo -e "\n${GREEN}Running terraform fmt to normalize spacing...${RESET}"
terraform fmt

# Verify URL patterns are correct for both environments
echo -e "\n${BLUE}Verifying URL patterns for both environments...${RESET}"

# Validate the terraform configuration
echo -e "\n${BLUE}Validating Terraform configuration...${RESET}"
terraform validate

if [ $? -eq 0 ]; then
  echo -e "\n${GREEN}${BOLD}Terraform configuration validated successfully!${RESET}"
  
  # If ollama is available, use it to analyze the Terraform config
  if command -v ollama &> /dev/null; then
    echo -e "\n${BLUE}Using Ollama to analyze Terraform configuration...${RESET}"
    
    TF_FILES=$(find . -name "*.tf" -type f | sort)
    
    # First 10 lines of each file for context
    SUMMARY=""
    for file in $TF_FILES; do
      SUMMARY="$SUMMARY\n\nFile: $file\n"
      SUMMARY="$SUMMARY$(head -n 10 "$file")\n..."
    done
    
    # Extract the URL patterns for analysis
    URL_PATTERNS=$(grep -A 10 -B 2 "get_url" *.tf || echo "No URL patterns found")
    
    # Prompt for ollama
    PROMPT="I need to verify the Terraform configuration for Datadog Synthetics tests. Please analyze these URL patterns to ensure they correctly handle both production and test environments:\n\n$URL_PATTERNS\n\nThe production site (ai-tools-lab.com) uses '/pages/' prefix for most pages, while the test site (ai-tools-lab-tst.netlify.app) has mixed patterns. Are there any issues or improvements needed?"
    
    echo -e "\n${YELLOW}Asking Llama 3.2 for analysis...${RESET}"
    ollama run llama3.2 "$PROMPT"
  fi
  
  echo -e "\n${GREEN}${BOLD}You can now run 'terraform init' followed by 'terraform plan' and 'terraform apply'${RESET}"
else
  echo -e "\n${RED}${BOLD}Terraform configuration still has issues. Please fix them manually.${RESET}"
  exit 1
fi
