import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminClient = createAdminClient();
    
    const { data: template, error } = await adminClient
      .from('notification_templates')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error fetching notification template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification template' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminClient = createAdminClient();
    const body = await request.json();

    const { data: template, error } = await adminClient
      .from('notification_templates')
      .update({
        name: body.name,
        type: body.type,
        title_template: body.titleTemplate,
        message_template: body.messageTemplate,
        is_active: body.isActive,
        variables: body.variables || null,
        ab_test_group: body.abTestGroup || null,
        ab_test_weight: body.abTestWeight || 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error updating notification template:', error);
    return NextResponse.json(
      { error: 'Failed to update notification template' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from('notification_templates')
      .delete()
      .eq('id', params.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification template:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification template' },
      { status: 500 }
    );
  }
}