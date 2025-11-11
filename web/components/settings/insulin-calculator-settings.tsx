'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase-client';
import { Calculator, Save, RotateCcw, AlertTriangle, Info } from 'lucide-react';

interface InsulinCalculatorSettings {
  id?: string;
  user_id: string;
  insulin_to_carb: number;
  correction_factor: number;
  target_glucose: number;
  rapid_acting_duration: number;
  short_acting_duration: number;
}

interface InsulinCalculatorSettingsProps {
  onUpdate?: (success: boolean) => void;
}

export function InsulinCalculatorSettings({ onUpdate }: InsulinCalculatorSettingsProps) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<InsulinCalculatorSettings>({
    user_id: user?.id || '',
    insulin_to_carb: 15.0,
    correction_factor: 50.0,
    target_glucose: 100,
    rapid_acting_duration: 4.0,
    short_acting_duration: 6.0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadSettings();
    }
  }, [user?.id]);

  const loadSettings = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('user_calculator_settings' as any)
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const record = data as any;
        setSettings({
          id: record.id,
          user_id: record.user_id,
          insulin_to_carb: parseFloat(record.insulin_to_carb),
          correction_factor: parseFloat(record.correction_factor),
          target_glucose: record.target_glucose,
          rapid_acting_duration: parseFloat(record.rapid_acting_duration),
          short_acting_duration: parseFloat(record.short_acting_duration),
        });
      }
    } catch (err) {
      console.error('Error loading calculator settings:', err);
      setError('Failed to load calculator settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user?.id) return;

    try {
      setSaving(true);
      setError(null);
      const supabase = createClient();

      const settingsData = {
        user_id: user.id,
        insulin_to_carb: settings.insulin_to_carb,
        correction_factor: settings.correction_factor,
        target_glucose: settings.target_glucose,
        rapid_acting_duration: settings.rapid_acting_duration,
        short_acting_duration: settings.short_acting_duration,
      };

      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('user_calculator_settings' as any)
          .update(settingsData)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Create new settings
        const { data, error } = await supabase
          .from('user_calculator_settings' as any)
          .insert([settingsData])
          .select()
          .single();

        if (error) throw error;
        
        setSettings(prev => ({ ...prev, id: (data as any).id }));
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onUpdate?.(true);
    } catch (err) {
      console.error('Error saving calculator settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      onUpdate?.(false);
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setSettings(prev => ({
      ...prev,
      insulin_to_carb: 15.0,
      correction_factor: 50.0,
      target_glucose: 100,
      rapid_acting_duration: 4.0,
      short_acting_duration: 6.0,
    }));
  };

  const handleInputChange = (field: keyof InsulinCalculatorSettings, value: number) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-slate-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Calculator className="w-6 h-6 text-blue-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Insulin Calculator Settings
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Configure your personal insulin dosing parameters
            </p>
          </div>
        </div>
        <button
          onClick={resetToDefaults}
          className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset to Defaults</span>
        </button>
      </div>

      {/* Warning Notice */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800 dark:text-amber-200">
              Important Medical Notice
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              These settings should only be configured with guidance from your healthcare provider. 
              Incorrect insulin calculations can be dangerous. Always verify doses before administration.
            </p>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6 space-y-6">
        {/* Insulin to Carb Ratio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Insulin-to-Carb Ratio (I:C)
          </label>
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <input
                type="number"
                min="5"
                max="50"
                step="0.5"
                value={settings.insulin_to_carb}
                onChange={(e) => handleInputChange('insulin_to_carb', parseFloat(e.target.value) || 15)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
            <span className="text-sm text-gray-600 dark:text-slate-400">
              1 unit per {settings.insulin_to_carb}g carbs
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
            How many grams of carbohydrates are covered by 1 unit of insulin
          </p>
        </div>

        {/* Correction Factor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Correction Factor (ISF)
          </label>
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <input
                type="number"
                min="20"
                max="150"
                step="5"
                value={settings.correction_factor}
                onChange={(e) => handleInputChange('correction_factor', parseFloat(e.target.value) || 50)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
            <span className="text-sm text-gray-600 dark:text-slate-400">
              mg/dL per unit
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
            How much 1 unit of insulin lowers your blood glucose
          </p>
        </div>

        {/* Target Glucose */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Target Glucose Level
          </label>
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <input
                type="number"
                min="80"
                max="140"
                step="5"
                value={settings.target_glucose}
                onChange={(e) => handleInputChange('target_glucose', parseInt(e.target.value) || 100)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
            <span className="text-sm text-gray-600 dark:text-slate-400">
              mg/dL
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
            Your target blood glucose level for corrections
          </p>
        </div>

        {/* Insulin Duration Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Rapid-Acting Duration
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                min="2"
                max="8"
                step="0.5"
                value={settings.rapid_acting_duration}
                onChange={(e) => handleInputChange('rapid_acting_duration', parseFloat(e.target.value) || 4)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
              />
              <span className="text-sm text-gray-600 dark:text-slate-400">hours</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
              Duration of rapid-acting insulin (e.g., Humalog, Novolog)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Short-Acting Duration
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                min="4"
                max="12"
                step="0.5"
                value={settings.short_acting_duration}
                onChange={(e) => handleInputChange('short_acting_duration', parseFloat(e.target.value) || 6)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
              />
              <span className="text-sm text-gray-600 dark:text-slate-400">hours</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
              Duration of short-acting insulin (e.g., Regular)
            </p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-200">
              How These Settings Are Used
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
              <li>• <strong>I:C Ratio:</strong> Calculates insulin needed for carbohydrates in meals</li>
              <li>• <strong>Correction Factor:</strong> Calculates insulin needed to correct high glucose</li>
              <li>• <strong>Target Glucose:</strong> The goal level for correction calculations</li>
              <li>• <strong>Duration:</strong> Used for insulin-on-board (IOB) calculations</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Save className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-700 dark:text-green-300">
              Calculator settings saved successfully!
            </p>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>
    </div>
  );
}