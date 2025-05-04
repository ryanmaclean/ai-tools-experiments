# Datadog Synthetics Tests Terraform Configuration for AI Tools Lab
# This file manages all synthetic browser tests for the AI Tools Lab project

terraform {
  required_providers {
    datadog = {
      source  = "datadog/datadog"
      version = "~> 3.30.0"
    }
  }
}

provider "datadog" {
  api_key = var.datadog_api_key
  app_key = var.datadog_app_key
  api_url = "https://api.datadoghq.com/"
}

# Datadog provider configuration uses variables from variables.tf

locals {
  # Base URLs for different environments
  environments = {
    production = "https://ai-tools-lab.com"
    staging    = "https://ai-tools-lab-tst.netlify.app"
  }
  
  # Default test config
  default_test_config = {
    device_ids  = ["laptop_large"]
    frequency   = 300 # 5 minutes in seconds
    locations   = ["aws:us-west-1"]
    retry_count = 2
    retry_interval = 300 # 5 minutes in seconds
  }
  
  # Episode pages to monitor - only prioritizing ep01 for browser tests due to quota limitations
  featured_episode = ["ep01"]
  
  # Other episodes monitored via API tests
  api_episode_pages = [
    "ep02", "ep03", "ep04", "ep05", 
    "ep06", "ep07", "ep08", "ep09", "ep10",
    "ep11", "ep12", "ep13", "ep14", "ep15",
    "ep16", "ep17"
  ]
  
  # All episodes combined for output references
  all_episode_pages = concat(local.featured_episode, local.api_episode_pages)
}

# Helper for determining the correct URL based on environment and route
locals {
  get_url = { for env_key, env_url in local.environments : env_key => {
    for route in concat(["home", "about", "resources", "observations"], local.all_episode_pages) :
      route => (
        # Home page is the base URL
        route == "home" ? env_url : (
          # Episodes in production use /pages/ prefix
          startswith(route, "ep") && env_key == "production" ? "${env_url}/pages/${route}" : (
            # Episodes in staging use direct path
            startswith(route, "ep") && env_key == "staging" ? "${env_url}/${route}" : (
              # Standard pages like about, resources in production use /pages/ prefix
              contains(["about", "resources", "observations"], route) && env_key == "production" ? "${env_url}/pages/${route}" : (
                # Standard pages in staging use direct path
                contains(["resources", "observations"], route) && env_key == "staging" ? "${env_url}/${route}" : (
                  # Default fallback
                  "${env_url}/${route}"
                )
              )
            )
          )
        )
      )
    }
  }
}

# Output test URLs for reference
output "test_urls" {
  value = {
    for page in concat(["home", "about", "resources", "observations"], local.all_episode_pages) :
      page => {
        production = local.get_url["production"][page]
        staging    = local.get_url["staging"][page]
      }
  }
  description = "URLs for all synthetic tests in both environments"
  sensitive   = false
}
