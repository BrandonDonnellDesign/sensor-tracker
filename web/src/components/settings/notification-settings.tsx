'use client';

import { useState } from 'react';
import { Profile } from '@/types/profile';

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
    
    // Clear message after 3 seconds
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
    
    // Clear message after 3 seconds
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">
          Notification Preferences
        </h2>
        <p className="text-gray-600 dark:text-slate-400 mb-6">
          Choose how you&apos;d like to be notified about sensor expiration and other important updates.
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

      <div className="space-y-4">
        {/* Email Notifications */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
          <div className="flex-1">
            <h3 className="text-base font-medium text-gray-900 dark:text-slate-100">
              Email Notifications
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
              Receive email alerts for sensor expirations and reminders
            </p>
          </div>
          <div className="ml-4">
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
        </div>

        {/* Push Notifications */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
          <div className="flex-1">
            <h3 className="text-base font-medium text-gray-900 dark:text-slate-100">
              Push Notifications
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
              Get browser notifications for immediate alerts
            </p>
          </div>
          <div className="ml-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={profile?.push_notifications_enabled || false}
                onChange={(e) => handleToggle('push_notifications_enabled', e.target.checked)}
                disabled={saving}
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* In-App Notifications */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
          <div className="flex-1">
            <h3 className="text-base font-medium text-gray-900 dark:text-slate-100">
              In-App Notifications
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
              Show notification badges and alerts within the application
            </p>
          </div>
          <div className="ml-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={profile?.in_app_notifications_enabled || false}
                onChange={(e) => handleToggle('in_app_notifications_enabled', e.target.checked)}
                disabled={saving}
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Notification Timing */}
      <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">
          Notification Timing
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              First Warning (days before expiration)
            </label>
            <select 
              className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
              value={profile?.warning_days_before || 3}
              onChange={(e) => handleNumericUpdate('warning_days_before', parseInt(e.target.value))}
              disabled={saving}
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
              className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
              value={profile?.critical_days_before || 1}
              onChange={(e) => handleNumericUpdate('critical_days_before', parseInt(e.target.value))}
              disabled={saving}
            >
              <option value={0}>Day of expiration</option>
              <option value={1}>1 day before</option>
              <option value={2}>2 days before</option>
            </select>
          </div>
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