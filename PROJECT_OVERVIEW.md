# Diabetes Tracker - Comprehensive Project Overview

## 🎯 Project Purpose

A full-stack web application for Type 1 diabetes management that integrates continuous glucose monitoring (CGM), insulin tracking, food logging, and advanced analytics to help users optimize their diabetes control.

---

## 🏗️ Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui
- **State Management**: React hooks, Context API
- **Charts**: Recharts
- **Notifications**: Sonner (toast notifications)

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **API**: Next.js API Routes
- **Real-time**: Supabase Realtime subscriptions
- **Storage**: Supabase Storage (for food images)

### Integrations
- **Dexcom CGM API**: Automatic glucose data sync
- **OpenFoodFacts API**: Food database and barcode scanning
- **MyFitnessPal**: Food logging integration
- **Netlify Functions**: Scheduled background tasks

### Monitoring & Analytics
- **Error Tracking**: Sentry
- **Performance**: Web Vitals tracking
- **Logging**: Centralized logger with environment-aware output

---

## 🎨 Core Features

### 1. Continuous Glucose Monitoring (CGM)
**Location**: `/dashboard/glucose-data`

**Features**:
- Automatic sync with Dexcom CGM (every 15 minutes via Netlify scheduled functions)
- Real-time glucose readings display
- Glucose trend visualization with interactive charts
- Time-in-range analysis (70-180 mg/dL)
- Glucose variability metrics (CV, standard deviation)
- Pattern detection (dawn phenomenon, post-meal spikes)
- Predictive analytics with safety warnings
- A1C estimation and trends
- Manual sync option for immediate updates

**Technical Details**:
- Syncs from last sync timestamp (efficient incremental updates)
- Handles Dexcom API token refresh automatically
- Stores readings in `glucose_readings` table
- Duplicate detection to prevent data redundancy
- 1-hour delay from Dexcom API (inherent limitation)

### 2. Insulin Tracking & IOB Calculator
**Location**: `/dashboard/insulin`

**Features**:
- Log insulin doses (bolus/basal, rapid/long-acting)
- Insulin-on-Board (IOB) calculation with exponential decay
- Real-time IOB display with safety warnings
- Insulin effectiveness tracking
- Total Daily Insulin (TDI) statistics
- Basal vs bolus ratio analysis
- Dose history and patterns
- Integration with meal logging for carb ratio calculations

**Technical Details**:
- IOB calculator: `web/lib/iob-calculator.ts` (fully tested)
- Exponential decay model (4-hour duration for rapid-acting)
- Safety alerts for insulin stacking (>3u IOB + multiple recent doses)
- Stores in `insulin_logs` table
- Automatic IOB updates via database triggers

### 3. Food & Meal Management
**Location**: `/dashboard/food`

**Tabs**:
1. **Log** - Add new meals
2. **Templates** - Save and reuse favorite meals
3. **History** - View past meals
4. **Analytics** - Meal impact analysis

**Features**:
- Barcode scanning for packaged foods
- OpenFoodFacts database integration
- Custom food creation
- Meal templates (save complete meals with multiple items)
- Carb counting with nutritional info
- Meal type categorization (breakfast, lunch, dinner, snack)
- Food-glucose correlation analysis
- Post-meal spike tracking
- Carb ratio suggestions based on history

**Technical Details**:
- `food_logs` table for meal entries
- `meal_templates` and `meal_template_items` tables
- Auto-calculates nutritional totals
- Tracks usage count for popular templates
- Integration with glucose data for impact analysis

### 4. Sensor Management
**Location**: `/dashboard/sensors`

**Features**:
- Track CGM sensor lifecycle
- Expiration alerts (3-day, 1-day, day-of warnings)
- Sensor replacement reminders
- Grace period countdown
- Sensor performance analytics
- Early failure detection
- Average sensor duration tracking
- Problematic sensor flagging

**Technical Details**:
- `sensors` table with sensor model relationships
- Automated expiration checks via Netlify scheduled functions (every 5 minutes)
- Smart notification system with templates
- Sensor inventory integration (auto-reduces stock on sensor add)

### 5. Sensor Inventory Tracking
**Location**: `/dashboard/inventory`

**Features**:
- Track sensor stock by model
- Calculate days of supply remaining (based on sensor duration)
- Usage rate calculation (sensors per month)
- Low stock alerts (< 2 sensors)
- Reorder date predictions
- Order tracking (ordered, shipped, delivered)
- Location tracking (home, office, travel)
- Automatic inventory reduction when sensor is added

