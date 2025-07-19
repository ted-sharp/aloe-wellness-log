# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🏗️ Project Structure

This is the **Aloe Wellness Log**, a health management Progressive Web App (PWA) built with React, TypeScript, and Vite. The main application code is located in `src_react/` directory.

```
aloe-wellness-log/
├── src_react/                    # Main React application
│   ├── src/
│   │   ├── pages/               # Page components (WeightRecord, DailyRecord, BpRecord, etc.)
│   │   ├── components/          # Reusable UI components & compound components
│   │   ├── store/               # MobX state management
│   │   ├── db/                  # IndexedDB database layer with repository pattern
│   │   ├── hooks/               # Custom React hooks
│   │   │   └── business/        # Domain-specific hooks with tests
│   │   ├── utils/               # Utility functions
│   │   ├── types/               # TypeScript type definitions
│   │   ├── constants/           # Application constants
│   │   └── data/                # Static data (tips, examples)
│   ├── public/                  # Static files and PWA manifest
│   ├── tests/                   # E2E tests with Playwright
│   └── coverage/                # Test coverage reports
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
- **MobX 6.13.7** for reactive state management (replaced Zustand)
- **mobx-react-lite** for React integration with hooks
- Centralized RootStore pattern with proper initialization
- State stores: dateStore, goalStore, recordsStore, toastStore
- Persistent data stored in IndexedDB via repository pattern

### Database Layer
- **IndexedDB** for client-side data persistence
- Repository pattern with structured data access layer
- Repositories: WeightRecordRepository, GoalRepository, BpRecordRepository
- Database operations centralized in `src/db/indexedDb.ts`
- Supports health records, daily activities, blood pressure, and goals
- Error handling with custom `DbError` types

### UI Framework
- **React 18.3.1** with TypeScript 5.8.3
- **Tailwind CSS 4.1.10** for utility-first styling
- **Headless UI 2.2.4** for accessible, unstyled components
- **React Router** for client-side routing
- **Recharts 2.15.3** for declarative charts and graphs
- **React Calendar 6.0.0** for date selection
- **React Icons 5.5.0** for comprehensive icon library
- **@dnd-kit** for modern drag-and-drop functionality

### PWA Features
- Service Worker for offline functionality
- Web App Manifest for app installation
- Auto-updating cache strategy
- Responsive design for mobile-first experience

### Testing Strategy
- **Vitest 3.2.4** for fast unit testing with jsdom environment
- **Playwright 1.53.1** for cross-browser E2E testing (Chromium, Firefox, Safari)
- **@testing-library** for React component testing
- **Business logic testing** for hooks in `hooks/business/__tests__/`
- Coverage reports with detailed analysis

### Performance Optimizations
- **Manual code splitting** - Separate vendor chunks (react, ui, dnd, icons, state)
- **Lazy loading** - Route-level code splitting with React.Suspense
- **Bundle analysis** - Rollup visualizer integration for size optimization
- **Terser minification** - Console/debugger removal in production
- **MobX reactions** - Efficient reactive state updates

## 🏗️ Key Architectural Patterns

### MobX Store Structure
```typescript
// Centralized RootStore pattern
class RootStore {
  dateStore = dateStore;           // Date selection management
  goalStore = goalStore;           // Goal setting & tracking
  recordsStore = enhancedRecordsStore; // Health records CRUD
  toastStore = toastStore;         // Notification system
}
```

### Repository Pattern for Data Access
```typescript
// Structured database access in src/db/
export { WeightRecordRepository } from './repositories/WeightRecordRepository';
export { GoalRepository } from './repositories/GoalRepository';
export { BpRecordRepository } from './repositories/BpRecordRepository';
```

### Business Logic Hooks
```
hooks/business/
├── useWeightRecordLogic.ts      # Weight tracking business logic
├── useBpRecordLogic.ts          # Blood pressure logic  
├── useGoalInputLogic.ts         # Goal management logic
└── __tests__/                   # Business logic tests
```

### Component Architecture
- **Page components** - Main route handlers in `pages/`
- **Compound components** - Complex UI like DatePickerBar
- **Feature-specific** - Organized in Goal/, DailyRecord/ folders
- **Reusable components** - Button, StatusMessage, etc.

## 🎯 Key Features

The app manages health data including:
- **Weight tracking** with goal progression
- **Daily activities** (exercise, meals, sleep, smoking, alcohol)
- **Blood pressure monitoring**
- **Data visualization** with charts and graphs
- **CSV export** functionality
- **Goal setting and tracking**
- **Milestone tracking** for special health guidance support

## 🔧 Configuration Files

- `vite.config.ts` - Build config with GitHub Pages setup, code splitting, PWA support
- `package.json` - Dependencies, scripts, project metadata
- `tsconfig.app.json` - TypeScript config with strict settings
- `eslint.config.js` - Linting rules for TypeScript/React
- `tailwind.config.js` - Tailwind CSS configuration
- `playwright.config.ts` - E2E test configuration
- `vitest.config.ts` - Unit test setup with jsdom environment

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

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.