# Additional API test for episode 01 page
# This completes our coverage of all episode pages via API tests

resource "datadog_synthetics_test" "api_ep01_page" {
  name      = "API Episode Page Test - ep01"
  type      = "api"
  subtype   = "http"
  status    = "live"
  message   = "The AI Tools Lab featured episode page ep01 is not responding correctly. Please investigate immediately."
  tags      = ["ai-tools-lab", "page:episode", "episode:ep01", "featured:true", "terraform:true", "test:api", "env:production", "environment:prd"]
  
  request_definition {
    method = "GET"
    url    = local.get_url["production"]["ep01"]
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
    tick_every         = 180 # Check more frequently for featured episode
    min_failure_duration = 300
    min_location_failed  = 1
    retry {
      count    = local.default_test_config.retry_count
      interval = local.default_test_config.retry_interval
    }
  }
}
