import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey, checkRateLimit, incrementRateLimit, logApiUsage, getClientIP } from '@/lib/api-auth';
// import { createClient } from '@/lib/supabase-server'; // TODO: Enable when JWT auth is implemented

export interface AuthContext {
  apiKey?: {
    id: string;
    userId: string;
    tier: string;
    rateLimitPerHour: number;
  };
  user?: {
    id: string;
    email: string;
  };
  ipAddress: string;
}

export interface ApiAuthOptions {
  requireAuth?: boolean;
  allowApiKey?: boolean;
  allowJWT?: boolean;
  rateLimitTier?: 'free' | 'basic' | 'premium';
  customRateLimit?: number;
}

/**
 * API Authentication and Rate Limiting Middleware
 */
export async function withApiAuth(
  request: NextRequest,
  options: ApiAuthOptions = {}
): Promise<{ 
  success: boolean; 
  response?: NextResponse; 
  context?: AuthContext 
}> {
  const startTime = Date.now();
  const ipAddress = getClientIP(request);
  const endpoint = new URL(request.url).pathname;
  const method = request.method;
  
  const {
    requireAuth = true,
    allowApiKey = true,
    allowJWT = true,
    // rateLimitTier, // TODO: Use when JWT auth is implemented
    customRateLimit
  } = options;

  let authContext: AuthContext = { ipAddress };
  let rateLimitPerHour = customRateLimit || 100; // Default rate limit
  
  try {
    // 1. Authentication
    if (requireAuth) {
      const apiKeyHeader = request.headers.get('x-api-key');
      const authHeader = request.headers.get('authorization');
      
      let authenticated = false;
      
      // Try API Key authentication
      if (allowApiKey && apiKeyHeader) {
        const apiKeyData = await verifyApiKey(apiKeyHeader);
        if (apiKeyData) {
          authContext.apiKey = {
            id: apiKeyData.id,
            userId: '', // We'll need to get this from the database
            tier: apiKeyData.tier,
            rateLimitPerHour: apiKeyData.rateLimitPerHour
          };
          rateLimitPerHour = apiKeyData.rateLimitPerHour;
          authenticated = true;
        }
      }
      
      // Try JWT authentication
      if (allowJWT && !authenticated && authHeader?.startsWith('Bearer ')) {
        // For now, skip JWT validation - we'll implement this later
        // TODO: Implement JWT validation with proper Supabase client
        console.log('JWT authentication not yet implemented');
      }
      
      if (!authenticated) {
        const response = NextResponse.json(
          { 
            error: 'unauthorized', 
            message: 'Valid API key or JWT token required' 
          },
          { status: 401 }
        );
        
        // Log failed authentication
        const userAgent = request.headers.get('user-agent');
        await logApiUsage({
          ipAddress,
          endpoint,
          method,
          statusCode: 401,
          responseTimeMs: Date.now() - startTime,
          ...(userAgent && { userAgent }),
          errorMessage: 'Authentication failed'
        }).catch(console.error);
        
        return { success: false, response };
      }
    }
    
    // 2. Rate Limiting
    const rateLimitCheck = await checkRateLimit(
      authContext.apiKey?.id,
      authContext.user?.id,
      ipAddress,
      endpoint,
      rateLimitPerHour
    );
    
    if (!rateLimitCheck.allowed) {
      const response = NextResponse.json(
        {
          error: 'rate_limit_exceeded',
          message: 'Rate limit exceeded. Please try again later.',
          details: {
            limit: rateLimitCheck.limitValue,
            current: rateLimitCheck.currentCount,
            resetTime: rateLimitCheck.resetTime
          }
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitCheck.limitValue.toString(),
            'X-RateLimit-Remaining': Math.max(0, rateLimitCheck.limitValue - rateLimitCheck.currentCount).toString(),
            'X-RateLimit-Reset': Math.floor(new Date(rateLimitCheck.resetTime).getTime() / 1000).toString(),
            'Retry-After': Math.ceil((new Date(rateLimitCheck.resetTime).getTime() - Date.now()) / 1000).toString()
          }
        }
      );
      
      // Log rate limit exceeded
      const userAgent = request.headers.get('user-agent');
      await logApiUsage({
        ...(authContext.apiKey?.id && { apiKeyId: authContext.apiKey.id }),
        ...(authContext.user?.id && { userId: authContext.user.id }),
        ipAddress,
        endpoint,
        method,
        statusCode: 429,
        responseTimeMs: Date.now() - startTime,
        ...(userAgent && { userAgent }),
        errorMessage: 'Rate limit exceeded'
      }).catch(console.error);
      
      return { success: false, response };
    }
    
    // 3. Increment rate limit counter
    await incrementRateLimit(
      authContext.apiKey?.id,
      authContext.user?.id,
      ipAddress,
      endpoint
    );
    
    return { success: true, context: authContext };
    
  } catch (error) {
    console.error('API auth middleware error:', error);
    
    const response = NextResponse.json(
      { 
        error: 'internal_error', 
        message: 'Authentication service temporarily unavailable' 
      },
      { status: 500 }
    );
    
    // Log internal error
    const userAgent = request.headers.get('user-agent');
    await logApiUsage({
      ...(authContext.apiKey?.id && { apiKeyId: authContext.apiKey.id }),
      ...(authContext.user?.id && { userId: authContext.user.id }),
      ipAddress,
      endpoint,
      method,
      statusCode: 500,
      responseTimeMs: Date.now() - startTime,
      ...(userAgent && { userAgent }),
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    }).catch(console.error);
    
    return { success: false, response };
  }
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  rateLimitResult: { currentCount: number; limitValue: number; resetTime: string }
): NextResponse {
  response.headers.set('X-RateLimit-Limit', rateLimitResult.limitValue.toString());
  response.headers.set('X-RateLimit-Remaining', Math.max(0, rateLimitResult.limitValue - rateLimitResult.currentCount).toString());
  response.headers.set('X-RateLimit-Reset', Math.floor(new Date(rateLimitResult.resetTime).getTime() / 1000).toString());
  
  return response;
}

