import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // In a real app, you'd get the user ID from authentication
    // For now, we'll use a placeholder or session-based approach
    const userId = request.headers.get('x-user-id') || 'demo-user';

    const { data, error } = await supabase
      .from('user_calculator_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching calculator settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch calculator settings' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'No settings found' },
        { status: 404 }
      );
    }

    // Return the settings
    return NextResponse.json({
      insulinToCarb: data.insulin_to_carb,
      correctionFactor: data.correction_factor,
      targetGlucose: data.target_glucose,
      rapidActingDuration: data.rapid_acting_duration,
      shortActingDuration: data.short_acting_duration
    });

  } catch (error) {
    console.error('Error in calculator settings GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      insulinToCarb, 
      correctionFactor, 
      targetGlucose, 
      rapidActingDuration, 
      shortActingDuration 
    } = body;

    // Validate the input
    if (!insulinToCarb || !correctionFactor || !targetGlucose || !rapidActingDuration || !shortActingDuration) {
      return NextResponse.json(
        { error: 'Missing required settings' },
        { status: 400 }
      );
    }

    // In a real app, you'd get the user ID from authentication
    const userId = request.headers.get('x-user-id') || 'demo-user';

    // Upsert the settings
    const { data, error } = await supabase
      .from('user_calculator_settings')
      .upsert({
        user_id: userId,
        insulin_to_carb: insulinToCarb,
        correction_factor: correctionFactor,
        target_glucose: targetGlucose,
        rapid_acting_duration: rapidActingDuration,
        short_acting_duration: shortActingDuration,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving calculator settings:', error);
      return NextResponse.json(
        { error: 'Failed to save calculator settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Calculator settings saved successfully',
      settings: {
        insulinToCarb: data.insulin_to_carb,
        correctionFactor: data.correction_factor,
        targetGlucose: data.target_glucose,
        rapidActingDuration: data.rapid_acting_duration,
        shortActingDuration: data.short_acting_duration
      }
    });

  } catch (error) {
    console.error('Error in calculator settings POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}