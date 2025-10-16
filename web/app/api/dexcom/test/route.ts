import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Simple test endpoint to verify Dexcom configuration
  const clientId = process.env.DEXCOM_CLIENT_ID;
  const clientSecret = process.env.DEXCOM_CLIENT_SECRET;
  const publicClientId = process.env.NEXT_PUBLIC_DEXCOM_CLIENT_ID;
  const apiBaseUrl = process.env.DEXCOM_API_BASE_URL;
  const redirectUri = process.env.DEXCOM_REDIRECT_URI;
  const publicRedirectUri = process.env.NEXT_PUBLIC_DEXCOM_REDIRECT_URI;

  return NextResponse.json({
    configured: {
      client_id: !!clientId,
      client_secret: !!clientSecret,
      public_client_id: !!publicClientId,
      api_base_url: !!apiBaseUrl,
      redirect_uri: !!redirectUri,
      public_redirect_uri: !!publicRedirectUri
    },
    values: {
      client_id: clientId ? `${clientId.substring(0, 8)}...` : 'Not set',
      public_client_id: publicClientId ? `${publicClientId.substring(0, 8)}...` : 'Not set',
      api_base_url: apiBaseUrl || 'Not set',
      redirect_uri: redirectUri || `${request.nextUrl.origin}/api/auth/dexcom/callback`,
      public_redirect_uri: publicRedirectUri || 'Not set',
      auto_detected_origin: request.nextUrl.origin
    }
  });
}