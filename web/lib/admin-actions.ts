'use server';

import { createClient, User } from '@supabase/supabase-js';

// Create a service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export interface AdminUserData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  profile?: {
    full_name?: string;
    role?: string;
    updated_at?: string;
  };
  sensor_count?: number;
}

export async function getAdminUsers(): Promise<AdminUserData[]> {
  try {
    // Try to get all auth users (requires service role)
    let authUsers: any = null;
    
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { data, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      if (authError) {
        console.error('Error fetching auth users:', authError);
      } else {
        authUsers = data;
      }
    }
    
    // If we can't get auth users, fall back to profiles only
    if (!authUsers) {
      console.warn('Service role key not available, using profiles only');
      return await getFallbackUsers();
    }

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, created_at, updated_at');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Create a map of profiles
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Get sensor counts for all users
    const { data: sensorCounts, error: sensorError } = await supabaseAdmin
      .from('sensors')
      .select('user_id')
      .eq('is_deleted', false);

    if (sensorError) {
      console.error('Error fetching sensor counts:', sensorError);
    }

    // Count sensors per user
    const sensorCountMap = new Map<string, number>();
    sensorCounts?.forEach(sensor => {
      const count = sensorCountMap.get(sensor.user_id) || 0;
      sensorCountMap.set(sensor.user_id, count + 1);
    });

    // Combine auth users with profile data
    const users: AdminUserData[] = authUsers.users.map((authUser: User) => {
      const profile = profileMap.get(authUser.id);
      return {
        id: authUser.id,
        email: authUser.email || '',
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        profile: profile ? {
          full_name: profile.full_name,
          role: profile.role,
          updated_at: profile.updated_at
        } : undefined,
        sensor_count: sensorCountMap.get(authUser.id) || 0
      };
    });

    return users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Error in getAdminUsers:', error);
    return await getFallbackUsers();
  }
}

// Fallback function when service role is not available
async function getFallbackUsers(): Promise<AdminUserData[]> {
  try {
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return [];
    }

    // Get sensor counts
    const { data: sensorCounts, error: sensorError } = await supabaseAdmin
      .from('sensors')
      .select('user_id')
      .eq('is_deleted', false);

    const sensorCountMap = new Map<string, number>();
    sensorCounts?.forEach(sensor => {
      const count = sensorCountMap.get(sensor.user_id) || 0;
      sensorCountMap.set(sensor.user_id, count + 1);
    });

    // Create user data with placeholder emails
    const users: AdminUserData[] = (profiles || []).map(profile => ({
      id: profile.id,
      email: `user-${profile.id.slice(0, 8)}@example.com`, // Placeholder email
      created_at: profile.created_at,
      profile: {
        full_name: profile.full_name,
        role: profile.role,
        updated_at: profile.updated_at
      },
      sensor_count: sensorCountMap.get(profile.id) || 0
    }));

    return users;
  } catch (error) {
    console.error('Error in getFallbackUsers:', error);
    return [];
  }
}

export async function updateUserRole(userId: string, role: 'admin' | 'user'): Promise<{ success: boolean; error?: string }> {
  try {
    // Update or create profile with new role
    const { error } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        role: role,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error updating user role:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateUserRole:', error);
    return { success: false, error: 'Failed to update user role' };
  }
}

export async function updateUserProfile(
  userId: string, 
  updates: { full_name?: string; role?: 'admin' | 'user' }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        ...updates,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    return { success: false, error: 'Failed to update user profile' };
  }
}

export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete the user from auth (this will cascade to profiles due to foreign key)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error('Error deleting user:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteUser:', error);
    return { success: false, error: 'Failed to delete user' };
  }
}