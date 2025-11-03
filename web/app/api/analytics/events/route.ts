import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface UserEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: string;
  user_id?: string;
  url?: string;
  user_agent?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const eventData: UserEvent = await request.json();
    
    // Store user event
    const { error } = await supabase
      .from('user_events')
      .insert({
        user_id: eventData.user_id || null,
        event_name: eventData.event,
        event_properties: eventData.properties || {},
        page_url: eventData.url || request.headers.get('referer'),
        user_agent: request.headers.get('user-agent'),
        timestamp: eventData.timestamp || new Date().toISOString(),
      });

    if (error) {
      console.error('Error storing user event:', error);
      return NextResponse.json({ error: 'Failed to store event' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User events API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}