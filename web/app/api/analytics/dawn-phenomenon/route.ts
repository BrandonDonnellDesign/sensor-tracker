import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { DawnPhenomenonDetector } from '@/lib/analytics/dawn-phenomenon-detector';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysToAnalyze = parseInt(searchParams.get('days') || '14');
    
    // Get user from session
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.json(
        { error: 'Authentication error', details: sessionError.message },
        { status: 401 }
      );
    }
    
    if (!session?.user) {
      console.error('No session or user found');
      return NextResponse.json(
        { error: 'Authentication required', details: 'No active session' },
        { status: 401 }
      );
    }

    // Validate days parameter
    if (daysToAnalyze < 7 || daysToAnalyze > 90) {
      return NextResponse.json(
        { error: 'Days to analyze must be between 7 and 90' },
        { status: 400 }
      );
    }

    // Create detector with admin client for server-side analysis
    const detector = new DawnPhenomenonDetector(true);
    
    // Perform analysis
    const analysis = await detector.analyzeDawnPhenomenon(session.user.id, daysToAnalyze);
    
    return NextResponse.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('Dawn phenomenon analysis error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to analyze dawn phenomenon',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, endDate } = body;
    
    // Get user from session
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate date parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (end <= start) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Create detector with admin client for server-side analysis
    const detector = new DawnPhenomenonDetector(true);
    
    // Get dawn phenomenon data for the specified date range
    const data = await detector.getDawnPhenomenonData(session.user.id, start, end);
    
    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Dawn phenomenon data fetch error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch dawn phenomenon data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}