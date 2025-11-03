import { NextRequest, NextResponse } from 'next/server';
import { alertSystem } from '@/lib/monitoring/alert-system';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'check') {
      // Run alert checks and return new alerts
      const newAlerts = await alertSystem.checkAlerts();
      return NextResponse.json({ alerts: newAlerts });
    } else {
      // Return active alerts
      const activeAlerts = await alertSystem.getActiveAlerts();
      return NextResponse.json({ alerts: activeAlerts });
    }
  } catch (error) {
    console.error('Error in alerts API:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, alertId } = body;

    if (action === 'resolve' && alertId) {
      // Mark alert as resolved (you could implement this in the alert system)
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in alerts API POST:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}