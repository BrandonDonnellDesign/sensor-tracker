import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10'); // Default to 10 entries
    const offset = parseInt(searchParams.get('offset') || '0'); // For pagination
    const level = searchParams.get('level'); // Filter by level if provided
    const category = searchParams.get('category'); // Filter by category if provided

    // Build query for logs with pagination
    let query = supabaseAdmin
      .from('system_logs')
      .select('id, created_at, level, category, message, user_hash', {
        count: 'exact',
      })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters if provided
    if (level) {
      query = query.eq('level', level);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data: logs, error: logsError, count } = await query;

    if (logsError) {
      console.error('Error fetching system logs:', logsError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch system logs',
        },
        { status: 500 }
      );
    }

    // Get summary statistics for the last 24 hours (separate query for performance)
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const { data: summaryData, error: summaryError } = await supabaseAdmin
      .from('system_logs')
      .select('level')
      .gte('created_at', twentyFourHoursAgo.toISOString());

    if (summaryError) {
      console.error('Error fetching log summary:', summaryError);
    }

    // Calculate summary statistics
    const summary: LogSummary = {
      errors_24h:
        summaryData?.filter((log) => log.level === 'error').length || 0,
      warnings_24h:
        summaryData?.filter((log) => log.level === 'warn').length || 0,
      info_24h: summaryData?.filter((log) => log.level === 'info').length || 0,
    };

    // Transform logs to match expected format
    const transformedLogs: SystemLogEvent[] = (logs || []).map((log) => ({
      id: log.id,
      timestamp: log.created_at,
      level: log.level as 'info' | 'warn' | 'error',
      category: log.category,
      message: log.message,
      user_hash: log.user_hash || undefined,
    }));

    // Calculate pagination metadata
    const totalCount = count || 0;
    const currentPage = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = offset + limit < totalCount;
    const hasPrevPage = offset > 0;

    return NextResponse.json({
      success: true,
      data: {
        logs: transformedLogs,
        summary,
        pagination: {
          currentPage,
          totalPages,
          totalCount,
          limit,
          offset,
          hasNextPage,
          hasPrevPage,
        },
      },
    });
  } catch (error) {
    console.error('Error in logs API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
