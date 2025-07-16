# Dials 🎛️

A development-only CSS variable editor for design systems and real-time prototyping. Edit CSS custom properties directly in your browser with support for contextual variables (responsive, theme-aware, and more).

## What is Dials?

Dials is a React-based developer tool that automatically detects CSS custom properties (CSS variables) in your project and provides a live editing interface. It's perfect for:

- **Design system development** - Quickly iterate on tokens and see changes instantly
- **Responsive design** - Edit variables that change across different contexts (mobile, tablet, desktop)
- **Theme development** - Test color schemes and spacing in real-time
- **Prototyping** - Rapidly experiment with design variations
- **Developer handoff** - Export variable changes as CSS or JSON

## Features

✨ **Automatic Detection** - Finds all CSS variables in your stylesheets
🎯 **Contextual Editing** - Edit variables that have different values across breakpoints or themes
🎨 **Smart Input Types** - Color picker for colors, number input with units for dimensions
📱 **Responsive Aware** - Shows which context is currently active
📋 **Export Support** - Copy changes as CSS or JSON
🎛️ **Draggable Panel** - Position the editor wherever you need it
🔄 **Live Updates** - See changes immediately in your design

## Installation

```bash
npm install @reallygoodwork/dials
# or
pnpm add @reallygoodwork/dials
# or
yarn add @reallygoodwork/dials
```

## Quick Start

Import and initialize Dials in your development environment:

```javascript
import { startDials } from '@reallygoodwork/dials';

// Only run in development
if (process.env.NODE_ENV === 'development') {
  startDials();
}
```

### React Example

```jsx
import { useEffect } from 'react';
import { startDials } from '@reallygoodwork/dials';

function App() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      startDials();
    }
  }, []);

  return (
    <div className="app">
      <h1 style={{ color: 'var(--primary-color)' }}>
        Hello World
      </h1>
    </div>
  );
}
```

## CSS Setup

Dials works with any CSS variables defined in your stylesheets. Here's an example:

```css
:root {
  /* Colors */
  --primary-color: #3b82f6;
  --secondary-color: #64748b;
  --accent-color: #10b981;

  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;

  /* Typography */
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --line-height: 1.5;
}

/* Responsive variables */
@media (max-width: 768px) {
  :root {
    --spacing-md: 0.75rem;
    --font-size-base: 0.875rem;
  }
}

@media (prefers-color-scheme: dark) {
  :root {
    --primary-color: #60a5fa;
    --secondary-color: #94a3b8;
  }
}
```

## Contextual Variables

Dials automatically detects when variables are redefined in different contexts and groups them together. It supports:

### Media Queries
- **Mobile**: `max-width: 768px`
- **Tablet**: `769px - 1024px`
- **Desktop**: `min-width: 1025px`
- **Large screens**: `min-width: 1400px`

### System Preferences
- **Dark mode**: `prefers-color-scheme: dark`
- **High contrast**: `prefers-contrast: high`
- **Reduced motion**: `prefers-reduced-motion: reduce`

### Print Styles
- **Print**: `@media print`

### Custom Media Queries
Any custom media query will be detected and labeled appropriately.

## Interface Overview

The Dials panel appears as a floating window with two main tabs:

### Variables Tab
- Lists all detected CSS variables
- Shows current values with smart input types:
  - **Colors**: Color picker with hex, RGB, HSL support
  - **Numbers**: Number input with unit preservation
  - **Text**: Standard text input for other values
- **Context tabs** for variables with multiple definitions
- **Reset buttons** to restore original values
- **Copy options** for individual variables

### Export Tab
- View all your changes organized by context
- **Copy as CSS**: Get properly formatted CSS rules
- **Copy as JSON**: Export as structured data
- **Preview**: See exactly what will be copied

## Panel Controls

### Positioning
- **Draggable**: Click and drag the title bar to reposition
- **Preset positions**: Top-left, top-right, bottom-left, bottom-right
- **Auto-persist**: Remembers your preferred position

### Variable Management
- **Individual reset**: Reset single variables to original values
- **Bulk reset**: Reset all changes at once
- **Context switching**: Manually select which context to edit
- **Live preview**: Changes apply immediately

## API Reference

### `startDials()`

Initializes the Dials interface and begins CSS variable detection.

**Returns**: An object with:
- `store`: Zustand store for programmatic access
- `updateVariable(name, value)`: Function to update variables programmatically

```javascript
const dials = startDials();

// Update a variable programmatically
dials.updateVariable('--primary-color', '#ff0000');
```

### Safety Features

- **Development only**: Automatically disabled in production builds
- **Non-destructive**: Changes are applied via inline styles, original CSS is unchanged
- **Performance optimized**: Efficient detection and update mechanisms

## Browser Support

- Modern browsers with CSS custom properties support
- Chrome 49+
- Firefox 31+
- Safari 9.1+
- Edge 16+

## Integration Examples

### Vite + React
```javascript
// main.tsx
import { startDials } from '@reallygoodwork/dials';

if (import.meta.env.DEV) {
  startDials();
}
```

### Next.js
```javascript
// _app.tsx
import { useEffect } from 'react';
import { startDials } from '@reallygoodwork/dials';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      startDials();
    }
  }, []);

  return <Component {...pageProps} />;
}
```

### Webpack
```javascript
// index.js
if (process.env.NODE_ENV === 'development') {
  import('@reallygoodwork/dials').then(({ startDials }) => {
    startDials();
  });
}
```

## Tips & Best Practices

### Naming Convention
Use consistent, semantic variable names:
```css
/* Good */
--color-primary
--spacing-large
--font-size-heading

/* Less ideal */
--blue
--big-gap
--h1-size
```

### Organization
Group related variables:
```css
/* Colors */
--color-primary: #3b82f6;
--color-secondary: #64748b;

/* Spacing */
--spacing-xs: 0.25rem;
--spacing-sm: 0.5rem;

/* Typography */
--font-size-base: 1rem;
--line-height-base: 1.5;
```

### Responsive Design
Define contextual overrides strategically:
```css
:root {
  --container-width: 1200px;
  --spacing-section: 4rem;
}

@media (max-width: 768px) {
  :root {
    --container-width: 100%;
    --spacing-section: 2rem;
  }
}
```

## Troubleshooting

### Variables Not Detected
- Ensure variables are defined in `:root` or other CSS rules
- Check that stylesheets are loaded before calling `startDials()`
- Verify CSS custom property syntax (`--variable-name`)

### Changes Not Applying
- Make sure you're in development mode
- Check browser console for errors
- Verify the variable names match exactly

### Performance Issues
- Dials is optimized for development; disable in production
- Large numbers of variables (500+) may impact performance
- Consider organizing variables into smaller, focused stylesheets

## Contributing

Dials is part of the Really Good Work toolkit. Contributions are welcome!

## License

MIT License - see LICENSE file for details.

---

**Made with ❤️ by Really Good Work**

*Dials helps you build better design systems by making CSS variables interactive and immediate.*
