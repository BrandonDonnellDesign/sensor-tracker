import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { backfillCGMReadings } from '@/lib/insulin-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const lookbackHours = body.lookbackHours || 2;
    
    const result = await backfillCGMReadings(user.id, lookbackHours);
    
    return NextResponse.json({
      success: true,
      ...result,
      message: `Updated ${result.meals_updated} meals and ${result.insulin_updated} insulin doses`
    });
  } catch (error) {
    console.error('Error backfilling CGM readings:', error);
    return NextResponse.json(
      { error: 'Failed to backfill CGM readings' },
      { status: 500 }
    );
  }
}
