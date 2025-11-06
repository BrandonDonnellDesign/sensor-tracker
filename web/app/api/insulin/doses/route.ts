import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { logInsulinDose } from '@/lib/insulin-service';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    
    // Query insulin logs directly
    let query = supabase
      .from('insulin_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('taken_at', { ascending: false });
    
    if (startDate) {
      query = query.gte('taken_at', startDate.toISOString());
    }
    
    if (endDate) {
      query = query.lte('taken_at', endDate.toISOString());
    }
    
    const { data: doses, error: queryError } = await query.limit(limit);
    
    if (queryError) {
      console.error('Query error:', queryError);
      return NextResponse.json({ error: 'Database query failed', details: queryError.message }, { status: 500 });
    }
    
    // Transform the data to match what the hook expects
    const transformedDoses = (doses || []).map(dose => ({
      id: dose.id,
      amount: dose.units,
      type: dose.insulin_type || 'rapid',
      timestamp: dose.taken_at,
      meal_carbs: null, // This would come from linked meal data
      pre_glucose: dose.blood_glucose_before || null,
      post_glucose: dose.blood_glucose_after || null,
      notes: dose.notes
    }));

    
    return NextResponse.json({ 
      doses: transformedDoses,
      total: doses?.length || 0
    });
  } catch (error) {
    console.error('Error fetching insulin doses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insulin doses', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const dose = await logInsulinDose({
      ...body,
      user_id: user.id,
      dosed_at: body.dosed_at || new Date().toISOString()
    });
    
    return NextResponse.json(dose, { status: 201 });
  } catch (error) {
    console.error('Error logging insulin dose:', error);
    return NextResponse.json(
      { error: 'Failed to log insulin dose' },
      { status: 500 }
    );
  }
}
