'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase';

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAdminAccess() {
      // If not logged in, redirect immediately
      if (!user) {
        router.push('/auth/login');
        return;
      }

      try {
        // Check if user has admin role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          router.push('/dashboard');
          return;
        }

        // Check admin status
        const hasAdminRole = (profile as any)?.role === 'admin';
        const isKnownAdminEmail = user.email === 'bmdonnell@gmail.com';

        if (hasAdminRole || isKnownAdminEmail) {
          setIsAdmin(true);
        } else {
          router.push('/dashboard');
          return;
        }
      } catch (err) {
        router.push('/dashboard');
        return;
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      checkAdminAccess();
    }
  }, [user, authLoading, router]);

  // Show loading while checking auth or redirect in progress
  if (authLoading || loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}