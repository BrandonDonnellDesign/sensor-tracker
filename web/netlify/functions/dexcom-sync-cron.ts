import { Handler, schedule } from '@netlify/functions';

// Netlify Scheduled Function - runs every 15 minutes
const handler: Handler = schedule('*/15 * * * *', async (_event, _context) => {
  console.log('🕐 Starting scheduled Dexcom sync for all users');
  
  try {
    // Get the site URL from environment or construct it
    const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:3000';
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret) {
      console.error('CRON_SECRET environment variable not set');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Configuration error' })
      };
    }

    // Call our cron API endpoint
    const response = await fetch(`${siteUrl}/api/cron/dexcom-sync`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Scheduled sync completed:', result);
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Scheduled Dexcom sync completed',
          result
        })
      };
    } else {
      console.error('❌ Scheduled sync failed:', result);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          success: false,
          error: 'Sync failed',
          details: result
        })
      };
    }

  } catch (error) {
    console.error('❌ Scheduled sync error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
});

export { handler };