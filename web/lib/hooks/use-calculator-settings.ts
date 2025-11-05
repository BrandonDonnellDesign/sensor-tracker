'use client';

import { useState, useEffect } from 'react';

export interface CalculatorSettings {
  insulinToCarb: number; // units per gram (e.g., 15 = 1 unit per 15g carbs)
  correctionFactor: number; // mg/dL per unit (e.g., 50 = 1 unit lowers glucose by 50 mg/dL)
  targetGlucose: number; // mg/dL
  rapidActingDuration: number; // hours
  shortActingDuration: number; // hours
}

const DEFAULT_SETTINGS: CalculatorSettings = {
  insulinToCarb: 15,
  correctionFactor: 50,
  targetGlucose: 100,
  rapidActingDuration: 4,
  shortActingDuration: 6
};

const STORAGE_KEY = 'insulin-calculator-settings';

interface UseCalculatorSettingsReturn {
  settings: CalculatorSettings;
  updateSettings: (newSettings: Partial<CalculatorSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  saveToProfile: () => Promise<boolean>;
  loadFromProfile: () => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

export function useCalculatorSettings(): UseCalculatorSettingsReturn {
  const [settings, setSettings] = useState<CalculatorSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load settings from database on mount
  useEffect(() => {
    loadFromDatabase();
  }, []);

  // Function to load settings from database
  const loadFromDatabase = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Loading settings from database...');
      const response = await fetch('/api/profile/calculator-settings');
      
      if (response.ok) {
        const profileSettings = await response.json();
        console.log('Loaded settings from database:', profileSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...profileSettings });
        
        // Also save to localStorage as backup
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, ...profileSettings }));
      } else if (response.status === 404) {
        console.log('No settings found in database, using defaults');
        // Save defaults to database for future use
        await saveToDatabase(DEFAULT_SETTINGS);
      } else {
        throw new Error('Failed to load settings from database');
      }
    } catch (err) {
      console.error('Error loading settings from database:', err);
      setError('Failed to load settings from database');
      
      // Fallback to localStorage if database fails
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsedSettings = JSON.parse(stored);
          console.log('Fallback to localStorage:', parsedSettings);
          setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
        }
      } catch (localErr) {
        console.error('Error loading from localStorage fallback:', localErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to save settings to database
  const saveToDatabase = async (settingsToSave: CalculatorSettings) => {
    try {
      console.log('Saving settings to database:', settingsToSave);
      const response = await fetch('/api/profile/calculator-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsToSave),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings to database');
      }

      console.log('Settings saved to database successfully');
      
      // Also save to localStorage as backup
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
      
      return true;
    } catch (err) {
      console.error('Error saving settings to database:', err);
      setError('Failed to save settings to database');
      return false;
    }
  };

  const updateSettings = async (newSettings: Partial<CalculatorSettings>) => {
    console.log('Updating settings from:', settings, 'to:', newSettings);
    const updated = { ...settings, ...newSettings };
    console.log('Updated settings:', updated);
    
    // Update state immediately for responsive UI
    setSettings(updated);
    
    // Save to database in background
    await saveToDatabase(updated);
  };

  const resetSettings = async () => {
    console.log('Resetting settings to defaults');
    setSettings(DEFAULT_SETTINGS);
    await saveToDatabase(DEFAULT_SETTINGS);
  };

  const saveToProfile = async (): Promise<boolean> => {
    // This now just triggers a manual save (settings are auto-saved)
    return await saveToDatabase(settings);
  };

  const loadFromProfile = async (): Promise<boolean> => {
    // This now reloads from database
    await loadFromDatabase();
    return true;
  };

  return {
    settings,
    updateSettings,
    resetSettings,
    saveToProfile,
    loadFromProfile,
    isLoading,
    error
  };
}