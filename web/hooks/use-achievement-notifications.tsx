'use client';

import { useState } from 'react';
// import { useGamification } from '@/components/providers/gamification-provider';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  badge_color: string;
}

export function useAchievementNotifications() {
  const [notifications, setNotifications] = useState<Achievement[]>([]);
  // const { userStats } = useGamification();

  const showAchievement = (achievement: Achievement) => {
    setNotifications(prev => [...prev, achievement]);
    
    // Auto-remove after 6 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(a => a.id !== achievement.id));
    }, 6000);
  };

  const removeNotification = (achievementId: string) => {
    setNotifications(prev => prev.filter(a => a.id !== achievementId));
  };

  return {
    notifications,
    showAchievement,
    removeNotification,
  };
}