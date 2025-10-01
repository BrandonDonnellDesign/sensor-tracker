'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import EditProfileForm from '@/components/profile/edit-profile-form';
import Image from 'next/image';
import { Profile } from '@/types/profile';

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data as Profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile information');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    fetchProfile();
  }, [user, router, fetchProfile]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-slate-700 pb-5">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Profile Settings</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Update your profile information and preferences
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-400" />
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      ) : profile ? (
        isEditing ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
            <EditProfileForm
              profile={profile}
              onClose={() => setIsEditing(false)}
              onUpdate={() => {
                fetchProfile();
                setIsEditing(false);
              }}
            />
          </div>
        ) : (
          <>
            {/* Profile Avatar Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center space-x-4">
                <div className="relative w-20 h-20">
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.full_name || 'User avatar'}
                      width={80}
                      height={80}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-semibold text-white">
                        {profile.full_name?.charAt(0).toUpperCase() ||
                          user.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">
                    {profile.full_name || 'Set your name'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Profile Information Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm divide-y divide-gray-200 dark:divide-slate-700">
              {/* Basic Information */}
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">
                  Basic Information
                </h3>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">
                      Full Name
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-slate-100">
                      {profile.full_name || 'Not set'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">
                      Username
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-slate-100">
                      {profile.username || 'Not set'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-slate-100">{user.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">
                      Timezone
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-slate-100">
                      {profile.timezone || 'Not set'}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Preferences */}
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">
                  Preferences
                </h3>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">
                      Glucose Unit
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-slate-100">
                      {profile.glucose_unit}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">
                      Notifications
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-slate-100">
                      {profile.notifications_enabled ? 'Enabled' : 'Disabled'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">
                      Dark Mode
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-slate-100">
                      {profile.dark_mode_enabled ? 'Enabled' : 'Disabled'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Edit Button */}
            <div className="flex justify-end">
              <button
                type="button"
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors duration-200"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </button>
            </div>
          </>
        )
      ) : null}
    </div>
  );
}