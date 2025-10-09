import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const active = searchParams.get('active');

    let query = adminClient
      .from('notification_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    if (active !== null) {
      query = query.eq('is_active', active === 'true');
    }

    const { data: templates, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching notification templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const body = await request.json();

    const { data: template, error } = await adminClient
      .from('notification_templates')
      .insert({
        name: body.name,
        type: body.type,
        title_template: body.titleTemplate,
        message_template: body.messageTemplate,
        is_active: body.isActive ?? true,
        variables: body.variables || null,
        ab_test_group: body.abTestGroup || null,
        ab_test_weight: body.abTestWeight || 1
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating notification template:', error);
    return NextResponse.json(
      { error: 'Failed to create notification template' },
      { status: 500 }
    );
  }
}