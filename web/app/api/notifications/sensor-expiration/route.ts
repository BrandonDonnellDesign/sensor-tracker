import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { sensorExpirationAlertService } from '@/lib/notifications/sensor-expiration-alerts';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'check';
    const days = parseInt(searchParams.get('days') || '7');

    switch (action) {
      case 'check':
        // Check and generate alerts for current user's sensors
        const result = await sensorExpirationAlertService.checkAndGenerateAlerts();
        return NextResponse.json(result);

      case 'expiring':
        // Get sensors expiring within specified days
        const expiringSensors = await sensorExpirationAlertService.getSensorsExpiringWithin(days);
        return NextResponse.json({ sensors: expiringSensors });

      case 'stats':
        // Get alert statistics
        const timeRange = searchParams.get('timeRange') as '24h' | '7d' | '30d' || '7d';
        const stats = await sensorExpirationAlertService.getAlertStats(timeRange);
        return NextResponse.json(stats);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Sensor expiration API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, sensorIds } = body;

    switch (action) {
      case 'force_check':
        // Force check specific sensors for expiration alerts
        if (!sensorIds || !Array.isArray(sensorIds)) {
          return NextResponse.json({ error: 'sensorIds array required' }, { status: 400 });
        }

        // This would require extending the service to check specific sensors
        const result = await sensorExpirationAlertService.checkAndGenerateAlerts();
        return NextResponse.json(result);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Sensor expiration POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}