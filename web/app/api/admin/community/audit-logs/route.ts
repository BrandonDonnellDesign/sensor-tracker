import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get user from Supabase auth (uses cookies from middleware)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get audit logs with admin user information using a direct join
    const { data: logs, error } = await supabase
      .rpc('get_admin_audit_logs_with_user_info', { log_limit: 50 });

    if (error) {
      console.error('Error fetching audit logs with RPC:', error);
      
      // Fallback to manual approach
      const { data: fallbackLogs, error: fallbackError } = await supabase
        .from('admin_audit_log')
        .select(`
          id,
          action,
          resource_type,
          resource_id,
          details,
          created_at,
          admin_id
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fallbackError) {
        console.error('Error fetching audit logs:', fallbackError);
        return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
      }

      // Get admin information from profiles table
      const adminIds = [...new Set(fallbackLogs?.map(log => log.admin_id).filter((id): id is string => Boolean(id)) || [])];
      let adminInfo: Record<string, { email: string; username: string }> = {};

      if (adminIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name')
          .in('id', adminIds);

        if (profiles) {
          profiles.forEach(profile => {
            // Prioritize username, then full_name, then fallback
            let displayUsername = 'Unknown User';
            
            if (profile.username) {
              displayUsername = profile.username;
            } else if (profile.full_name) {
              displayUsername = profile.full_name;
            } else {
              displayUsername = `User-${profile.id.substring(0, 8)}`;
            }

            adminInfo[profile.id] = {
              email: 'No Email Field',
              username: displayUsername
            };
          });
        }

        // For any admin IDs that don't have profiles, create fallback entries
        adminIds.forEach(adminId => {
          if (!adminInfo[adminId]) {
            adminInfo[adminId] = {
              email: 'No Profile',
              username: `User-${adminId.substring(0, 8)}`
            };
          }
        });
      }

      // Transform fallback data
      const transformedLogs = fallbackLogs?.map((log: any) => {
        const admin = adminInfo[log.admin_id];
        const username = admin?.username || `User-${log.admin_id.substring(0, 8)}`;
        const displayName = `Admin: ${username}`;
        
        return {
          id: log.id,
          adminEmail: displayName,
          action: log.action,
          resourceType: log.resource_type,
          resourceId: log.resource_id,
          details: log.details,
          createdAt: log.created_at
        };
      }) || [];

      return NextResponse.json({ logs: transformedLogs });
    }

    // If RPC worked, transform the data
    const transformedLogs = logs?.map((log: any) => {
      // Prioritize username over email, and provide meaningful fallback
      let username = 'Unknown User';
      
      if (log.admin_username && log.admin_username !== 'No Email Set') {
        username = log.admin_username;
      } else if (log.admin_email && log.admin_email !== 'No Email Set') {
        username = log.admin_email.split('@')[0];
      } else if (log.admin_id) {
        username = `User-${log.admin_id.substring(0, 8)}`;
      }
      
      const displayName = `Admin: ${username}`;
      
      return {
        id: log.id,
        adminEmail: displayName,
        action: log.action,
        resourceType: log.resource_type,
        resourceId: log.resource_id,
        details: log.details,
        createdAt: log.created_at
      };
    }) || [];

    return NextResponse.json({ logs: transformedLogs });

  } catch (error) {
    console.error('Error in audit logs API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}