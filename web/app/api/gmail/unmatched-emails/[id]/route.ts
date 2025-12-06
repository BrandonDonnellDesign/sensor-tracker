import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params (Next.js 15+ requirement)
    const { id } = await params;

    const body = await request.json();
    const { reviewed, notes } = body;

    // Update unmatched email
    const { data, error } = await supabase
      .from('unmatched_emails')
      .update({
        reviewed: reviewed ?? undefined,
        reviewed_at: reviewed ? new Date().toISOString() : undefined,
        reviewed_by: reviewed ? user.id : undefined,
        notes: notes ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      email: data,
    });
  } catch (error) {
    console.error('Failed to update unmatched email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update unmatched email';
    
    // If table doesn't exist, return a more helpful error
    if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
      return NextResponse.json(
        { 
          error: 'Database table not found',
          message: 'The unmatched_emails table does not exist. Please run the migration.',
          hint: 'Run: npx supabase db push'
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to update unmatched email',
        message: errorMessage
      },
      { status: 500 }
    );
  }
}
