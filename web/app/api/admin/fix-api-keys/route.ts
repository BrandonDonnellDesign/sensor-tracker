import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(_request: NextRequest) {
  try {
    // Get the first user from profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (profileError || !profiles || profiles.length === 0) {
      return NextResponse.json({ 
        error: 'No users found',
        details: 'Cannot find a user to associate with API keys'
      }, { status: 404 });
    }
    
    const userId = profiles[0].id;
    
    // Update all API keys without a user_id
    const { data: updated, error: updateError } = await supabase
      .from('api_keys')
      .update({ user_id: userId })
      .is('user_id', null)
      .select();
    
    if (updateError) {
      return NextResponse.json({ 
        error: 'Update failed',
        details: updateError.message
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Updated ${updated?.length || 0} API keys`,
      userId,
      updatedKeys: updated?.map(k => ({
        id: k.id,
        name: k.name,
        key_prefix: k.key_prefix
      }))
    });
    
  } catch (error) {
    console.error('Error fixing API keys:', error);
    return NextResponse.json({ 
      error: 'Internal error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
