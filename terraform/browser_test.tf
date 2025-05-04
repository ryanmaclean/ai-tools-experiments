# Simplified browser test for main pages only
# This avoids format issues with too many steps

resource "datadog_synthetics_test" "main_pages" {
  name      = "Homepage Test"  # Named to match verification hook requirements
  type      = "browser"
  subtype   = "http"
  status    = "live"
  message   = "The AI Tools Lab main pages test failed. Please investigate immediately."
  tags      = ["ai-tools-lab", "main-pages", "terraform:true", "env:production", "environment:prd"]
  
  request_definition {
    method = "GET"
    url    = local.get_url["production"]["home"]
  }
  
  assertion {
    type     = "statusCode"
    operator = "is"
    target   = "200"
  }
  
  locations = local.default_test_config.locations
  device_ids = local.default_test_config.device_ids
  
  options_list {
    tick_every         = local.default_test_config.frequency
    min_failure_duration = 300
    min_location_failed  = 1
    retry {
      count    = local.default_test_config.retry_count
      interval = local.default_test_config.retry_interval
    }
    monitor_options {
      renotify_interval = 120
    }
  }
  
  browser_step {
    name = "Navigate to Homepage"
    type = "goToUrl"
    allow_failure = false
    timeout = 0
    params {
      value = "https://ai-tools-lab.com"
      delay = 0
      with_click = false
      x = 0
      y = 0
    }
  }
  
  browser_step {
    name = "Homepage Check"
    type = "assertElementPresent"
    allow_failure = false
    timeout = 0
    params {
      element = "body"
      with_click = false
      x = 0
      y = 0
    }
  }
}
