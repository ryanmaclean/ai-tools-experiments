# Consolidated API tests to stay within Datadog's 20-test quota
# These tests perform key page checks without exceeding the API test quota

# Main pages batch test - Checks homepage with proper params
resource "datadog_synthetics_test" "main_pages" {
  name      = "AI Tools Lab - Home Page Health Check"
  type      = "api"
  subtype   = "http"
  status    = "live"
  message   = "Homepage not responding correctly. Please investigate immediately."
  tags      = ["ai-tools-lab", "page:home", "terraform:true", "test:api", "env:production", "environment:prd"]
  
  # Single request definition for homepage
  request_definition {
    method = "GET"
    url    = local.get_url["production"]["home"]
  }
  
  assertion {
    type     = "statusCode"
    operator = "is"
    target   = "200"
  }
  
  assertion {
    type     = "responseTime"
    operator = "lessThan"
    target   = "3000"
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

# Site health check test - Checks CSS resources
resource "datadog_synthetics_test" "api_site_health" {
  name      = "AI Tools Lab - Site Health Check"
  type      = "api"
  subtype   = "http"
  status    = "live"
  message   = "Critical site resource check failed. Please investigate immediately."
  tags      = ["ai-tools-lab", "site:health", "terraform:true", "test:api", "env:production", "environment:prd"]
  
  # Check CSS resources
  request_definition {
    method = "GET"
    url    = "${local.get_url["production"]["home"]}styles.css"
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
    target   = "text/css"
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
