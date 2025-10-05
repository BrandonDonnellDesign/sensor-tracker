import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Generate a secure state parameter
    const state = crypto.randomUUID();
    
    // Get configuration from environment
    const clientId = process.env.DEXCOM_CLIENT_ID;
    const redirectUri = process.env.DEXCOM_REDIRECT_URI;
    const authBaseUrl = process.env.DEXCOM_AUTH_BASE_URL;
    
    // Validate required environment variables
    if (!clientId || !redirectUri || !authBaseUrl) {
      return NextResponse.json(
        { error: 'Missing Dexcom configuration' },
        { status: 500 }
      );
    }
    
    // Build OAuth authorization URL
    const authUrl = new URL(`${authBaseUrl}/oauth2/login`);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'offline_access');
    authUrl.searchParams.set('state', state);
    
    return NextResponse.json({
      authUrl: authUrl.toString(),
      state
    });
    
  } catch (error) {
    console.error('Error generating Dexcom auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    );
  }
}