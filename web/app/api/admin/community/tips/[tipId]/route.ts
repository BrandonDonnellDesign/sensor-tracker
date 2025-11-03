import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(
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

    // Get tip details before deletion for logging
    const { data: tip } = await supabase
      .from('community_tips')
      .select('id, title, author_name, category')
      .eq('id', tipId)
      .single();

    if (!tip) {
      return NextResponse.json({ error: 'Tip not found' }, { status: 404 });
    }

    // Mark tip as deleted (soft delete)
    const { error: deleteError } = await supabase
      .from('community_tips')
      .update({ is_deleted: true })
      .eq('id', tipId);

    if (deleteError) {
      console.error('Error deleting tip:', deleteError);
      return NextResponse.json({ error: 'Failed to delete tip' }, { status: 500 });
    }

    // Log the admin action
    try {
      await supabase
        .from('admin_audit_log')
        .insert({
          admin_id: user.id,
          action: 'delete_tip',
          resource_type: 'community_tip',
          resource_id: tipId,
          details: {
            tip_title: tip.title,
            tip_author: tip.author_name,
            tip_category: tip.category
          }
        });
    } catch (logError) {
      // Don't fail the deletion if logging fails
      console.error('Failed to log admin action:', logError);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Tip deleted successfully'
    });

  } catch (error) {
    console.error('Error in admin tip deletion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}