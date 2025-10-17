'use client';

import { useEffect, useState } from 'react';
import { AdminGuard } from '@/components/admin/admin-guard';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase';

export default function DebugUserPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        console.log('User profile:', profile);
        console.log('Profile error:', error);
        setProfile(profile);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [user]);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!user) {
    return <div className="p-8">Not logged in</div>;
  }

  return (
    <AdminGuard>
      <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">User Debug Info</h1>
      
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border">
          <h2 className="text-lg font-semibold mb-4">Auth User</h2>
          <pre className="bg-gray-100 dark:bg-slate-700 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border">
          <h2 className="text-lg font-semibold mb-4">Profile Data</h2>
          <pre className="bg-gray-100 dark:bg-slate-700 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border">
          <h2 className="text-lg font-semibold mb-4">Admin Status</h2>
          <p className="text-lg">
            <strong>Is Admin:</strong> {profile?.role === 'admin' ? '✅ Yes' : '❌ No'}
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-2">
            Current role: {profile?.role || 'No role set'}
          </p>
        </div>

        {profile?.role !== 'admin' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              Not an Admin
            </h3>
            <p className="text-yellow-700 dark:text-yellow-300 mb-4">
              Your profile doesn&apos;t have admin role. You need to update your profile to have role = &apos;admin&apos;.
            </p>
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              You can do this manually in your database or ask an existing admin to promote you.
            </p>
          </div>
        )}
      </div>
      </div>
    </AdminGuard>
  );
}