/**
 * Log successful API usage
 */
export async function logSuccessfulApiUsage(
  request: NextRequest,
  response: NextResponse,
  context: AuthContext,
  startTime: number
): Promise<void> {
  const endpoint = new URL(request.url).pathname;
  const responseTimeMs = Date.now() - startTime;
  
  const userAgent = request.headers.get('user-agent');
  const referer = request.headers.get('referer');
  const contentLength = response.headers.get('content-length');
  
  await logApiUsage({
    ...(context.apiKey?.id && { apiKeyId: context.apiKey.id }),
    ...(context.user?.id && { userId: context.user.id }),
    ipAddress: context.ipAddress,
    endpoint,
    method: request.method,
    statusCode: response.status,
    responseTimeMs,
    ...(userAgent && { userAgent }),
    ...(referer && { referer }),
    requestSize: parseInt(request.headers.get('content-length') || '0'),
    ...(contentLength && { responseSize: parseInt(contentLength) })
  }).catch(console.error);
}

/**
 * Simplified API authentication middleware for new endpoints
 * Returns a simple success/error result with userId for convenience
 */
export async function apiAuthMiddleware(request: NextRequest): Promise<{
  success: boolean;
  error?: string;
  status?: number;
  userId?: string;
  apiKeyId?: string;
}> {
  const authResult = await withApiAuth(request, {
    requireAuth: true,
    allowApiKey: true,
    allowJWT: true
  });

  if (!authResult.success) {
    return {
      success: false,
      error: 'Authentication required',
      status: authResult.response?.status || 401
    };
  }

  const result: {
    success: boolean;
    error?: string;
    status?: number;
    userId?: string;
    apiKeyId?: string;
  } = {
    success: true,
    userId: authResult.context?.user?.id || authResult.context?.apiKey?.userId || 'anonymous'
  };

  if (authResult.context?.apiKey?.id) {
    result.apiKeyId = authResult.context.apiKey.id;
  }

  return result;
}