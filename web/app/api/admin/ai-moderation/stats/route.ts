import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get user from Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: { user }, error: authError } = await userSupabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
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

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    // Get AI moderation statistics
    const { data: stats, error } = await supabase
      .rpc('get_ai_moderation_stats', { days_back: days });

    if (error) {
      console.error('Error fetching AI moderation stats:', error);
      // Return empty stats if function doesn't exist yet
      return NextResponse.json({
        total_moderated: 0,
        approved: 0,
        flagged: 0,
        rejected: 0,
        avg_confidence: 0,
        avg_quality: 0,
        spam_detected: 0,
        inappropriate_detected: 0,
        off_topic_detected: 0,
        misinformation_detected: 0,
        by_content_type: { tips: 0, comments: 0 }
      });
    }

    return NextResponse.json(stats || {
      total_moderated: 0,
      approved: 0,
      flagged: 0,
      rejected: 0,
      avg_confidence: 0,
      avg_quality: 0,
      spam_detected: 0,
      inappropriate_detected: 0,
      off_topic_detected: 0,
      misinformation_detected: 0,
      by_content_type: { tips: 0, comments: 0 }
    });

  } catch (error) {
    console.error('Error in AI moderation stats API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}