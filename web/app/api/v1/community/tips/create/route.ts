import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { authenticateApiRequest } from '@/lib/api-middleware';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check authentication and rate limit
    const authResult = await authenticateApiRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'authentication_failed', message: authResult.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      title,
      content,
      category,
      tags = [],
      is_anonymous = false
    } = body;

    // Validate required fields
    if (!title || !content || !category) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Title, content, and category are required' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['sensor-placement', 'troubleshooting', 'lifestyle', 'alerts', 'data-analysis', 'general'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Invalid category' },
        { status: 400 }
      );
    }

    // Validate content length
    if (title.length > 200) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Title must be 200 characters or less' },
        { status: 400 }
      );
    }

    if (content.length > 10000) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Content must be 10,000 characters or less' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    const authorName = is_anonymous ? 'Anonymous' : 'Community Member';

    // Create the tip
    const { data: tip, error } = await supabase
      .from('community_tips')
      .insert({
        user_id: authResult.userId!,
        title: title.trim(),
        content: content.trim(),
        category,
        tags: Array.isArray(tags) ? tags : [],
        author_name: authorName,
        is_anonymous,
        status: 'published' // Auto-publish for now, could add moderation later
      })
      .select(`
        id,
        title,
        content,
        category,
        tags,
        author_name,
        is_anonymous,
        status,
        created_at,
        updated_at,
        upvotes,
        downvotes,
        view_count,
        comment_count
      `)
      .single();

    if (error) {
      console.error('Error creating tip:', error);
      return NextResponse.json(
        { error: 'database_error', message: 'Failed to create tip' },
        { status: 500 }
      );
    }

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      data: tip,
      meta: {
        responseTime: `${responseTime}ms`,
        apiVersion: '1.0.0'
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error in create tip API:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}