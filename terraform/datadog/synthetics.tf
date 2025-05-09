/**
 * Datadog Synthetic Tests Configuration
 * 
 * This file configures synthetic tests for API, browser, visual regression,
 * performance, and security monitoring across all environments.
 */

locals {
  environments = {
    dev = {
      url = "https://ai-tools-lab-dev.netlify.app"
      name = "Development"
    }
    tst = {
      url = "https://ai-tools-lab-tst.netlify.app"
      name = "Test"
    }
    prd = {
      url = "https://ai-tools-lab.com"
      name = "Production"
    }
  }
}

# API Tests for each environment
resource "datadog_synthetics_test" "api_test" {
  for_each = local.environments
  
  name    = "${each.value.name} API Health Check"
  type    = "api"
  subtype = "http"
  status  = "live"
  message = "${each.value.name} API health check failed"
  tags    = ["env:${each.key}", "service:ai-tools-lab", "type:api"]

  request_definition {
    method = "GET"
    url    = "${each.value.url}/api/health"
  }

  assertion {
    type     = "statusCode"
    operator = "is"
    target   = "200"
  }

  assertion {
    type     = "responseTime"
    operator = "lessThan"
    target   = each.key == "prd" ? 1000 : 2000  # Stricter threshold for production
  }

  assertion {
    type     = "header"
    property = "content-type"
    operator = "contains"
    target   = "application/json"
  }

  locations = ["aws:us-east-1"]
  options_list {
    tick_every = each.key == "prd" ? 300 : 900  # More frequent checks in production
  }
}

# API Endpoint Tests
resource "datadog_synthetics_test" "api_endpoints" {
  for_each = local.environments
  
  name    = "${each.value.name} API Endpoints"
  type    = "api"
  subtype = "http"
  status  = "live"
  message = "${each.value.name} API endpoints check failed"
  tags    = ["env:${each.key}", "service:ai-tools-lab", "type:api"]

  request_definition {
    method = "GET"
    url    = "${each.value.url}/api/observations"
  }

  assertion {
    type     = "statusCode"
    operator = "is"
    target   = "200"
  }

  assertion {
    type     = "body"
    operator = "validatesJSONPath"
    target   = "$.data"
  }

  locations = ["aws:us-east-1"]
  options_list {
    tick_every = each.key == "prd" ? 300 : 900
  }
}

# Browser Tests for each environment
resource "datadog_synthetics_test" "browser_test" {
  for_each = local.environments
  
  name    = "${each.value.name} Browser Functionality"
  type    = "browser"
  status  = "live"
  message = "${each.value.name} browser test failed"
  tags    = ["env:${each.key}", "service:ai-tools-lab", "type:browser"]

  browser_step {
    name = "Check page load"
    type = "assertElementContent"
    params {
      element = "h1"
      value   = "AI Tools Lab"
    }
  }

  browser_step {
    name = "Check navigation"
    type = "click"
    params {
      element = "nav a"
    }
  }

  browser_step {
    name = "Check responsive design"
    type = "setViewport"
    params {
      width  = 375
      height = 667
    }
  }

  browser_step {
    name = "Check mobile menu"
    type = "click"
    params {
      element = ".mobile-menu-button"
    }
  }

  locations = ["aws:us-east-1"]
  options_list {
    tick_every = each.key == "prd" ? 900 : 1800
  }
}

# Visual Regression Tests for each environment
resource "datadog_synthetics_test" "visual_test" {
  for_each = local.environments
  
  name    = "${each.value.name} Visual Regression"
  type    = "browser"
  status  = "live"
  message = "${each.value.name} visual regression detected"
  tags    = ["env:${each.key}", "service:ai-tools-lab", "type:visual"]

  browser_step {
    name = "Take screenshot of homepage"
    type = "screenshot"
    params {
      element = "body"
    }
  }

  browser_step {
    name = "Compare homepage with baseline"
    type = "assertScreenshot"
    params {
      threshold = each.key == "prd" ? 0.05 : 0.1
    }
  }

  browser_step {
    name = "Take screenshot of mobile view"
    type = "setViewport"
    params {
      width  = 375
      height = 667
    }
  }

  browser_step {
    name = "Compare mobile view with baseline"
    type = "assertScreenshot"
    params {
      threshold = each.key == "prd" ? 0.05 : 0.1
    }
  }

  locations = ["aws:us-east-1"]
  options_list {
    tick_every = each.key == "prd" ? 1800 : 3600
  }
}

# Performance Tests for each environment
resource "datadog_synthetics_test" "performance_test" {
  for_each = local.environments
  
  name    = "${each.value.name} Performance Metrics"
  type    = "browser"
  status  = "live"
  message = "${each.value.name} performance metrics below threshold"
  tags    = ["env:${each.key}", "service:ai-tools-lab", "type:performance"]

  browser_step {
    name = "Measure FCP"
    type = "assertPerformance"
    params {
      metric = "first-contentful-paint"
      threshold = each.key == "prd" ? 1000 : 2000
    }
  }

  browser_step {
    name = "Measure LCP"
    type = "assertPerformance"
    params {
      metric = "largest-contentful-paint"
      threshold = each.key == "prd" ? 2500 : 3500
    }
  }

  browser_step {
    name = "Measure TTI"
    type = "assertPerformance"
    params {
      metric = "time-to-interactive"
      threshold = each.key == "prd" ? 3500 : 5000
    }
  }

  browser_step {
    name = "Measure CLS"
    type = "assertPerformance"
    params {
      metric = "cumulative-layout-shift"
      threshold = each.key == "prd" ? 0.1 : 0.2
    }
  }

  locations = ["aws:us-east-1"]
  options_list {
    tick_every = each.key == "prd" ? 900 : 1800
  }
}

# Security Tests for each environment
resource "datadog_synthetics_test" "security_test" {
  for_each = local.environments
  
  name    = "${each.value.name} Security Headers"
  type    = "api"
  subtype = "http"
  status  = "live"
  message = "${each.value.name} security headers missing or incorrect"
  tags    = ["env:${each.key}", "service:ai-tools-lab", "type:security"]

  request_definition {
    method = "GET"
    url    = each.value.url
  }

  assertion {
    type     = "header"
    property = "Strict-Transport-Security"
    operator = "is"
    target   = "max-age=31536000; includeSubDomains"
  }

  assertion {
    type     = "header"
    property = "X-Content-Type-Options"
    operator = "is"
    target   = "nosniff"
  }

  assertion {
    type     = "header"
    property = "X-Frame-Options"
    operator = "is"
    target   = "DENY"
  }

  assertion {
    type     = "header"
    property = "Content-Security-Policy"
    operator = "contains"
    target   = "default-src 'self'"
  }

  assertion {
    type     = "header"
    property = "X-XSS-Protection"
    operator = "is"
    target   = "1; mode=block"
  }

  locations = ["aws:us-east-1"]
  options_list {
    tick_every = each.key == "prd" ? 1800 : 3600
  }
}

# Variables
variable "environment" {
  description = "Environment name (dev, tst, prd)"
  type        = string
  validation {
    condition     = contains(["dev", "tst", "prd"], var.environment)
    error_message = "Environment must be one of: dev, tst, prd"
  }
} 