import { lazy } from 'react';

// Dashboard components - using named exports
export const ActivityTimeline = lazy(() => 
  import('@/components/dashboard/activity-timeline').then(module => ({ default: module.ActivityTimeline }))
);

// Note: Only including components that exist and have proper exports
// Other components can be added as they are created with proper export statements