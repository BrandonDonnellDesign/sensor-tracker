import { createClient } from '@/lib/supabase-server';
import { User } from '@supabase/supabase-js';

/**
 * Get the current authenticated user from the server-side Supabase client
 * This function should be used in API routes and server components
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting current user:', error);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return null;
  }
}

/**
 * Get the current user's profile information
 */
export async function getCurrentUserProfile() {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error getting user profile:', error);
      return null;
    }

    return profile;
  } catch (error) {
    console.error('Error in getCurrentUserProfile:', error);
    return null;
  }
}

/**
 * Check if the current user is an admin
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const profile = await getCurrentUserProfile();
    return profile?.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Require authentication - throws error if user is not authenticated
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

/**
 * Require admin access - throws error if user is not an admin
 */
export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  const isAdmin = await isCurrentUserAdmin();
  
  if (!isAdmin) {
    throw new Error('Admin access required');
  }
  
  return user;
}