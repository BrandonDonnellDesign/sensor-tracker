import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { contentModerator, ContentToAnalyze } from '@/lib/ai/content-moderator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
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

    // Check if user is admin (only admins can use AI moderation API directly)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { content, type = 'tip' } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Analyze the content
    const contentToAnalyze: ContentToAnalyze = {
      title: content.title,
      content: content.content || content.text,
      category: content.category,
      author: content.author,
      type: type
    };

    const analysis = await contentModerator.analyzeContent(contentToAnalyze);

    return NextResponse.json({
      success: true,
      analysis: analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in AI content moderation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Batch moderation endpoint for processing multiple items
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { items = [] } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items array is required' }, { status: 400 });
    }

    // Process each item
    const results = await Promise.all(
      items.map(async (item) => {
        try {
          const contentToAnalyze: ContentToAnalyze = {
            title: item.title,
            content: item.content || item.text,
            category: item.category,
            author: item.author,
            type: item.type || 'tip'
          };

          const analysis = await contentModerator.analyzeContent(contentToAnalyze);
          
          return {
            id: item.id,
            analysis: analysis,
            success: true
          };
        } catch (error) {
          return {
            id: item.id,
            error: 'Failed to analyze content',
            success: false
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      results: results,
      processed: results.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in batch AI content moderation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}