**Technical Details**:
- `sensor_inventory` table
- `sensor_orders` table for shipment tracking
- `inventory_alerts` table for preferences
- Auto-updates inventory on order delivery
- Calculates days remaining: quantity × sensor_duration_days

### 6. Advanced Analytics
**Location**: `/dashboard/analytics`

**Features**:
- **Dawn Phenomenon Detection**: Identifies morning glucose rises (4-8 AM)
- **Post-Meal Spike Analysis**: Tracks glucose response to meals
- **Food-Glucose Correlation**: Identifies problem foods
- **A1C Estimation**: Calculate estimated A1C from average glucose
- **Time-in-Range**: Daily/weekly/monthly TIR analysis
- **Glucose Variability**: CV, standard deviation, MAG, J-Index
- **Pattern Recognition**: Hourly patterns, weekly trends
- **Predictive Analytics**: Forecast glucose trends

**Technical Details**:
- Analytics engine: `web/lib/analytics/`
- A1C calculator: `web/lib/analytics/a1c-calculator.ts`
- Dawn phenomenon detector: `web/lib/analytics/dawn-phenomenon-detector.ts`
- AI insights engine: `web/lib/ai/insights-engine.ts`
- Stores patterns in `glucose_patterns` table

### 7. Community Features
**Location**: `/dashboard/community`

**Features**:
- Share diabetes management tips
- Upvote/downvote system
- Comment on tips
- AI-powered content moderation
- Flagged content review
- User reputation system
- Category filtering

**Technical Details**:
- `community_tips` table
- `tip_votes` and `tip_comments` tables
- AI moderation via OpenAI API
- Automatic flagging of inappropriate content

### 8. Notifications & Alerts
**System-wide**

**Types**:
- Sensor expiration warnings
- Low inventory alerts
- Insulin stacking warnings (high IOB + multiple doses)
- Low glucose alerts (< 80 mg/dL)
- High glucose alerts (> 180 mg/dL)
- Rising glucose without food logged
- Smart alerts based on patterns

**Technical Details**:
- `notifications` table
- Database triggers for automatic alert creation
- Real-time notifications via Supabase subscriptions
- Notification preferences per user
- Alert deduplication (prevents spam)

---

## 📊 Database Schema

### Core Tables
- `profiles` - User profiles and settings
- `glucose_readings` - CGM data from Dexcom
- `insulin_logs` - Insulin dose tracking
- `food_logs` - Meal entries
- `sensors` - CGM sensor tracking
- `sensor_models` - Sensor specifications
- `sensor_inventory` - Stock tracking
- `meal_templates` - Saved meal templates
- `meal_template_items` - Foods in templates
- `notifications` - User alerts
- `dexcom_tokens` - Dexcom API credentials

### Analytics Tables
- `glucose_patterns` - Detected patterns
- `glucose_predictions` - Prediction history
- `notification_rules` - User alert preferences

### Community Tables
- `community_tips` - User-shared tips
- `tip_votes` - Upvotes/downvotes
- `tip_comments` - Comments on tips

---

## 🔄 Background Jobs

### Netlify Scheduled Functions

**Dexcom Sync** (every 15 minutes):
- Syncs glucose data for all active users
- Refreshes expiring tokens (< 2 hours)
- Limits to 10 users per run (prevents timeouts)
- Location: `web/netlify/functions/dexcom-sync-cron.ts`

**Sensor Expiration Checks** (every 5 minutes):
- Checks all active sensors for expiration
- Creates notifications at 3-day, 1-day, and day-of thresholds
- Sends replacement reminders
- Location: Netlify scheduled function

---

## 🔐 Security & Privacy

### Authentication
- Supabase Auth with email/password
- Row Level Security (RLS) on all tables
- User can only access their own data
- Admin role for moderation

### Data Protection
- Sensitive data sanitization in logs
- PII removal from error reports
- Encrypted Dexcom tokens (base64)
- Secure API key storage

### API Security
- CRON_SECRET for scheduled functions
- Bearer token authentication
- Rate limiting on public endpoints
- Input validation and sanitization

---

## 📱 User Experience

### Responsive Design
- Mobile-first approach
- Touch-friendly interfaces
- Optimized for phones, tablets, desktops
- Progressive Web App (PWA) ready

### Performance
- Server-side rendering (SSR)
- Optimistic UI updates
- Lazy loading of components
- Image optimization
- Database query optimization with indexes

### Accessibility
- Semantic HTML
- ARIA labels
- Keyboard navigation
- Screen reader support
- Color contrast compliance

---

## 🧪 Testing & Quality

### Testing
- IOB calculator: 34 comprehensive tests (100% passing)
- Unit tests for critical calculations
- Integration tests for API routes

