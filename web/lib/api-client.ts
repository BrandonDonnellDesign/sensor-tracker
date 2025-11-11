import { createClient } from '@/lib/supabase-client';

/**
 * Make an authenticated API request
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  // Get the current session
  const supabase = createClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error('Error getting session:', sessionError);
    throw new Error('Failed to get authentication session');
  }
  
  if (!session?.access_token) {
    console.error('No access token available');
    throw new Error('Not authenticated');
  }
  
  const headers = new Headers(options.headers);
  
  // Add authorization header
  headers.set('Authorization', `Bearer ${session.access_token}`);
  
  // Add content-type if not already set and we have a body
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  // Debug logging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    const tokenParts = session.access_token.split('.');
    console.log('API Request:', {
      url,
      method: options.method || 'GET',
      hasToken: !!session.access_token,
      tokenLength: session.access_token.length,
      tokenParts: tokenParts.length,
      firstPart: tokenParts[0]?.substring(0, 20),
      authHeader: `Bearer ${session.access_token.substring(0, 20)}...`
    });
    
    // Validate token before sending
    if (tokenParts.length !== 3) {
      console.error('⚠️ WARNING: Token is malformed before sending!', {
        tokenParts: tokenParts.length,
        token: session.access_token
      });
    }
  }
  
  return fetch(url, {
    ...options,
    headers
  });
}

/**
 * Make an authenticated API request and parse JSON response
 */
export async function authenticatedFetchJson<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await authenticatedFetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${errorText}`);
  }
  
  return response.json();
}