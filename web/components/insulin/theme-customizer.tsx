'use client';

import { useState, useEffect } from 'react';
import { Palette, Sun, Moon, Monitor, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  accentColor: string;
  density: 'compact' | 'comfortable' | 'spacious';
}

const COLOR_THEMES = [
  { name: 'Blue', primary: 'blue', accent: 'indigo', colors: ['#3b82f6', '#6366f1'] },
  { name: 'Purple', primary: 'purple', accent: 'violet', colors: ['#8b5cf6', '#7c3aed'] },
  { name: 'Green', primary: 'green', accent: 'emerald', colors: ['#10b981', '#059669'] },
  { name: 'Orange', primary: 'orange', accent: 'amber', colors: ['#f97316', '#f59e0b'] },
  { name: 'Pink', primary: 'pink', accent: 'rose', colors: ['#ec4899', '#f43f5e'] },
  { name: 'Teal', primary: 'teal', accent: 'cyan', colors: ['#14b8a6', '#06b6d4'] },
];

interface ThemeCustomizerProps {
  className?: string;
}

export function ThemeCustomizer({ className = '' }: ThemeCustomizerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeConfig>({
    mode: 'system',
    primaryColor: 'blue',
    accentColor: 'indigo',
    density: 'comfortable'
  });

  useEffect(() => {
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('insulin-theme');
    if (savedTheme) {
      try {
        setTheme(JSON.parse(savedTheme));
      } catch (error) {
        console.error('Error loading saved theme:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Apply theme to document
    applyTheme(theme);
    
    // Save theme to localStorage
    localStorage.setItem('insulin-theme', JSON.stringify(theme));
  }, [theme]);

  const applyTheme = (config: ThemeConfig) => {
    const root = document.documentElement;
    
    // Apply color mode
    if (config.mode === 'dark') {
      root.classList.add('dark');
    } else if (config.mode === 'light') {
      root.classList.remove('dark');
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
    
    // Apply density
    root.classList.remove('density-compact', 'density-comfortable', 'density-spacious');
    root.classList.add(`density-${config.density}`);
    
    // Apply custom CSS properties for colors
    const selectedTheme = COLOR_THEMES.find(t => t.primary === config.primaryColor);
    if (selectedTheme) {
      root.style.setProperty('--primary-color', selectedTheme.colors[0]);
      root.style.setProperty('--accent-color', selectedTheme.colors[1]);
    }
  };

  const updateTheme = (updates: Partial<ThemeConfig>) => {
    setTheme(prev => ({ ...prev, ...updates }));
  };

  if (!isOpen) {
    return (
      <div className={className}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="text-xs"
        >
          <Palette className="h-3 w-3 mr-1" />
          Customize Theme
        </Button>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg">
            <Palette className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Theme Customization
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Personalize your insulin tracking experience
            </p>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="text-xs"
        >
          Done
        </Button>
      </div>

      {/* Color Mode */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-3">
          Appearance
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {[
            { mode: 'light' as const, icon: Sun, label: 'Light' },
            { mode: 'dark' as const, icon: Moon, label: 'Dark' },
            { mode: 'system' as const, icon: Monitor, label: 'System' }
          ].map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => updateTheme({ mode })}
              className={`flex flex-col items-center p-3 rounded-lg border transition-all ${
                theme.mode === mode
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
              }`}
            >
              <Icon className={`h-5 w-5 mb-1 ${
                theme.mode === mode ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-slate-400'
              }`} />
              <span className={`text-xs ${
                theme.mode === mode ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-slate-400'
              }`}>
                {label}
              </span>
              {theme.mode === mode && (
                <Check className="h-3 w-3 text-blue-600 dark:text-blue-400 mt-1" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Color Themes */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-3">
          Color Theme
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {COLOR_THEMES.map((colorTheme) => (
            <button
              key={colorTheme.name}
              onClick={() => updateTheme({ 
                primaryColor: colorTheme.primary, 
                accentColor: colorTheme.accent 
              })}
              className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                theme.primaryColor === colorTheme.primary
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
              }`}
            >
              <div className="flex space-x-1">
                {colorTheme.colors.map((color, index) => (
                  <div
                    key={index}
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className={`text-sm ${
                theme.primaryColor === colorTheme.primary 
                  ? 'text-blue-600 dark:text-blue-400 font-medium' 
                  : 'text-gray-700 dark:text-slate-300'
              }`}>
                {colorTheme.name}
              </span>
              {theme.primaryColor === colorTheme.primary && (
                <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 ml-auto" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Density */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-3">
          Layout Density
        </h4>
        <div className="space-y-2">
          {[
            { density: 'compact' as const, label: 'Compact', description: 'More content, less spacing' },
            { density: 'comfortable' as const, label: 'Comfortable', description: 'Balanced spacing (recommended)' },
            { density: 'spacious' as const, label: 'Spacious', description: 'More spacing, easier to read' }
          ].map(({ density, label, description }) => (
            <button
              key={density}
              onClick={() => updateTheme({ density })}
              className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                theme.density === density
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
              }`}
            >
              <div>
                <div className={`text-sm font-medium ${
                  theme.density === density ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-slate-100'
                }`}>
                  {label}
                </div>
                <div className={`text-xs ${
                  theme.density === density ? 'text-blue-500 dark:text-blue-300' : 'text-gray-500 dark:text-slate-500'
                }`}>
                  {description}
                </div>
              </div>
              {theme.density === density && (
                <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="border-t border-gray-200 dark:border-slate-600 pt-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-3">
          Preview
        </h4>
        <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 space-y-3">
          <div className="flex items-center space-x-3">
            <div 
              className="w-8 h-8 rounded-lg"
              style={{ backgroundColor: COLOR_THEMES.find(t => t.primary === theme.primaryColor)?.colors[0] }}
            />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                Sample Card Title
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-500">
                This is how your content will look
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <div 
              className="px-3 py-1 rounded text-xs text-white"
              style={{ backgroundColor: COLOR_THEMES.find(t => t.primary === theme.primaryColor)?.colors[0] }}
            >
              Primary Button
            </div>
            <div 
              className="px-3 py-1 rounded text-xs text-white"
              style={{ backgroundColor: COLOR_THEMES.find(t => t.primary === theme.primaryColor)?.colors[1] }}
            >
              Accent Button
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}