import { NextRequest, NextResponse } from 'next/server';
import { databaseMaintenance } from '@/lib/database/maintenance';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'stats':
        const stats = await databaseMaintenance.getDatabaseStats();
        return NextResponse.json(stats);

      case 'insights':
        const insights = await databaseMaintenance.getPerformanceInsights();
        return NextResponse.json({ insights });

      case 'user-stats':
        const daysBack = parseInt(searchParams.get('days') || '30');
        const userStats = await databaseMaintenance.getUserStats(daysBack);
        return NextResponse.json({ stats: userStats });

      case 'sensor-stats':
        const sensorDays = parseInt(searchParams.get('days') || '30');
        const sensorStats = await databaseMaintenance.getSensorStats(sensorDays);
        return NextResponse.json({ stats: sensorStats });

      default:
        // Return general database health info
        const shouldRun = await databaseMaintenance.shouldRunMaintenance();
        return NextResponse.json({ 
          maintenanceNeeded: shouldRun,
          timestamp: new Date().toISOString()
        });
    }
  } catch (error) {
    console.error('Error in database API:', error);
    return NextResponse.json({ error: 'Failed to fetch database information' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'refresh-views':
        const refreshResult = await databaseMaintenance.refreshAnalyticsViews();
        return NextResponse.json(refreshResult);

      case 'cleanup':
        const cleanupResult = await databaseMaintenance.cleanupOldData();
        return NextResponse.json(cleanupResult);

      case 'run-maintenance':
        const maintenanceResults = await databaseMaintenance.runMaintenanceTasks();
        return NextResponse.json({ tasks: maintenanceResults });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in database API POST:', error);
    return NextResponse.json({ error: 'Failed to execute database operation' }, { status: 500 });
  }
}