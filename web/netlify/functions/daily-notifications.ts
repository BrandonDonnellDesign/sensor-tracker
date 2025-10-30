
import { Handler } from '@netlify/functions';
// Node 18+ has global fetch, but for older Netlify runtimes, import node-fetch
// Uncomment the next line if you get fetch not defined errors:
// import fetch from 'node-fetch';

// Use 'any' for event/context to suppress type errors if types are missing
const handler: Handler = async (event: any, _context: any) => {
  // Only allow POST requests or scheduled triggers
  if (event.httpMethod && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Get the site URL from environment or use default
    const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:3000';

    // Call your existing notifications API endpoint
    const response = await fetch(`${siteUrl}/api/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'generate' }),
    });

    let result: any = {};
    try {
      result = await response.json();
    } catch (jsonError) {
      // If response is not JSON, fallback to text
      result = { error: await response.text() };
    }

    if (!response.ok) {
      throw new Error(`API call failed: ${result.error || response.statusText}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Daily notifications generated successfully',
        result,
      }),
    };

  } catch (error: any) {
    console.error('Error in daily notifications function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error?.message || 'Unknown error',
      }),
    };
  }
};

export { handler };