import { schedule } from '@netlify/functions';

// Scheduled function that runs every 5 minutes to generate notifications
const handler = schedule('*/5 * * * *', async (_event, _context) => {
  try {
    console.log('🔄 Running scheduled notification generation...');
    
    // Call our existing cron API endpoint
    const response = await fetch(`${process.env.URL}/api/cron/generate-notifications`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    console.log('✅ Notification generation completed:', {
      processedUsers: result.processedUsers,
      totalNotifications: result.totalNotifications,
      timestamp: result.timestamp
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'Notifications generated successfully',
        ...result 
      })
    };
    
  } catch (error) {
    console.error('❌ Scheduled notification error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false,
        error: 'Failed to generate notifications',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
});

export { handler };