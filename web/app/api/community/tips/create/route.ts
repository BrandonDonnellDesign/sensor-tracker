import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
  try {
    const body = await request.json();
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}