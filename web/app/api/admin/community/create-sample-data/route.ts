import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Create sample tips
    const sampleTips = [
      {
        title: 'Proper Sensor Placement Technique',
        content: 'Always clean the insertion site with alcohol and let it dry completely. Use a skin prep wipe for better adhesion.',
        category: 'insertion',
        author_id: user.id,
        author_name: 'Admin User',
        is_verified: true,
        tags: ['placement', 'insertion', 'skin-prep']
      },
      {
        title: 'Dealing with Adhesive Issues',
        content: 'If your sensor keeps falling off, try using additional adhesive patches or compression shorts for thigh sensors.',
        category: 'adhesion',
        author_id: user.id,
        author_name: 'Admin User',
        is_verified: false,
        tags: ['adhesive', 'patches', 'compression']
      },
      {
        title: 'Troubleshooting Inaccurate Readings',
        content: 'When you get strange readings, calibrate with a finger stick and check for compression lows.',
        category: 'troubleshooting',
        author_id: user.id,
        author_name: 'Admin User',
        is_verified: true,
        tags: ['accuracy', 'calibration', 'troubleshooting']
      }
    ];

    const { data: insertedTips, error: tipsError } = await supabase
      .from('community_tips')
      .insert(sampleTips)
      .select();

    if (tipsError) {
      console.error('Error creating sample tips:', tipsError);
      return NextResponse.json({ error: 'Failed to create sample tips' }, { status: 500 });
    }

    // Create sample comments
    const sampleComments = insertedTips?.flatMap(tip => [
      {
        tip_id: tip.id,
        author_id: user.id,
        author_name: 'Test User 1',
        content: 'This is really helpful! Thanks for sharing.',
        is_approved: null, // Pending moderation
        is_rejected: false
      },
      {
        tip_id: tip.id,
        author_id: user.id,
        author_name: 'Test User 2',
        content: 'I tried this and it worked great for me too.',
        is_approved: true,
        is_rejected: false
      }
    ]) || [];

    const { error: commentsError } = await supabase
      .from('community_tip_comments')
      .insert(sampleComments);

    if (commentsError) {
      console.error('Error creating sample comments:', commentsError);
    }

    // Create some sample votes
    const sampleVotes = insertedTips?.map(tip => ({
      tip_id: tip.id,
      user_id: user.id,
      vote_type: Math.random() > 0.3 ? 'up' : 'down'
    })) || [];

    const { error: votesError } = await supabase
      .from('community_tip_votes')
      .insert(sampleVotes);

    if (votesError) {
      console.error('Error creating sample votes:', votesError);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Sample data created successfully',
      tipsCreated: insertedTips?.length || 0,
      commentsCreated: sampleComments.length,
      votesCreated: sampleVotes.length
    });

  } catch (error) {
    console.error('Error creating sample data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}