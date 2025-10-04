'use client';

import { useState, useEffect } from 'react';
import { Profile } from '@/types/profile';
import { timezones } from '@/constants/timezones';

interface TimezoneSettingsProps {
  profile: Profile | null;
  onUpdate: (updates: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
}

export function TimezoneSettings({ profile, onUpdate }: TimezoneSettingsProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Local state to handle immediate UI updates
  const [localSettings, setLocalSettings] = useState({
    timezone: '',
    date_format: '',
    time_format: '',
    glucose_unit: ''
  });

  // Sync local state with profile when it changes
  useEffect(() => {
    if (profile) {
      setLocalSettings({
        timezone: profile.timezone || 'America/New_York',
        date_format: profile.date_format || 'MM/DD/YYYY',
        time_format: profile.time_format || '12',
        glucose_unit: profile.glucose_unit || 'mg/dL'
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
          glucose_unit: profile.glucose_unit || 'mg/dL'
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