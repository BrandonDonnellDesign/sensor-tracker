import { Handler, schedule } from '@netlify/functions';

// Netlify Scheduled Function - runs every hour to refresh expiring tokens
const handler: Handler = schedule('0 * * * *', async (_event, _context) => {
  console.log('🔑 Starting scheduled Dexcom token refresh');
  
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

    // Call our token refresh cron API endpoint
    const response = await fetch(`${siteUrl}/api/cron/dexcom-refresh`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Scheduled token refresh completed:', result);
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Scheduled Dexcom token refresh completed',
          result
        })
      };
    } else {
      console.error('❌ Scheduled token refresh failed:', result);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          success: false,
          error: 'Token refresh failed',
          details: result
        })
      };
    }

  } catch (error) {
    console.error('❌ Scheduled token refresh error:', error);
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