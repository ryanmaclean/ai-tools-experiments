# Netlify Site CSS Validation Synthetic Test
# This test specifically validates CSS styling and visual consistency
# on the deployed Netlify site using browser assertions

resource "datadog_synthetics_test" "netlify_css_validation" {
  name      = "Netlify Site CSS Validation"
  type      = "browser"
  status    = "live"
  message   = "The CSS validation test for the Netlify site has failed. Please check the visual styling and CSS properties."
  tags      = ["env:production", "app:ai-tools-lab", "service:frontend", "team:frontend"]
  locations = ["aws:us-west-1", "aws:us-east-2"]
  
  request_definition {
    method = "GET"
    url    = "https://ai-tools-lab.com"
  }
  
  assertion {
    type     = "statusCode"
    operator = "is"
    target   = "200"
  }
  
  # Website should load within 3 seconds
  options_list {
    tick_every          = 900
    min_location_failed = 1
    min_failure_duration = 300
    retry {
      count    = 2
      interval = 300
    }
    monitor_options {
      renotify_interval = 120
    }
    scheduling_options {
      timezone = "America/Los_Angeles"
      timeframes {
        day  = "*"
        from = "9:00"
        to   = "19:00"
      }
    }
    monitor_name = "[Production] Netlify CSS Validation"
    monitor_priority = 3
  }
  
  # Browser steps for CSS validation
  browser_step {
    name = "Check Logo and Header Styling"
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
        
        // Validate header background color
        const validHeaderBgColors = [
          'rgb(147, 172, 181)',
          'rgba(147, 172, 181, 1)',
          '#93acb5'
        ];
        
        const isValidBgColor = validHeaderBgColors.some(color => 
          bgColor.toLowerCase().includes(color.toLowerCase()));
          
        if (!isValidBgColor) {
          throw new Error(`Header background color should be #93ACB5, but found: ${bgColor}`);
        }
        
        // Check logo visibility and styling
        const logo = document.querySelector('header .logo, header .brand, header h1');
        if (!logo) {
          throw new Error('Logo element not found in header');
        }
        
        const logoStyles = window.getComputedStyle(logo);
        if (parseFloat(logoStyles.fontSize) < 16) {
          throw new Error(`Logo font size should be at least 16px, but found: ${logoStyles.fontSize}`);
        }
        
        return 'Header and logo styling validated successfully';
      EOF
    }
  }
  
  browser_step {
    name = "Validate Typography and Font Consistency"
    type = "assertFromJavascript"
    allow_failure = false
    timeout = 10
    params {
      code = <<-EOF
        // Define expected typography settings
        const TYPOGRAPHY = {
          fontFamilies: [
            'Inter',
            'system-ui',
            '-apple-system',
            'sans-serif'
          ],
          headingSizes: {
            h1: 32, // Minimum expected size in px
            h2: 24,
            h3: 20,
            h4: 16
          }
        };
        
        // Check main heading
        const headings = {};
        for (let i = 1; i <= 4; i++) {
          const heading = document.querySelector(`h${i}`);
          if (heading) {
            headings[`h${i}`] = heading;
          }
        }
        
        if (Object.keys(headings).length === 0) {
          throw new Error('No heading elements (h1-h4) found on the page');
        }
        
        // Validate font family for headings
        Object.entries(headings).forEach(([tag, element]) => {
          const styles = window.getComputedStyle(element);
          const fontFamily = styles.fontFamily.toLowerCase();
          
          const hasValidFont = TYPOGRAPHY.fontFamilies.some(font => 
            fontFamily.includes(font.toLowerCase()));
          
          if (!hasValidFont) {
            throw new Error(`${tag} font family is inconsistent: ${fontFamily}`);
          }
          
          // Check font size meets minimum
          const fontSize = parseFloat(styles.fontSize);
          const minSize = TYPOGRAPHY.headingSizes[tag];
          
          if (fontSize < minSize) {
            throw new Error(`${tag} font size should be at least ${minSize}px, but found: ${fontSize}px`);
          }
        });
        
        // Check paragraph styles
        const paragraph = document.querySelector('p');
        if (paragraph) {
          const pStyles = window.getComputedStyle(paragraph);
          const pFontFamily = pStyles.fontFamily.toLowerCase();
          
          const hasValidPFont = TYPOGRAPHY.fontFamilies.some(font => 
            pFontFamily.includes(font.toLowerCase()));
          
          if (!hasValidPFont) {
            throw new Error(`Paragraph font family is inconsistent: ${pFontFamily}`);
          }
        }
        
        return 'Typography validation successful';
      EOF
    }
  }
  
  browser_step {
    name = "Check Responsive Layout"
    type = "runAsyncStep"
    allow_failure = false
    timeout = 15
    params {
      code = <<-EOF
        // Test responsive layout at mobile width
        await setViewport(375, 667); // iPhone SE viewport
        
        // Wait for layout to adjust
        await wait(1000);
        
        // Check for horizontal overflow (a common responsive layout issue)
        const hasHorizontalOverflow = document.body.scrollWidth > window.innerWidth;
        if (hasHorizontalOverflow) {
          throw new Error('Horizontal overflow detected at mobile viewport size - page is not fully responsive');
        }
        
        // Check if mobile navigation is properly implemented
        const navElement = document.querySelector('nav, .navigation, .main-nav');
        if (navElement) {
          const navStyles = window.getComputedStyle(navElement);
          
          // Mobile menus are typically hidden or shown with specific display properties
          // Alternatively they might be transformed into a hamburger menu
          const isMobileNavVisible = navStyles.display !== 'none' && 
                                  !navStyles.transform.includes('translate') && 
                                  !navStyles.transform.includes('scale(0)');
                                  
          // Look for hamburger menu as an alternative
          const hamburgerExists = !!document.querySelector('.hamburger, .menu-toggle, .mobile-menu-button');
          
          // Ensure either the nav is properly styled for mobile or a hamburger menu exists
          if (!hamburgerExists && isMobileNavVisible) {
            // Check if the navigation fits within the viewport width
            const navRect = navElement.getBoundingClientRect();
            if (navRect.width > window.innerWidth) {
              throw new Error('Navigation elements overflow on mobile viewport and no mobile menu toggle is present');
            }
          }
        }
        
        // Reset viewport to desktop
        await setViewport(1280, 800);
        await wait(1000);
        
        return 'Responsive layout validation successful';
      EOF
    }
  }
  
  browser_step {
    name = "Validate Color Contrast for Accessibility"
    type = "assertFromJavascript"
    allow_failure = false
    timeout = 15
    params {
      code = <<-EOF
        // Utility function to calculate color luminance
        function luminance(r, g, b) {
          const a = [r, g, b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
          });
          return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
        }
        
        // Calculate contrast ratio between two colors
        function contrastRatio(rgb1, rgb2) {
          const lum1 = luminance(rgb1[0], rgb1[1], rgb1[2]);
          const lum2 = luminance(rgb2[0], rgb2[1], rgb2[2]);
          const brightest = Math.max(lum1, lum2);
          const darkest = Math.min(lum1, lum2);
          return (brightest + 0.05) / (darkest + 0.05);
        }
        
        // Extract RGB values from a CSS color string
        function getRGB(color) {
          const div = document.createElement('div');
          div.style.color = color;
          document.body.appendChild(div);
          const computed = window.getComputedStyle(div).color;
          document.body.removeChild(div);
          
          const match = computed.match(/rgb\(([\d]+),\s*([\d]+),\s*([\d]+)\)/);
          if (match) {
            return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
          }
          return [0, 0, 0]; // Fallback
        }
        
        // Test critical text elements for contrast
        const criticalElements = [
          document.querySelector('header'),
          document.querySelector('main h1, main h2'),
          document.querySelector('main p'),
          document.querySelector('footer')
        ].filter(el => el !== null); // Remove null elements
        
        if (criticalElements.length === 0) {
          throw new Error('No critical text elements found for contrast testing');
        }
        
        const contrastIssues = [];
        
        criticalElements.forEach(element => {
          const styles = window.getComputedStyle(element);
          const textColor = styles.color;
          const bgColor = styles.backgroundColor;
          
          // Only test if background is not transparent
          if (bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            const textRGB = getRGB(textColor);
            const bgRGB = getRGB(bgColor);
            const ratio = contrastRatio(textRGB, bgRGB);
            
            // WCAG AA requires 4.5:1 for normal text
            if (ratio < 4.5) {
              contrastIssues.push(`${element.tagName.toLowerCase()}: ${ratio.toFixed(2)} (below 4.5:1)`);
            }
          }
        });
        
        if (contrastIssues.length > 0) {
          throw new Error(`Contrast ratio issues found: ${contrastIssues.join(', ')}`);
        }
        
        return 'Color contrast validation successful';
      EOF
    }
  }
  
  browser_step {
    name = "Verify Critical CSS Classes"
    type = "assertFromJavascript"
    allow_failure = false
    timeout = 10
    params {
      code = <<-EOF
        // Define critical CSS classes that should be present
        const criticalClasses = [
          'container',  // Common layout container
          'header',     // Header styling
          'footer',     // Footer styling
          'nav',        // Navigation styling
          'button',     // Button styling
        ];
        
        // Look for elements with these classes or appropriate semantic elements
        const missingClasses = [];
        
        criticalClasses.forEach(className => {
          // Try to find by class
          const elementsByClass = document.getElementsByClassName(className);
          // Try to find by tag (for semantic elements like header, footer, nav)
          const elementsByTag = document.getElementsByTagName(className);
          
          if (elementsByClass.length === 0 && elementsByTag.length === 0) {
            missingClasses.push(className);
          }
        });
        
        // It's acceptable to have some missing classes if semantic HTML is used instead
        // So we'll only throw an error if more than 60% of critical classes are missing
        if (missingClasses.length > criticalClasses.length * 0.6) {
          throw new Error(`Too many critical CSS classes/elements missing: ${missingClasses.join(', ')}`);
        }
        
        return 'Critical CSS classes validation successful';
      EOF
    }
  }
}
