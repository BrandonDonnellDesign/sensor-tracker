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
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  try {
    // Query real system_logs table
    const { data: systemLogs, error } = await supabase
      .from('system_logs')
      .select('*')
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Map logs for frontend
    const logs: SystemLogEvent[] = (systemLogs || []).map((log: any) => ({
      id: log.id,
      timestamp: log.created_at,
      level: log.level,
      category: log.category,
      message: log.message,
      user_hash: log.user_hash
      // Optionally: metadata: log.metadata
    }));

    // Calculate summary statistics
    const summary: LogSummary = {
      errors_24h: logs.filter(log => log.level === 'error').length,
      warnings_24h: logs.filter(log => log.level === 'warn').length,
      info_24h: logs.filter(log => log.level === 'info').length
    };

    return { logs, summary };
  } catch (error) {
    console.error('Error fetching system logs:', error);
    const errorLog: SystemLogEvent = {
      id: 'system_error',
      timestamp: now.toISOString(),
      level: 'error',
      category: 'system',
      message: 'Failed to fetch system logs from database'
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