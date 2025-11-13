import { schedule } from '@netlify/functions';

// This function runs every 30 minutes
const handler = schedule('*/30 * * * *', async () => {
  try {
    // Call the actual sync endpoint
    const response = await fetch(`${process.env.URL}/api/cron/myfitnesspal-sync`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
    });

    const data = await response.json();
    
    console.log('MyFitnessPal sync completed:', data);
    
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('MyFitnessPal sync error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Sync failed' 
      }),
    };
  }
});

export { handler };
