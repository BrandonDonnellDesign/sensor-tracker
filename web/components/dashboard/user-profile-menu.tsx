'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { UserIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase-client';
import { Profile } from '@/types/profile';

export function UserProfileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const router = useRouter();
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setProfile(data as Profile);
        }
      };

      fetchProfile();
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) return null;

  // Use first letter of username or email for initials
  const userInitials = profile?.username
    ? profile.username.substring(0, 2).toUpperCase()
    : user.email?.charAt(0).toUpperCase() || '?';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 focus:outline-0 focus:ring-3 focus:ring-blue-500 dark:focus:ring-blue-400 rounded-xl p-2"
      >
        {profile?.avatar_url ? (
          <div className="relative h-8 w-8 rounded-full overflow-hidden">
            <Image
              src={profile.avatar_url}
              alt={profile.username || user.email || ''}
              fill
              sizes="32px"
              className="object-cover"
              priority
            />
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
            <span className="text-sm font-medium text-white">
              {userInitials}
            </span>
          </div>
        )}
        <div className="hidden lg:block flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
            {profile?.username || user.email}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            {profile?.full_name || 'CGM User'}
          </p>
        </div>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-slate-800 shadow-lg ring-3 ring-black/5 dark:ring-white/10 z-50 p-3">
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 mb-2">
              <div className="flex items-center space-x-3">
                {profile?.avatar_url ? (
                  <div className="relative h-10 w-10 rounded-full overflow-hidden">
                    <Image
                      src={profile.avatar_url}
                      alt={profile.username || user.email || ''}
                      fill
                      sizes="40px"
                      className="object-cover"
                      priority
                    />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                    <span className="text-sm font-medium text-white">
                      {userInitials}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                    {profile?.username || user.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {profile?.full_name || 'CGM User'}
                  </p>
                </div>
              </div>
            </div>
              
            <div className="space-y-1">
              <Link
                href="/dashboard/settings"
                className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors duration-200"
                onClick={() => setIsOpen(false)}
              >
                <UserIcon className="h-4 w-4 mr-3" />
                Settings
              </Link>

              <div className="h-px bg-gray-100 dark:bg-slate-700 my-2" />

              <button
                onClick={handleSignOut}
                className="flex w-full items-center px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}