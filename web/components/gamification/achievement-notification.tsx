'use client';

import { useEffect, useState } from 'react';
import { useGamification } from '@/components/providers/gamification-provider';
import { Award, X } from 'lucide-react';

interface AchievementNotificationProps {
  achievement?: {
    id: string;
    name: string;
    description: string;
    icon: string;
    points: number;
    badge_color: string;
  };
  onClose: () => void;
  showAll?: boolean;
}

export function AchievementNotification({ 
  achievement, 
  onClose, 
  showAll = false 
}: AchievementNotificationProps) {
  const { allAchievements, userAchievements, userStats } = useGamification();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    if (!showAll && achievement) {
      // Auto-close single achievement notification after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [achievement, onClose, showAll]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const getBadgeColor = (color: string) => {
    switch (color) {
      case 'gold': return 'from-yellow-400 to-yellow-600';
      case 'silver': return 'from-gray-300 to-gray-500';
      case 'platinum': return 'from-purple-400 to-purple-600';
      case 'bronze': return 'from-orange-400 to-orange-600';
      default: return 'from-blue-400 to-blue-600';
    }
  };

  const calculateAchievementProgress = (achievement: any, userStats: any) => {
    if (!userStats) return { current: 0, target: achievement.requirement_value, percentage: 0 };
    
    let current = 0;
    const target = achievement.requirement_value;
    
    switch (achievement.requirement_type) {
      case 'sensor_count':  // Fixed: matches database requirement_type
        current = userStats.sensors_tracked || 0;
        break;
      case 'sensors_tracked':  // Keep for backward compatibility
        current = userStats.sensors_tracked || 0;
        break;
      case 'successful_sensors':
        current = userStats.successful_sensors || 0;
        break;
      case 'success_rate':
        // Calculate success rate percentage, but only if minimum sensors requirement is met
        const minSensors = achievement.requirement_data?.min_sensors || 10;
        if (userStats.sensors_tracked >= minSensors) {
          current = Math.round((userStats.successful_sensors / userStats.sensors_tracked) * 100);
        } else {
          // If minimum sensors not met, show progress towards minimum sensors instead
          current = userStats.sensors_tracked;
          // Override target to show sensor count progress instead of percentage
          return {
            current: userStats.sensors_tracked,
            target: minSensors,
            percentage: Math.max(0, Math.min(100, (userStats.sensors_tracked / minSensors) * 100)),
            isMinimumProgress: true
          };
        }
        break;
      case 'streak_days':  // Fixed: matches database requirement_type
        current = Math.max(userStats.current_streak || 0, userStats.longest_streak || 0);
        break;
      case 'current_streak':  // Keep for backward compatibility
        current = userStats.current_streak || 0;
        break;
      case 'longest_streak':
        current = userStats.longest_streak || 0;
        break;
      case 'total_points':
        current = userStats.total_points || 0;
        break;
      case 'level':
        current = userStats.level || 1;
        break;
      case 'hidden_trigger':
        // Hidden achievements - show as unlocked or locked without progress
        switch (achievement.name) {
          case 'Hidden Gem':
            current = userStats.sensors_tracked >= 1 ? 1 : 0;
            break;
          case 'Data Hoarder':
            current = userStats.sensors_tracked >= 200 ? 200 : userStats.sensors_tracked;
            break;
          default:
            // Other hidden achievements need additional tracking
            current = 0;
        }
        break;
      case 'special_action':
        // Handle special achievements based on action_type
        const actionType = achievement.requirement_data?.action_type;
        const requiredCount = achievement.requirement_data?.required_count || achievement.requirement_value;
        
        // Handle not implemented features first
        if (actionType === 'integration_setup' || actionType === 'auto_sync' || actionType === 'dexcom_integration') {
          return {
            current: 0,
            target: requiredCount || 1,
            percentage: 0,
            isNotImplemented: true,
            message: 'Feature coming soon - integration tracking'
          };
        }
        
        if (actionType === 'detailed_notes') {
          return {
            current: 0,
            target: requiredCount,
            percentage: 0,
            isNotImplemented: true,
            message: 'Feature coming soon - detailed notes tracking'
          };
        }
        
        if (actionType === 'long_term_usage') {
          return {
            current: 0,
            target: achievement.requirement_data?.required_months || 6,
            percentage: 0,
            isNotImplemented: true,
            message: 'Feature coming soon - usage duration tracking'
          };
        }
        
        if (actionType === 'sensor_longevity') {
          return {
            current: 0,
            target: achievement.requirement_data?.required_percentage || 90,
            percentage: 0,
            isNotImplemented: true,
            message: 'Feature coming soon - sensor lifespan tracking'
          };
        }
        
        if (actionType === 'archive_sensors') {
          return {
            current: 0,
            target: requiredCount,
            percentage: 0,
            isNotImplemented: true,
            message: 'Feature coming soon - archive tracking'
          };
        }
        
        if (actionType === 'maintenance_streak') {
          return {
            current: 0,
            target: achievement.requirement_data?.required_days || 90,
            percentage: 0,
            isNotImplemented: true,
            message: 'Feature coming soon - maintenance tracking'
          };
        }
        
        if (actionType === 'perfect_usage') {
          return {
            current: 0,
            target: requiredCount,
            percentage: 0,
            isNotImplemented: true,
            message: 'Feature coming soon - perfect usage tracking'
          };
        }
        
        // Handle implemented features
        if (actionType === 'tag_issues' || actionType === 'issue_documentation') {
          // Count problematic sensors as a proxy for issue documentation
          current = userStats.sensors_tracked - userStats.successful_sensors;
        } else {
          current = 0;
        }
        break;
      default:
        current = 0;
    }
    
    const percentage = Math.max(0, Math.min(100, (current / target) * 100));
    return { current, target, percentage };
  };

  const earnedAchievementIds = new Set(userAchievements.map(ua => ua.achievement_id));

  // Filter out hidden achievements that haven't been earned yet for progress calculations
  const visibleAchievements = allAchievements.filter(achievement => {
    // Show all non-hidden achievements
    if (achievement.requirement_type !== 'hidden_trigger') return true;
    
    // For hidden achievements, only show if earned
    return earnedAchievementIds.has(achievement.id);
  });

  if (showAll) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <div className={`bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto transform transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center space-x-2">
              <Award className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              <span>Achievements</span>
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Summary */}
          {userStats && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4 mb-6 border border-indigo-200 dark:border-indigo-800">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center mb-4">
                <div>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {userAchievements.length}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-slate-400">Earned</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {visibleAchievements.length - userAchievements.length}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-slate-400">Remaining</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {Math.round((userAchievements.length / visibleAchievements.length) * 100)}%
                  </p>
                  <p className="text-xs text-gray-600 dark:text-slate-400">Complete</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {userStats.total_points}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-slate-400">Total Points</p>
                </div>
              </div>
              
              {/* Points Breakdown */}
              <div className="border-t border-indigo-200 dark:border-indigo-700 pt-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Points Breakdown</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between items-center p-2 bg-white/50 dark:bg-slate-800/50 rounded">
                    <span className="text-gray-600 dark:text-slate-400">🏆 Achievements</span>
                    <span className="font-medium text-gray-900 dark:text-slate-100">
                      {userAchievements.reduce((sum, ua) => sum + ua.achievement.points, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white/50 dark:bg-slate-800/50 rounded">
                    <span className="text-gray-600 dark:text-slate-400">📅 Daily Activities</span>
                    <span className="font-medium text-gray-900 dark:text-slate-100">
                      {userStats.total_points - userAchievements.reduce((sum, ua) => sum + ua.achievement.points, 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {['tracking', 'consistency', 'milestone', 'special', 'mystery', 'analytics', 'organization', 'meta', 'detail', 'media', 'performance'].map(category => {
              const categoryAchievements = visibleAchievements.filter(a => {
                // Only show achievements in this category
                return a.category === category;
              });
              if (categoryAchievements.length === 0) return null;

              return (
                <div key={category}>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">
                    {category === 'mystery' ? '🔮 Hidden Achievements' :
                     category === 'analytics' ? '📊 Analytics Achievements' :
                     category === 'organization' ? '📁 Organization Achievements' :
                     category === 'meta' ? '🌟 Meta Achievements' :
                     category === 'detail' ? '🔍 Detail Achievements' :
                     category === 'media' ? '📸 Media Achievements' :
                     category === 'performance' ? '⚡ Performance Achievements' :
                     `${category.charAt(0).toUpperCase() + category.slice(1)} Achievements`}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {categoryAchievements.map(ach => {
                      const isEarned = earnedAchievementIds.has(ach.id);
                      return (
                        <div
                          key={ach.id}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            isEarned 
                              ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' 
                              : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                              isEarned 
                                ? `bg-gradient-to-r ${getBadgeColor(ach.badge_color)}` 
                                : 'bg-gray-200 dark:bg-slate-600 grayscale'
                            }`}>
                              {isEarned ? ach.icon : '🔒'}
                            </div>
                            <div className="flex-1">
                              <h4 className={`font-semibold ${
                                isEarned 
                                  ? 'text-gray-900 dark:text-slate-100' 
                                  : 'text-gray-500 dark:text-slate-400'
                              }`}>
                                {ach.name}
                              </h4>
                              <p className={`text-sm ${
                                isEarned 
                                  ? 'text-gray-600 dark:text-slate-300' 
                                  : 'text-gray-400 dark:text-slate-500'
                              }`}>
                                {ach.description}
                              </p>
                              
                              {/* Progress Bar for Unearned Achievements */}
                              {!isEarned && userStats && (
                                <div className="mt-3">
                                  {(() => {
                                    const progress = calculateAchievementProgress(ach, userStats);
                                    return (
                                      <div>
                                        <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mb-1">
                                          <span>
                                            {progress.isNotImplemented
                                              ? 'Coming Soon'
                                              : progress.isMinimumProgress 
                                              ? `${progress.current} / ${progress.target} sensors needed`
                                              : `${progress.current} / ${progress.target}${ach.requirement_type === 'success_rate' ? '%' : ''}`
                                            }
                                          </span>
                                          <span>{Math.round(progress.percentage)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                                          <div 
                                            className={`rounded-full h-2 transition-all duration-500 ${
                                              progress.isNotImplemented
                                                ? 'bg-gradient-to-r from-gray-400 to-gray-500'
                                                : progress.isMinimumProgress 
                                                ? 'bg-gradient-to-r from-orange-500 to-orange-600' 
                                                : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                            }`}
                                            style={{ width: `${progress.percentage}%` }}
                                          ></div>
                                        </div>
                                        {progress.isMinimumProgress && (
                                          <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                            Need {progress.target - progress.current} more sensors to unlock this achievement
                                          </div>
                                        )}
                                        {progress.isNotImplemented && (
                                          <div className="text-xs text-gray-500 dark:text-slate-400 mt-1 italic">
                                            {progress.message}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between mt-2">
                                <span className={`text-xs font-medium ${
                                  isEarned 
                                    ? 'text-green-600 dark:text-green-400' 
                                    : 'text-gray-400 dark:text-slate-500'
                                }`}>
                                  {ach.points} points
                                </span>
                                {isEarned && (
                                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                    ✓ Earned
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (!achievement) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-slate-700 max-w-sm transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
            🎉 Achievement Unlocked!
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${getBadgeColor(achievement.badge_color)} flex items-center justify-center text-2xl shadow-lg`}>
            {achievement.icon}
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-gray-900 dark:text-slate-100 mb-1">
              {achievement.name}
            </h4>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-2">
              {achievement.description}
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                +{achievement.points} points
              </span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                achievement.badge_color === 'gold' ? 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/30' :
                achievement.badge_color === 'silver' ? 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-900/30' :
                achievement.badge_color === 'platinum' ? 'text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/30' :
                'text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/30'
              }`}>
                {achievement.badge_color}
              </span>
            </div>
          </div>
        </div>

        {/* Celebration animation */}
        <div className="absolute -top-2 -right-2 text-2xl animate-bounce">
          🎊
        </div>
        <div className="absolute -top-1 -left-2 text-xl animate-pulse">
          ✨
        </div>
      </div>
    </div>
  );
}