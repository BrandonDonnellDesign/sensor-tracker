import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sensorId = searchParams.get('sensorId');
    const userId = request.headers.get('x-user-id') || 'demo-user';

    let query = supabase
      .from('cgm_issues')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (sensorId) {
      query = query.eq('sensor_id', sensorId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching CGM issues:', error);
      return NextResponse.json(
        { error: 'Failed to fetch CGM issues' },
        { status: 500 }
      );
    }

    // Transform data for frontend
    const issues = data?.map(issue => ({
      id: issue.id,
      sensorId: issue.sensor_id,
      sensorLotNumber: issue.sensor_lot_number,
      issueType: issue.issue_type,
      severity: issue.severity,
      description: issue.description,
      startTime: new Date(issue.start_time),
      endTime: issue.end_time ? new Date(issue.end_time) : null,
      warrantyClaimNumber: issue.warranty_claim_number,
      replacementSent: issue.replacement_sent,
      replacementTrackingNumber: issue.replacement_tracking_number,
      status: issue.status,
      contactMethod: issue.contact_method,
      manufacturerResponse: issue.manufacturer_response,
      notes: issue.notes,
      createdAt: new Date(issue.created_at),
      updatedAt: issue.updated_at ? new Date(issue.updated_at) : null
    })) || [];

    return NextResponse.json({ issues });

  } catch (error) {
    console.error('Error in CGM issues GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = request.headers.get('x-user-id') || 'demo-user';

    const {
      sensorId,
      issueType,
      severity,
      description,
      sensorLotNumber,
      meterReadings,
      contactMethod,
      notes
    } = body;

    // Validate required fields
    if (!sensorId || !issueType || !severity || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate a warranty claim number
    const claimNumber = `WC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    const { data, error } = await supabase
      .from('cgm_issues')
      .insert({
        user_id: userId,
        sensor_id: sensorId,
        sensor_lot_number: sensorLotNumber,
        issue_type: issueType,
        severity: severity,
        description: description,
        start_time: new Date().toISOString(),
        warranty_claim_number: claimNumber,
        status: 'reported',
        contact_method: contactMethod,
        meter_readings: meterReadings,
        notes: notes,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating CGM issue:', error);
      return NextResponse.json(
        { error: 'Failed to create CGM issue report' },
        { status: 500 }
      );
    }

    // Transform response
    const issue = {
      id: data.id,
      sensorId: data.sensor_id,
      sensorLotNumber: data.sensor_lot_number,
      issueType: data.issue_type,
      severity: data.severity,
      description: data.description,
      startTime: new Date(data.start_time),
      warrantyClaimNumber: data.warranty_claim_number,
      status: data.status,
      contactMethod: data.contact_method,
      meterReadings: data.meter_readings,
      notes: data.notes,
      createdAt: new Date(data.created_at)
    };

    return NextResponse.json({
      message: 'CGM issue reported successfully',
      issue,
      claimNumber
    });

  } catch (error) {
    console.error('Error in CGM issues POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = request.headers.get('x-user-id') || 'demo-user';

    const {
      issueId,
      status,
      manufacturerResponse,
      replacementSent,
      replacementTrackingNumber,
      endTime,
      notes
    } = body;

    if (!issueId) {
      return NextResponse.json(
        { error: 'Issue ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (status) updateData.status = status;
    if (manufacturerResponse) updateData.manufacturer_response = manufacturerResponse;
    if (replacementSent !== undefined) updateData.replacement_sent = replacementSent;
    if (replacementTrackingNumber) updateData.replacement_tracking_number = replacementTrackingNumber;
    if (endTime) updateData.end_time = endTime;
    if (notes) updateData.notes = notes;

    const { data, error } = await supabase
      .from('cgm_issues')
      .update(updateData)
      .eq('id', issueId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating CGM issue:', error);
      return NextResponse.json(
        { error: 'Failed to update CGM issue' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'CGM issue updated successfully',
      issue: data
    });

  } catch (error) {
    console.error('Error in CGM issues PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}