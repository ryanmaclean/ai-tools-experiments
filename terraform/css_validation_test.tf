# Enhanced CSS Validation Test for AI Tools Lab
# This test thoroughly validates CSS properties, color schemes, typography, and layout
# ensuring visual consistency across the application

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
  
  # First step must be goToUrl
  browser_step {
    name = "Navigate to homepage"
    type = "goToUrl"
    allow_failure = false
    timeout = 0
    params {
      value = local.get_url["production"]["home"]
    }
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
    type = "assertFromJavascript"
    allow_failure = false
    timeout = 10
    params {
      code = <<-EOF
        const headerElement = document.querySelector('header.site-header');
        if (!headerElement) {
          throw new Error('Header element with class site-header not found');
        }
        return 'Header element found';
      EOF
    }
  }
  
  browser_step {
    name = "Homepage: Validate Header CSS Properties"
    type = "assertFromJavascript"
    allow_failure = false
    timeout = 10
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
        
        // Check additional styling properties
        const padding = styles.padding;
        if (!padding.includes('1rem') && !padding.includes('16px')) {
          throw new Error('Header padding should be 1rem, but found: ' + padding);
        }
        
        // Check box shadow
        const boxShadow = styles.boxShadow;
        if (!boxShadow || boxShadow === 'none') {
          throw new Error('Header should have a box shadow, but found: ' + boxShadow);
        }
        
        // Check layout properties
        const display = styles.display;
        const flexDisplay = display === 'flex' || display === 'inline-flex';
        if (!flexDisplay) {
          throw new Error('Header should use flex layout, but found: ' + display);
        }
        
        return 'Header CSS validated successfully';
      EOF
    }
  }
  
  # Resource page check with CSS validation
  browser_step {
    name = "Navigate to Resources"
    type = "goToUrl"
    allow_failure = false
    timeout = 0
    params {
      value = local.get_url["production"]["resources"]
    }
  }
  
  browser_step {
    name = "Resources: Validate Resource Cards Class"
    type = "assertFromJavascript"
    allow_failure = false
    timeout = 10
    params {
      code = <<-EOF
        const resourceCards = document.querySelectorAll('.resource-card');
        if (!resourceCards || resourceCards.length === 0) {
          throw new Error('Resource card elements not found');
        }
        return 'Resource card elements found: ' + resourceCards.length;
      EOF
    }
  }
  
  browser_step {
    name = "Resources: Validate Resource Cards CSS Properties"
    type = "assertFromJavascript"
    allow_failure = false
    timeout = 10
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
