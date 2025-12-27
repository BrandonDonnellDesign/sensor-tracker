'use client';

import { useState, useEffect } from 'react';
import { useGamification } from '@/components/providers/gamification-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { AchievementNotification } from '@/components/gamification/achievement-notification';
import { Award, Flame, Star, Trophy, Target, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import { Profile } from '@/types/profile';

interface CompactGamificationProps {
  className?: string;
}

export function CompactGamification({ className = '' }: CompactGamificationProps) {
  const { user } = useAuth();
  const { 
    userStats, 
    userAchievements, 
    allAchievements, 
    streakStatus,
    loading, 
    getPointsForNextLevel,
    recalculateStreaks
  } = useGamification();
  const [showAchievements, setShowAchievements] = useState(false);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);

  // Load user profile to get achievement tracking preference
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('profiles')
          .select('preferred_achievement_tracking, preferred_achievement_id')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setUserProfile(data as any);
        }
      } catch (error) {
        console.error('Error loading user profile for achievement tracking:', error);
      }
    };

    loadProfile();
  }, [user?.id]);

  if (loading || !userStats) {
    return (
      <div className={`bg-[#1e293b] rounded-lg p-6 border border-slate-700/30 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
          <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded w-full"></div>
        </div>
      </div>
    );
  }

  // Calculate level progress
  const currentLevelStart = userStats.level === 1 ? 0 : getPointsForNextLevel(userStats.level - 1);
  const nextLevelStart = getPointsForNextLevel(userStats.level);
  const pointsInCurrentLevel = userStats.total_points - currentLevelStart;
  const pointsNeededForNext = nextLevelStart - currentLevelStart;
  const progressPercentage = (pointsInCurrentLevel / pointsNeededForNext) * 100;

  // Filter visible achievements
  const visibleAchievements = allAchievements.filter(achievement => {
    if (achievement.requirement_type !== 'hidden_trigger') return true;
    return userAchievements.some(ua => ua.achievement_id === achievement.id);
  });

  // Get next achievement goal
  const nextAchievement = visibleAchievements.find(ach => 
    !userAchievements.some(ua => ua.achievement_id === ach.id) &&
    ach.requirement_type === 'sensor_count'
  );

  // Recent achievements (last 3)
  const recentAchievements = userAchievements.slice(0, 3);

  // Get user's preferred tracking mode
  const trackingPreference = (userProfile as any)?.preferred_achievement_tracking || 'next_achievement';

  // Render the appropriate tracking widget based on user preference
  const renderTrackingWidget = () => {
    switch (trackingPreference) {
      case 'current_streak':
        const currentStreak = streakStatus?.streakData?.currentStreak || userStats.current_streak || 0;
        const streakMessage = streakStatus?.message || (
          currentStreak === 0 ? 'Start tracking to begin your streak!' : 
          currentStreak === 1 ? 'Great start! Keep it going tomorrow.' :
          `Amazing! ${currentStreak} days in a row!`
        );
        
        return (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-medium text-orange-900 dark:text-orange-300">Current Streak</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {currentStreak}
                </span>
                {streakStatus?.status === 'at_risk' && (
                  <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded-full">
                    At Risk!
                  </span>
                )}
                {streakStatus?.status === 'active' && streakStatus.streakData.isActiveToday && (
                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-full">
                    Active
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-orange-700 dark:text-orange-300">
              {streakMessage}
            </p>
          </div>
        );

      case 'sensors_tracked':
        return (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-900 dark:text-green-300">Sensors Tracked</span>
              </div>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                {userStats.sensors_tracked || 0}
              </span>
            </div>
            <p className="text-xs text-green-700 dark:text-green-300">
              {userStats.sensors_tracked === 0 ? 'Add your first sensor to get started!' :
               userStats.sensors_tracked === 1 ? 'Great! You\'ve tracked your first sensor.' :
               `You've successfully tracked ${userStats.sensors_tracked} sensors!`}
            </p>
          </div>
        );

      case 'level_progress':
        return (
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium text-purple-900 dark:text-purple-300">Level Progress</span>
              </div>
              <span className="text-xs bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full">
                {nextLevelStart - userStats.total_points} pts left
              </span>
            </div>
            
            <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2 mb-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-full h-2 transition-all duration-500"
                style={{ width: `${Math.min(100, progressPercentage)}%` }}
              ></div>
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-300">
              Level {userStats.level} → Level {userStats.level + 1}
            </p>
          </div>
        );

      case 'specific_achievement':
        const specificAchievement = allAchievements.find(ach => ach.id === (userProfile as any)?.preferred_achievement_id);
        if (!specificAchievement || userAchievements.some(ua => ua.achievement_id === specificAchievement.id)) {
          // Achievement not found or already earned, fall back to next achievement
          return nextAchievement ? (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{nextAchievement.icon}</span>
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-300">{nextAchievement.name}</span>
                </div>
                <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                  {nextAchievement.requirement_value - (userStats.sensors_tracked || 0)} left
                </span>
              </div>
              
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-full h-2 transition-all duration-500"
                  style={{ 
                    width: `${Math.min(100, ((userStats.sensors_tracked || 0) / nextAchievement.requirement_value) * 100)}%` 
                  }}
                ></div>
              </div>
            </div>
          ) : null;
        }
        
        // Calculate progress for specific achievement
        const getProgressForAchievement = (achievement: any) => {
          switch (achievement.requirement_type) {
            case 'sensor_count':
              return {
                current: userStats.sensors_tracked || 0,
                target: achievement.requirement_value,
                remaining: Math.max(0, achievement.requirement_value - (userStats.sensors_tracked || 0))
              };
            case 'streak_days':
              return {
                current: userStats.current_streak,
                target: achievement.requirement_value,
                remaining: Math.max(0, achievement.requirement_value - userStats.current_streak)
              };
            case 'points_total':
              return {
                current: userStats.total_points,
                target: achievement.requirement_value,
                remaining: Math.max(0, achievement.requirement_value - userStats.total_points)
              };
            default:
              return {
                current: 0,
                target: achievement.requirement_value,
                remaining: achievement.requirement_value
              };
          }
        };

        const progress = getProgressForAchievement(specificAchievement);
        
        return (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{specificAchievement.icon}</span>
                <span className="text-sm font-medium text-indigo-900 dark:text-indigo-300">{specificAchievement.name}</span>
              </div>
              <span className="text-xs bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded-full">
                {progress.remaining} left
              </span>
            </div>
            
            <div className="w-full bg-indigo-200 dark:bg-indigo-800 rounded-full h-2 mb-2">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full h-2 transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, (progress.current / progress.target) * 100)}%` 
                }}
              ></div>
            </div>
            
            <p className="text-xs text-indigo-700 dark:text-indigo-300">
              {specificAchievement.description} ({progress.current}/{progress.target})
            </p>
          </div>
        );

      case 'next_achievement':
      default:
        return nextAchievement ? (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{nextAchievement.icon}</span>
                <span className="text-sm font-medium text-blue-900 dark:text-blue-300">{nextAchievement.name}</span>
              </div>
              <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                {nextAchievement.requirement_value - (userStats.sensors_tracked || 0)} left
              </span>
            </div>
            
            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-full h-2 transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, ((userStats.sensors_tracked || 0) / nextAchievement.requirement_value) * 100)}%` 
                }}
              ></div>
            </div>
          </div>
        ) : null;
    }
  };

  return (
    <div className={`bg-[#1e293b] rounded-lg p-6 border border-slate-700/30 ${className}`}>
      {/* Header with Gradient Accent */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Level {userStats.level}</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400">{userStats.total_points.toLocaleString()} points</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAchievements(true)}
            className="bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 hover:scale-105 shadow-md"
          >
            View All
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
            Progress to Level {userStats.level + 1}
          </span>
          <span className="text-sm text-gray-500 dark:text-slate-500">
            {nextLevelStart - userStats.total_points} pts left
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-teal-500 to-blue-600 rounded-full h-3 transition-all duration-700 shadow-sm"
            style={{ width: `${Math.max(0, Math.min(100, progressPercentage))}%` }}
          ></div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-slate-100">
            {streakStatus?.streakData?.currentStreak || userStats.current_streak || 0}
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-400">
            Streak
            {streakStatus?.status === 'at_risk' && (
              <span className="block text-red-500 font-semibold">At Risk!</span>
            )}
          </p>
        </div>
        
        <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
          <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Award className="w-4 h-4 text-white" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{userAchievements.length}</p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400">Earned</p>
        </div>
        
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Target className="w-4 h-4 text-white" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{userStats.sensors_tracked || 0}</p>
          <p className="text-xs text-green-600 dark:text-green-400">Sensors</p>
        </div>
      </div>

      {/* Dynamic Tracking Widget */}
      {renderTrackingWidget()}

      {/* Recent Achievements */}
      {recentAchievements.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">Recent Achievements</h4>
          {recentAchievements.map((userAchievement) => (
            <div
              key={userAchievement.id}
              className="flex items-center space-x-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-3"
            >
              <span className="text-lg">{userAchievement.achievement.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                  {userAchievement.achievement.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                  +{userAchievement.achievement.points} points
                </p>
              </div>
              <div className={`w-3 h-3 rounded-full ${
                userAchievement.achievement.badge_color === 'gold' ? 'bg-yellow-400' :
                userAchievement.achievement.badge_color === 'silver' ? 'bg-gray-400' :
                userAchievement.achievement.badge_color === 'platinum' ? 'bg-purple-400' :
                'bg-orange-400'
              }`}></div>
            </div>
          ))}
        </div>
      )}

      {/* No Achievements Yet */}
      {recentAchievements.length === 0 && (
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-full flex items-center justify-center mx-auto mb-3">
            <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <p className="text-sm text-gray-700 dark:text-slate-300 mb-1">Ready to earn achievements?</p>
          <p className="text-xs text-gray-500 dark:text-slate-500">Start tracking sensors to unlock rewards!</p>
        </div>
      )}

      {/* Motivational Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-600">
        <div className="flex items-center justify-center space-x-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
            {streakStatus?.message || (
              userStats.current_streak > 0 
                ? `${userStats.current_streak} day streak! Keep it up!` 
                : 'Start your tracking streak today!'
            )}
          </span>
        </div>
        {streakStatus?.status === 'at_risk' && (
          <div className="mt-2 text-center">
            <button
              onClick={recalculateStreaks}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 underline"
            >
              Recalculate Streak
            </button>
          </div>
        )}
      </div>

      {/* Achievement Modal */}
      {showAchievements && (
        <AchievementNotification 
          onClose={() => setShowAchievements(false)}
          showAll={true}
        />
      )}
    </div>
  );
}