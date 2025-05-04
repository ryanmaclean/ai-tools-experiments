# API Synthetics Tests for main pages (Homepage, About, Resources, Observations)
# Using API tests rather than browser tests to ensure reliable verification

# Homepage Test (exact name required by verification hook)
resource "datadog_synthetics_test" "homepage_test" {
  name      = "Homepage Test"
  type      = "api"
  subtype   = "http"
  status    = "live"
  message   = "The AI Tools Lab homepage is not responding correctly. Please investigate immediately."
  tags      = ["ai-tools-lab", "page:home", "terraform:true", "test:api", "env:production", "environment:prd"]
  
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

# About Page Test (exact name required by verification hook)
resource "datadog_synthetics_test" "about_page_test" {
  name      = "About Page Test"
  type      = "api"
  subtype   = "http"
  status    = "live"
  message   = "The AI Tools Lab about page is not responding correctly. Please investigate immediately."
  tags      = ["ai-tools-lab", "page:about", "terraform:true", "test:api", "env:production", "environment:prd"]
  
  request_definition {
    method = "GET"
    url    = local.get_url["production"]["about"]
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

# Resources Page Test (exact name required by verification hook)
resource "datadog_synthetics_test" "resources_page_test" {
  name      = "Resources Page Test"
  type      = "api"
  subtype   = "http"
  status    = "live"
  message   = "The AI Tools Lab resources page is not responding correctly. Please investigate immediately."
  tags      = ["ai-tools-lab", "page:resources", "terraform:true", "test:api", "env:production", "environment:prd"]
  
  request_definition {
    method = "GET"
    url    = local.get_url["production"]["resources"]
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

# Observations Page Test (exact name required by verification hook)
resource "datadog_synthetics_test" "observations_page_test" {
  name      = "Observations Page Test"
  type      = "api"
  subtype   = "http"
  status    = "live"
  message   = "The AI Tools Lab observations page is not responding correctly. Please investigate immediately."
  tags      = ["ai-tools-lab", "page:observations", "terraform:true", "test:api", "env:production", "environment:prd"]
  
  request_definition {
    method = "GET"
    url    = local.get_url["production"]["observations"]
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
