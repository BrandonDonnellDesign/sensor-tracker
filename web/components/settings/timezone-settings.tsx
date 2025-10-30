'use client';

import { useState, useEffect } from 'react';
import { Profile } from '@/types/profile';
import { timezones } from '@/constants/timezones';
import { useGamification } from '@/components/providers/gamification-provider';

interface TimezoneSettingsProps {
  profile: Profile | null;
  onUpdate: (updates: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
}

export function TimezoneSettings({ profile, onUpdate }: TimezoneSettingsProps) {
  const { allAchievements, userAchievements } = useGamification();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Local state to handle immediate UI updates
  const [localSettings, setLocalSettings] = useState({
    timezone: '',
    date_format: '',
    time_format: '',
    glucose_unit: '',
    preferred_achievement_tracking: '',
    preferred_achievement_id: ''
  });

  // Sync local state with profile when it changes
  useEffect(() => {
    if (profile) {
      setLocalSettings({
        timezone: profile.timezone || 'America/New_York',
        date_format: profile.date_format || 'MM/DD/YYYY',
        time_format: profile.time_format || '12',
        glucose_unit: profile.glucose_unit || 'mg/dL',
        preferred_achievement_tracking: (profile as any).preferred_achievement_tracking || 'next_achievement',
        preferred_achievement_id: (profile as any).preferred_achievement_id || ''
      });
    }
  }, [profile]);

  const dateFormats = [
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)', example: '10/04/2025' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (EU)', example: '04/10/2025' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)', example: '2025-10-04' },
    { value: 'MMM DD, YYYY', label: 'MMM DD, YYYY', example: 'Oct 04, 2025' },
  ];

  const timeFormats = [
    { value: '12', label: '12-hour (AM/PM)', example: '2:30 PM' },
    { value: '24', label: '24-hour', example: '14:30' },
  ];

  const achievementTrackingOptions = [
    { value: 'next_achievement', label: 'Next Achievement', description: 'Show progress toward the next unearned achievement' },
    { value: 'specific_achievement', label: 'Specific Achievement', description: 'Choose a specific achievement to track' },
    { value: 'current_streak', label: 'Current Streak', description: 'Track your daily activity streak' },
    { value: 'sensors_tracked', label: 'Sensors Tracked', description: 'Show total number of sensors tracked' },
    { value: 'level_progress', label: 'Level Progress', description: 'Display progress toward next level' },
  ];

  // Filter achievements that are not yet earned and are trackable
  const availableAchievements = allAchievements.filter(achievement => {
    // Don't show hidden achievements unless already earned
    if (achievement.requirement_type === 'hidden_trigger' && 
        !userAchievements.some(ua => ua.achievement_id === achievement.id)) {
      return false;
    }
    // Don't show already earned achievements
    return !userAchievements.some(ua => ua.achievement_id === achievement.id);
  });

  const handleUpdate = async (setting: keyof Profile, value: string) => {
    // Update local state immediately for UI responsiveness
    setLocalSettings(prev => ({ ...prev, [setting]: value }));
    
    setSaving(true);
    setMessage(null);

    const result = await onUpdate({ [setting]: value });
    
    if (result.success) {
      setMessage({ type: 'success', text: 'Preferences updated successfully' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update preferences' });
      // Revert local state on error
      if (profile) {
        setLocalSettings({
          timezone: profile.timezone || 'America/New_York',
          date_format: profile.date_format || 'MM/DD/YYYY',
          time_format: profile.time_format || '12',
          glucose_unit: profile.glucose_unit || 'mg/dL',
          preferred_achievement_tracking: (profile as any).preferred_achievement_tracking || 'next_achievement',
          preferred_achievement_id: (profile as any).preferred_achievement_id || ''
        });
      }
    }

    setSaving(false);
    
    // Clear message after 3 seconds
    setTimeout(() => setMessage(null), 3000);
  };

  const getCurrentExample = () => {
    const now = new Date();
    
    try {
      // Format date according to timezone and preferences
      const options: Intl.DateTimeFormatOptions = {
        timeZone: localSettings.timezone,
        hour12: localSettings.time_format === '12',
        year: 'numeric',
        month: localSettings.date_format.includes('MMM') ? 'short' : '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      };
      
      const formatter = new Intl.DateTimeFormat('en-US', options);
      return formatter.format(now);
    } catch (error) {
      return 'Invalid format';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">
          Date & Time Preferences
        </h2>
        <p className="text-gray-600 dark:text-slate-400 mb-6">
          Customize how dates and times are displayed throughout the application.
        </p>
      </div>

      {/* Success/Error Message */}
      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Timezone Selection */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600 p-4">
          <h3 className="text-base font-medium text-gray-900 dark:text-slate-100 mb-3">
            Timezone
          </h3>
          <select 
            className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
            value={localSettings.timezone}
            onChange={(e) => handleUpdate('timezone', e.target.value)}
            disabled={saving}
          >
            {timezones.map((tz) => (
              <option 
                key={tz} 
                value={tz}
                className="text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700"
              >
                {tz.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
            This affects how sensor expiration times and notifications are calculated.
          </p>
        </div>

        {/* Date Format */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600 p-4">
          <h3 className="text-base font-medium text-gray-900 dark:text-slate-100 mb-3">
            Date Format
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dateFormats.map((format) => (
              <label key={format.value} className="flex items-center p-3 border border-gray-200 dark:border-slate-600 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600/50">
                <input
                  type="radio"
                  name="dateFormat"
                  value={format.value}
                  checked={localSettings.date_format === format.value}
                  onChange={(e) => handleUpdate('date_format', e.target.value)}
                  disabled={saving}
                  className="mr-3 text-blue-600"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                    {format.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    {format.example}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Time Format */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600 p-4">
          <h3 className="text-base font-medium text-gray-900 dark:text-slate-100 mb-3">
            Time Format
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {timeFormats.map((format) => (
              <label key={format.value} className="flex items-center p-3 border border-gray-200 dark:border-slate-600 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600/50">
                <input
                  type="radio"
                  name="timeFormat"
                  value={format.value}
                  checked={localSettings.time_format === format.value}
                  onChange={(e) => handleUpdate('time_format', e.target.value)}
                  disabled={saving}
                  className="mr-3 text-blue-600"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                    {format.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    {format.example}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Glucose Unit */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600 p-4">
          <h3 className="text-base font-medium text-gray-900 dark:text-slate-100 mb-3">
            Glucose Unit
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center p-3 border border-gray-200 dark:border-slate-600 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600/50">
              <input
                type="radio"
                name="glucoseUnit"
                value="mg/dL"
                checked={localSettings.glucose_unit === 'mg/dL'}
                onChange={(e) => handleUpdate('glucose_unit', e.target.value)}
                disabled={saving}
                className="mr-3 text-blue-600"
              />
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                  mg/dL
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  Common in US (70-140 mg/dL)
                </div>
              </div>
            </label>
            <label className="flex items-center p-3 border border-gray-200 dark:border-slate-600 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600/50">
              <input
                type="radio"
                name="glucoseUnit"
                value="mmol/L"
                checked={localSettings.glucose_unit === 'mmol/L'}
                onChange={(e) => handleUpdate('glucose_unit', e.target.value)}
                disabled={saving}
                className="mr-3 text-blue-600"
              />
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                  mmol/L
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  Common in EU (3.9-7.8 mmol/L)
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Achievement Tracking Preference */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600 p-4">
          <h3 className="text-base font-medium text-gray-900 dark:text-slate-100 mb-3">
            Dashboard Achievement Widget
          </h3>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
            Choose what to highlight in your gamification widget on the dashboard.
          </p>
          <div className="space-y-3">
            {achievementTrackingOptions.map((option) => (
              <div key={option.value}>
                <label className="flex items-start p-3 border border-gray-200 dark:border-slate-600 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600/50">
                  <input
                    type="radio"
                    name="achievementTracking"
                    value={option.value}
                    checked={localSettings.preferred_achievement_tracking === option.value}
                    onChange={(e) => handleUpdate('preferred_achievement_tracking' as any, e.target.value)}
                    disabled={saving}
                    className="mr-3 mt-0.5 text-blue-600"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">
                      {option.description}
                    </div>
                  </div>
                </label>
                
                {/* Enhanced Specific Achievement Selection */}
                {option.value === 'specific_achievement' && localSettings.preferred_achievement_tracking === 'specific_achievement' && (
                  <div className="mt-3 ml-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">🎯</span>
                      </div>
                      <label className="text-sm font-medium text-blue-900 dark:text-blue-300">
                        Choose Your Target Achievement
                      </label>
                    </div>
                    
                    {availableAchievements.length > 0 ? (
                      <div className="space-y-2">
                        {/* Custom Achievement Selector with Hover Descriptions */}
                        <div className="relative">
                          <select
                            value={localSettings.preferred_achievement_id}
                            onChange={(e) => handleUpdate('preferred_achievement_id' as any, e.target.value)}
                            disabled={saving}
                            className="w-full p-3 border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                          >
                            <option value="">🎯 Select an achievement to track...</option>
                            {availableAchievements.map((achievement) => (
                              <option key={achievement.id} value={achievement.id}>
                                {achievement.icon} {achievement.name} • {achievement.points} pts • {achievement.category}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Achievement Cards with Hover Descriptions */}
                        <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                          <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                            💡 Hover over achievements below to see descriptions:
                          </p>
                          {availableAchievements.map((achievement) => (
                            <div
                              key={achievement.id}
                              className={`relative group p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                                localSettings.preferred_achievement_id === achievement.id
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                  : 'border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                              }`}
                              onClick={() => handleUpdate('preferred_achievement_id' as any, achievement.id)}
                            >
                              <div className="flex items-center space-x-3">
                                <span className="text-xl">{achievement.icon}</span>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <h4 className="font-medium text-gray-900 dark:text-slate-100">
                                      {achievement.name}
                                    </h4>
                                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full">
                                      {achievement.points} pts
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-slate-400">
                                    {achievement.category}
                                  </p>
                                </div>
                                {localSettings.preferred_achievement_id === achievement.id && (
                                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              
                              {/* Hover Tooltip */}
                              <div className="absolute left-0 top-full mt-2 w-full bg-gray-900 dark:bg-slate-800 text-white text-sm p-3 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 border border-gray-700">
                                <div className="flex items-start space-x-2">
                                  <span className="text-lg">{achievement.icon}</span>
                                  <div>
                                    <h5 className="font-medium mb-1">{achievement.name}</h5>
                                    <p className="text-xs text-gray-300 mb-2">{achievement.description}</p>
                                    <div className="flex items-center space-x-2 text-xs">
                                      <span className="bg-blue-600 px-2 py-1 rounded">
                                        {achievement.points} points
                                      </span>
                                      <span className="bg-gray-700 px-2 py-1 rounded">
                                        {achievement.category}
                                      </span>
                                      <span className={`px-2 py-1 rounded ${
                                        achievement.badge_color === 'gold' ? 'bg-yellow-600' :
                                        achievement.badge_color === 'silver' ? 'bg-gray-500' :
                                        achievement.badge_color === 'platinum' ? 'bg-purple-600' :
                                        'bg-orange-600'
                                      }`}>
                                        {achievement.badge_color}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                {/* Tooltip Arrow */}
                                <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 dark:bg-slate-800 border-l border-t border-gray-700 transform rotate-45"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Show selected achievement details */}
                        {localSettings.preferred_achievement_id && (
                          <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-700">
                            {(() => {
                              const selectedAchievement = availableAchievements.find(a => a.id === localSettings.preferred_achievement_id);
                              if (!selectedAchievement) return null;
                              
                              return (
                                <div className="flex items-start space-x-3">
                                  <span className="text-2xl">{selectedAchievement.icon}</span>
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-900 dark:text-slate-100">
                                      {selectedAchievement.name}
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                                      {selectedAchievement.description}
                                    </p>
                                    <div className="flex items-center space-x-4 text-xs">
                                      <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full">
                                        {selectedAchievement.points} points
                                      </span>
                                      <span className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 px-2 py-1 rounded-full">
                                        {selectedAchievement.category}
                                      </span>
                                      <span className={`px-2 py-1 rounded-full ${
                                        selectedAchievement.badge_color === 'gold' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                                        selectedAchievement.badge_color === 'silver' ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' :
                                        selectedAchievement.badge_color === 'platinum' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                                        'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                                      }`}>
                                        {selectedAchievement.badge_color} badge
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-2xl">🏆</span>
                        </div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">
                          Congratulations! 🎉
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-400">
                          You&apos;ve earned all available achievements! Check back later for new challenges.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-base font-medium text-blue-900 dark:text-blue-300 mb-2">
            Preview
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-400">
            With your current settings, dates and times will appear as: <strong>{getCurrentExample()}</strong>
          </p>
        </div>
      </div>

      {saving && (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600 dark:text-slate-400">Saving preferences...</span>
        </div>
      )}
    </div>
  );
}