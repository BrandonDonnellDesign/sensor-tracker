import { NextRequest, NextResponse } from 'next/server';
import { sensorExpirationAlertService } from '@/lib/notifications/sensor-expiration-alerts';

/**
 * Cron job endpoint for checking sensor expirations
 * This should be called periodically (e.g., every 6 hours) by a cron service
 * 
 * Usage with Vercel Cron:
 * Add to vercel.json:
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/sensor-expiration-check",
 *       "schedule": "0 star-slash-6 star star star"
 *     }
 *   ]
 * }
 * Note: Replace star-slash with the actual cron syntax
 */

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting sensor expiration check...');
    const startTime = Date.now();

    // Run the sensor expiration check
    const result = await sensorExpirationAlertService.checkAndGenerateAlerts();

    const duration = Date.now() - startTime;

    console.log('Sensor expiration check completed:', {
      success: result.success,
      alertsGenerated: result.alertsGenerated,
      sensorsChecked: result.sensorsChecked,
      duration: `${duration}ms`,
      errors: result.errors
    });

    // Return detailed results
    return NextResponse.json({
      success: result.success,
      message: `Checked ${result.sensorsChecked} sensors, generated ${result.alertsGenerated} alerts`,
      details: {
        sensorsChecked: result.sensorsChecked,
        alertsGenerated: result.alertsGenerated,
        duration: `${duration}ms`,
        errors: result.errors,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Cron job error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Allow manual triggering of the cron job for testing
  return GET(request);
}