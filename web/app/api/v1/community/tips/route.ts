import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { withApiAuth, addRateLimitHeaders, logSuccessfulApiUsage } from '@/lib/middleware/api-auth-middleware';
import { checkRateLimit } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // Apply authentication and rate limiting
  const authResult = await withApiAuth(request, {
    requireAuth: true,
    allowApiKey: true,
    allowJWT: true
  });
  
  if (!authResult.success) {
    return authResult.response!;
  }
  
  const { context } = authResult;
  
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';
    
    // Validate sort field
    const validSortFields = ['created_at', 'updated_at', 'upvotes', 'view_count'];
    const sortField = validSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';
    
    // Build query
    let query = supabase
      .from('community_tips_with_stats')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }
    
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }
    
    // Apply sorting
    if (sortField === 'upvotes') {
      query = query.order('net_votes', { ascending: sortOrder === 'asc' });
    } else {
      query = query.order(sortField, { ascending: sortOrder === 'asc' });
    }
    
    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    
    const { data: tips, error, count } = await query;
    
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'database_error', message: 'Failed to fetch tips' },
        { status: 500 }
      );
    }
    
    // Transform data to match API schema
    const transformedTips = tips?.map(tip => ({
      id: tip.id,
      title: tip.title,
      content: tip.content,
      category: tip.category,
      author: tip.author_name || 'Anonymous',
      tags: tip.tags || [],
      stats: {
        upvotes: tip.upvotes || 0,
        downvotes: tip.downvotes || 0,
        netVotes: tip.net_votes || 0,
        comments: tip.comment_count || 0,
        views: 0 // View count not implemented yet
      },
      createdAt: tip.created_at,
      updatedAt: tip.updated_at
    })) || [];
    
    // Calculate pagination info
    const total = count || 0;
    const pages = Math.ceil(total / limit);
    const hasNext = page < pages;
    const hasPrev = page > 1;
    
    const responseTime = `${Date.now() - startTime}ms`;
    
    // Get current rate limit status
    const rateLimitStatus = await checkRateLimit(
      context?.apiKey?.id,
      context?.user?.id,
      context?.ipAddress,
      new URL(request.url).pathname,
      context?.apiKey?.rateLimitPerHour || 100
    );
    
    const response = NextResponse.json({
      data: transformedTips,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext,
        hasPrev
      },
      meta: {
        responseTime,
        apiVersion: '1.0.0',
        rateLimit: {
          limit: rateLimitStatus.limitValue.toString(),
          remaining: Math.max(0, rateLimitStatus.limitValue - rateLimitStatus.currentCount).toString(),
          reset: Math.floor(new Date(rateLimitStatus.resetTime).getTime() / 1000).toString()
        }
      }
    });
    
    // Add rate limit headers
    addRateLimitHeaders(response, rateLimitStatus);
    
    // Log successful usage
    await logSuccessfulApiUsage(request, response, context!, startTime);
    
    return response;
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
