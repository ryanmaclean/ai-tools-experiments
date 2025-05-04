# A bare minimum browser test to troubleshoot Datadog Synthetics formatting

resource "datadog_synthetics_test" "minimal_test" {
  name      = "AI Tools Lab Minimal Test"
  type      = "browser"
  subtype   = "http"
  status    = "live"
  message   = "The AI Tools Lab minimal test failed."
  tags      = ["ai-tools-lab", "minimal", "terraform:true", "env:production", "environment:prd"]
  
  request_definition {
    method = "GET"
    url    = "https://ai-tools-lab.com"
  }
  
  assertion {
    type     = "statusCode"
    operator = "is"
    target   = "200"
  }
  
  locations = ["aws:us-west-1"]
  device_ids = ["laptop_large"]
  
  options_list {
    tick_every         = 300
    min_failure_duration = 300
    min_location_failed  = 1
    retry {
      count    = 2
      interval = 300
    }
    monitor_options {
      renotify_interval = 120
    }
  }
  
  browser_step {
    name = "Homepage Check"
    type = "assertElementPresent"
    params {
      element = "{\\\"css\\\":\\\"body\\\"}"
    }
  }
}
