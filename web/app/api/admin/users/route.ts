import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { systemLogger } from '@/lib/system-logger';

// Create a service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function checkAdminAccess(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No authorization header found');
      return false;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the JWT token using the admin client
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      console.log('Invalid token or no user:', error?.message);
      return false;
    }

    console.log('User found:', user.id);

    // Check if user has admin role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error checking admin role:', profileError);
      return false;
    }

    console.log('User role:', profile?.role);
    return profile?.role === 'admin';
  } catch (error) {
    console.error('Error in checkAdminAccess:', error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const isAdmin = await checkAdminAccess(request);
    if (!isAdmin) {
      await systemLogger.warn('users', 'Non-admin attempted to access user management');
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Get all auth users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
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
    const users = authUsers.users.map(authUser => {
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

    const sortedUsers = users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    await systemLogger.info('users', 'Admin fetched user list', undefined, { userCount: sortedUsers.length });
    return NextResponse.json({ users: sortedUsers });
  } catch (error) {
    console.error('Error in GET /api/admin/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Check if user is admin
    const isAdmin = await checkAdminAccess(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { userId, updates } = await request.json();

    if (!userId || !updates) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update or create profile with new data
    const { error } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        ...updates,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error updating user profile:', error);
      await systemLogger.error('users', `Admin failed to update user profile: ${error.message}`, userId);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await systemLogger.info('users', 'Admin updated user profile', userId, { updates });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PATCH /api/admin/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check if user is admin
    const isAdmin = await checkAdminAccess(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Delete the user from auth (this will cascade to profiles due to foreign key)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error('Error deleting user:', error);
      await systemLogger.error('users', `Admin failed to delete user: ${error.message}`, userId);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await systemLogger.warn('users', 'Admin deleted user account', userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}