import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// POST /api/insulin/bolus - Quick log bolus insulin
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      units,
      injection_site,
      notes,
      taken_at
    } = body;

    // Validate required fields
    if (!units) {
      return NextResponse.json(
        { error: 'Insulin units are required' },
        { status: 400 }
      );
    }

    // Create the insulin log entry directly
    const { data: log, error } = await supabase
      .from('insulin_logs')
      .insert({
        user_id: user.id,
        insulin_type: 'rapid', // Default for bolus
        insulin_name: 'Quick Bolus',
        units: parseFloat(units),
        delivery_type: 'bolus',
        meal_relation: 'with_meal',
        taken_at: taken_at || new Date().toISOString(),
        injection_site: injection_site || 'omnipod',
        notes: notes || null,
        logged_via: 'quick_bolus',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating insulin log:', error);
      return NextResponse.json({ error: 'Failed to log insulin' }, { status: 500 });
    }

    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    console.error('Insulin bolus API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}