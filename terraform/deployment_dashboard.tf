/**
 * Datadog Deployment Metrics Dashboard
 * 
 * This Terraform configuration creates a dashboard in Datadog visualizing
 * deployment success metrics, including synthetic test results, response times,
 * and visual regression detection.
 */

local {
  site_name = var.site_name != "" ? var.site_name : "ai-tools-experiments"
  environment = var.environment != "" ? var.environment : "production"
}

resource "datadog_dashboard" "deployment_metrics" {
  title       = "Netlify Deployment Metrics"
  description = "Visualizes deployment success metrics including synthetic test results, response times, and visual regression detection"
  layout_type = "ordered"
  
  widget {
    note_definition {
      content          = "# ${local.site_name} Deployment Metrics\n\nMonitoring deployment success and visual regression metrics"
      background_color = "vivid_blue"
      font_size        = "16"
      text_align       = "center"
      show_tick        = true
      tick_pos         = "bottom"
      tick_edge        = "bottom"
    }
    widget_layout {
      x      = 0
      y      = 0
      width  = 12
      height = 2
    }
  }
  
  widget {
    query_value_definition {
      title      = "Deployment Success Rate"
      title_size = "16"
      
      request {
        q          = "sum:synthetics.test.results{test_name:*css*validation*,env:${local.environment}} by {status}.as_count().last('1d')"
        aggregator = "sum"
        
        conditional_format {
          comparator = "<"
          value      = 80
          palette    = "red"
        }
        
        conditional_format {
          comparator = ">="
          value      = 80
          palette    = "yellow"
        }
        
        conditional_format {
          comparator = ">="
          value      = 95
          palette    = "green"
        }
      }
      
      precision  = 1
      autoscale  = true
    }
    widget_layout {
      x      = 0
      y      = 2
      width  = 4
      height = 3
    }
  }
  
  widget {
    timeseries_definition {
      title      = "Deployment Frequency"
      title_size = "16"
      
      request {
        q           = "sum:events{source:deployment,site:${local.site_name}}.rollup(count).by{status}"
        display_type = "bars"
      }
    }
    widget_layout {
      x      = 4
      y      = 2
      width  = 8
      height = 3
    }
  }
  
  widget {
    timeseries_definition {
      title      = "CSS Validation Test Results"
      title_size = "16"
      
      request {
        q           = "sum:synthetics.test.results{test_name:*css*validation*,env:${local.environment}} by {status}.as_count()"
        display_type = "line"
      }
      
      marker {
        display_type = "error dashed"
        label       = "All Tests Failing"
        value       = "y = 0"
      }
    }
    widget_layout {
      x      = 0
      y      = 5
      width  = 6
      height = 4
    }
  }
  
  widget {
    timeseries_definition {
      title      = "API Response Time Around Deployments"
      title_size = "16"
      
      request {
        q           = "avg:api.http.response_time{env:${local.environment}}"
        display_type = "line"
      }
      
      event {
        q = "sources:deployment status:success tags:site:${local.site_name}"
      }
    }
    widget_layout {
      x      = 6
      y      = 5
      width  = 6
      height = 4
    }
  }
  
  widget {
    timeseries_definition {
      title      = "Visual Regression Detection"
      title_size = "16"
      
      request {
        q           = "sum:synthetics.browser.run_results{test_name:*css*validation*,check_type:contains,env:${local.environment},status:fail} by {check_name}.as_count()"
        display_type = "bars"
      }
    }
    widget_layout {
      x      = 0
      y      = 9
      width  = 12
      height = 4
    }
  }
  
  widget {
    list_stream_definition {
      title      = "Recent Deployments"
      title_size = "16"
      
      request {
        query {
          data_source = "event_stream"
          event_size  = "l"
          query       = "sources:deployment tags:site:${local.site_name}"
        }
        
        columns {
          field = "timestamp"
          width = "auto"
        }
        
        columns {
          field = "message"
          width = "auto"
        }
        
        columns {
          field = "status"
          width = "auto"
        }
      }
    }
    widget_layout {
      x      = 0
      y      = 13
      width  = 12
      height = 4
    }
  }
  
  template_variable {
    name    = "env"
    default = local.environment
    prefix  = "env"
  }
}

# Variables for customization
variable "site_name" {
  description = "The name of the site to monitor deployments for"
  type        = string
  default     = ""
}

variable "environment" {
  description = "Environment to filter metrics by (production, staging, etc.)"
  type        = string
  default     = ""
}
