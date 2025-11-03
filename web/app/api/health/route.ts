import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const startTime = Date.now();
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Test database connection
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    const responseTime = Date.now() - startTime;

    if (error) {
      return NextResponse.json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime,
        checks: {
          database: { status: 'fail', error: error.message },
          api: { status: 'pass' }
        }
      }, { status: 503 });
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime,
      checks: {
        database: { status: 'pass' },
        api: { status: 'pass' }
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime,
      checks: {
        database: { status: 'fail', error: 'Connection failed' },
        api: { status: 'fail', error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }, { status: 503 });
  }
}