# Consolidated API tests to stay within Datadog's 20-test quota
# This test performs batched checking of multiple episodes in a single API test

resource "datadog_synthetics_test" "main_pages" {
  name      = "AI Tools Lab - Main Pages Batch Check"
  type      = "api"
  subtype   = "multi"
  status    = "live"
  message   = "Multiple main pages are not responding correctly. Please investigate immediately."
  tags      = ["ai-tools-lab", "page:batch", "terraform:true", "test:api", "env:production", "environment:prd"]
  
  # Check home page
  request_definition {
    method = "GET"
    url    = local.get_url["production"]["home"]
    request_query {}
    request_headers {}
  }
  
  # Check about page
  request_definition {
    method = "GET"
    url    = local.get_url["production"]["about"]
    request_query {}
    request_headers {}
  }
  
  # Check resources page
  request_definition {
    method = "GET"
    url    = local.get_url["production"]["resources"]
    request_query {}
    request_headers {}
  }
  
  # Check observations page
  request_definition {
    method = "GET"
    url    = local.get_url["production"]["observations"]
    request_query {}
    request_headers {}
  }
  
  # Common assertions for all endpoints
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

# Consolidated episodes API test - Group 1 (episodes 1-6)
resource "datadog_synthetics_test" "api_site_health" {
  name      = "AI Tools Lab - Site Health Check"
  type      = "api"
  subtype   = "multi"
  status    = "live"
  message   = "Critical site health check failed. Please investigate immediately."
  tags      = ["ai-tools-lab", "site:health", "terraform:true", "test:api", "env:production", "environment:prd"]
  
  # Check CSS resources
  request_definition {
    method = "GET"
    url    = "${local.get_url["production"]["home"]}styles.css"
    request_query {}
    request_headers {}
  }
  
  # Check favicon
  request_definition {
    method = "GET"
    url    = "${local.get_url["production"]["home"]}images/ai-tools-lab-logo.webp"
    request_query {}
    request_headers {}
  }
  
  # Check robots.txt
  request_definition {
    method = "GET"
    url    = "${local.get_url["production"]["home"]}robots.txt"
    request_query {}
    request_headers {}
  }
  
  # Common assertions for all endpoints
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
