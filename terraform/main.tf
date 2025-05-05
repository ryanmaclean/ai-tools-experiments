# Main Terraform configuration for Datadog monitoring
# This file uses environment variables for API keys to avoid exposing them in code

terraform {
  required_providers {
    datadog = {
      source  = "datadog/datadog"
      version = "~> 3.30.0"
    }
  }
  
  # Optional backend configuration for state storage
  # Uncomment and configure as needed
  # backend "s3" {
  #   bucket = "ai-tools-lab-terraform"
  #   key    = "terraform.tfstate"
  #   region = "us-west-2"
  # }
}

# Datadog provider configured using environment variables
# Set TF_VAR_datadog_api_key and TF_VAR_datadog_app_key in your environment
# or use .env files loaded by a script before running terraform
provider "datadog" {
  api_key = var.datadog_api_key # from variables.tf, passed in via TF_VAR_datadog_api_key
  app_key = var.datadog_app_key # from variables.tf, passed in via TF_VAR_datadog_app_key
  api_url = "https://api.datadoghq.com/"
}

# Import configuration modules
module "rum_monitoring" {
  source = "./modules/rum"
  
  app_name = "ai-tools-lab"
  environment = var.environment
}

module "synthetics" {
  source = "./modules/synthetics"
  
  app_name = "ai-tools-lab"
  environment = var.environment
  test_frequency = var.test_frequency
  notification_emails = var.notification_emails
}

# Output key values that can be used in deployment
# Note: No API keys are included in outputs
output "rum_application_id" {
  description = "The Datadog RUM Application ID for client-side monitoring"
  value       = module.rum_monitoring.rum_application_id
  sensitive   = false
}

output "rum_client_token" {
  description = "The Datadog RUM Client Token for client-side monitoring"
  value       = module.rum_monitoring.rum_client_token
  sensitive   = true # Marked as sensitive to avoid displaying in logs
}

output "synthetic_test_ids" {
  description = "The IDs of created Datadog synthetic tests"
  value       = module.synthetics.test_ids
  sensitive   = false
}

# Script to run tests can be accessed via:
output "run_tests_command" {
  description = "Command to trigger synthetic tests manually"
  value       = "curl -X POST 'https://api.datadoghq.com/api/v1/synthetics/tests/trigger/run' -H 'Content-Type: application/json' -H 'DD-API-KEY: ${var.datadog_api_key}' -H 'DD-APPLICATION-KEY: ${var.datadog_app_key}' -d '{\"tests\": ${jsonencode(module.synthetics.test_ids)}}'"
  sensitive   = true # Marked as sensitive to avoid displaying API keys in logs
} 