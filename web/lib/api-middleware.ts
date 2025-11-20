import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { verifyApiKey, checkRateLimit, incrementRateLimit, getClientIP } from '@/lib/api-auth';

export interface AuthResult {
  success: true;
  userId: string;
  apiKeyId?: string | undefined;
  rateLimit?: {
    allowed: boolean;
    currentCount: number;
    limitValue: number;
    resetTime: string;
  };
}

export interface AuthError {
  success: false;
  error: string;
  rateLimit?: {
    allowed: boolean;
    currentCount: number;
    limitValue: number;
    resetTime: string;
  };
}

/**
 * Authenticate and check rate limits for API requests
 */
export async function authenticateApiRequest(request: NextRequest): Promise<AuthResult | AuthError> {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKeyHeader = request.headers.get('x-api-key');
    const clientIP = getClientIP(request);
    
    let userId: string | undefined;
    let apiKeyId: string | undefined;
    let rateLimit = 100; // default rate limit

    // Try API key authentication first (x-api-key header)
    if (apiKeyHeader) {
      const apiKey = await verifyApiKey(apiKeyHeader);
      if (!apiKey) {
        return {
          success: false,
          error: 'Invalid API key'
        };
      }
      
      apiKeyId = apiKey.id;
      rateLimit = apiKey.rateLimitPerHour;
      
      // Get user ID from API key
      const supabase = await createClient();
      const { data: keyData } = await supabase
        .from('api_keys')
        .select('user_id')
        .eq('id', apiKey.id)
        .single();
      
      if (keyData) {
        userId = keyData.user_id;
      }
    }
    // Try Bearer token authentication (could be JWT or API key)
    else if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Check if it's an API key (starts with sk_)
      if (token.startsWith('sk_')) {
        const apiKey = await verifyApiKey(token);
        if (!apiKey) {
          return {
            success: false,
            error: 'Invalid API key'
          };
        }
        
        apiKeyId = apiKey.id;
        rateLimit = apiKey.rateLimitPerHour;
        
        // Get user ID from API key
        const supabase = await createClient();
        const { data: keyData } = await supabase
          .from('api_keys')
          .select('user_id')
          .eq('id', apiKey.id)
          .single();
        
        if (keyData) {
          userId = keyData.user_id;
        }
      } else {
        // It's a JWT token
        const supabase = await createClient();
        
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
          return {
            success: false,
            error: 'Invalid JWT token'
          };
        }
        
        userId = user.id;
      }
    }
    else {
      return {
        success: false,
        error: 'No authentication provided'
      };
    }

    if (!userId) {
      return {
        success: false,
        error: 'Unable to determine user ID'
      };
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(
      apiKeyId,
      userId,
      clientIP,
      request.nextUrl.pathname,
      rateLimit
    );

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        error: 'Rate limit exceeded',
        rateLimit: rateLimitResult
      };
    }

    // Increment rate limit counter
    await incrementRateLimit(apiKeyId, userId, clientIP, request.nextUrl.pathname);

    return {
      success: true,
      userId,
      apiKeyId,
      rateLimit: rateLimitResult
    };

  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed'
    };
  }
}