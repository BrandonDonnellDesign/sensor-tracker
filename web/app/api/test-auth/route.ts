import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  console.log('🧪 Test auth API called');
  console.log('🍪 Request cookies:', request.cookies.getAll().map(c => `${c.name}=${c.value.substring(0, 20)}...`));
  
  try {
    const supabase = await createClient();
    
    // Get user from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('🔐 Test auth check:', { 
      hasUser: !!user, 
      userId: user?.id?.substring(0, 8) + '...', 
      authError: authError?.message 
    });
    
    if (authError) {
      return NextResponse.json({ 
        authenticated: false,
        error: authError.message,
        details: 'Authentication error occurred',
        cookies: request.cookies.getAll().map(c => c.name)
      });
    }
    
    if (!user) {
      return NextResponse.json({ 
        authenticated: false,
        message: 'No user session found',
        cookies: request.cookies.getAll().map(c => c.name)
      });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      profile: profile || null,
      profileError: profileError?.message || null,
      cookies: request.cookies.getAll().map(c => c.name)
    });

  } catch (error) {
    console.error('Error in test-auth API:', error);
    return NextResponse.json(
      { 
        authenticated: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}