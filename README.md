# CGM Sensor Tracker

A cross-platform application for tracking continuous glucose monitoring (CGM) sensors with cloud synchronization. Supports Dexcom and Freestyle sensors.

## Project Structure

This is a monorepo containing:

- `backend/` - Node.js/Express API server with TypeScript
- `mobile/` - React Native mobile app for iOS and Android
- `web/` - Next.js web application with PWA support
- `shared/` - Shared business logic and types

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- For mobile development: React Native CLI, Xcode (iOS), Android Studio (Android)
- For backend: PostgreSQL database

### Installation

```bash
# Install all dependencies
npm run install:all

# Or install individually
npm install
npm run install:backend
npm run install:mobile  
npm run install:web
```

### Development

```bash
# Start backend API server
npm run dev:backend

# Start web development server
npm run dev:web

# Start React Native metro bundler
npm run start:mobile
```

### Building

```bash
# Build all projects
npm run build

# Build individually
npm run build:shared
npm run build:backend
npm run build:web
```

### Testing

```bash
# Run all tests
npm test

# Run tests individually
npm run test:shared
npm run test:backend
npm run test:web
```

## Platform Support

- **Mobile**: iOS 13.0+, Android 8.0+ (API level 26)
- **Web**: Modern browsers (Chrome, Firefox, Safari, Edge)
- **Backend**: Node.js 18+ with PostgreSQL database