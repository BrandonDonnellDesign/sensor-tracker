import { NextResponse } from 'next/server';

export async function GET() {
  const apiInfo = {
    name: 'Sensor Tracker Community API',
    version: '1.0.0',
    description: 'Public API for accessing community tips and sensor data',
    documentation: {
      interactive: '/docs',
      openapi: '/api/v1/docs',
      readme: '/docs/API_DOCUMENTATION.md'
    },
    endpoints: {
      tips: '/api/v1/community/tips',
      comments: '/api/v1/community/comments', 
      categories: '/api/v1/community/categories',
      search: '/api/v1/community/search'
    },
    authentication: {
      methods: ['API Key', 'JWT Bearer Token'],
      headers: {
        apiKey: 'X-API-Key',
        bearer: 'Authorization: Bearer <token>'
      }
    },
    rateLimit: {
      free: '100 requests/hour',
      basic: '1,000 requests/hour',
      premium: '10,000 requests/hour'
    },
    support: {
      email: 'api@sensortracker.com',
      documentation: process.env.NEXT_PUBLIC_APP_URL + '/docs'
    }
  };

  return NextResponse.json(apiInfo, {
    headers: {
      'Cache-Control': 'public, max-age=3600'
    }
  });
}