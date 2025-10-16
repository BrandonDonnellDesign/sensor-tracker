# Copilot Instructions for CGM Sensor Tracker Monorepo

## Project Overview
- **Monorepo Structure:**
  - `backend/`: Node.js/Express API (TypeScript, Prisma, PostgreSQL)
  - `web/`: Next.js PWA (TypeScript, Supabase, Netlify)
  - `mobile/`: React Native app (iOS/Android)
  - `shared/`: Common business logic and types
- **Domain:** Tracks CGM sensors (Dexcom, FreeStyle), manages expiration, analytics, notifications, and secure user data.

## Key Workflows
- **Install All Dependencies:**
  - `npm run install:all` (root)
- **Start Development Servers:**
  - Web: `npm run dev:web`
  - Backend: `npm run dev:backend`
  - Mobile: `npm run start:mobile`
- **Build All Projects:**
  - `npm run build`
- **Run All Tests:**
  - `npm test`
- **Auto-Commit Script:**
  - `npm run commit` or `node scripts/auto-commit.js` (auto-generates conventional commit messages)

## Data & Integration
- **Database:** PostgreSQL (backend), Supabase (web)
- **Prisma:** Used for backend ORM/migrations (`backend/prisma/schema.prisma`)
- **Supabase:** Used for web authentication, RLS, and data sync
- **Dexcom Integration:** OAuth 2.0, real-time sync (see `DEXCOM_INTEGRATION.md`)
- **Shared Types:** All apps import from `shared/` for models and business logic

## Patterns & Conventions
- **TypeScript Everywhere:** All main codebases use TypeScript
- **Business Logic:** Centralized in `shared/` (e.g., sensor models, expiration logic)
- **Testing:**
  - Jest for all packages (`jest.config.js` in each)
  - Tests in `test/` or `__tests__/` folders
- **Environment Variables:**
  - Backend: `.env` (PostgreSQL, secrets)
  - Web: `.env.local` (Supabase keys)
- **Scripts:**
  - Database: `db:generate`, `db:migrate`, `db:seed`, `db:reset` (backend)
  - Supabase: `db:generate`, `db:migrate`, `db:reset` (web)

## Notable Files & Directories
- `backend/prisma/schema.prisma`: DB schema
- `shared/models/`: Core data models
- `web/lib/database.types.ts`: Supabase type generation
- `scripts/auto-commit.js`: Commit message automation
- `web/components/`: UI components by domain
- `web/hooks/`: Custom React hooks

## Project-Specific Practices
- **Sensor Expiration:**
  - Expiration logic in `shared/utils/sensorExpiration.ts`
  - Automatic notifications and tagging for expired sensors
- **Tagging System:**
  - Predefined tags in `shared/models/Sensor.ts` and related files
- **Notifications:**
  - Web push via service worker (`web/public/manifest.json`, `web/lib/push-notifications.ts`)
- **Admin Tools:**
  - Admin panel in `web/app/admin/`
  - Backend scripts for DB setup and seeding

## Example: Adding a New Sensor Type
1. Update models in `shared/models/Sensor.ts`
2. Update expiration logic in `shared/utils/sensorExpiration.ts`
3. Add API endpoints in `backend/src/controllers/`
4. Update UI in `web/components/sensors/`

---

**For unclear or missing conventions, ask for clarification or check related README files.**
