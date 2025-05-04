# API Synthetics Tests for remaining pages
# This handles episodes that can't be covered by browser tests due to quota limitations

# API tests for remaining episode pages
resource "datadog_synthetics_test" "api_episode_pages" {
  for_each = toset(local.api_episode_pages)
  
  name      = "API Episode Page Test - ${each.value}"
  type      = "api"
  subtype   = "http"
  status    = "live"
  message   = "The AI Tools Lab episode page ${each.value} is not responding correctly. Please investigate immediately."
  tags      = ["ai-tools-lab", "page:episode", "episode:${each.value}", "terraform:true", "test:api", "env:production", "environment:prd"]
  
  request_definition {
    method = "GET"
    url    = local.get_url["production"][each.value]
  }
  
  assertion {
    type     = "statusCode"
    operator = "is"
    target   = "200"
  }
  
  assertion {
    type     = "responseTime"
    operator = "lessThan"
    target   = "2000"
  }
  
  assertion {
    type     = "header"
    property = "content-type"
    operator = "contains"
    target   = "text/html"
  }
  
  locations = local.default_test_config.locations
  
  options_list {
    tick_every         = local.default_test_config.frequency
    min_failure_duration = 300
    min_location_failed  = 1
    retry {
      count    = local.default_test_config.retry_count
      interval = local.default_test_config.retry_interval
    }
  }
}

# API test for key site functionality
resource "datadog_synthetics_test" "api_site_health" {
  name      = "API Site Health Check"
  type      = "api"
  subtype   = "http"
  status    = "live"
  message   = "The AI Tools Lab site health check failed. Please investigate immediately."
  tags      = ["ai-tools-lab", "page:health", "terraform:true", "test:api", "env:production", "environment:prd"]
  
  request_definition {
    method = "GET"
    url    = local.environments["production"]
  }
  
  assertion {
    type     = "statusCode"
    operator = "is"
    target   = "200"
  }
  
  assertion {
    type     = "responseTime"
    operator = "lessThan"
    target   = "1000"
  }
  
  locations = local.default_test_config.locations
  
  options_list {
    tick_every         = 60 # Check every minute for critical health
    min_failure_duration = 180
    min_location_failed  = 1
    retry {
      count    = 3
      interval = 60
    }
  }
}
