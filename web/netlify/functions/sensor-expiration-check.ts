import { schedule } from '@netlify/functions';

// This function runs every 6 hours
const handler = schedule('0 */6 * * *', async () => {
  try {
    // Call the actual sensor check endpoint
    const response = await fetch(`${process.env.URL}/api/cron/sensor-expiration-check`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
    });

    const data = await response.json();
    
    console.log('Sensor expiration check completed:', data);
    
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Sensor expiration check error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Check failed' 
      }),
    };
  }
});

export { handler };
