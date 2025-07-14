# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🏗️ Project Structure

This is the **Aloe Wellness Log**, a health management Progressive Web App (PWA) built with React, TypeScript, and Vite. The main application code is located in `src_react/` directory.

```
aloe-wellness-log/
├── src_react/                    # Main React application
│   ├── src/
│   │   ├── pages/               # Page components (WeightRecord, DailyRecord, BpRecord, etc.)
│   │   ├── components/          # Reusable UI components 
│   │   ├── store/               # Zustand state management
│   │   ├── db/                  # IndexedDB database layer
│   │   ├── hooks/               # Custom React hooks
│   │   ├── utils/               # Utility functions
│   │   └── types/               # TypeScript type definitions
│   ├── public/                  # Static files and PWA manifest
│   └── tests/                   # E2E tests with Playwright
├── docs/                        # GitHub Pages deployment output
└── doc/                         # Project documentation
```

## 🚀 Development Commands

All commands should be run from the `src_react/` directory:

```bash
cd src_react

# Development
yarn dev                 # Start development server (http://localhost:5173)
yarn build              # Production build
yarn build:preview      # Build for preview
yarn preview            # Preview production build

# Testing
yarn test               # Run unit tests with Vitest (watch mode)
yarn test:run           # Run unit tests once (for CI/validation)
yarn test:coverage      # Run tests with coverage report
yarn test:e2e           # Run E2E tests with Playwright
yarn test:e2e:ui        # Run E2E tests with UI mode

# Code Quality
yarn lint               # Run ESLint
yarn lint:fix           # Run ESLint with auto-fix
tsc                     # TypeScript type checking (run from src_react/)

# Deployment
yarn deploy             # Deploy to GitHub Pages
```

## 🏛️ Architecture Overview

### State Management
- **Zustand** for global state management (records, goals, toast notifications)
- State stores located in `src/store/` directory
- Persistent data stored in IndexedDB via custom database layer

### Database Layer
- **IndexedDB** for client-side data persistence
- Database operations centralized in `src/db/indexedDb.ts`
- Supports health records, daily activities, blood pressure, and goals
- Error handling with custom `DbError` types

### UI Framework
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Headless UI** for accessible components
- **React Router** for client-side routing
- **Recharts** for data visualization
- **React Calendar** for date selection

### PWA Features
- Service Worker for offline functionality
- Web App Manifest for app installation
- Auto-updating cache strategy
- Responsive design for mobile-first experience

### Testing Strategy
- **Vitest** for unit testing
- **Playwright** for E2E testing across browsers
- **Testing Library** for React component testing
- Coverage reports available

### Performance Optimizations
- Code splitting with manual chunks (react-vendor, ui-vendor, etc.)
- Lazy loading for large components (RecordExport)
- Bundle analysis with rollup-plugin-visualizer
- Terser minification for production builds

## 🎯 Key Features

The app manages health data including:
- **Weight tracking** with goal progression
- **Daily activities** (exercise, meals, sleep, smoking, alcohol)
- **Blood pressure monitoring**
- **Data visualization** with charts and graphs
- **CSV export** functionality
- **Goal setting and tracking**

## 🔧 Configuration Files

- `vite.config.ts` - Build configuration with GitHub Pages deployment settings
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `eslint.config.js` - ESLint rules
- `tailwind.config.js` - Tailwind CSS configuration
- `playwright.config.ts` - E2E test configuration
- `vitest.config.ts` - Unit test configuration

## 🚨 Important Notes

### Working Directory
Always work from the `src_react/` directory when running commands, as this contains the main application code.

### GitHub Pages Deployment
- Production builds output to `../docs/` directory
- Uses `/aloe-wellness-log/` base path for GitHub Pages
- Service Worker automatically updates with new asset paths
- Deploy with `yarn deploy` from `src_react/` directory

### Data Storage
- All user data stored locally in IndexedDB
- No server-side data persistence
- Privacy-focused design with local-only storage

### Development Tips
- Use `yarn dev` for development with HMR
- Run `yarn test:run` and `tsc` before committing changes
- Check `yarn lint` for code quality issues
- Use `yarn test:e2e` to verify critical user flows

### Environment Notes
- Development environment: Windows 10 with PowerShell 7
- Package manager: Uses yarn (verify before running npm commands)
- All commands must be run from the `src_react/` directory unless otherwise specified