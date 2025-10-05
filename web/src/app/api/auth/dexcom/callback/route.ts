import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Log the callback for debugging
  console.log('Dexcom OAuth callback received:', {
    code: code ? 'present' : 'missing',
    state: state ? state : 'missing',
    error: error || 'none'
  });

  // For testing, just redirect to the callback page with the parameters
  const callbackUrl = new URL('/auth/dexcom/callback', request.url);
  callbackUrl.searchParams.set('code', code || '');
  callbackUrl.searchParams.set('state', state || '');
  if (error) {
    callbackUrl.searchParams.set('error', error);
  }

  return NextResponse.redirect(callbackUrl);
}