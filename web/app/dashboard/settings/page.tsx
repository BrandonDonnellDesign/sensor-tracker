'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { NotificationSettings } from '@/components/settings/notification-settings';
import { TimezoneSettings } from '@/components/settings/timezone-settings';
import { ExportSettings } from '@/components/settings/export-settings';
import { ProfileSettings } from '@/components/settings/profile-settings';
import { CgmIntegrations } from '@/components/settings/cgm-integrations';
import { User, Bell, Settings, Link, BarChart3 } from 'lucide-react';

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
    if (tab && ['profile', 'notifications', 'preferences', 'integrations', 'export'].includes(tab)) {
      setActiveTab(tab);
    }


  }, [searchParams]);

  useEffect(() => {
    const loadProfile = async () => {
      console.log('loadProfile called, user:', user?.id);
      if (!user?.id) {
        console.log('No user ID, skipping profile load');
        setLoading(false);
        return;
      }
      
      try {
        console.log('Attempting to fetch profile for user:', user.id);
        
        // First try to get existing profile
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        console.log('Database query result:', { data, error });

        if (error && error.code === 'PGRST116') {
          // Profile doesn't exist, create a basic one with default values
          console.log('Profile not found, creating default profile for user:', user.id);
          
          const defaultProfile: Profile = {
            id: user.id,
            username: user.user_metadata?.username || user.email?.split('@')[0] || null,
            full_name: user.user_metadata?.full_name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
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
            preferred_achievement_tracking: 'all',
            preferred_achievement_id: null,
            role: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_sync_at: null
          };
          
          console.log('Using default profile:', defaultProfile);
          setProfile(defaultProfile);
        } else if (error) {
          console.error('Error fetching profile:', error);
          return;
        } else {
          console.log('Profile loaded successfully:', data);
          setProfile(data as Profile);
        }
      } catch (error) {
        console.error('Error in loadProfile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user?.id) return { success: false, error: 'User not found' };
    
    try {
      
      // First try to update
      const { data: updateData, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it first
        console.log('Profile not found during update, creating it first');
        
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
          console.error('Error creating profile during update:', createError);
          throw createError;
        }

        // Update local state with created profile
        const createdProfile = createData[0] as Profile;
        setProfile(createdProfile);
        dateTimeFormatter.setProfile(createdProfile);
        return { success: true };
      } else if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }
      
      // Reload the profile from database to ensure we have the latest data
      const { data: freshProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        console.error('Error reloading profile:', fetchError);
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
      console.error('Error updating profile:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Update failed' };
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'integrations', label: 'Integrations', icon: Link },
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
          <ProfileSettings 
            profile={profile} 
            onUpdate={updateProfile} 
          />
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
        {activeTab === 'export' && (
          <ExportSettings 
            userId={user?.id} 
          />
        )}
      </div>
    </div>
  );
}