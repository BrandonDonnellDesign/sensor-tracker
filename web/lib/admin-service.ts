import { supabase } from '@/lib/supabase';

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalSensors: number;
  activeSensors: number;
  problematicSensors: number;
  totalAchievements: number;
  systemUptime: number;
  roadmapProgress: number;
  recentSignups: number;
  avgSensorsPerUser: number;
}

export interface RecentActivity {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  type: 'user' | 'sensor' | 'system' | 'roadmap' | 'achievement' | 'dexcom' | 'notifications' | 'photos' | 'ocr';
  user_email?: string;
  user_hash?: string;
}

/**
 * Get empty stats object for fallback
 */
function getEmptyStats(): AdminStats {
  return {
    totalUsers: 0,
    activeUsers: 0,
    totalSensors: 0,
    activeSensors: 0,
    problematicSensors: 0,
    totalAchievements: 0,
    systemUptime: 99.9,
    roadmapProgress: 0,
    recentSignups: 0,
    avgSensorsPerUser: 0
  };
}

/**
 * Fetch comprehensive admin statistics
 */
export async function fetchAdminStats(): Promise<AdminStats> {
  try {
    // Check if user is admin first
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      console.warn('Non-admin user attempting to fetch admin stats');
      return getEmptyStats();
    }

    // Fetch user statistics with admin privileges
    // Note: email is in auth.users, other data in profiles
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, created_at, updated_at, full_name')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Error fetching users:', usersError);
      // Continue with empty user data rather than failing completely
    }

    // Fetch sensor statistics
    const { data: sensors, error: sensorsError } = await supabase
      .from('sensors')
      .select(`
        id,
        date_added,
        is_problematic,
        archived_at,
        is_deleted,
        sensor_models (
          duration_days
        )
      `)
      .eq('is_deleted', false)
      .order('date_added', { ascending: false });

    if (sensorsError) {
      console.error('Error fetching sensors:', sensorsError);
      // Continue with empty sensor data
    }

    // Fetch gamification statistics
    const { data: gamificationStats, error: gamificationError } = await (supabase as any)
      .from('user_gamification_stats')
      .select('total_points, achievements_earned')
      .order('updated_at', { ascending: false });

    if (gamificationError) {
      console.error('Error fetching gamification stats:', gamificationError);
      // Continue with empty gamification data
    }

    // Calculate statistics
    const totalUsers = users?.length || 0;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Active users (updated within last 30 days - using updated_at as proxy)
    const activeUsers = users?.filter(user => 
      user.updated_at && new Date(user.updated_at) > thirtyDaysAgo
    ).length || Math.floor(totalUsers * 0.7); // Fallback estimate

    // Recent signups (within last 7 days)
    const recentSignups = users?.filter(user => 
      new Date(user.created_at) > sevenDaysAgo
    ).length || 0;

    // Sensor statistics
    const totalSensors = sensors?.length || 0;
    const problematicSensors = sensors?.filter(s => s.is_problematic).length || 0;
    
    // Active sensors (not expired and not archived)
    const activeSensors = sensors?.filter(sensor => {
      if (sensor.archived_at) return false;
      
      // Handle sensor_models which might be null/undefined due to relation issues
      const sensorModel = (sensor as any).sensor_models;
      const durationDays = sensorModel?.duration_days || 10; // Default to 10 days if no model data
      
      const expirationDate = new Date(sensor.date_added);
      expirationDate.setDate(expirationDate.getDate() + durationDays);
      
      return expirationDate > now && !sensor.is_problematic;
    }).length || 0;

    // Gamification statistics
    const totalAchievements = gamificationStats?.reduce((sum: number, stat: any) => 
      sum + (stat.achievements_earned || 0), 0
    ) || 0;

    // Average sensors per user
    const avgSensorsPerUser = totalUsers > 0 ? Math.round((totalSensors / totalUsers) * 10) / 10 : 0;

    // System uptime (placeholder - would need real monitoring)
    const systemUptime = 99.9;

    // Roadmap progress (placeholder - could be calculated from roadmap data)
    const roadmapProgress = 67;

    return {
      totalUsers,
      activeUsers,
      totalSensors,
      activeSensors,
      problematicSensors,
      totalAchievements,
      systemUptime,
      roadmapProgress,
      recentSignups,
      avgSensorsPerUser
    };
  } catch (error) {
    console.error('Error in fetchAdminStats:', error);
    return getEmptyStats();
  }
}

/**
 * Fetch recent system activity
 */
