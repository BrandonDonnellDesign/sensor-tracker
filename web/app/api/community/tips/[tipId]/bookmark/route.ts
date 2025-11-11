import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tipId: string }> }
) {
  try {
    const { tipId } = await params;

    // Get user from Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Use service role key to verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ 
        error: 'Invalid authentication',
        details: authError?.message 
      }, { status: 401 });
    }

    // Verify the tip exists
    const { data: tip, error: tipError } = await supabase
      .from('community_tips')
      .select('id')
      .eq('id', tipId)
      .eq('is_deleted', false)
      .single();

    if (tipError || !tip) {
      return NextResponse.json({ error: 'Tip not found' }, { status: 404 });
    }

    // Call the toggle_tip_bookmark function
    const { data: result, error: bookmarkError } = await supabase
      .rpc('toggle_tip_bookmark', {
        tip_uuid: tipId,
        user_uuid: user.id
      });

    if (bookmarkError) {
      console.error('Error toggling bookmark:', bookmarkError);
      return NextResponse.json({ error: 'Failed to update bookmark' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      bookmarkResult: result
    });

  } catch (error) {
    console.error('Error handling bookmark:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get bookmark status for a tip
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tipId: string }> }
) {
  try {
    const { tipId } = await params;

    // Get user from Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ bookmarked: false });
    }

    const token = authHeader.substring(7);
    
    // Use service role key to verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ bookmarked: false });
    }

    // Check if bookmark exists
    const { data: bookmark } = await supabase
      .from('community_tip_bookmarks')
      .select('id')
      .eq('tip_id', tipId)
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      bookmarked: !!bookmark
    });

  } catch (error) {
    console.error('Error checking bookmark status:', error);
    return NextResponse.json({ bookmarked: false });
  }
}