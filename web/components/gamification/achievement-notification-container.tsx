'use client';

import { AchievementNotification } from './achievement-notification';
import { useGamification } from '@/components/providers/gamification-provider';

export function AchievementNotificationContainer() {
  const { achievementNotifications, clearAchievementNotification } = useGamification();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {achievementNotifications.map((achievement) => (
        <AchievementNotification
          key={achievement.id}
          achievement={achievement}
          onClose={() => clearAchievementNotification(achievement.id)}
        />
      ))}
    </div>
  );
}