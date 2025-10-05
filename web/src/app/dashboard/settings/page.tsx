'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { NotificationSettings } from '@/components/settings/notification-settings';
import { TimezoneSettings } from '@/components/settings/timezone-settings';
import { ExportSettings } from '@/components/settings/export-settings';
import { ProfileSettings } from '@/components/settings/profile-settings';
import { DexcomIntegrationComingSoon } from '@/components/settings/dexcom-integration-coming-soon';
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
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setProfile(data as Profile);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user?.id) return { success: false, error: 'User not found' };
    
    try {
      const { data: updateData, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select();

      if (error) {
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
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
    { id: 'integrations', label: 'Integrations', icon: '🔗' },
    { id: 'export', label: 'Export Data', icon: '📊' },
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
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
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
          <DexcomIntegrationComingSoon />
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