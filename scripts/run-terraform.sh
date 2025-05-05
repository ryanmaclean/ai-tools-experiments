#!/usr/bin/env bash
# Utility script to safely run Terraform with Datadog credentials

set -e

# Ensure we're in the project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

# Print header
echo "🔒 Running Terraform safely with environment variables"
echo "======================================================"

# Check if .env file exists
ENV_FILE="${PROJECT_ROOT}/.env"

# Source environment variables if available
if [ -f "${ENV_FILE}" ]; then
  echo "📝 Loading environment variables from ${ENV_FILE}"
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
fi

# Check for required variables
if [ -z "${DD_API_KEY}" ]; then
  echo "❌ Error: DD_API_KEY environment variable is not set."
  echo "Please set it in your environment or in .env file."
  exit 1
fi

if [ -z "${DD_APP_KEY}" ]; then
  echo "❌ Error: DD_APP_KEY environment variable is not set."
  echo "Please set it in your environment or in .env file."
  exit 1
fi

# Set Terraform variables from environment without printing values
export TF_VAR_datadog_api_key="${DD_API_KEY}"
export TF_VAR_datadog_app_key="${DD_APP_KEY}"

# Determine environment
ENVIRONMENT="${1:-test}"
if [[ "${ENVIRONMENT}" != "production" && "${ENVIRONMENT}" != "test" ]]; then
  echo "⚠️ Invalid environment: ${ENVIRONMENT}. Using 'test' instead."
  ENVIRONMENT="test"
fi

export TF_VAR_environment="${ENVIRONMENT}"

# Navigate to Terraform directory
cd "${PROJECT_ROOT}/terraform"

# Print what we're about to do (without showing any secrets)
echo "✅ Environment variables securely loaded"
echo "📊 Running Terraform for environment: ${ENVIRONMENT}"
echo ""

# Run Terraform with the command passed as rest arguments
shift
TERRAFORM_CMD=${*:-plan}

echo "▶️ terraform ${TERRAFORM_CMD}"
terraform ${TERRAFORM_CMD}

# Print completion
echo ""
echo "✅ Terraform command completed" 