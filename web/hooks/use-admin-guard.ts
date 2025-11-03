import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase-client';

interface AdminGuardState {
  loading: boolean;
  isAdmin: boolean;
  error: string | null;
}

export function useAdminGuard() {
  const { user } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<AdminGuardState>({
    loading: true,
    isAdmin: false,
    error: null,
  });

  useEffect(() => {
    const checkAdminAccess = async () => {
      console.log('🔒 Admin guard: Checking access for user:', user?.email);
      
      if (!user) {
        console.log('❌ Admin guard: No user, redirecting to login');
        router.push('/auth/login?redirectTo=' + window.location.pathname);
        return;
      }

      try {
        const supabase = createClient();
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        console.log('👑 Admin guard: Profile check:', { 
          hasProfile: !!profile, 
          role: profile?.role, 
          error: error?.message 
        });

        if (error) {
          if (error.code === 'PGRST116') {
            // Profile doesn't exist
            setState({
              loading: false,
              isAdmin: false,
              error: 'No profile found. Please create your profile first or contact an administrator.',
            });
          } else {
            setState({
              loading: false,
              isAdmin: false,
              error: `Database error: ${error.message}`,
            });
          }
          return;
        }

        if (!profile || profile.role !== 'admin') {
          console.log('❌ Admin guard: Not an admin, showing error');
          setState({
            loading: false,
            isAdmin: false,
            error: 'Admin access required. You do not have permission to access this page.',
          });
          return;
        }

        console.log('✅ Admin guard: Access granted');
        setState({
          loading: false,
          isAdmin: true,
          error: null,
        });
      } catch (error) {
        console.error('🚨 Admin guard: Exception:', error);
        setState({
          loading: false,
          isAdmin: false,
          error: 'Failed to verify admin access. Please try again.',
        });
      }
    };

    checkAdminAccess();
  }, [user, router]);

  return state;
}