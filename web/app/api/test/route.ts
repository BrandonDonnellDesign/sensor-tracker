import { NextResponse } from 'next/server';

export async function GET() {
  console.log('🧪 Test API endpoint called');
  
  return NextResponse.json({
    success: true,
    message: 'API routing is working',
    timestamp: new Date().toISOString()
  });
}