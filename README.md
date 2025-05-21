# @reallygoodwork/dials

A dev-only npm package that allows developers to visually inspect and edit CSS variables in real time. This tool works in any modern frontend project—no framework lock-in. It's especially useful when working with design systems and tokens.

## Features

- 🔍 Automatically detects all CSS variables from the current DOM
- 📱 Recognizes and tracks variables overridden by media queries
- 🎨 Provides a floating UI panel for editing tokens live
- ⚡️ Applies updates instantly
- 📊 Monitors media context to update values based on breakpoints
- ♿️ Includes WCAG color contrast validation
- 💾 Persists session changes via localStorage (optional)
- 🛡️ Dev-only: only loads in development mode

## Installation

```bash
npm install @reallygoodwork/dials --save-dev
# or
yarn add @reallygoodwork/dials --dev
# or
pnpm add @reallygoodwork/dials --save-dev
```

## Usage

```typescript
import { startDials } from '@reallygoodwork/dials';

// Initialize the editor
const dials = startDials();
```

## Development

This project uses pnpm workspaces and Turborepo for monorepo management.

```bash
# Install dependencies
pnpm install

# Start development
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Run linting
pnpm lint
```

## Project Structure

```
dials/
├── packages/
│   └── dials/          # Core package
└── apps/
    └── demo/           # Demo application
```

## License

MIT