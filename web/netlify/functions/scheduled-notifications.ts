import { schedule } from '@netlify/functions';

// Enhanced scheduled function that runs every 5 minutes to generate notifications
// Now includes sensor expiration alerts alongside existing notifications
const handler = schedule('*/5 * * * *', async (_event, _context) => {
  try {
    console.log('🔄 Running enhanced scheduled notification generation...');
    
    const results: {
      generalNotifications: any;
      sensorExpirationAlerts: any;
      errors: string[];
    } = {
      generalNotifications: null,
      sensorExpirationAlerts: null,
      errors: []
    };
    
    // 1. Generate general notifications (existing system)
    try {
      const generalResponse = await fetch(`${process.env.URL}/api/cron/generate-notifications`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (generalResponse.ok) {
        results.generalNotifications = await generalResponse.json();
        console.log('✅ General notifications completed:', results.generalNotifications);
      } else {
        throw new Error(`General notifications failed: HTTP ${generalResponse.status}`);
      }
    } catch (error) {
      const errorMsg = `General notifications error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌', errorMsg);
      results.errors.push(errorMsg);
    }
    
    // 2. Generate sensor expiration alerts (new system)
    try {
      const sensorResponse = await fetch(`${process.env.URL}/api/notifications/sensor-expiration`, {
        method: 'POST',
        headers: {
          'x-cron-secret': process.env.CRON_SECRET || '',
          'Content-Type': 'application/json'
        }
      });
      
      if (sensorResponse.ok) {
        results.sensorExpirationAlerts = await sensorResponse.json();
        console.log('✅ Sensor expiration alerts completed:', results.sensorExpirationAlerts);
      } else {
        throw new Error(`Sensor alerts failed: HTTP ${sensorResponse.status}`);
      }
    } catch (error) {
      const errorMsg = `Sensor expiration alerts error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌', errorMsg);
      results.errors.push(errorMsg);
    }
    
    // Calculate totals
    const totalNotifications = (results.generalNotifications?.totalNotifications || 0) + 
                              (results.sensorExpirationAlerts?.data?.alertsGenerated || 0);
    const totalProcessed = (results.generalNotifications?.processedUsers || 0) + 
                          (results.sensorExpirationAlerts?.data?.sensorsChecked || 0);
    
    console.log('📊 Enhanced notification summary:', {
      totalNotifications,
      totalProcessed,
      generalNotifications: results.generalNotifications?.totalNotifications || 0,
      sensorAlerts: results.sensorExpirationAlerts?.data?.alertsGenerated || 0,
      errors: results.errors.length,
      timestamp: new Date().toISOString()
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: results.errors.length === 0,
        message: results.errors.length === 0 
          ? 'Enhanced notifications generated successfully'
          : `Completed with ${results.errors.length} error(s)`,
        totalNotifications,
        totalProcessed,
        details: results,
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('❌ Critical scheduled notification error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false,
        error: 'Critical failure in notification generation',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    };
  }
});

export { handler };