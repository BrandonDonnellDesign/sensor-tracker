import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest,
  { params }: { params: { sensorId: string } }
) {
  try {
    console.log('Sensor tags POST: Starting...');
    const resolvedParams = await params;
    console.log('Sensor tags POST: Sensor ID:', resolvedParams.sensorId);
    
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Sensor tags POST: Auth error:', authError);
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 });
    }
    
    if (!user) {
      console.error('Sensor tags POST: No user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Sensor tags POST: User authenticated:', user.id);
    
    const { tagIds } = await request.json();
    console.log('Sensor tags POST: Tag IDs to save:', tagIds);

    if (!Array.isArray(tagIds)) {
      return NextResponse.json({ error: 'tagIds must be an array' }, { status: 400 });
    }

    // Verify user owns the sensor
    const { data: sensor, error: sensorError } = await supabase
      .from('sensors')
      .select('user_id')
      .eq('id', resolvedParams.sensorId)
      .single();

    console.log('Sensor tags POST: Sensor query result:', { sensor, sensorError });

    if (sensorError || !sensor) {
      return NextResponse.json({ error: 'Sensor not found' }, { status: 404 });
    }

    if (sensor.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // First, remove all existing tags for this sensor
    console.log('Sensor tags POST: Deleting existing tags...');
    const { error: deleteError } = await supabase
      .from('sensor_tags')
      .delete()
      .eq('sensor_id', resolvedParams.sensorId);

    if (deleteError) {
      console.error('Sensor tags POST: Delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to clear existing tags' }, { status: 500 });
    }

    // Then add the new tags
    if (tagIds.length > 0) {
      console.log('Sensor tags POST: Inserting new tags...');
      const sensorTags = tagIds.map(tagId => ({
        sensor_id: resolvedParams.sensorId,
        tag_id: tagId
      }));

      console.log('Sensor tags POST: Sensor tags to insert:', sensorTags);

      const { error: insertError } = await supabase
        .from('sensor_tags')
        .insert(sensorTags);

      if (insertError) {
        console.error('Sensor tags POST: Insert error:', insertError);
        return NextResponse.json({ error: 'Failed to update sensor tags' }, { status: 500 });
      }
    }

    console.log('Sensor tags POST: Success!');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error updating sensor tags:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { sensorId: string } }
) {
  try {
    const resolvedParams = await params;
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: sensorTags, error } = await supabase
      .from('sensor_tags')
      .select(`
        id,
        tag_id,
        tags:tag_id (
          id,
          name,
          category,
          description,
          color,
          created_at
        )
      `)
      .eq('sensor_id', resolvedParams.sensorId);

    if (error) {
      console.error('Error fetching sensor tags:', error);
      return NextResponse.json({ error: 'Failed to fetch sensor tags' }, { status: 500 });
    }

    return NextResponse.json(sensorTags);
  } catch (error) {
    console.error('Unexpected error fetching sensor tags:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}