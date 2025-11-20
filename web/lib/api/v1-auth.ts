/**
 * V1 API Authentication Helper
 * Supports both session-based and API key authentication
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export interface AuthResult {
  user: { id: string } | null;
  error?: string;
  supabase: any; // Regular client for reads
  supabaseAdmin: any; // Admin client for writes (bypasses RLS)
}

/**
 * Authenticate a v1 API request
 * Supports both session auth and API key auth
 */
export async function authenticateV1Request(req: NextRequest): Promise<AuthResult> {
  const supabase = await createClient();
  const supabaseAdmin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Try session auth first
  const { data: { user: sessionUser } } = await supabase.auth.getUser();
  
  if (sessionUser) {
    return {
      user: sessionUser,
      supabase,
      supabaseAdmin: supabase // Use regular client for session auth
    };
  }

  // Try API key auth
  const authHeader = req.headers.get('authorization');
  
  if (authHeader?.startsWith('Bearer ')) {
    const apiKey = authHeader.substring(7);
    
    // Hash the API key for lookup
    const crypto = await import('crypto');
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    // Look up user by API key hash (use admin client to bypass RLS)
    const { data: apiKeyData, error: apiKeyError } = await supabaseAdmin
      .from('api_keys')
      .select('user_id, is_active, expires_at')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .maybeSingle();

    if (!apiKeyError && apiKeyData) {
      // Check if key is expired
      if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
        return {
          user: null,
          error: 'API key has expired',
          supabase,
          supabaseAdmin
        };
      }
      
      // Update last_used_at (use admin client to bypass RLS)
      await supabaseAdmin
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('key_hash', keyHash);
      
      return {
        user: { id: apiKeyData.user_id },
        supabase,
        supabaseAdmin // Use admin client for API key auth to bypass RLS
      };
    }
  }

  return {
    user: null,
    error: 'Unauthorized - Please provide a valid session or API key',
    supabase,
    supabaseAdmin
  };
}
