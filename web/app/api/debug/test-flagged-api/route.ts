import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(_request: NextRequest) {
  try {
    console.log('🧪 Testing flagged content API...');

    // Test direct database query for flagged content
    const { data: flaggedTips, error: tipsError } = await supabase
      .from('community_tips')
      .select(`
        id,
        title,
        content,
        category,
        moderation_status,
        moderation_reason,
        moderated_at,
        created_at,
        profiles!community_tips_author_id_fkey (
          full_name,
          username
        )
      `)
      .eq('moderation_status', 'flagged')
      .order('moderated_at', { ascending: false });

    const { data: flaggedComments, error: commentsError } = await supabase
      .from('community_tip_comments')
      .select(`
        id,
        content,
        moderation_status,
        moderation_reason,
        moderated_at,
        created_at,
        profiles!community_tip_comments_author_id_fkey (
          full_name,
          username
        ),
        community_tips!community_tip_comments_tip_id_fkey (
          title
        )
      `)
      .eq('moderation_status', 'flagged')
      .order('moderated_at', { ascending: false });

    console.log('📊 Flagged tips found:', flaggedTips?.length || 0);
    console.log('📊 Flagged comments found:', flaggedComments?.length || 0);

    if (tipsError) console.error('Tips error:', tipsError);
    if (commentsError) console.error('Comments error:', commentsError);

    return NextResponse.json({
      success: true,
      debug: {
        flaggedTipsCount: flaggedTips?.length || 0,
        flaggedCommentsCount: flaggedComments?.length || 0,
        flaggedTips: flaggedTips || [],
        flaggedComments: flaggedComments || [],
        errors: {
          tipsError,
          commentsError
        }
      }
    });

  } catch (error) {
    console.error('Error testing flagged API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}