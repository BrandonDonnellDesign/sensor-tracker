import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Test 1: Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      return NextResponse.json({
        test: 'auth_test',
        success: false,
        error: 'Authentication error',
        details: authError.message
      });
    }
    
    if (!user) {
      return NextResponse.json({
        test: 'auth_test',
        success: false,
        error: 'No user found',
        details: 'User session not found'
      });
    }
    
    // Test 2: Check if api_keys table exists
    try {
      const { error: tableError } = await supabase
        .from('api_keys')
        .select('count')
        .limit(1);
        
      if (tableError) {
        return NextResponse.json({
          test: 'database_test',
          success: false,
          error: 'Table access error',
          details: tableError.message,
          user: {
            id: user.id,
            email: user.email
          }
        });
      }
      
      return NextResponse.json({
        test: 'complete',
        success: true,
        user: {
          id: user.id,
          email: user.email
        },
        database: 'api_keys table accessible'
      });
      
    } catch (dbError) {
      return NextResponse.json({
        test: 'database_test',
        success: false,
        error: 'Database error',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error',
        user: {
          id: user.id,
          email: user.email
        }
      });
    }
    
  } catch (error) {
    return NextResponse.json({
      test: 'general_error',
      success: false,
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
