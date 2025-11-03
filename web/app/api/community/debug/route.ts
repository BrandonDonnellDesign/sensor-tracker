import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const debug = {
      timestamp: new Date().toISOString(),
      tables: {} as any,
      auth: {} as any
    };

    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const userSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        
        const { data: { user }, error } = await userSupabase.auth.getUser(token);
        debug.auth = {
          hasToken: true,
          tokenLength: token.length,
          userExists: !!user,
          userId: user?.id?.substring(0, 8) + '...',
          error: error?.message
        };
      } catch (error) {
        debug.auth = { error: 'Token validation failed' };
      }
    } else {
      debug.auth = { hasToken: false };
    }

    // Check table existence
    const tablesToCheck = [
      'community_tips',
      'community_tip_votes', 
      'community_tip_comments',
      'community_comment_votes',
      'community_tip_bookmarks'
    ];

    for (const tableName of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('count')
          .limit(1);
        
        debug.tables[tableName] = {
          exists: !error,
          error: error?.message,
          hasData: !!data && data.length > 0
        };
      } catch (error) {
        debug.tables[tableName] = {
          exists: false,
          error: 'Table check failed'
        };
      }
    }

    // Check views
    const viewsToCheck = [
      'community_tips_with_stats',
      'community_comments_with_stats'
    ];

    for (const viewName of viewsToCheck) {
      try {
        const { data, error } = await supabase
          .from(viewName)
          .select('*')
          .limit(1);
        
        debug.tables[viewName] = {
          exists: !error,
          error: error?.message,
          hasData: !!data && data.length > 0
        };
      } catch (error) {
        debug.tables[viewName] = {
          exists: false,
          error: 'View check failed'
        };
      }
    }

    return NextResponse.json(debug);

  } catch (error) {
    return NextResponse.json({
      error: 'Debug check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}