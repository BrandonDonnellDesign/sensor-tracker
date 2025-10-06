import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createHash } from 'crypto';

interface SystemLogEvent {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  category: string;
  message: string;
  user_hash?: string;
}

interface LogSummary {
  errors_24h: number;
  warnings_24h: number;
  info_24h: number;
}

// Hash user ID for privacy
function hashUserId(userId: string): string {
  return createHash('sha256').update(userId).digest('hex').substring(0, 12);
}

// Generate system logs from database activity
async function generateSystemLogs(supabase: any): Promise<{ logs: SystemLogEvent[], summary: LogSummary }> {
  const logs: SystemLogEvent[] = [];
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    // Get recent sensor activities
    const { data: recentSensors } = await supabase
      .from('sensors')
      .select('id, user_id, created_at, sensor_type, is_problematic')
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    // Get recent photo uploads
    const { data: recentPhotos } = await supabase
      .from('photos')
      .select('id, user_id, created_at, sensor_id, file_size')
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    // Get recent user registrations
    const { data: recentProfiles } = await supabase
      .from('profiles')
      .select('id, created_at, updated_at')
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    // Get problematic sensors for warnings
    const { data: problematicSensors } = await supabase
      .from('sensors')
      .select('id, user_id, created_at, is_problematic, issue_notes')
      .eq('is_problematic', true)
      .gte('updated_at', twentyFourHoursAgo.toISOString())
      .order('updated_at', { ascending: false })
      .limit(20);

    // Get large files that might indicate issues
    const { data: largePhotos } = await supabase
      .from('photos')
      .select('id, user_id, created_at, file_size')
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .gt('file_size', 5 * 1024 * 1024) // Files > 5MB
      .order('created_at', { ascending: false })
      .limit(10);

    // Convert sensor activities to logs
    recentSensors?.forEach((sensor: any) => {
      logs.push({
        id: `sensor_${sensor.id}`,
        timestamp: sensor.created_at,
        level: 'info',
        category: 'sensors',
        message: `New ${sensor.sensor_type} sensor added successfully`,
        user_hash: hashUserId(sensor.user_id)
      });
    });

    // Convert photo uploads to logs
    recentPhotos?.forEach((photo: any) => {
      const sizeKB = Math.round((photo.file_size || 0) / 1024);
      logs.push({
        id: `photo_${photo.id}`,
        timestamp: photo.created_at,
        level: 'info',
        category: 'photos',
        message: `Photo uploaded (${sizeKB}KB) for sensor`,
        user_hash: hashUserId(photo.user_id)
      });
    });

    // Convert user registrations to logs
    recentProfiles?.forEach((profile: any) => {
      logs.push({
        id: `user_${profile.id}`,
        timestamp: profile.created_at,
        level: 'info',
        category: 'users',
        message: 'New user registration completed',
        user_hash: hashUserId(profile.id)
      });
    });

    // Convert problematic sensors to warnings
    problematicSensors?.forEach((sensor: any) => {
      logs.push({
        id: `problem_${sensor.id}`,
        timestamp: sensor.created_at,
        level: 'warn',
        category: 'sensors',
        message: `Sensor flagged as problematic: ${sensor.issue_notes || 'No details provided'}`,
        user_hash: hashUserId(sensor.user_id)
      });
    });

    // Convert large files to warnings
    largePhotos?.forEach((photo: any) => {
      const sizeMB = Math.round((photo.file_size || 0) / (1024 * 1024));
      logs.push({
        id: `large_file_${photo.id}`,
        timestamp: photo.created_at,
        level: 'warn',
        category: 'storage',
        message: `Large file uploaded (${sizeMB}MB) - consider optimization`,
        user_hash: hashUserId(photo.user_id)
      });
    });

    // Add some system-level logs based on data patterns
    const totalSensors = recentSensors?.length || 0;
    const totalPhotos = recentPhotos?.length || 0;
    const problematicCount = problematicSensors?.length || 0;

    // High activity warning
    if (totalSensors > 20) {
      logs.push({
        id: 'high_activity_sensors',
        timestamp: now.toISOString(),
        level: 'warn',
        category: 'system',
        message: `High sensor registration activity detected (${totalSensors} in 24h)`
      });
    }

    // Storage usage info
    if (totalPhotos > 50) {
      logs.push({
        id: 'storage_activity',
        timestamp: now.toISOString(),
        level: 'info',
        category: 'storage',
        message: `Active photo upload period (${totalPhotos} uploads in 24h)`
      });
    }

    // Quality control error
    if (problematicCount > 5) {
      logs.push({
        id: 'quality_control',
        timestamp: now.toISOString(),
        level: 'error',
        category: 'quality',
        message: `High number of problematic sensors reported (${problematicCount})`
      });
    }

    // Sort logs by timestamp (most recent first)
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Calculate summary statistics
    const summary: LogSummary = {
      errors_24h: logs.filter(log => log.level === 'error').length,
      warnings_24h: logs.filter(log => log.level === 'warn').length,
      info_24h: logs.filter(log => log.level === 'info').length
    };

    return { logs: logs.slice(0, 100), summary }; // Return most recent 100 logs
  } catch (error) {
    console.error('Error generating system logs:', error);
    
    // Return error log
    const errorLog: SystemLogEvent = {
      id: 'system_error',
      timestamp: now.toISOString(),
      level: 'error',
      category: 'system',
      message: 'Failed to generate system logs from database'
    };

    return {
      logs: [errorLog],
      summary: { errors_24h: 1, warnings_24h: 0, info_24h: 0 }
    };
  }
}

export async function GET() {
  try {
    const supabase = createAdminClient();
    
    const { logs, summary } = await generateSystemLogs(supabase);

    return NextResponse.json({
      success: true,
      data: {
        logs,
        summary,
        generated_at: new Date().toISOString(),
        note: 'Logs generated from real database activity'
      }
    });
  } catch (error) {
    console.error('Admin logs API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch system logs',
        data: {
          logs: [],
          summary: { errors_24h: 0, warnings_24h: 0, info_24h: 0 }
        }
      },
      { status: 500 }
    );
  }
}