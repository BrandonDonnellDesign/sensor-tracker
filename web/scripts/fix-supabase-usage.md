# Supabase Client Migration Guide

## Files that need updating to use SSR-compatible client:

### Pattern to find:
```typescript
import { supabase } from '@/lib/supabase';
```

### Replace with:
```typescript
import { createClient } from '@/lib/supabase-client';
```

### Usage pattern to find:
```typescript
const { data, error } = await supabase.from('table')...
```

### Replace with:
```typescript
const supabase = createClient();
const { data, error } = await supabase.from('table')...
```

## Files to update:
- web/components/settings/profile-settings.tsx ✅
- web/components/dashboard/user-profile-menu.tsx ✅
- web/app/dashboard/page.tsx ✅
- web/hooks/use-retroactive-awards.tsx ✅

## Remaining files:
- web/components/settings/export-settings.tsx
- web/components/sensors/tag-selector.tsx
- web/components/sensors/sensor-card.tsx
- web/components/sensors/photo-gallery.tsx
- web/components/sensors/image-upload.tsx
- web/components/sensors/archived-sensors-view.tsx
- web/components/providers/gamification-provider.tsx
- web/components/profile/edit-profile-form.tsx
- web/components/food/food-log-edit-form.tsx
- web/components/food/food-log-list.tsx
- web/components/food/food-log-form.tsx
- web/components/food/multi-food-log-form.tsx
- web/components/dexcom-settings.tsx
- web/components/dashboard/mobile-dashboard.tsx
- web/components/dashboard/notifications-button.tsx
- web/components/dashboard/sidebar.tsx
- web/components/dashboard/enhanced-dashboard-with-ai.tsx
- web/components/dashboard/compact-gamification.tsx
- web/components/dashboard/activity-timeline.tsx
- web/components/api/api-key-manager.tsx
- web/components/admin/admin-users-client.tsx
- web/components/admin/admin-guard.tsx
- web/app/dashboard/search/page.tsx
- web/app/dashboard/settings/page.tsx
- web/app/dashboard/sensors/page.tsx
- web/app/dashboard/sensors/[id]/page.tsx
- web/app/dashboard/sensors/new/page.tsx
- web/app/dashboard/analytics/page.tsx

## Priority Order:
1. Authentication-related components (admin-guard, user-profile-menu) ✅
2. Main dashboard pages ✅
3. Settings components
4. Sensor components
5. Food logging components
6. Other components