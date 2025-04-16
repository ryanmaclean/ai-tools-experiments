# AI Tools Lab Style Guide

## Brand Vision

AI Tools Lab is designed to be a modern, accessible platform that bridges the gap between complex AI technologies and practical developer applications. The visual identity embodies a blend of scientific precision and technological innovation with a friendly, approachable aesthetic.

### Brand Personality

- **Trustworthy & Authoritative**: Presenting reliable information through clean, structured layouts
- **Innovative & Forward-thinking**: Using modern design elements with animated bubbles that evoke a sense of experimentation
- **Approachable & Educational**: Employing a color palette that is professional yet not intimidating
- **Interactive & Engaging**: Incorporating subtle animations and visual feedback

### Logo

The AI Tools Lab logo features a purple microscope with an AI cloud integrated into its design, symbolizing the examination and exploration of AI technologies. The logo visually communicates:

- Scientific exploration (microscope) of AI technologies (cloud with "AI" text)
- Connection points (network nodes) representing how AI tools connect with existing development workflows
- A color palette dominated by purples, conveying innovation, creativity, and technological advancement

## Color Palette

```css
:root {
    --primary-color: #6C756B;     /* Dark sage gray - Text and UI elements */
    --secondary-color: #93ACB5;   /* Muted blue-gray - Headers and backgrounds */
    --accent-color: #96C5F7;      /* Light blue - Links and highlights */
    --light-color: #F2F4FF;       /* Very light lavender - Backgrounds */
    --dark-color: #6C756B;        /* Same as primary - Dark UI elements */
    --highlight-color: #A9D3FF;   /* Lighter blue - Tags and chips */
}
```

### Primary Applications

- **Primary**: Used for main text, UI elements, and key interface components
- **Secondary**: Applied to header backgrounds, navigation, and section dividers
- **Accent**: Utilized for links, call-to-action buttons, and interactive elements
- **Light**: Background color for the main content areas, providing a subtle purple tint
- **Dark**: Applied to dark UI elements, footers, and important text
- **Highlight**: Used for tags, chips, and to draw attention to secondary elements

## Typography

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
```

The site primarily uses Inter, a modern sans-serif typeface designed for screen readability, with system font fallbacks for optimal performance.

### Type Scale

- Main Headers: 2rem (32px)
- Section Headers: 1.5rem (24px)
- Subsection Headers: 1.2rem (19.2px)
- Body Text: 1rem (16px)
- Small Text/Captions: 0.9rem (14.4px)

## Visual Elements

### Bubbles Animation

A signature element of the AI Tools Lab brand is the animated "bubbles" that appear in the header and footer regions. These bubbles:

- Create a laboratory/scientific atmosphere, evoking test tubes and experiments
- Animate upward with slight horizontal drift, suggesting movement and progress
- Use varying sizes, opacities, and colors from the brand palette
- Add a playful, dynamic quality to an otherwise professional interface

#### Implementation

Bubbles are created through CSS pseudo-elements and keyframe animations:
- Header bubbles rise from bottom to top
- Navigation items feature micro-bubbles that appear on hover
- Footer bubbles mirror the header effect
- Resource cards incorporate bubbles for visual continuity

### Depth and Elevation

The interface uses subtle shadows to create a sense of layering:

```css
--shadow: 0 2px 10px rgba(108, 117, 107, 0.1);
--soft-shadow: 0 4px 15px rgba(108, 117, 107, 0.15);
```

These shadows are applied to:
- Cards and containers
- Interactive elements on hover
- Modal windows and popovers

## Component Styling

### Cards

Content cards feature:
- White backgrounds with rounded corners (8px radius)
- Subtle shadow effects that intensify on hover
- Consistent internal padding (1.5rem)
- Animated scaling effects on hover (transform: translateY(-5px))
- Optional bubble animations on interactive elements

### Buttons and Interactive Elements

Standard buttons use:
- The primary color as background
- White text for contrast
- Padding of 0.8rem
- Bold font weight
- Hover effects that change background to accent color

### Navigation

- Text links use accent color
- Navigation buttons feature radial gradients and subtle bubble effects on hover
- Active/current page indicators use slightly brighter backgrounds

## Responsive Design

The design adapts to different screen sizes with these breakpoints:

- Mobile: Up to 768px
- Tablet: 769px to 1023px
- Desktop: 1024px and above

Mobile-specific adaptations include:
- Single-column layouts
- Hamburger menu for navigation
- Reduced animation effects
- Adjusted font sizes
- Touch-optimized interactive elements

## Animation Guidelines

Animations should be:
- Subtle and purposeful
- Between 0.3s to 0.5s for transitions
- Used primarily for feedback on user interactions
- Disabled for users with reduced motion preferences

The signature bubble animations use longer durations (7-10s) but maintain a subtle presence through reduced opacity.

## Design Principles

1. **Consistency**: Maintain consistent spacing, color usage, and component styling
2. **Hierarchy**: Use size, color, and positioning to establish clear information hierarchy
3. **Accessibility**: Ensure sufficient color contrast and text readability
4. **Performance**: Optimize animations and effects for smooth performance
5. **Responsive**: Design components to work across all screen sizes

This style guide serves as a reference for maintaining consistent visual identity across the AI Tools Lab website.