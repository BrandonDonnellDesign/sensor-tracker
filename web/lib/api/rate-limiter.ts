/**
 * Rate Limiting System for Public API
 * Implements token bucket algorithm with Redis-like storage
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (request: any) => string; // Custom key generator
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitInfo {
  totalHits: number;
  totalHitsPerWindow: number;
  resetTime: Date;
  remaining: number;
  limit: number;
}

class RateLimiter {
  private store: Map<string, { count: number; resetTime: number }> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Check if request should be rate limited
   */
  async checkLimit(key: string): Promise<{ allowed: boolean; info: RateLimitInfo }> {
    const now = Date.now();
    
    // Get or create entry
    let entry = this.store.get(key);
    
    if (!entry || entry.resetTime <= now) {
      // Create new window
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs
      };
    }

    // Check if limit exceeded
    const allowed = entry.count < this.config.maxRequests;
    
    if (allowed) {
      entry.count++;
      this.store.set(key, entry);
    }

    const info: RateLimitInfo = {
      totalHits: entry.count,
      totalHitsPerWindow: entry.count,
      resetTime: new Date(entry.resetTime),
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      limit: this.config.maxRequests
    };

    return { allowed, info };
  }

  /**
   * Generate rate limit key from request
   */
  generateKey(request: any): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(request);
    }

    // Default: use IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    return `rate_limit:${ip}`;
  }

  /**
   * Clean up expired entries
   */
  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime <= now) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get current stats for monitoring
   */
  getStats() {
    return {
      totalKeys: this.store.size,
      config: this.config
    };
  }
}

// Pre-configured rate limiters for different API tiers
export const rateLimiters = {
  // Public API - 100 requests per hour
  public: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 100
  }),

  // Authenticated API - 1000 requests per hour
  authenticated: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 1000,
    keyGenerator: (request) => {
      const userId = request.userId || 'anonymous';
      return `rate_limit:user:${userId}`;
    }
  }),

  // Premium API - 10000 requests per hour
  premium: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10000,
    keyGenerator: (request) => {
      const apiKey = request.apiKey || 'unknown';
      return `rate_limit:premium:${apiKey}`;
    }
  }),

  // Admin API - No limits
  admin: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 999999
  })
};

/**
 * Middleware function to apply rate limiting
 */
export function createRateLimitMiddleware(limiter: RateLimiter) {
  return async (request: any) => {
    const key = limiter.generateKey(request);
    const { allowed, info } = await limiter.checkLimit(key);

    return {
      allowed,
      headers: {
        'X-RateLimit-Limit': info.limit.toString(),
        'X-RateLimit-Remaining': info.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(info.resetTime.getTime() / 1000).toString(),
        'X-RateLimit-Used': info.totalHits.toString()
      },
      retryAfter: allowed ? null : Math.ceil((info.resetTime.getTime() - Date.now()) / 1000)
    };
  };
}

export { RateLimiter, type RateLimitConfig, type RateLimitInfo };