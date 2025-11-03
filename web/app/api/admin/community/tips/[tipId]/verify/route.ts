import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tipId: string }> }
) {
  try {
    const { tipId } = await params;
    const { verified } = await request.json();

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

    // Get tip details for logging
    const { data: tip } = await supabase
      .from('community_tips')
      .select('id, title, author_name, is_verified')
      .eq('id', tipId)
      .single();

    if (!tip) {
      return NextResponse.json({ error: 'Tip not found' }, { status: 404 });
    }

    // Update tip verification status
    const { error: updateError } = await supabase
      .from('community_tips')
      .update({ is_verified: verified })
      .eq('id', tipId);

    if (updateError) {
      console.error('Error updating tip verification:', updateError);
      return NextResponse.json({ error: 'Failed to update tip verification' }, { status: 500 });
    }

    // Log the admin action
    try {
      await supabase
        .from('admin_audit_log')
        .insert({
          admin_id: user.id,
          action: verified ? 'verify_tip' : 'unverify_tip',
          resource_type: 'community_tip',
          resource_id: tipId,
          details: {
            tip_title: tip.title,
            tip_author: tip.author_name,
            previous_status: tip.is_verified,
            new_status: verified
          }
        });
    } catch (logError) {
      // Don't fail the update if logging fails
      console.error('Failed to log admin action:', logError);
    }

    return NextResponse.json({ 
      success: true,
      verified: verified,
      message: `Tip ${verified ? 'verified' : 'unverified'} successfully`
    });

  } catch (error) {
    console.error('Error in admin tip verification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}