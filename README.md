# CGM Sensor Tracker

A cross-platform application for tracking continuous glucose monitoring (CGM) sensors with cloud synchronization. Supports Dexcom and Freestyle sensors.

## Features

✨ **Core Tracking**
- Track multiple sensor types (Dexcom G6/G7, FreeStyle Libre)
- Automatic expiration detection and notifications
- Photo documentation with optimized gallery
- Comprehensive sensor history and analytics
- Sensor model management with customizable duration settings
- Real-time status indicators (normal/problematic)

🏷️ **Notes & Tags System**
- 22 predefined tags across 8 categories (Adhesive, Performance, Physical, etc.)
- Custom notes editor for detailed tracking
- Automatic tagging for expired sensors
- Tag-based analytics and filtering
- Visual tag display with color coding
- Bulk tag management

🗄️ **Data Management**
- Soft delete system with recovery options
- Hard delete for permanent data removal
- Automatic archival of sensors older than 6 months
- Export data to CSV/JSON formats
- Searchable archived sensor history
- Performance-optimized data loading
- Advanced search and filtering capabilities

🔗 **Dexcom Integration** *(Coming Soon)*
- Secure OAuth 2.0 connection to Dexcom account
- Automatic sensor data synchronization
- Configurable sync frequency (15 minutes to 6 hours)
- Manual sync capabilities
- Encrypted token storage

🔔 **Smart Notifications**
- Customizable expiration warnings (1-7 days before expiry)
- Web push notifications with service worker support
- Timezone-aware scheduling
- Daily notification summaries
- Notification history tracking

📊 **Analytics & Insights**
- Sensor performance tracking
- Failure pattern analysis
- Tag-based categorization
- Wear duration statistics
- Expiration timeline visualization
- Problematic sensor identification

🔐 **Security & Authentication**
- Secure user authentication with Supabase
- Row-level security (RLS) for data protection
- Encrypted sensitive data storage
- Session management
- Password reset functionality

🎨 **User Experience**
- Dark/light theme support
- Responsive design for all devices
- Progressive Web App (PWA) capabilities
- Offline functionality
- Intuitive navigation and search
- Real-time updates and synchronization

🛠️ **Administration**
- Admin panel for sensor model management
- User management capabilities
- System health monitoring
- Database optimization tools

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

## Dexcom Integration

CGM Tracker now supports automatic sensor data synchronization with Dexcom accounts. See [DEXCOM_INTEGRATION.md](./DEXCOM_INTEGRATION.md) for complete setup instructions.

Key capabilities:
- Secure OAuth 2.0 authentication
- Automatic sensor detection and import
- Configurable sync frequency
- Encrypted token storage
- Real-time data updates

## Platform Support

- **Mobile**: iOS 13.0+, Android 8.0+ (API level 26)
- **Web**: Modern browsers (Chrome, Firefox, Safari, Edge)
- **Backend**: Node.js 18+ with PostgreSQL database