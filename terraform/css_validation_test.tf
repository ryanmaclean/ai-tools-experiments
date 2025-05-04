# CSS Validation Test for AI Tools Lab
# This test specifically checks CSS properties, not just element presence

resource "datadog_synthetics_test" "css_validation" {
  name      = "AI Tools Lab CSS Validation Test"
  type      = "browser"
  subtype   = "http"
  status    = "live"
  message   = "The AI Tools Lab CSS validation test failed. Please investigate styling issues immediately."
  tags      = ["ai-tools-lab", "css-validation", "terraform:true", "env:production", "environment:prd"]
  
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
  
  # Homepage check with CSS validation
  browser_step {
    name = "Homepage: Validate Header Class"
    type = "assertElementPresent"
    params {
      element = "header.site-header"
    }
  }
  
  browser_step {
    name = "Homepage: Validate Header CSS Properties"
    type = "assertFromJavascript"
    params {
      code = <<-EOF
        const header = document.querySelector('header');
        if (!header) {
          throw new Error('Header element not found');
        }
        
        const styles = window.getComputedStyle(header);
        const bgColor = styles.backgroundColor;
        
        // Check for specific header background color
        const validHeaderBgColors = [
          'rgb(147, 172, 181)',
          'rgba(147, 172, 181, 1)',
          '#93acb5'
        ];
        
        const isValidColor = validHeaderBgColors.some(color => 
          bgColor.toLowerCase().includes(color.toLowerCase()));
          
        if (!isValidColor) {
          throw new Error('Header background color should be #93ACB5, but found: ' + bgColor);
        }
        
        // Check text color
        const textColor = styles.color;
        if (!textColor.includes('255, 255, 255') && 
            !textColor.includes('#fff') && 
            !textColor.includes('#ffffff')) {
          throw new Error('Header text color should be white, but found: ' + textColor);
        }
        
        return 'Header CSS validated successfully';
      EOF
    }
  }
  
  # Resource page check with CSS validation
  browser_step {
    name = "Navigate to Resources"
    type = "goToUrl"
    params {
      value = local.get_url["production"]["resources"]
    }
  }
  
  browser_step {
    name = "Resources: Validate Resource Cards Class"
    type = "assertElementPresent"
    params {
      element = ".resource-card"
    }
  }
  
  browser_step {
    name = "Resources: Validate Resource Cards CSS Properties"
    type = "assertFromJavascript"
    params {
      code = <<-EOF
        const resourceCard = document.querySelector('.resource-card');
        if (!resourceCard) {
          throw new Error('Resource card element not found');
        }
        
        const styles = window.getComputedStyle(resourceCard);
        
        // Check for border radius
        if (styles.borderRadius === '0px') {
          throw new Error('Resource card should have border radius styling');
        }
        
        // Check for box shadow
        if (styles.boxShadow === 'none') {
          throw new Error('Resource card should have box shadow styling');
        }
        
        return 'Resource cards CSS validated successfully';
      EOF
    }
  }
}
