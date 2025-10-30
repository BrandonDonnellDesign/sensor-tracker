import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getInsulinDoses, logInsulinDose } from '@/lib/insulin-service';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    
    const doses = await getInsulinDoses(user.id, startDate, endDate);
    return NextResponse.json(doses);
  } catch (error) {
    console.error('Error fetching insulin doses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insulin doses' },
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
