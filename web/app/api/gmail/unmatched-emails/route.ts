import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get unmatched emails
    const { data: emails, error } = await supabase
      .from('unmatched_emails')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.warn('Could not fetch unmatched emails:', error);
      // Return empty array if table doesn't exist yet
      return NextResponse.json({
        success: true,
        emails: [],
      });
    }

    return NextResponse.json({
      success: true,
      emails: emails || [],
    });
  } catch (error) {
    console.error('Failed to fetch unmatched emails:', error);
    // Return empty data instead of error
    return NextResponse.json({
      success: true,
      emails: [],
    });
  }
}