### Monitoring
- Sentry error tracking
- Web Vitals performance monitoring
- Centralized logging system
- Database query performance tracking

### Code Quality
- TypeScript for type safety
- ESLint for code standards
- Prettier for formatting
- Consistent naming conventions

---

## 🚀 Deployment

### Hosting
- **Frontend**: Netlify (automatic deployments from Git)
- **Database**: Supabase (managed PostgreSQL)
- **Functions**: Netlify Functions (serverless)

### CI/CD
- Automatic deployments on Git push
- Preview deployments for pull requests
- Environment-specific configurations
- Database migrations via Supabase CLI

---

## 📈 Key Metrics & Insights

### User Engagement
- Daily active users tracking
- Feature usage analytics
- Session duration monitoring
- User retention metrics

### Health Metrics
- Average time-in-range across users
- Common glucose patterns
- Insulin usage trends
- Meal logging frequency

### System Performance
- API response times
- Database query performance
- Error rates
- Sync success rates

---

## 🎯 Unique Value Propositions

1. **Integrated Workflow**: Seamlessly connects CGM, insulin, and food data
2. **Automatic Sync**: Background sync every 15 minutes (no manual intervention)
3. **Smart Analytics**: AI-powered insights and pattern detection
4. **Safety First**: IOB calculator with stacking warnings
5. **Practical Tools**: Sensor inventory, meal templates, expiration alerts
6. **Community Support**: Share tips and learn from others
7. **Privacy Focused**: User data never shared, full control
8. **Clinically Accurate**: A1C estimation based on ADAG study

---

## 🔮 Technical Innovations

### IOB Calculator
- Exponential decay model (clinically accurate)
- Fully tested with 34 test cases
- Handles multiple insulin types
- Real-time updates via triggers

### Sync Architecture
- Incremental sync (only new data)
- Automatic token refresh
- Duplicate detection
- Graceful error handling

### Meal Templates
- Multi-item templates
- Auto-calculated nutritionals
- Usage tracking for popularity
- Quick-add to food logger

### Inventory Management
- Duration-based supply calculation
- Automatic reduction on sensor use
- Predictive reorder dates
- Order tracking integration

---

## 📝 Data Flow Examples

### Glucose Reading Flow
1. Dexcom CGM measures glucose
2. Netlify function calls Dexcom API (every 15 min)
3. New readings inserted into `glucose_readings`
4. Database trigger checks for alerts (low/high glucose)
5. Notification created if threshold exceeded
6. Real-time update pushed to user's dashboard
7. Analytics engine processes for patterns

### Meal Logging Flow
1. User scans barcode or searches food
2. OpenFoodFacts API returns nutritional data
3. User adjusts serving size
4. Carb ratio calculator suggests insulin dose
5. Meal saved to `food_logs`
6. Optional: Insulin dose logged to `insulin_logs`
7. IOB calculator updates
8. Food-glucose correlation tracked for future insights

### Sensor Replacement Flow
1. User adds new sensor to tracking
2. Database trigger reduces inventory by 1
3. Expiration date calculated (start + duration_days)
4. Scheduled function checks expiration daily
5. Notifications sent at 3-day, 1-day, day-of
6. Grace period countdown displayed
7. Replacement reminder after expiration

---

## 🎓 For LLM Context

When working with this codebase:

1. **Database First**: Most features start with database schema in `web/supabase/migrations/`
2. **API Routes**: Located in `web/app/api/` following Next.js conventions
3. **Components**: Organized by feature in `web/components/`
4. **Type Safety**: Always check `web/types/` for TypeScript interfaces
5. **Utilities**: Shared logic in `web/lib/`
6. **Testing**: Critical calculations have tests in `__tests__/`
7. **Logging**: Use centralized logger from `web/lib/logger.ts`
8. **Styling**: Tailwind classes, dark theme by default
9. **State**: Prefer server components, use client components only when needed
10. **Security**: Always implement RLS policies for new tables

---

## 🔗 Key File Locations

- **IOB Calculator**: `web/lib/iob-calculator.ts`
- **A1C Calculator**: `web/lib/analytics/a1c-calculator.ts`
- **Dexcom Sync**: `web/app/api/dexcom/sync/route.ts`
- **Food Logger**: `web/components/food/smart-food-logger.tsx`
- **Sensor Management**: `web/app/dashboard/sensors/page.tsx`
- **Inventory**: `web/app/dashboard/inventory/page.tsx`
- **Analytics**: `web/app/dashboard/analytics/page.tsx`
- **Database Schema**: `web/supabase/migrations/`

---

*Last Updated: November 14, 2025*
*Version: 2.0*
*Status: Production-ready with active development*
