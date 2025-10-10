'use client';

import { useGamification } from '@/components/providers/gamification-provider';
import { Flame, Rocket, Zap, Dumbbell, Sprout } from 'lucide-react';

interface StreakIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function StreakIndicator({ size = 'md', showLabel = true }: StreakIndicatorProps) {
  const { userStats, loading } = useGamification();

  if (loading || !userStats) {
    return (
      <div className={`animate-pulse ${
        size === 'sm' ? 'w-16 h-6' : size === 'lg' ? 'w-24 h-10' : 'w-20 h-8'
      } bg-gray-200 dark:bg-slate-700 rounded-lg`}></div>
    );
  }

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return 'from-teal-500 to-cyan-500';
    if (streak >= 14) return 'from-orange-500 to-red-500';
    if (streak >= 7) return 'from-yellow-500 to-orange-500';
    if (streak >= 3) return 'from-green-500 to-blue-500';
    return 'from-gray-400 to-gray-500';
  };

  const getStreakIcon = (streak: number) => {
    if (streak >= 30) return <Flame className="h-4 w-4" />;
    if (streak >= 14) return <Rocket className="h-4 w-4" />;
    if (streak >= 7) return <Zap className="h-4 w-4" />;
    if (streak >= 3) return <Dumbbell className="h-4 w-4" />;
    return <Sprout className="h-4 w-4" />;
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <div className={`inline-flex items-center space-x-1.5 bg-gradient-to-r ${getStreakColor(userStats.current_streak)} text-white rounded-lg font-medium ${sizeClasses[size]} shadow-sm`}>
      {getStreakIcon(userStats.current_streak)}
      <span>{userStats.current_streak}</span>
      {showLabel && (
        <span className="opacity-90">
          {size === 'sm' ? '' : 'day streak'}
        </span>
      )}
    </div>
  );
}