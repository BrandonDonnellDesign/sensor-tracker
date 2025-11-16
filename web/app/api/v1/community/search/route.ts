import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    
    // Validate query
    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'invalid_query', message: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }
    
    const results: any[] = [];
    let totalCount = 0;
    
    // Search tips
    if (type === 'all' || type === 'tips') {
      const { data: tips, error: tipsError, count: tipsCount } = await supabase
        .from('community_tips_with_stats')
        .select('*', { count: 'exact' })
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order('net_votes', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
      
      if (!tipsError && tips) {
        const tipResults = tips.map(tip => ({
          type: 'tip',
          id: tip.id,
          title: tip.title,
          content: tip.content ? tip.content.substring(0, 200) + (tip.content.length > 200 ? '...' : '') : '',
          author: tip.author_name || 'Anonymous',
          category: tip.category,
          tipId: null,
          tipTitle: null,
          stats: {
            upvotes: tip.upvotes || 0,
            downvotes: tip.downvotes || 0,
            netVotes: tip.net_votes || 0,
            comments: tip.comment_count || 0,
            views: 0 // view_count not available in current schema
          },
          createdAt: tip.created_at,
          relevanceScore: calculateRelevanceScore(query, tip.title || '', tip.content || '')
        }));
        
        results.push(...tipResults);
        totalCount += tipsCount || 0;
      }
    }
    
    // Search comments
    if (type === 'all' || type === 'comments') {
      const { data: comments, error: commentsError, count: commentsCount } = await supabase
        .from('community_tip_comments')
        .select('*', { count: 'exact' })
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
      
      if (!commentsError && comments) {
        const commentResults = comments.map(comment => ({
          type: 'comment',
          id: comment.id,
          title: null,
          content: comment.content ? comment.content.substring(0, 200) + (comment.content.length > 200 ? '...' : '') : '',
          author: comment.author_name || 'Anonymous',
          category: null,
          tipId: comment.tip_id,
          tipTitle: 'Unknown', // tip_title not available in view
          stats: {
            upvotes: 0,
            downvotes: 0,
            netVotes: 0
          },
          createdAt: comment.created_at,
          relevanceScore: calculateRelevanceScore(query, '', comment.content || '')
        }));
        
        results.push(...commentResults);
        totalCount += commentsCount || 0;
      }
    }
    
    // Sort by relevance score
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Apply pagination to combined results
    const paginatedResults = results.slice((page - 1) * limit, page * limit);
    
    // Calculate pagination info
    const pages = Math.ceil(totalCount / limit);
    const hasNext = page < pages;
    const hasPrev = page > 1;
    
    const responseTime = `${Date.now() - startTime}ms`;
    
    return NextResponse.json({
      data: paginatedResults,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages,
        hasNext,
        hasPrev
      },
      meta: {
        responseTime,
        apiVersion: '1.0.0',
        query,
        type,
        rateLimit: {
          limit: '1000',
          remaining: '999',
          reset: Math.floor(Date.now() / 1000) + 3600
        }
      }
    });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateRelevanceScore(query: string, title: string, content: string): number {
  const queryLower = query.toLowerCase();
  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();
  
  let score = 0;
  
  // Title matches are worth more
  if (titleLower.includes(queryLower)) {
    score += 10;
  }
  
  // Content matches
  const contentMatches = (contentLower.match(new RegExp(queryLower, 'g')) || []).length;
  score += contentMatches * 2;
  
  // Exact matches are worth more
  if (titleLower === queryLower) {
    score += 20;
  }
  
  // Word boundary matches
  const wordBoundaryRegex = new RegExp(`\\b${queryLower}\\b`, 'g');
  const titleWordMatches = (titleLower.match(wordBoundaryRegex) || []).length;
  const contentWordMatches = (contentLower.match(wordBoundaryRegex) || []).length;
  
  score += titleWordMatches * 5;
  score += contentWordMatches * 3;
  
  return score;
}
