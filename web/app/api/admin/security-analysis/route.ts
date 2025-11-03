import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const hours = parseInt(searchParams.get('hours') || '24');
    const userId = searchParams.get('userId');

    switch (action) {
      case 'user-patterns':
        if (!userId) {
          return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }
        
        const { data: userAnalysis, error: userError } = await supabase
          .rpc('analyze_user_security_patterns', { 
            p_user_id: userId, 
            p_hours_back: hours 
          });

        if (userError) {
          console.error('Error analyzing user patterns:', userError);
          return NextResponse.json({ error: 'Failed to analyze user patterns' }, { status: 500 });
        }

        return NextResponse.json({ analysis: userAnalysis });

      case 'failed-auth':
        const { data: authAnalysis, error: authError } = await supabase
          .rpc('analyze_failed_auth_attempts', { p_hours_back: hours });

        if (authError) {
          console.error('Error analyzing failed auth:', authError);
          return NextResponse.json({ error: 'Failed to analyze authentication attempts' }, { status: 500 });
        }

        return NextResponse.json({ analysis: authAnalysis });

      case 'data-access':
        const { data: accessAnalysis, error: accessError } = await supabase
          .rpc('monitor_data_access_patterns', { p_hours_back: hours });

        if (accessError) {
          console.error('Error monitoring data access:', accessError);
          return NextResponse.json({ error: 'Failed to monitor data access patterns' }, { status: 500 });
        }

        return NextResponse.json({ analysis: accessAnalysis });

      case 'security-report':
        const { data: securityReport, error: reportError } = await supabase
          .rpc('generate_security_report', { p_hours_back: hours });

        if (reportError) {
          console.error('Error generating security report:', reportError);
          return NextResponse.json({ error: 'Failed to generate security report' }, { status: 500 });
        }

        return NextResponse.json({ report: securityReport });

      case 'metrics':
        const { data: securityMetrics, error: metricsError } = await supabase
          .rpc('get_security_metrics', { p_hours_back: hours });

        if (metricsError) {
          console.error('Error getting security metrics:', metricsError);
          return NextResponse.json({ error: 'Failed to get security metrics' }, { status: 500 });
        }

        return NextResponse.json({ metrics: securityMetrics });

      default:
        // Return comprehensive security overview
        const [metricsResult, reportResult] = await Promise.all([
          supabase.rpc('get_security_metrics', { p_hours_back: hours }),
          supabase.rpc('generate_security_report', { p_hours_back: hours })
        ]);

        return NextResponse.json({
          metrics: metricsResult.data,
          report: reportResult.data,
          timestamp: new Date().toISOString()
        });
    }
  } catch (error) {
    console.error('Error in security analysis API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'log-security-event':
        const { level, category, message, userHash, metadata } = params;
        
        const { data: logResult, error: logError } = await supabase
          .rpc('log_security_event', {
            p_level: level,
            p_category: category,
            p_message: message,
            p_user_hash: userHash,
            p_metadata: metadata || {}
          });

        if (logError) {
          console.error('Error logging security event:', logError);
          return NextResponse.json({ error: 'Failed to log security event' }, { status: 500 });
        }

        return NextResponse.json({ success: true, logId: logResult });

      case 'check-rate-limit':
        const { userId, actionType, limit, windowMinutes } = params;
        
        const { data: rateLimitResult, error: rateLimitError } = await supabase
          .rpc('check_rate_limit', {
            p_user_id: userId,
            p_action: actionType,
            p_limit: limit,
            p_window_minutes: windowMinutes || 60
          });

        if (rateLimitError) {
          console.error('Error checking rate limit:', rateLimitError);
          return NextResponse.json({ error: 'Failed to check rate limit' }, { status: 500 });
        }

        return NextResponse.json({ allowed: rateLimitResult });

      case 'validate-input':
        const { input, fieldName, maxLength } = params;
        
        const { data: validationResult, error: validationError } = await supabase
          .rpc('validate_user_input', {
            p_input: input,
            p_field_name: fieldName,
            p_max_length: maxLength || 255
          });

        if (validationError) {
          console.error('Error validating input:', validationError);
          return NextResponse.json({ error: 'Failed to validate input' }, { status: 500 });
        }

        return NextResponse.json({ valid: validationResult });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in security analysis API POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}