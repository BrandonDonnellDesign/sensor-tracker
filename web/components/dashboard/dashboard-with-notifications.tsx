'use client';

import { useSmartNotifications } from '@/lib/notifications/smart-notifications';
import { useNotificationContext } from '@/components/notifications/realtime-notification-provider';
import { CombinedNotificationBar } from '@/components/dashboard/combined-notification-bar';

interface DashboardNotificationsProps {
  // Smart notification context
  sensors: any[];
  userStats: any;
  insulinDoses: any[];
  currentGlucose?: number;
  glucoseReadings: any[];
  foodLogs: any[];
  maxVisible?: number;
}

export function DashboardNotifications({
  sensors,
  userStats,
  insulinDoses,
  currentGlucose,
  glucoseReadings,
  foodLogs,
  maxVisible = 2
}: DashboardNotificationsProps) {
  
  // Get smart notifications (client-side generated)
  const { notifications: smartNotifications, dismissNotification: dismissSmartNotification } = useSmartNotifications({
    sensors,
    userStats,
    currentTime: new Date(),
    insulinDoses,
    currentGlucose,
    glucoseReadings,
    foodLogs
  });

  // Get realtime notifications (WebSocket from database)
  const { notifications: realtimeNotifications, dismissNotification: dismissRealtimeNotification } = useNotificationContext();

  return (
    <CombinedNotificationBar
      smartNotifications={smartNotifications}
      realtimeNotifications={realtimeNotifications}
      onDismissSmartNotification={dismissSmartNotification}
      onDismissRealtimeNotification={dismissRealtimeNotification}
      maxVisible={maxVisible}
    />
  );
}