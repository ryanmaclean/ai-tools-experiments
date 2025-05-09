# Advanced API Endpoint Tests for AI Tools Lab
# Focuses specifically on API functionality rather than just page availability

# Common API test configuration
locals {
  api_test_config = {
    frequency = 300  # 5 minutes in seconds
    locations = ["aws:us-west-1", "aws:us-east-1"]
    retry_count = 2
    retry_interval = 300
    # API-specific configurations
    timeout = 10
    follow_redirects = true
    allow_insecure = false
  }
  
  # API endpoints to monitor
  api_endpoints = {
    observations = "/api/observations"
    episodes = "/api/episodes"
    resources = "/api/resources"
  }
  
  # Expected content patterns for verification
  content_patterns = {
    observations = "\"title\":"
    episodes = "\"episodeNumber\":"
    resources = "\"resourceType\":"
  }
}

# API Endpoint Tests - Testing actual API functionality
resource "datadog_synthetics_test" "api_endpoint_tests" {
  for_each = local.api_endpoints
  
  name      = "AI Tools Lab - ${title(each.key)} API Endpoint Test"
  type      = "api"
  subtype   = "http"
  status    = "live"
  message   = <<-EOT
    The ${each.key} API endpoint is not functioning correctly.
    
    This could indicate backend issues with data retrieval or processing.
    Please investigate the API service immediately.
    
    API URL: ${local.environments["production"]}${each.value}
  EOT
  tags      = ["ai-tools-lab", "api:endpoint", "endpoint:${each.key}", "terraform:true", "test:api", "env:production", "priority:high"]
  
  request_definition {
    method = "GET"
    url    = "${local.environments["production"]}${each.value}"
    timeout = local.api_test_config.timeout
    
    # Add authentication if needed
    # basic_auth {
    #   username = "${var.api_username}"
    #   password = "${var.api_password}"
    # }
  }
  
  # Status code validation
  assertion {
    type     = "statusCode"
    operator = "is"
    target   = "200"
  }
  
  # Response time validation
  assertion {
    type     = "responseTime"
    operator = "lessThan"
    target   = "2000"  # 2 seconds
  }
  
  # Content type validation
  assertion {
    type     = "header"
    property = "content-type"
    operator = "contains"
    target   = "application/json"
  }
  
  # Content validation - checks for required patterns in the response
  assertion {
    type     = "body"
    operator = "contains"
    target   = local.content_patterns[each.key]
  }
  
  # JSON validation - checks that the response is valid JSON
  assertion {
    type     = "body"
    operator = "validatesJSONPath"
    target   = "$.length"
    targetjsonpath = {
      operator = "greaterThan"
      targetvalue = "0"
    }
  }
  
  # Advanced configuration
  options_list {
    tick_every         = local.api_test_config.frequency
    min_failure_duration = 300
    min_location_failed  = 1
    follow_redirects     = local.api_test_config.follow_redirects
    allow_insecure       = local.api_test_config.allow_insecure
    
    retry {
      count    = local.api_test_config.retry_count
      interval = local.api_test_config.retry_interval
    }
    
    monitor_options {
      renotify_interval = 120
    }
  }
}

# Advanced HTTP request test - Testing API with specific parameters
resource "datadog_synthetics_test" "api_search_test" {
  name      = "AI Tools Lab - API Search Functionality Test"
  type      = "api"
  subtype   = "http"
  status    = "live"
  message   = "The search API functionality is not working correctly. Please investigate immediately."
  tags      = ["ai-tools-lab", "api:search", "terraform:true", "test:api", "env:production", "priority:high"]
  
  request_definition {
    method = "GET"
    url    = "${local.environments["production"]}/api/search"
    timeout = local.api_test_config.timeout
    
    # Query parameters for search
    request_query {
      name = "q"
      value = "automation"
    }
    
    request_query {
      name = "limit"
      value = "5"
    }
    
    # Specific headers for the API request
    request_headers = {
      Accept = "application/json"
      X-Source = "synthetic-test"
    }
  }
  
  # Status code validation
  assertion {
    type     = "statusCode"
    operator = "is"
    target   = "200"
  }
  
  # Response time validation
  assertion {
    type     = "responseTime"
    operator = "lessThan"
    target   = "3000"  # 3 seconds for search
  }
  
  # Advanced assertions for search results
  assertion {
    type     = "body"
    operator = "validatesJSONPath"
    target   = "$.results"
    targetjsonpath = {
      operator = "exists"
    }
  }
  
  options_list {
    tick_every         = local.api_test_config.frequency
    min_failure_duration = 300
    min_location_failed  = 1
    follow_redirects     = local.api_test_config.follow_redirects
    allow_insecure       = local.api_test_config.allow_insecure
    
    retry {
      count    = local.api_test_config.retry_count
      interval = local.api_test_config.retry_interval
    }
    
    monitor_options {
      renotify_interval = 120
    }
  }
}

# API multi-step test for more complex workflows
resource "datadog_synthetics_test" "api_multi_step_test" {
  name      = "AI Tools Lab - API Workflow Test"
  type      = "api"
  subtype   = "multi"
  status    = "live"
  message   = "The API workflow test has failed. This indicates a critical issue with the API functionality."
  tags      = ["ai-tools-lab", "api:workflow", "terraform:true", "test:api", "env:production", "priority:critical"]
  
  api_step {
    name = "Get Episodes"
    request_definition {
      method = "GET"
      url    = "${local.environments["production"]}/api/episodes"
      timeout = local.api_test_config.timeout
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
    # Store episode ID for next step
    extracted_value {
      name = "firstEpisodeId"
      type = "http_body"
      parser = {
        type = "json_path"
        value = "$[0].id"
      }
    }
  }
  
  api_step {
    name = "Get Episode Details"
    request_definition {
      method = "GET"
      url    = "${local.environments["production"]}/api/episodes/{{ firstEpisodeId }}"
      timeout = local.api_test_config.timeout
    }
    assertion {
      type     = "statusCode"
      operator = "is"
      target   = "200"
    }
    assertion {
      type     = "body"
      operator = "validatesJSONPath"
      target   = "$.details"
      targetjsonpath = {
        operator = "exists"
      }
    }
  }
  
  api_step {
    name = "Get Related Resources"
    request_definition {
      method = "GET"
      url    = "${local.environments["production"]}/api/episodes/{{ firstEpisodeId }}/resources"
      timeout = local.api_test_config.timeout
    }
    assertion {
      type     = "statusCode"
      operator = "is"
      target   = "200"
    }
    assertion {
      type     = "body"
      operator = "validatesJSONPath"
      target   = "$"
      targetjsonpath = {
        operator = "isArray"
      }
    }
  }
  
  options_list {
    tick_every         = local.api_test_config.frequency * 2 # Less frequent due to complexity
    min_failure_duration = 300
    min_location_failed  = 1
    
    retry {
      count    = local.api_test_config.retry_count
      interval = local.api_test_config.retry_interval
    }
    
    monitor_options {
      renotify_interval = 120
    }
  }
  
  locations = local.api_test_config.locations
}
