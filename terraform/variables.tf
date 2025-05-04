# Variables for Datadog Synthetics Terraform Configuration

variable "datadog_api_key" {
  type        = string
  description = "Datadog API key"
  sensitive   = true
}

variable "datadog_app_key" {
  type        = string
  description = "Datadog Application key"
  sensitive   = true
}

variable "environment" {
  type        = string
  description = "Environment to deploy tests against (production or test)"
  default     = "test"
  validation {
    condition     = contains(["production", "test"], var.environment)
    error_message = "The environment must be 'production' or 'test'."
  }
}

variable "test_frequency" {
  type        = number
  description = "Test frequency in seconds (300 = 5 minutes, 600 = 10 minutes, etc.)"
  default     = 300
  validation {
    condition     = var.test_frequency >= 60 && var.test_frequency <= 86400
    error_message = "Test frequency must be between 60 seconds (1 minute) and 86400 seconds (24 hours)."
  }
}

variable "notification_emails" {
  type        = list(string)
  description = "Email addresses to notify on test failures"
  default     = []
}
