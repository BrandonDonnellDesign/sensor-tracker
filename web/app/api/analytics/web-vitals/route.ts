import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface WebVitalMetric {
  name: string;
  value: number;
  id: string;
  delta: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  user_id?: string;
  page_url?: string;
  user_agent?: string;
  timestamp?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // For web vitals, we don't need user auth - can be anonymous
    // const { data: { user } } = await supabase.auth.getUser();
    
    const metric: WebVitalMetric = await request.json();
    
    // Store web vitals data
    const { error } = await supabase
      .from('web_vitals')
      .insert({
        user_id: metric.user_id || null,
        metric_name: metric.name,
        metric_value: metric.value,
        metric_id: metric.id,
        metric_delta: metric.delta,
        metric_rating: metric.rating,
        user_agent: metric.user_agent || request.headers.get('user-agent'),
        page_url: metric.page_url,
        timestamp: metric.timestamp || new Date().toISOString(),
      });

    if (error) {
      console.error('Error storing web vital:', error);
      return NextResponse.json({ error: 'Failed to store metric' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Web vitals API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}