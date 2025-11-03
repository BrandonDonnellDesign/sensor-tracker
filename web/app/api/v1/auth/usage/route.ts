import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: { user }, error: authError } = await userSupabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Invalid authentication' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const apiKeyId = searchParams.get('api_key_id');
    const days = Math.min(30, Math.max(1, parseInt(searchParams.get('days') || '7')));
    
    // Get usage statistics
    let usageQuery = supabase
      .from('api_usage_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (apiKeyId) {
      usageQuery = usageQuery.eq('api_key_id', apiKeyId);
    }
    
    const { data: usageLogs, error: usageError } = await usageQuery;
    
    if (usageError) {
      throw usageError;
    }
    
    // Get current rate limit status for all user's API keys
    const { data: apiKeys, error: keysError } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, tier, rate_limit_per_hour')
      .eq('user_id', user.id)
      .eq('is_active', true);
    
    if (keysError) {
      throw keysError;
    }
    
    // Calculate statistics
    const totalRequests = usageLogs?.length || 0;
    const successfulRequests = usageLogs?.filter(log => log.status_code < 400).length || 0;
    const errorRequests = usageLogs?.filter(log => log.status_code >= 400).length || 0;
    
    // Group by endpoint
    const endpointStats = usageLogs?.reduce((acc, log) => {
      const endpoint = log.endpoint;
      if (!acc[endpoint]) {
        acc[endpoint] = {
          endpoint,
          requests: 0,
          errors: 0,
          avgResponseTime: 0,
          totalResponseTime: 0
        };
      }
      acc[endpoint].requests++;
      if (log.status_code >= 400) {
        acc[endpoint].errors++;
      }
      if (log.response_time_ms) {
        acc[endpoint].totalResponseTime += log.response_time_ms;
        acc[endpoint].avgResponseTime = acc[endpoint].totalResponseTime / acc[endpoint].requests;
      }
      return acc;
    }, {} as Record<string, any>) || {};
    
    // Group by day for time series
    const dailyStats = usageLogs?.reduce((acc, log) => {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, requests: 0, errors: 0 };
      }
      acc[date].requests++;
      if (log.status_code >= 400) {
        acc[date].errors++;
      }
      return acc;
    }, {} as Record<string, any>) || {};
    
    // Get current hour usage for rate limiting
    const currentHour = new Date();
    currentHour.setMinutes(0, 0, 0);
    
    const { data: currentHourUsage, error: hourError } = await supabase
      .from('api_usage_logs')
      .select('api_key_id')
      .eq('user_id', user.id)
      .gte('created_at', currentHour.toISOString());
    
    if (hourError) {
      console.error('Current hour usage error:', hourError);
    }
    
    const currentHourByKey = currentHourUsage?.reduce((acc, log) => {
      const keyId = log.api_key_id || 'jwt';
      acc[keyId] = (acc[keyId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};
    
    return NextResponse.json({
      data: {
        summary: {
          totalRequests,
          successfulRequests,
          errorRequests,
          successRate: totalRequests > 0 ? (successfulRequests / totalRequests * 100).toFixed(2) : '0',
          period: `${days} days`
        },
        apiKeys: apiKeys?.map(key => ({
          ...key,
          currentHourUsage: currentHourByKey[key.id] || 0,
          remainingThisHour: Math.max(0, key.rate_limit_per_hour - (currentHourByKey[key.id] || 0))
        })) || [],
        endpoints: Object.values(endpointStats),
        dailyUsage: Object.values(dailyStats).sort((a: any, b: any) => a.date.localeCompare(b.date)),
        recentRequests: usageLogs?.slice(0, 50) || []
      },
      meta: {
        apiVersion: '1.0.0',
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Get usage analytics error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to fetch usage analytics' },
      { status: 500 }
    );
  }
}