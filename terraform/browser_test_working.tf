# A revised browser test with correctly formatted element selectors for Datadog

# Comment out the main_pages and minimal_test resources to prevent configuration conflicts
# This file should serve as a working example once we've resolved the formatting issues

resource "datadog_synthetics_test" "homepage_test" {
  name      = "AI Tools Lab Homepage Test"
  type      = "browser"
  subtype   = "http"
  status    = "live"
  message   = "The AI Tools Lab homepage test failed."
  tags      = ["ai-tools-lab", "page:home", "terraform:true", "env:production", "environment:prd"]
  
  request_definition {
    method = "GET"
    url    = "https://ai-tools-lab.com"
    timeout = 60
  }
  
  assertion {
    type     = "statusCode"
    operator = "is"
    target   = "200"
  }
  
  locations = ["aws:us-west-1"]
  device_ids = ["laptop_large"]
  
  options_list {
    tick_every = 300
    min_failure_duration = 300
    min_location_failed = 1
    retry {
      count = 2
      interval = 300
    }
    monitor_options {
      renotify_interval = 120
    }
  }
  
  # Each browser_step must have a params block
  browser_step {
    name = "Check Homepage Header"
    type = "assertElementPresent"
    allow_failure = false
    timeout = 0
    params {
      element = "body > header"
    }
  }
  
  browser_step {
    name = "Wait 1s"
    type = "wait"
    allow_failure = false
    timeout = 0
    params {
      value = "1000"
    }
  }
}
