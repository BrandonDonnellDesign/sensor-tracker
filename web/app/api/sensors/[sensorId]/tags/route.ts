import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-client';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sensorId: string }> }
) {
  const { sensorId } = await params;
  try {
    const supabase = createClient();
    const { data: tags, error } = await supabase
      .from('sensor_tags')
      .select(`
        tag_id,
        tags (
          id,
          name,
          category,
          color,
          description
        )
      `)
      .eq('sensor_id', sensorId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tags: tags || [] });
  } catch (error) {
    console.error('Error fetching sensor tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sensor tags' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sensorId: string }> }
) {
  const { sensorId } = await params;
  try {
    const { tagId } = await request.json();

    const supabase = createClient();
    const { error } = await supabase
      .from('sensor_tags')
      .insert({
        sensor_id: sensorId,
        tag_id: tagId
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding sensor tag:', error);
    return NextResponse.json(
      { error: 'Failed to add sensor tag' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sensorId: string }> }
) {
  const { sensorId } = await params;
  try {
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('tagId');

    if (!tagId) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 });
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('sensor_tags')
      .delete()
      .eq('sensor_id', sensorId)
      .eq('tag_id', tagId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing sensor tag:', error);
    return NextResponse.json(
      { error: 'Failed to remove sensor tag' },
      { status: 500 }
    );
  }
}