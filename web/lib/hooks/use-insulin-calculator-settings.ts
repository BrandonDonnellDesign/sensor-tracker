import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase-client';

export interface InsulinCalculatorSettings {
  id?: string;
  user_id: string;
  insulin_to_carb: number;
  correction_factor: number;
  target_glucose: number;
  rapid_acting_duration: number;
  short_acting_duration: number;
}

const DEFAULT_SETTINGS: Omit<InsulinCalculatorSettings, 'user_id'> = {
  insulin_to_carb: 15.0,
  correction_factor: 50.0,
  target_glucose: 100,
  rapid_acting_duration: 4.0,
  short_acting_duration: 6.0,
};

export function useInsulinCalculatorSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<InsulinCalculatorSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadSettings();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const loadSettings = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
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
      } else {
        // No settings found, use defaults
        setSettings({
          user_id: user.id,
          ...DEFAULT_SETTINGS,
        });
      }
    } catch (err) {
      console.error('Error loading calculator settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
      
      // Fallback to defaults on error
      if (user?.id) {
        setSettings({
          user_id: user.id,
          ...DEFAULT_SETTINGS,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<InsulinCalculatorSettings>) => {
    if (!user?.id || !settings) return { success: false, error: 'No user or settings' };

    try {
      const supabase = createClient();
      const updatedSettings = { ...settings, ...updates };

      const settingsData = {
        user_id: user.id,
        insulin_to_carb: updatedSettings.insulin_to_carb,
        correction_factor: updatedSettings.correction_factor,
        target_glucose: updatedSettings.target_glucose,
        rapid_acting_duration: updatedSettings.rapid_acting_duration,
        short_acting_duration: updatedSettings.short_acting_duration,
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
        
        updatedSettings.id = (data as any).id;
      }

      setSettings(updatedSettings);
      return { success: true };
    } catch (err) {
      console.error('Error updating calculator settings:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to update settings' 
      };
    }
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
    refreshSettings: loadSettings,
  };
}

// Utility functions for insulin calculations
export const calculateInsulinForCarbs = (carbs: number, insulinToCarbRatio: number): number => {
  return Math.round((carbs / insulinToCarbRatio) * 10) / 10;
};

export const calculateCorrectionInsulin = (
  currentGlucose: number, 
  targetGlucose: number, 
  correctionFactor: number
): number => {
  const correction = (currentGlucose - targetGlucose) / correctionFactor;
  return Math.max(0, Math.round(correction * 10) / 10);
};

export const calculateTotalInsulin = (
  carbs: number,
  currentGlucose: number,
  settings: InsulinCalculatorSettings
): {
  carbInsulin: number;
  correctionInsulin: number;
  totalInsulin: number;
} => {
  const carbInsulin = calculateInsulinForCarbs(carbs, settings.insulin_to_carb);
  const correctionInsulin = calculateCorrectionInsulin(
    currentGlucose,
    settings.target_glucose,
    settings.correction_factor
  );
  
  return {
    carbInsulin,
    correctionInsulin,
    totalInsulin: Math.round((carbInsulin + correctionInsulin) * 10) / 10,
  };
};