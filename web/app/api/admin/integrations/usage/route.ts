import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client
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

interface UsageStats {
  dexcomApiCalls: number;
  ocrRequests: number;
  databaseQueries: number;
  failedRequests: number;
}

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get Dexcom API calls from sync logs
    const { data: dexcomLogs, error: dexcomError } = await supabaseAdmin
      .from('dexcom_sync_log')
      .select('id, status')
      .gte('created_at', twentyFourHoursAgo.toISOString());

    if (dexcomError) {
      console.error('Error fetching Dexcom logs:', dexcomError);
    }

    // Get OCR requests (estimate from photos uploaded)
    const { data: photos, error: photosError } = await supabaseAdmin
      .from('photos')
      .select('id')
      .gte('created_at', twentyFourHoursAgo.toISOString());

    if (photosError) {
      console.error('Error fetching photos:', photosError);
    }

    // Get notification requests
    const { data: notifications, error: notificationsError } = await supabaseAdmin
      .from('notifications')
      .select('id, status')
      .gte('created_at', twentyFourHoursAgo.toISOString());

    if (notificationsError) {
      console.error('Error fetching notifications:', notificationsError);
    }

    // Get system logs to estimate database queries and failed requests
    const { data: systemLogs, error: systemLogsError } = await supabaseAdmin
      .from('system_logs')
      .select('level, category')
      .gte('created_at', twentyFourHoursAgo.toISOString());

    if (systemLogsError) {
      console.error('Error fetching system logs:', systemLogsError);
    }

    // Calculate usage statistics
    const dexcomApiCalls = dexcomLogs?.length || 0;
    const ocrRequests = photos?.length || 0; // Assume each photo upload triggers OCR
    const notificationRequests = notifications?.length || 0;
    
    // Estimate database queries (rough calculation based on activity)
    const estimatedDbQueries = (dexcomApiCalls * 5) + (ocrRequests * 3) + (notificationRequests * 2) + 500; // Base queries
    
    // Count failed requests
    const failedDexcomCalls = dexcomLogs?.filter(log => log.status === 'failed').length || 0;
    const failedNotifications = notifications?.filter(n => n.status === 'failed').length || 0;
    const systemErrors = systemLogs?.filter(log => log.level === 'error').length || 0;
    const totalFailedRequests = failedDexcomCalls + failedNotifications + systemErrors;

    const usage: UsageStats = {
      dexcomApiCalls,
      ocrRequests,
      databaseQueries: estimatedDbQueries,
      failedRequests: totalFailedRequests
    };

    return NextResponse.json(usage);
  } catch (error) {
    console.error('Error fetching usage statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage statistics' },
      { status: 500 }
    );
  }
}