export async function fetchRecentActivity(): Promise<RecentActivity[]> {
  try {
    // Check if user is admin first
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      console.warn('Non-admin user attempting to fetch recent activity');
      return [];
    }

    const activities: RecentActivity[] = [];
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Fetch recent system logs
    const { data: systemLogs, error: logsError } = await (supabase as any)
      .from('system_logs')
      .select('id, created_at, level, category, message, user_hash')
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (logsError) {
      console.error('Error fetching system logs:', logsError);
      return [];
    }

    // Convert system logs to activity format
    systemLogs?.forEach((log: any) => {
      // Map categories to activity types
      let activityType: 'user' | 'sensor' | 'system' | 'roadmap' | 'achievement' | 'dexcom' | 'notifications' | 'photos' | 'ocr' = 'system';
      switch (log.category) {
        case 'users':
        case 'auth':
          activityType = 'user';
          break;
        case 'sensors':
          activityType = 'sensor';
          break;
        case 'dexcom':
        case 'notifications':
        case 'photos':
        case 'ocr':
          activityType = log.category;
          break;
        default:
          activityType = 'system';
      }

      // Create user-friendly action names
      let action = log.message;
      let details = log.message;

      // Enhance common log messages
      if (log.message.includes('logged in successfully')) {
        action = 'User logged in';
        details = 'User authentication successful';
      } else if (log.message.includes('Profile created successfully')) {
        action = 'New user registered';
        details = 'User profile created and initialized';
      } else if (log.message.includes('Dexcom account connected')) {
        action = 'Dexcom integration connected';
        details = 'User successfully connected their Dexcom account';
      } else if (log.message.includes('Dexcom sync completed')) {
        action = 'Dexcom sync completed';
        details = 'Automatic Dexcom data synchronization finished';
      } else if (log.message.includes('New sensor added')) {
        action = 'New sensor added';
        details = 'User added a new CGM sensor to their account';
      } else if (log.message.includes('Photo uploaded')) {
        action = 'Photo uploaded';
        details = 'User uploaded a sensor photo';
      } else if (log.message.includes('OCR processing completed')) {
        action = 'OCR processing completed';
        details = 'Sensor image processed successfully';
      } else if (log.message.includes('Push notification sent')) {
        action = 'Notification sent';
        details = 'Push notification delivered to user';
      } else if (log.message.includes('failed') || log.message.includes('error')) {
        action = `Error: ${log.category}`;
        details = log.message;
      }

      activities.push({
        id: log.id,
        action,
        details,
        timestamp: log.created_at,
        type: activityType,
        user_hash: log.user_hash || undefined
      });
    });



    // Also fetch some recent database events for additional context
    const { data: recentUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, created_at, full_name')
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (!usersError && recentUsers) {
      recentUsers.forEach(user => {
        const displayName = user.full_name || 'New user';
        activities.push({
          id: `user-reg-${user.id}`,
          action: 'New user registered',
          details: `${displayName} joined the platform`,
          timestamp: user.created_at,
          type: 'user'
        });
      });
    }

    // Fetch recent sensor additions for additional context
    const { data: recentSensors, error: sensorsError } = await supabase
      .from('sensors')
      .select(`
        id,
        date_added,
        is_problematic,
        user_id,
        sensor_type,
        serial_number
      `)
      .gte('date_added', twentyFourHoursAgo.toISOString())
      .eq('is_deleted', false)
      .order('date_added', { ascending: false })
      .limit(5);

    if (!sensorsError && recentSensors && recentSensors.length > 0) {
      const userIds = [...new Set(recentSensors.map(s => s.user_id))];
      const { data: sensorUsers } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const userMap = new Map(sensorUsers?.map(u => [u.id, u]) || []);

      recentSensors.forEach(sensor => {
        const user = userMap.get(sensor.user_id);
        const userName = user?.full_name || 'User';
        const sensorType = sensor.sensor_type === 'dexcom' ? 'Dexcom' : 'FreeStyle';
        const sensorName = `${sensorType} CGM`;
        
        activities.push({
          id: `sensor-add-${sensor.id}`,
          action: sensor.is_problematic ? 'Problematic sensor reported' : 'New sensor added',
          details: `${sensorName} (${sensor.serial_number}) added by ${userName}`,
          timestamp: sensor.date_added,
          type: 'sensor'
        });
      });
    }

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Return the most recent 5 activities for the main dashboard
    return activities.slice(0, 5);
  } catch (error) {
    console.error('Error in fetchRecentActivity:', error);
    return [];
  }
}

/**
 * Check if user is admin
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return profile?.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}