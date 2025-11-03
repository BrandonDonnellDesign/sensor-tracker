'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { NotificationSettings } from '@/components/settings/notification-settings';
import { TimezoneSettings } from '@/components/settings/timezone-settings';
import { ExportSettings } from '@/components/settings/export-settings';
import { ProfileSettings } from '@/components/settings/profile-settings';
import { CgmIntegrations } from '@/components/settings/cgm-integrations';
import { ApiKeyManager } from '@/components/api/api-key-manager';
import { ApiShortcutCard } from '@/components/api/api-shortcut-card';
import { User, Bell, Settings, Link, BarChart3, Key } from 'lucide-react';

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
    if (tab && ['profile', 'notifications', 'preferences', 'integrations', 'export', 'api'].includes(tab)) {
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
          
          const defaultProfile: Profile = {
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

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'integrations', label: 'Integrations', icon: Link },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'export', label: 'Export Data', icon: BarChart3 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-gray-200 dark:border-slate-700">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Settings</h1>
        <p className="mt-2 text-gray-600 dark:text-slate-400">
          Manage your account preferences and data settings
        </p>
      </div>

      {/* Quick Actions */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => setActiveTab('api')}
            className="p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors text-left group"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-slate-100">API Keys</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">Manage programmatic access</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('integrations')}
            className="p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors text-left group"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                <Link className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-slate-100">Integrations</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">Connect external services</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className="p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors text-left group"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-slate-100">Export Data</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">Download your information</p>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-8">
        {activeTab === 'profile' && (
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
        )}
        {activeTab === 'notifications' && (
          <NotificationSettings 
            profile={profile} 
            onUpdate={updateProfile} 
          />
        )}
        {activeTab === 'preferences' && (
          <TimezoneSettings 
            profile={profile} 
            onUpdate={updateProfile} 
          />
        )}
        {activeTab === 'integrations' && (
          <CgmIntegrations />
        )}
        {activeTab === 'api' && (
          <div className="space-y-6">
            {/* API Documentation Link */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100">
                    API Documentation
                  </h3>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    Explore interactive API docs and test endpoints
                  </p>
                </div>
                <a
                  href="/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Open Docs
                </a>
              </div>
            </div>
            
            <ApiKeyManager />
          </div>
        )}
        {activeTab === 'export' && user?.id && (
          <ExportSettings 
            userId={user.id} 
          />
        )}
      </div>
    </div>
  );
}