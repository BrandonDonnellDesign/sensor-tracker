import { createHash, randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  tier: 'free' | 'basic' | 'premium';
  rateLimitPerHour: number;
  isActive: boolean;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  limitValue: number;
  resetTime: string;
}

export interface ApiUsageLog {
  apiKeyId?: string;
  userId?: string;
  ipAddress: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs?: number;
  userAgent?: string;
  referer?: string;
  requestSize?: number;
  responseSize?: number;
  errorMessage?: string;
}

// Rate limit tiers
export const RATE_LIMIT_TIERS = {
  free: 100,
  basic: 1000,
  premium: 10000
} as const;

/**
 * Generate a new API key
 */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  // Generate a secure random key (32 bytes = 256 bits)
  const keyBytes = randomBytes(32);
  const key = `sk_${keyBytes.toString('hex')}`;
  
  // Create hash for storage
  const hash = createHash('sha256').update(key).digest('hex');
  
  // Get prefix for identification (first 8 chars after sk_)
  const prefix = key.substring(0, 11); // "sk_" + first 8 hex chars
  
  return { key, hash, prefix };
}

/**
 * Hash an API key for comparison
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(key: string): boolean {
  return /^sk_[a-f0-9]{64}$/.test(key);
}

/**
 * Create a new API key for a user
 */
export async function createApiKey(
  userId: string,
  name: string,
  tier: 'free' | 'basic' | 'premium' = 'free',
  expiresAt?: Date
): Promise<{ apiKey: ApiKey; rawKey: string }> {
  
  const { key, hash, prefix } = generateApiKey();
  const rateLimitPerHour = RATE_LIMIT_TIERS[tier];
  
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: userId,
      name,
      key_hash: hash,
      key_prefix: prefix,
      tier,
      rate_limit_per_hour: rateLimitPerHour,
      expires_at: expiresAt?.toISOString()
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create API key: ${error.message}`);
  }
  
  return {
    apiKey: {
      id: data.id,
      name: data.name,
      keyPrefix: data.key_prefix,
      tier: data.tier,
      rateLimitPerHour: data.rate_limit_per_hour,
      isActive: data.is_active,
      lastUsedAt: data.last_used_at,
      expiresAt: data.expires_at,
      createdAt: data.created_at
    },
    rawKey: key
  };
}

/**
 * Verify an API key and return key info
 */
export async function verifyApiKey(key: string): Promise<ApiKey | null> {
  if (!isValidApiKeyFormat(key)) {
    return null;
  }
  
  const keyHash = hashApiKey(key);
  
  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  // Check if key is expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null;
  }
  
  // Update last used timestamp
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);
  
  return {
    id: data.id,
    name: data.name,
    keyPrefix: data.key_prefix,
    tier: data.tier,
    rateLimitPerHour: data.rate_limit_per_hour,
    isActive: data.is_active,
    lastUsedAt: data.last_used_at,
    expiresAt: data.expires_at,
    createdAt: data.created_at
  };
}

/**
 * Check rate limit for API key, user, or IP
 */
export async function checkRateLimit(
  apiKeyId?: string,
  userId?: string,
  ipAddress?: string,
  endpoint: string = 'general',
  rateLimit: number = 100
): Promise<RateLimitResult> {
  
  const { data, error } = await supabase
    .rpc('check_rate_limit', {
      p_api_key_id: apiKeyId || null,
      p_user_id: userId || null,
      p_ip_address: ipAddress || null,
      p_endpoint: endpoint,
      p_rate_limit: rateLimit
    });
  
  if (error) {
    console.error('Rate limit check error:', error);
    // Default to allowing request if check fails
    return {
      allowed: true,
      currentCount: 0,
      limitValue: rateLimit,
      resetTime: new Date(Date.now() + 3600000).toISOString()
    };
  }
  
  const result = data[0];
  return {
    allowed: result.allowed,
    currentCount: result.current_count,
    limitValue: result.limit_value,
    resetTime: result.reset_time
  };
}

/**
 * Increment rate limit counter
 */
export async function incrementRateLimit(
  apiKeyId?: string,
  userId?: string,
  ipAddress?: string,
  endpoint: string = 'general'
): Promise<void> {
  
  await supabase.rpc('increment_rate_limit', {
    p_api_key_id: apiKeyId || null,
    p_user_id: userId || null,
    p_ip_address: ipAddress || null,
    p_endpoint: endpoint
  });
}

/**
 * Log API usage
 */
export async function logApiUsage(usage: ApiUsageLog): Promise<void> {
  
  await supabase
    .from('api_usage_logs')
    .insert({
      api_key_id: usage.apiKeyId || null,
      user_id: usage.userId || null,
      ip_address: usage.ipAddress || null,
      endpoint: usage.endpoint,
      method: usage.method,
      status_code: usage.statusCode,
      response_time_ms: usage.responseTimeMs || null,
      user_agent: usage.userAgent || null,
      referer: usage.referer || null,
      request_size: usage.requestSize || null,
      response_size: usage.responseSize || null,
      error_message: usage.errorMessage || null
    });
}

/**
 * Get API keys for a user
 */
export async function getUserApiKeys(userId: string): Promise<ApiKey[]> {
  
  const { data, error } = await supabase
    .from('api_key_stats')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Failed to fetch API keys: ${error.message}`);
  }
  
  return data.map(key => ({
    id: key.id,
    name: key.name,
    keyPrefix: key.key_prefix,
    tier: key.tier,
    rateLimitPerHour: key.rate_limit_per_hour,
    isActive: key.is_active,
    lastUsedAt: key.last_used_at,
    expiresAt: key.expires_at,
    createdAt: key.created_at
  }));
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: string, userId: string): Promise<void> {
  
  const { error } = await supabase
    .from('api_keys')
    .update({ is_active: false })
    .eq('id', keyId)
    .eq('user_id', userId);
  
  if (error) {
    throw new Error(`Failed to revoke API key: ${error.message}`);
  }
}

/**
 * Delete an API key
 */
export async function deleteApiKey(keyId: string, userId: string): Promise<void> {
  
  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', keyId)
    .eq('user_id', userId);
  
  if (error) {
    throw new Error(`Failed to delete API key: ${error.message}`);
  }
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  
  return '127.0.0.1'; // fallback
}