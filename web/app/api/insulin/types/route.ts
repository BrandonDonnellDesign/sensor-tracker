import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getInsulinTypes, createInsulinType } from '@/lib/insulin-service';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const types = await getInsulinTypes(user.id);
    return NextResponse.json(types);
  } catch (error) {
    console.error('Error fetching insulin types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insulin types' },
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
    const insulinType = await createInsulinType({
      ...body,
      user_id: user.id,
      is_active: true
    });
    
    return NextResponse.json(insulinType, { status: 201 });
  } catch (error) {
    console.error('Error creating insulin type:', error);
    return NextResponse.json(
      { error: 'Failed to create insulin type' },
      { status: 500 }
    );
  }
}
