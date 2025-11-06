'use client';

import { useState } from 'react';
import { Profile } from '@/types/profile';
import { Bell, Syringe, TrendingUp, Activity, AlertTriangle } from 'lucide-react';

interface NotificationSettingsProps {
  profile: Profile | null;
  onUpdate: (updates: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
}

export function NotificationSettings({ profile, onUpdate }: NotificationSettingsProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleToggle = async (setting: keyof Profile, value: boolean) => {
    setSaving(true);
    setMessage(null);

    const result = await onUpdate({ [setting]: value });
    
    if (result.success) {
      setMessage({ type: 'success', text: 'Settings updated successfully' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update settings' });
    }

    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleNumericUpdate = async (setting: keyof Profile, value: number) => {
    setSaving(true);
    setMessage(null);

    const result = await onUpdate({ [setting]: value });
    
    if (result.success) {
      setMessage({ type: 'success', text: 'Settings updated successfully' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update settings' });
    }

    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSmartNotificationPreference = async (preference: string, value: boolean | number) => {
    setSaving(true);
    setMessage(null);

    const currentPrefs = (profile?.notification_preferences as Record<string, any>) || {};
    const updatedPrefs = {
      ...currentPrefs,
      [preference]: value
    };

    const result = await onUpdate({ 
      notification_preferences: updatedPrefs 
    });
    
    if (result.success) {
      setMessage({ type: 'success', text: 'Notification preferences updated successfully' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update preferences' });
    }

    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCommunityPreference = async (preference: string, value: boolean) => {
    setSaving(true);
    setMessage(null);

    const currentPrefs = (profile?.notification_preferences as Record<string, any>) || {};
    const updatedPrefs = {
      ...currentPrefs,
      [preference]: value
    };

    const result = await onUpdate({ 
      notification_preferences: updatedPrefs 
    });
    
    if (result.success) {
      setMessage({ type: 'success', text: 'Community preferences updated successfully' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update preferences' });
    }

    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  // Get current smart notification preferences from profile
  const smartPrefs = (profile?.notification_preferences as Record<string, any>) || {};

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">
          Notification Preferences
        </h2>
        <p className="text-gray-600 dark:text-slate-400 mb-6">
          Choose how you&apos;d like to be notified about sensor expiration, insulin safety, and other important updates.
        </p>
      </div>

      {/* Success/Error Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* General Notification Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">
            General Settings
          </h3>
        </div>
        
        <div className="space-y-4">
          {/* Master Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-slate-100">Enable Notifications</h4>
              <p className="text-sm text-gray-600 dark:text-slate-400">Master switch for all notifications</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={profile?.notifications_enabled || false}
                onChange={(e) => handleToggle('notifications_enabled', e.target.checked)}
                disabled={saving}
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Push Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-slate-100">Browser Push Notifications</h4>
              <p className="text-sm text-gray-600 dark:text-slate-400">Receive notifications even when app is closed</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={profile?.push_notifications_enabled || false}
                onChange={(e) => handleToggle('push_notifications_enabled', e.target.checked)}
                disabled={saving || !profile?.notifications_enabled}
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* In-App Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-slate-100">In-App Notifications</h4>
              <p className="text-sm text-gray-600 dark:text-slate-400">Show notification bar in the app</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={profile?.in_app_notifications_enabled || false}
                onChange={(e) => handleToggle('in_app_notifications_enabled', e.target.checked)}
                disabled={saving || !profile?.notifications_enabled}
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Sensor Alerts */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">
            Sensor Expiration Alerts
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              First Warning (days before expiration)
            </label>
            <select 
              className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
              value={profile?.warning_days_before || 3}
              onChange={(e) => handleNumericUpdate('warning_days_before', parseInt(e.target.value))}
              disabled={saving || !profile?.notifications_enabled}
            >
              <option value={1}>1 day before</option>
              <option value={2}>2 days before</option>
              <option value={3}>3 days before</option>
              <option value={5}>5 days before</option>
              <option value={7}>1 week before</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Critical Warning (days before expiration)
            </label>
            <select 
              className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
              value={profile?.critical_days_before || 1}
              onChange={(e) => handleNumericUpdate('critical_days_before', parseInt(e.target.value))}
              disabled={saving || !profile?.notifications_enabled}
            >
              <option value={0}>Day of expiration</option>
              <option value={1}>1 day before</option>
              <option value={2}>2 days before</option>
            </select>
          </div>
        </div>
      </div>

      {/* IOB Safety Alerts */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Syringe className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">
            IOB Safety Alerts
          </h3>
          <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 px-2 py-1 rounded-full">
            NEW
          </span>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-slate-100">Insulin Stacking Alerts</h4>
              <p className="text-sm text-gray-600 dark:text-slate-400">Warn when multiple doses are taken in short period</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={smartPrefs.iob_stacking_alerts ?? true}
                onChange={(e) => handleSmartNotificationPreference('iob_stacking_alerts', e.target.checked)}
                disabled={saving || !profile?.notifications_enabled}
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-slate-100">High IOB + Low Glucose Alerts</h4>
              <p className="text-sm text-gray-600 dark:text-slate-400">Critical safety alert for hypoglycemia risk</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={smartPrefs.high_iob_low_glucose_alerts ?? true}
                onChange={(e) => handleSmartNotificationPreference('high_iob_low_glucose_alerts', e.target.checked)}
                disabled={saving || !profile?.notifications_enabled}
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Very High IOB Threshold (units)
            </label>
            <input
              type="number"
              min="3"
              max="10"
              step="0.5"
              value={smartPrefs.very_high_iob_threshold ?? 5}
              onChange={(e) => handleSmartNotificationPreference('very_high_iob_threshold', parseFloat(e.target.value))}
              disabled={saving || !profile?.notifications_enabled}
              className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
            />
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Alert when IOB exceeds this amount</p>
          </div>
        </div>
      </div>

      {/* Glucose-Based Alerts */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">
            Glucose-Based Alerts
          </h3>
          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full">
            NEW
          </span>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-slate-100">Rising Glucose Alerts</h4>
              <p className="text-sm text-gray-600 dark:text-slate-400">Alert when glucose rises without logged food</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={smartPrefs.rising_glucose_alerts ?? true}
                onChange={(e) => handleSmartNotificationPreference('rising_glucose_alerts', e.target.checked)}
                disabled={saving || !profile?.notifications_enabled}
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-slate-100">Prolonged High Glucose Alerts</h4>
              <p className="text-sm text-gray-600 dark:text-slate-400">Alert for extended high glucose periods</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={smartPrefs.prolonged_high_alerts ?? true}
                onChange={(e) => handleSmartNotificationPreference('prolonged_high_alerts', e.target.checked)}
                disabled={saving || !profile?.notifications_enabled}
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-slate-100">Dawn Phenomenon Detection</h4>
              <p className="text-sm text-gray-600 dark:text-slate-400">Educational alerts about morning glucose rises</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={smartPrefs.dawn_phenomenon_alerts ?? false}
                onChange={(e) => handleSmartNotificationPreference('dawn_phenomenon_alerts', e.target.checked)}
                disabled={saving || !profile?.notifications_enabled}
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-slate-100">Low Glucose + IOB Alerts</h4>
              <p className="text-sm text-gray-600 dark:text-slate-400">Critical safety alert for severe hypoglycemia risk</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={smartPrefs.low_glucose_iob_alerts ?? true}
                onChange={(e) => handleSmartNotificationPreference('low_glucose_iob_alerts', e.target.checked)}
                disabled={saving || !profile?.notifications_enabled}
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Glucose Thresholds */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-slate-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Low Threshold
              </label>
              <input
                type="number"
                min="60"
                max="100"
                value={smartPrefs.low_glucose_threshold ?? 80}
                onChange={(e) => handleSmartNotificationPreference('low_glucose_threshold', parseInt(e.target.value))}
                disabled={saving || !profile?.notifications_enabled}
                className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">mg/dL</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                High Threshold
              </label>
              <input
                type="number"
                min="140"
                max="220"
                value={smartPrefs.high_glucose_threshold ?? 180}
                onChange={(e) => handleSmartNotificationPreference('high_glucose_threshold', parseInt(e.target.value))}
                disabled={saving || !profile?.notifications_enabled}
                className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">mg/dL</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Critical Threshold
              </label>
              <input
                type="number"
                min="200"
                max="300"
                value={smartPrefs.critical_glucose_threshold ?? 250}
                onChange={(e) => handleSmartNotificationPreference('critical_glucose_threshold', parseInt(e.target.value))}
                disabled={saving || !profile?.notifications_enabled}
                className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">mg/dL</p>
            </div>
          </div>
        </div>
      </div>

      {/* Community Notifications */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">
            Community Notifications
          </h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-slate-100">Comment Replies</h4>
              <p className="text-sm text-gray-600 dark:text-slate-400">Get notified when someone replies to your comments</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={smartPrefs.commentReplies ?? true}
                onChange={(e) => handleCommunityPreference('commentReplies', e.target.checked)}
                disabled={saving || !profile?.notifications_enabled}
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-slate-100">Weekly Community Digest</h4>
              <p className="text-sm text-gray-600 dark:text-slate-400">Receive a weekly summary of top community tips</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={smartPrefs.weeklyDigest ?? true}
                onChange={(e) => handleCommunityPreference('weeklyDigest', e.target.checked)}
                disabled={saving || !profile?.notifications_enabled}
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Admin Alerts (only show for admins) */}
          {profile?.role === 'admin' && (
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-slate-100">Admin Alerts</h4>
                <p className="text-sm text-gray-600 dark:text-slate-400">Receive notifications about flagged content and moderation alerts</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={smartPrefs.adminAlerts ?? false}
                  onChange={(e) => handleCommunityPreference('adminAlerts', e.target.checked)}
                  disabled={saving || !profile?.notifications_enabled}
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          )}
        </div>
      </div>

      {saving && (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600 dark:text-slate-400">Saving...</span>
        </div>
      )}
    </div>
  );
}