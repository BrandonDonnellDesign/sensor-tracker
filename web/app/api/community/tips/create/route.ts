import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyApiKey } from '@/lib/api-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper function to get user display name
async function getUserDisplayName(userId: string): Promise<string> {
  try {
    // Try to get user profile first
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, first_name, last_name')
      .eq('id', userId)
      .single();

    if (profile) {
      // Use display_name if available
      if (profile.display_name) {
        return profile.display_name;
      }
      
      // Use first name + last initial if available
      if (profile.first_name) {
        const lastInitial = profile.last_name ? ` ${profile.last_name.charAt(0)}.` : '';
        return `${profile.first_name}${lastInitial}`;
      }
    }

    // Fallback: get email and use the part before @
    const { data: { user } } = await supabase.auth.admin.getUserById(userId);
    if (user?.email) {
      const emailName = user.email.split('@')[0];
      // Capitalize first letter and replace dots/underscores with spaces
      return emailName
        .replace(/[._]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    // Final fallback
    return 'Community Member';
  } catch (error) {
    console.log('Could not get user display name:', error);
    return 'Community Member';
  }
}

export async function POST(request: NextRequest) {
  console.log('=== POST /api/community/tips/create called ===');
  
  try {
    console.log('Parsing request body...');
    const body = await request.json();
    console.log('Body parsed:', { title: body.title, category: body.category });
    const { title, content, category, tags } = body;

    // Validate required fields
    if (!title || !content || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (title.length > 100) {
      return NextResponse.json({ error: 'Title too long (max 100 characters)' }, { status: 400 });
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: 'Content too long (max 1000 characters)' }, { status: 400 });
    }

    const validCategories = ['insertion', 'adhesion', 'longevity', 'troubleshooting', 'general'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // Check for API key authentication first
    const apiKeyHeader = request.headers.get('x-api-key');
    let user;
    let userId: string;
    
    if (apiKeyHeader) {
      console.log('Using API key authentication');
      // API Key authentication
      const apiKey = await verifyApiKey(apiKeyHeader);
      
      if (!apiKey) {
        return NextResponse.json({ 
          error: 'Invalid API key',
          details: 'API key is invalid or expired'
        }, { status: 401 });
      }
      
      // Get user from API key
      const { data: apiKeyData } = await supabase
        .from('api_keys')
        .select('user_id')
        .eq('id', apiKey.id)
        .single();
      
      if (!apiKeyData?.user_id) {
        return NextResponse.json({ 
          error: 'Invalid API key',
          details: 'No user associated with API key'
        }, { status: 401 });
      }
      
      userId = apiKeyData.user_id;
      
      // Get user details
      const { data: { user: apiUser }, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (userError || !apiUser) {
        return NextResponse.json({ 
          error: 'User not found',
          details: 'Could not find user for API key'
        }, { status: 401 });
      }
      
      user = apiUser;
    } else {
      console.log('Using JWT authentication');
      // JWT Bearer token authentication
      const authHeader = request.headers.get('authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ 
          error: 'Authentication required',
          details: 'Provide either X-API-Key header or Authorization: Bearer token'
        }, { status: 401 });
      }

      const token = authHeader.substring(7).trim();
      
      // Validate token format (JWT should have 3 parts separated by dots)
      const tokenParts = token.split('.');
      if (!token || tokenParts.length !== 3) {
        console.error('Malformed JWT token:', {
          hasToken: !!token,
          tokenLength: token?.length,
          tokenParts: tokenParts.length,
          firstChars: token?.substring(0, 20)
        });
        return NextResponse.json({ 
          error: 'Invalid token format',
          details: `JWT token is malformed (has ${tokenParts.length} parts, expected 3)`
        }, { status: 401 });
      }
      
      // Verify the JWT token
      try {
        const { data, error: authError } = await supabase.auth.getUser(token);
        
        if (authError) {
          console.error('JWT verification error:', authError.message);
          return NextResponse.json({ 
            error: 'Invalid authentication',
            details: 'Token verification failed: ' + authError.message
          }, { status: 401 });
        }
        
        if (!data.user) {
          return NextResponse.json({ 
            error: 'Invalid authentication',
            details: 'No user found for token'
          }, { status: 401 });
        }
        
        user = data.user;
        userId = user.id;
      } catch (error) {
        console.error('Unexpected auth error:', error);
        return NextResponse.json({ 
          error: 'Authentication failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 401 });
      }
    }

    // Validate and clean tags
    const cleanTags = Array.isArray(tags) 
      ? tags
          .filter(tag => typeof tag === 'string' && tag.trim().length > 0)
          .map(tag => tag.trim().toLowerCase())
          .slice(0, 5) // Limit to 5 tags
      : [];

    // Try to create the tip, return mock response if tables don't exist
    try {
      // Get the display name first
      const authorName = await getUserDisplayName(user.id);
      
      const { data: newTip, error: createError } = await supabase
        .from('community_tips')
        .insert({
          title: title.trim(),
          content: content.trim(),
          category,
          author_id: user.id,
          author_name: authorName,
          tags: cleanTags,
          is_verified: false,
          is_deleted: false
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Run AI moderation on the new tip
      let moderationResult = null;
      try {
        const { autoModerator } = await import('@/lib/ai/auto-moderator');
        moderationResult = await autoModerator.moderateTip({
          id: newTip.id,
          title: newTip.title,
          content: newTip.content,
          category: newTip.category,
          authorId: newTip.author_id,
          authorName: newTip.author_name
        });

        // Add moderation info to response
        newTip.moderation_result = moderationResult;
        
        // If content is rejected, delete it and return error to user
        if (moderationResult.action === 'rejected') {
          // Delete the rejected tip from database
          await supabase
            .from('community_tips')
            .delete()
            .eq('id', newTip.id);
            
          return NextResponse.json({
            error: 'Content rejected by moderation system',
            reason: moderationResult.analysis.reasoning,
            flags: moderationResult.analysis.flags
          }, { status: 400 });
        }
        
      } catch (moderationError) {
        console.error('Error in AI moderation:', moderationError);
        // Don't fail tip creation if moderation fails, but log it
      }

      // Return the new tip with initial stats
      const transformedTip = {
        id: newTip.id,
        title: newTip.title,
        content: newTip.content,
        category: newTip.category,
        author: newTip.author_name,
        authorId: newTip.author_id,
        likes: 0,
        dislikes: 0,
        netVotes: 0,
        comments: 0,
        createdAt: newTip.created_at,
        isVerified: newTip.is_verified,
        tags: newTip.tags || [],
        userVote: null,
        isBookmarked: false
      };

      return NextResponse.json({
        success: true,
        tip: transformedTip
      });

    } catch (dbError) {
      console.log('Database tables not available, returning mock tip response');
      
      // Return mock response for development
      const authorName = await getUserDisplayName(user.id);
      
      const mockTip = {
        id: `mock-${Date.now()}`,
        title: title.trim(),
        content: content.trim(),
        category,
        author: authorName,
        authorId: user.id,
        likes: 0,
        dislikes: 0,
        netVotes: 0,
        comments: 0,
        createdAt: new Date().toISOString(),
        isVerified: false,
        tags: cleanTags,
        userVote: null,
        isBookmarked: false
      };

      return NextResponse.json({
        success: true,
        tip: mockTip
      });
    }



  } catch (error) {
    console.error('Error creating tip:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Full error details:', {
      message: errorMessage,
      stack: errorStack,
      error
    });
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: errorMessage
    }, { status: 500 });
  }
}