import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// Simple logging utility (replace with Sentry later)
const logger = {
  warn: (message: string, context?: any) => console.warn(message, context),
  error: (message: string, error?: any, context?: any) => console.error(message, error, context),
  info: (message: string, context?: any) => console.info(message, context),
  setUser: (_user: any) => {},
};

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type,
      title,
      description,
      priority,
      category,
      user_id,
      user_email,
    } = body;

    // Validate required fields
    if (!type || !title || !description) {
      logger.warn('Feedback submission failed: Missing required fields', {
        category: 'feedback',
        metadata: { type, title: !!title, description: !!description }
      });
      
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Set user context for logging
    if (user_id) {
      logger.setUser({ id: user_id, email: user_email });
    }

    // Insert feedback into database
    const { data: feedback, error } = await supabaseAdmin
      .from('feedback')
      .insert({
        type,
        title: title.trim(),
        description: description.trim(),
        priority: priority || 'medium',
        category: category || 'general',
        user_id: user_id || null,
        user_email: user_email || null,
        status: 'submitted',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('Database error creating feedback', error, {
        category: 'database',
        userId: user_id,
        metadata: {
          feedback_type: type,
          error_code: error.code,
          error_details: error.details,
        }
      });

      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      );
    }

    // Log successful feedback submission
    logger.info('Feedback submitted successfully', {
      category: 'feedback',
      action: 'submitted',
      userId: user_id,
      metadata: {
        feedback_id: feedback.id,
        feedback_type: type,
        category,
        priority,
        title: title.substring(0, 50), // Truncate for logging
      }
    });

    // Also log to system_logs for admin visibility
    await supabaseAdmin
      .from('system_logs')
      .insert({
        level: 'info',
        category: 'feedback',
        message: `New ${type} feedback: "${title}"`,
        user_hash: user_id ? Buffer.from(user_id).toString('base64').substring(0, 8) : null,
        created_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      feedback: {
        id: feedback.id,
        type: feedback.type,
        title: feedback.title,
        status: feedback.status,
      }
    });

  } catch (error) {
    logger.error('Unexpected error in feedback submission', error as Error, {
      category: 'system',
      metadata: {
        endpoint: '/api/feedback',
        method: 'POST',
      }
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabaseAdmin
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data: feedback, error } = await query;

    if (error) {
      logger.error('Database error fetching feedback', error, {
        category: 'database',
        metadata: {
          error_code: error.code,
          error_details: error.details,
          filters: { status, type, category },
        }
      });

      return NextResponse.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      );
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('feedback')
      .select('*', { count: 'exact', head: true });

    if (status) countQuery = countQuery.eq('status', status);
    if (type) countQuery = countQuery.eq('type', type);
    if (category) countQuery = countQuery.eq('category', category);

    const { count } = await countQuery;

    return NextResponse.json({
      success: true,
      data: feedback || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      }
    });

  } catch (error) {
    logger.error('Unexpected error fetching feedback', error as Error, {
      category: 'system',
      metadata: {
        endpoint: '/api/feedback',
        method: 'GET',
      }
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}