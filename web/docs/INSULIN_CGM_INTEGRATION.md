# Insulin Logging & CGM Integration

This feature automatically associates CGM readings with meals and insulin doses, accounting for the ~1 hour delay in CGM data availability.

## Features

### 1. Insulin Logging

- Track insulin doses with type, units, injection site, and timing
- Support for multiple insulin types (rapid, long-acting, etc.)
- Automatic CGM reading capture at time of dose
- Track insulin pharmacokinetics (onset, peak, duration)

### 2. CGM Association

- **Meals**: Automatically captures CGM reading closest to meal time (within 90 min window)
- **Insulin**: Automatically captures CGM reading at dose time
- **Post-meal tracking**: Shows glucose at +1hr and +2hr after meals
- **Peak tracking**: Shows glucose at expected insulin peak time

### 3. Timeline View

- Combined view of meals, insulin doses, and glucose readings
- Color-coded glucose values (red: low, green: in range, orange: high)
- Trend arrows (↑↑, ↑, →, ↓, ↓↓)
- Grouped by date for easy navigation

## Database Schema

### Tables Created

- `insulin_types`: User-defined insulin types with pharmacokinetic properties
- `insulin_doses`: Insulin dose logs with CGM context
- `food_logs`: Extended with CGM reading fields

### Views

- `food_logs_with_cgm`: Meals with pre/post CGM readings
- `insulin_doses_with_cgm`: Doses with CGM at dose time and peak

### Functions

- `get_closest_cgm_reading()`: Finds nearest CGM reading accounting for delay
- `auto_populate_food_cgm()`: Trigger to auto-capture CGM for meals
- `auto_populate_insulin_cgm()`: Trigger to auto-capture CGM for insulin

## API Endpoints

### Insulin Types

- `GET /api/insulin/types` - List user's insulin types
- `POST /api/insulin/types` - Create new insulin type

### Insulin Doses

- `GET /api/insulin/doses?startDate=&endDate=` - List doses with CGM context
- `POST /api/insulin/doses` - Log new dose (CGM auto-captured)

### Timeline

- `GET /api/timeline?startDate=&endDate=` - Combined timeline of all events

### CGM Backfill

- `POST /api/cgm/backfill` - Manually backfill CGM readings for recent meals/insulin
  - Body: `{ "lookbackHours": 2 }`
  - Returns: `{ "meals_updated": 5, "insulin_updated": 3 }`

## Components

### InsulinTypeManager

Manage insulin types with common presets (Humalog, Novolog, Lantus, etc.)

```tsx
import { InsulinTypeManager } from '@/components/dashboard/insulin-type-manager';

<InsulinTypeManager />;
```

### InsulinLogForm

Log insulin doses with automatic CGM capture

```tsx
import { InsulinLogForm } from '@/components/dashboard/insulin-log-form';

<InsulinLogForm onSuccess={() => console.log('Logged!')} />;
```

### TimelineView

View combined timeline of meals, insulin, and glucose

```tsx
import { TimelineView } from '@/components/dashboard/timeline-view';

<TimelineView />;
```

## Usage Example

```typescript
import {
  logInsulinDose,
  getFoodLogsWithCGM,
  getTimelineEvents,
} from '@/lib/insulin-service';

// Log insulin dose (CGM reading auto-captured)
await logInsulinDose({
  user_id: userId,
  insulin_type_id: 'uuid',
  units: 5,
  dose_type: 'bolus',
  dosed_at: new Date().toISOString(),
});

// Get meals with CGM context
const meals = await getFoodLogsWithCGM(userId, startDate, endDate);
// Each meal includes:
// - cgm_reading_at_meal
// - cgm_trend_at_meal
// - cgm_1hr_post_meal
// - cgm_2hr_post_meal

// Get complete timeline
const timeline = await getTimelineEvents(userId, startDate, endDate);

// Manually backfill CGM readings after a sync
const result = await backfillCGMReadings(userId, 2); // lookback 2 hours
console.log(
  `Updated ${result.meals_updated} meals and ${result.insulin_updated} insulin doses`
);
```

## CGM Delay Handling

CGM readings have a ~60 minute delay between when the glucose is measured and when the data becomes available in the database.

**How it works:**

1. You eat a meal at 12:00 PM and log it immediately
2. The CGM reading from 12:00 PM won't be available until ~1:00 PM
3. When you log the meal at 12:00 PM, the CGM field will be empty (data not available yet)
4. After the next CGM sync (around 1:00 PM), the system automatically backfills the reading
5. The meal now shows the glucose value from 12:00 PM (when you ate), even though the data arrived at 1:00 PM

**Technical details:**

- Looks for CGM readings with `system_time` matching the event time (±10 minutes)
- The `system_time` represents when the glucose was measured, not when data arrived
- Automatic backfill runs after each CGM sync to populate recent meals/insulin
- Post-meal readings use ±10 minute windows around target times (1hr, 2hr)
- Peak insulin readings use ±10 minute windows around expected peak time

**Manual backfill:**
If you need to backfill CGM readings for recent logs, call:

```sql
SELECT * FROM public.backfill_cgm_readings('user-id', 2); -- lookback 2 hours
```

## Common Insulin Types

Pre-configured with common insulin types:

| Name    | Type       | Onset  | Peak | Duration |
| ------- | ---------- | ------ | ---- | -------- |
| Humalog | Rapid      | 15 min | 1 hr | 4 hr     |
| Novolog | Rapid      | 15 min | 1 hr | 4 hr     |
| Apidra  | Rapid      | 15 min | 1 hr | 4 hr     |
| Lantus  | Long       | 90 min | None | 24 hr    |
| Levemir | Long       | 90 min | None | 24 hr    |
| Tresiba | Ultra-long | 60 min | None | 42 hr    |

## Migration

Run the migrations in order:

```bash
supabase db push
```

**Migration 20250127000004** creates:

- Tables for insulin types and doses
- CGM association fields on food_logs
- Automatic triggers for CGM capture (on insert)
- Backfill function for updating existing logs
- Views for combined data
- Helper functions for CGM lookup

**Migration 20250127000002** (updated):

- Dexcom auto-sync now calls backfill after successful sync
- Automatically updates recent meals/insulin with CGM readings

## Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Service role has full access for background jobs
- Functions use SECURITY DEFINER with explicit search_path
