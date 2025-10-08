'use client';

import { useGamification } from '@/components/providers/gamification-provider';
import { Crown, Gem, Award, Medal, Star } from 'lucide-react';

interface LevelBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
}

export function LevelBadge({ size = 'md', showProgress = false }: LevelBadgeProps) {
  const { userStats, loading, getProgressToNextLevel } = useGamification();

  if (loading || !userStats) {
    return (
      <div className={`animate-pulse ${
        size === 'sm' ? 'w-12 h-12' : size === 'lg' ? 'w-20 h-20' : 'w-16 h-16'
      } bg-gray-200 dark:bg-slate-700 rounded-full`}></div>
    );
  }

  const getLevelColor = (level: number) => {
    if (level >= 20) return 'from-purple-500 to-pink-500';
    if (level >= 15) return 'from-indigo-500 to-purple-500';
    if (level >= 10) return 'from-blue-500 to-indigo-500';
    if (level >= 5) return 'from-green-500 to-blue-500';
    return 'from-gray-500 to-gray-600';
  };

  const getLevelIcon = (level: number) => {
    if (level >= 20) return <Crown className="h-5 w-5" />;
    if (level >= 15) return <Gem className="h-5 w-5" />;
    if (level >= 10) return <Award className="h-5 w-5" />;
    if (level >= 5) return <Medal className="h-5 w-5" />;
    return <Star className="h-5 w-5" />;
  };

  const sizeClasses = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-16 h-16 text-xl',
    lg: 'w-20 h-20 text-2xl'
  };

  const progress = getProgressToNextLevel(userStats.total_points, userStats.level);

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="relative">
        <div className={`${sizeClasses[size]} bg-gradient-to-r ${getLevelColor(userStats.level)} rounded-full flex items-center justify-center text-white font-bold shadow-lg`}>
          {getLevelIcon(userStats.level)}
        </div>
        
        {/* Level number overlay */}
        <div className={`absolute -bottom-1 -right-1 ${
          size === 'sm' ? 'w-6 h-6 text-xs' : size === 'lg' ? 'w-8 h-8 text-sm' : 'w-7 h-7 text-xs'
        } bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-600 rounded-full flex items-center justify-center font-bold text-gray-900 dark:text-slate-100`}>
          {userStats.level}
        </div>

        {/* Progress ring */}
        {showProgress && (
          <svg className={`absolute inset-0 ${sizeClasses[size]} transform -rotate-90`} viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              className="text-gray-200 dark:text-slate-700"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              className="text-white transition-all duration-500"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>

      {showProgress && (
        <div className="text-center">
          <p className="text-xs text-gray-600 dark:text-slate-400">
            Level {userStats.level}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-500">
            {Math.round(progress)}% to next
          </p>
        </div>
      )}
    </div>
  );
}