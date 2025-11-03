'use client';

import { useState, memo, useMemo, useCallback } from 'react';
import { useGamification } from '@/components/providers/gamification-provider';
import { useAuth } from '@/components/providers/auth-provider';

import { AchievementNotification } from './achievement-notification';
import { Award, Flame } from 'lucide-react';

interface GamificationWidgetProps {
  compact?: boolean;
}

export const GamificationWidget = memo(function GamificationWidget({ compact = false }: GamificationWidgetProps) {
  const { user: _user } = useAuth();
  const { userStats, userAchievements, allAchievements, loading, getProgressToNextLevel: _getProgressToNextLevel, getPointsForNextLevel: _getPointsForNextLevel } = useGamification();
  const [showAchievements, setShowAchievements] = useState(false);

  // Memoize filtered achievements
  const visibleAchievements = useMemo(() => 
    allAchievements.filter(achievement => {
      // Show all non-hidden achievements
      if (achievement.requirement_type !== 'hidden_trigger') return true;
      
      // For hidden achievements, only show if earned
      return userAchievements.some(ua => ua.achievement_id === achievement.id);
    }),
    [allAchievements, userAchievements]
  );




  if (loading || !userStats) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
          <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded w-full"></div>
        </div>
      </div>
    );
  }

  // Memoize level calculations
  const levelProgress = useMemo(() => {
    if (!userStats) return { currentLevelStart: 0, nextLevelStart: 100, progressToNext: 0 };
    
    const currentLevelStart = userStats.level === 1 ? 0 : (userStats.level === 2 ? 100 : Math.pow(2, userStats.level - 2) * 100);
    const nextLevelStart = userStats.level === 1 ? 100 : (userStats.level === 2 ? 200 : Math.pow(2, userStats.level - 1) * 100);
    const progressToNext = ((userStats.total_points - currentLevelStart) / (nextLevelStart - currentLevelStart)) * 100;
    
    return { currentLevelStart, nextLevelStart, progressToNext };
  }, [userStats?.level, userStats?.total_points]);

  const recentAchievements = useMemo(() => 
    userAchievements.slice(0, 3),
    [userAchievements]
  );

  // Memoize handlers
  const toggleAchievements = useCallback(() => {
    setShowAchievements(prev => !prev);
  }, []);

  const closeAchievements = useCallback(() => {
    setShowAchievements(false);
  }, []);

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <Award className="h-6 w-6 text-white" />
              <div>
                <p className="text-sm opacity-90">Level {userStats.level}</p>
                <p className="font-bold">{userStats.total_points.toLocaleString()} pts</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-90">Streak</p>
            <div className="flex items-center justify-end space-x-1">
              <p className="font-bold text-lg">{userStats.current_streak}</p>
              <Flame className="h-5 w-5 text-orange-300" />
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs opacity-90 mb-1">
            <span>Level {userStats.level}</span>
            <span>Next: {levelProgress.nextLevelStart - userStats.total_points} pts</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-white rounded-full h-2 transition-all duration-500"
              style={{ width: `${Math.max(0, Math.min(100, levelProgress.progressToNext))}%` }}
            ></div>
          </div>
        </div>
        
        {/* Quick Goal */}
        {(() => {
          const nextAchievement = visibleAchievements.find(ach => 
            !userAchievements.some(ua => ua.achievement_id === ach.id) &&
            ach.requirement_type === 'sensor_count'  // Fixed: matches database requirement_type
          );
          
          if (nextAchievement) {
            const current = userStats.sensors_tracked || 0;
            const target = nextAchievement.requirement_value;
            const remaining = target - current;
            
            if (remaining > 0 && remaining <= 5) {
              return (
                <div className="mt-2 text-xs opacity-90">
                  <div className="flex items-center justify-between">
                    <span>{nextAchievement.icon} {nextAchievement.name}</span>
                    <span>{remaining} more</span>
                  </div>
                </div>
              );
            }
          }
          return null;
        })()}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full flex items-center justify-center">
            <Award className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Your Progress
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Level {userStats.level} • {userStats.total_points.toLocaleString()} points
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {userAchievements.length}/{visibleAchievements.length} earned
            </p>
            <div className="w-16 bg-gray-200 dark:bg-slate-700 rounded-full h-1">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-600 rounded-full h-1 transition-all duration-500"
                style={{ width: `${visibleAchievements.length > 0 ? (userAchievements.length / visibleAchievements.length) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
          <button
            onClick={toggleAchievements}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            {showAchievements ? 'Hide' : 'View All'}
          </button>
        </div>
      </div>

      {/* Level Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
            Level {userStats.level}
          </span>
          <span className="text-sm text-gray-500 dark:text-slate-400">
            {userStats.total_points - levelProgress.currentLevelStart} / {levelProgress.nextLevelStart - levelProgress.currentLevelStart} pts
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full h-3 transition-all duration-500"
            style={{ width: `${Math.max(0, Math.min(100, levelProgress.progressToNext))}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
          {levelProgress.nextLevelStart - userStats.total_points} points to level {userStats.level + 1}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            <Flame className="h-5 w-5 text-orange-500" />
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
            {userStats.current_streak}
          </p>
          <p className="text-xs text-gray-600 dark:text-slate-400">Current Streak</p>
        </div>
        
        <div className="text-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            <Award className="h-5 w-5 text-yellow-500" />
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
            {userStats.achievements_earned}
          </p>
          <p className="text-xs text-gray-600 dark:text-slate-400">Achievements</p>
        </div>
      </div>

      {/* Goals Progress */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
          Current Goals
        </h4>
        <div className="space-y-3">
          {/* Next Achievement Goal */}
          {(() => {
            const nextAchievement = visibleAchievements.find(ach => 
              !userAchievements.some(ua => ua.achievement_id === ach.id) &&
              ach.requirement_type === 'sensor_count'  // Fixed: matches database requirement_type
            );
            
            if (nextAchievement) {
              const current = userStats.sensors_tracked || 0;
              const target = nextAchievement.requirement_value;
              const percentage = Math.max(0, Math.min(100, (current / target) * 100));
              
              return (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{nextAchievement.icon}</span>
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                        {nextAchievement.name}
                      </span>
                    </div>
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      {current}/{target}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-full h-2 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            }
            return null;
          })()}
          
          {/* Streak Goal */}
          {userStats.current_streak >= 0 && userStats.current_streak < 7 && (
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium text-orange-900 dark:text-orange-300">
                    Weekly Streak
                  </span>
                </div>
                <span className="text-xs text-orange-600 dark:text-orange-400">
                  {userStats.current_streak}/7
                </span>
              </div>
              <div className="w-full bg-orange-200 dark:bg-orange-800 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-full h-2 transition-all duration-500"
                  style={{ width: `${Math.max(0, Math.min(100, (userStats.current_streak / 7) * 100))}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>



      {/* Recent Achievements */}
      {recentAchievements.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
            Recent Achievements
          </h4>
          <div className="space-y-2">
            {recentAchievements.map((userAchievement) => (
              <div
                key={userAchievement.id}
                className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
              >
                <span className="text-lg">{userAchievement.achievement.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                    {userAchievement.achievement.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    +{userAchievement.achievement.points} points
                  </p>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  userAchievement.achievement.badge_color === 'gold' ? 'bg-yellow-400' :
                  userAchievement.achievement.badge_color === 'silver' ? 'bg-gray-400' :
                  userAchievement.achievement.badge_color === 'platinum' ? 'bg-purple-400' :
                  'bg-orange-400'
                }`}></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Achievements Yet */}
      {recentAchievements.length === 0 && (
        <div className="text-center py-4">
          <span className="text-4xl mb-2 block">🏆</span>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Start tracking sensors to earn achievements!
          </p>
        </div>
      )}

      {/* Debug Actions (Development Only) */}


      {/* All Achievements Modal */}
      {showAchievements && (
        <AchievementNotification 
          onClose={closeAchievements}
          showAll={true}
        />
      )}
    </div>
  );
});