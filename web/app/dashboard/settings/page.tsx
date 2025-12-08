'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/providers/auth-provider';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { NotificationSettings } from '@/components/settings/notification-settings';
import { TimezoneSettings } from '@/components/settings/timezone-settings';
import { ExportSettings } from '@/components/settings/export-settings';
import { ProfileSettings } from '@/components/settings/profile-settings';
import { CgmIntegrations } from '@/components/settings/cgm-integrations';
import { InsulinCalculatorSettings } from '@/components/settings/insulin-calculator-settings';
import { ApiKeyManager } from '@/components/api/api-key-manager';
import { ApiShortcutCard } from '@/components/api/api-shortcut-card';
import { User, Bell, Settings, Link, BarChart3, Key, Calculator } from 'lucide-react';

import { Profile } from '@/types/profile';
import { dateTimeFormatter } from '@/utils/date-formatter';

export default function SettingsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    // Check for URL parameters to set initial tab
    const tab = searchParams.get('tab');
    if (tab && ['profile', 'notifications', 'preferences', 'calculator', 'integrations', 'export', 'api'].includes(tab)) {
      setActiveTab(tab);
    }


  }, [searchParams]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      
      try {
        // First try to get existing profile
        const supabase = createClient();
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code === 'PGRST116') {
          // Profile doesn't exist, create a basic one with default values
          
          const defaultProfile: any = {
            id: user.id,
            username: user.user_metadata?.username || user.email?.split('@')[0] || null,
            full_name: user.user_metadata?.full_name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
            email: user.email || '',
            timezone: 'UTC',
            notifications_enabled: true,
            dark_mode_enabled: false,
            glucose_unit: 'mg/dL',
            push_notifications_enabled: true,
            in_app_notifications_enabled: true,
            warning_days_before: 2,
            critical_days_before: 1,
            date_format: 'MM/dd/yyyy',
            time_format: '12h',
            notification_preferences: {},
            preferred_achievement_id: null,
            preferred_achievement_tracking: null,
            role: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_sync_at: null
          };
          
          setProfile(defaultProfile);
        } else if (error) {
          return;
        } else {
          setProfile(data as Profile);
        }
      } catch (error) {
        // Error loading profile
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user?.id) return { success: false, error: 'User not found' };
    
    try {
      const supabase = createClient();
      // First try to update
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it first
        const newProfile = {
          id: user.id,
          username: user.user_metadata?.username || user.email?.split('@')[0] || null,
          full_name: user.user_metadata?.full_name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
          timezone: 'UTC',
          notifications_enabled: true,
          dark_mode_enabled: false,
          glucose_unit: 'mg/dL' as const,
          push_notifications_enabled: true,
          in_app_notifications_enabled: true,
          warning_days_before: 2,
          critical_days_before: 1,
          date_format: 'MM/dd/yyyy',
          time_format: '12h',
          preferred_achievement_tracking: 'all',
          preferred_achievement_id: null,
          role: 'user' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_sync_at: null,
          ...updates // Apply the updates on top of defaults
        };

        const { data: createData, error: createError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select();

        if (createError) {
          throw createError;
        }

        // Update local state with created profile
        const createdProfile = createData[0] as Profile;
        setProfile(createdProfile);
        dateTimeFormatter.setProfile(createdProfile);
        return { success: true };
      } else if (error) {
        throw error;
      }
      
      // Reload the profile from database to ensure we have the latest data
      const { data: freshProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        // Still update local state even if reload fails
        const updatedProfile = profile ? { ...profile, ...updates } : null;
        setProfile(updatedProfile);
        if (updatedProfile) {
          dateTimeFormatter.setProfile(updatedProfile);
        }
      } else {
        // Use fresh data from database
        setProfile(freshProfile as Profile);
        dateTimeFormatter.setProfile(freshProfile as Profile);
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Update failed' };
    }
  };

  const [isLoading, setIsLoading] = useState(false);

  // Simulate loading effect when changing tabs
  useEffect(() => {
    if (activeTab) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User, description: 'Personal info' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Alert settings' },
    { id: 'preferences', label: 'Preferences', icon: Settings, description: 'App preferences' },
    { id: 'calculator', label: 'Insulin Calculator', icon: Calculator, description: 'Dosing settings' },
    { id: 'integrations', label: 'Integrations', icon: Link, description: 'Connected services' },
    { id: 'api', label: 'API Keys', icon: Key, description: 'Developer access' },
    { id: 'export', label: 'Export Data', icon: BarChart3, description: 'Download data' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-8">
            <ProfileSettings 
              profile={profile} 
              onUpdate={updateProfile} 
            />
            
            {/* API Integration Shortcut */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">
                Developer Tools
              </h3>
              <ApiShortcutCard variant="compact" />
            </div>
          </div>
        );
      case 'notifications':
        return <NotificationSettings profile={profile} onUpdate={updateProfile} />;
      case 'preferences':
        return <TimezoneSettings profile={profile} onUpdate={updateProfile} />;
      case 'calculator':
        return <InsulinCalculatorSettings />;
      case 'integrations':
        return <CgmIntegrations />;
      case 'api':
        return (
          <div className="space-y-6">
            {/* API Documentation Link */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100">
                    📚 API Documentation
                  </h3>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    Interactive Swagger UI - Test endpoints, view schemas, and explore the API
                  </p>
                </div>
                <a
                  href="/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Open Swagger UI
                </a>
              </div>
            </div>
            
            <ApiKeyManager />
          </div>
        );
      case 'export':
        return user?.id ? <ExportSettings userId={user.id} /> : null;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Settings className="w-8 h-8" />
          Settings
        </h1>
        <p className="text-slate-400 mt-2">
          Manage your account preferences and data settings
        </p>
      </div>

      {/* Tabs Container */}
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Sidebar navigation */}
        <div className="sm:w-64 flex sm:flex-col gap-2 rounded-xl bg-gray-900/30 backdrop-filter backdrop-blur-lg p-2 border border-gray-800">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative group flex items-center w-full px-4 py-3 transition-all rounded-lg ${
                  activeTab === tab.id
                    ? 'text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {/* Background highlight for active tab */}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="settingsTabBackground"
                    className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}

                {/* Tab content with icon and text */}
                <div className="flex items-center gap-3 z-10 flex-1">
                  <Icon className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">{tab.label}</div>
                    <div className="text-xs opacity-70">{tab.description}</div>
                  </div>
                </div>

                {/* Small dot indicator */}
                {activeTab === tab.id ? (
                  <motion.div
                    layoutId="settingsActiveDot"
                    className="w-2 h-2 rounded-full bg-white z-10"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 }}
                  />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-600/0 group-hover:bg-gray-600/30 transition-colors" />
                )}
              </button>
            );
          })}
        </div>

        {/* Content area */}
        <div className="flex-1 relative rounded-xl overflow-hidden">
          {/* Loading overlay */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                key="loader"
                className="absolute inset-0 z-20 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <svg
                  className="animate-spin h-8 w-8 text-indigo-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab content with animations */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}