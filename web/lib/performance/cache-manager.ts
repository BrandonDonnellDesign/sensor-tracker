// Advanced caching system for improved performance

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
}

export class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0
  };
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private defaultTTL: number = 300000) { // 5 minutes default
    this.startCleanup();
  }

  // Get item from cache
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    this.stats.hits++;
    this.updateHitRate();
    return entry.data as T;
  }

  // Set item in cache
  set<T>(key: string, data: T, ttl?: number, tags: string[] = []): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      tags
    };

    this.cache.set(key, entry);
    this.stats.sets++;
  }

  // Delete item from cache
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  // Clear cache by tags
  clearByTags(tags: string[]): number {
    let cleared = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (tags.some(tag => entry.tags.includes(tag))) {
        this.cache.delete(key);
        cleared++;
      }
    }
    
    this.stats.deletes += cleared;
    return cleared;
  }

  // Clear all cache
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.deletes += size;
  }

  // Get cache statistics
  getStats(): CacheStats {
    return { ...this.stats };
  }

  // Get cache size
  size(): number {
    return this.cache.size;
  }

  // Get all keys
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Check if key exists and is not expired
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  // Get or set pattern (cache-aside)
  async getOrSet<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttl?: number, 
    tags: string[] = []
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, ttl, tags);
    return data;
  }

  // Batch get multiple keys
  mget<T>(keys: string[]): Map<string, T> {
    const results = new Map<string, T>();
    
    for (const key of keys) {
      const value = this.get<T>(key);
      if (value !== null) {
        results.set(key, value);
      }
    }
    
    return results;
  }

  // Batch set multiple keys
  mset<T>(entries: Array<{ key: string; data: T; ttl?: number; tags?: string[] }>): void {
    for (const entry of entries) {
      this.set(entry.key, entry.data, entry.ttl, entry.tags || []);
    }
  }

  // Update hit rate calculation
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  // Start automatic cleanup of expired entries
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  // Clean up expired entries
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  // Stop cleanup interval
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Specialized cache managers for different data types
export class UserCacheManager extends CacheManager {
  constructor() {
    super(300000); // 5 minutes default for user data
  }

  // Cache user stats
  async getUserStats(userId: string, fetcher: () => Promise<any>): Promise<any> {
    return this.getOrSet(
      `user:stats:${userId}`,
      fetcher,
      300000, // 5 minutes
      ['user', 'stats', userId]
    );
  }

  // Cache user sensors
  async getUserSensors(userId: string, fetcher: () => Promise<any[]>): Promise<any[]> {
    return this.getOrSet(
      `user:sensors:${userId}`,
      fetcher,
      60000, // 1 minute
      ['user', 'sensors', userId]
    );
  }

  // Cache user achievements
  async getUserAchievements(userId: string, fetcher: () => Promise<any[]>): Promise<any[]> {
    return this.getOrSet(
      `user:achievements:${userId}`,
      fetcher,
      600000, // 10 minutes
      ['user', 'achievements', userId]
    );
  }

  // Invalidate user-specific cache
  invalidateUser(userId: string): number {
    return this.clearByTags([userId]);
  }
}

export class AnalyticsCacheManager extends CacheManager {
  constructor() {
    super(1800000); // 30 minutes default for analytics
  }

  // Cache monthly analytics
  async getMonthlyAnalytics(userId: string, month: string, fetcher: () => Promise<any>): Promise<any> {
    return this.getOrSet(
      `analytics:monthly:${userId}:${month}`,
      fetcher,
      3600000, // 1 hour
      ['analytics', 'monthly', userId]
    );
  }

  // Cache performance metrics
  async getPerformanceMetrics(userId: string, fetcher: () => Promise<any>): Promise<any> {
    return this.getOrSet(
      `analytics:performance:${userId}`,
      fetcher,
      1800000, // 30 minutes
      ['analytics', 'performance', userId]
    );
  }

  // Cache seasonal patterns
  async getSeasonalPatterns(userId: string, fetcher: () => Promise<any>): Promise<any> {
    return this.getOrSet(
      `analytics:seasonal:${userId}`,
      fetcher,
      7200000, // 2 hours
      ['analytics', 'seasonal', userId]
    );
  }
}

export class CommunityCacheManager extends CacheManager {
  constructor() {
    super(900000); // 15 minutes default for community data
  }

  // Cache community stats
  async getCommunityStats(fetcher: () => Promise<any>): Promise<any> {
    return this.getOrSet(
      'community:stats',
      fetcher,
      1800000, // 30 minutes
      ['community', 'stats']
    );
  }

  // Cache community tips
  async getCommunityTips(category: string, fetcher: () => Promise<any[]>): Promise<any[]> {
    return this.getOrSet(
      `community:tips:${category}`,
      fetcher,
      900000, // 15 minutes
      ['community', 'tips', category]
    );
  }

  // Cache leaderboard
  async getLeaderboard(type: string, fetcher: () => Promise<any[]>): Promise<any[]> {
    return this.getOrSet(
      `community:leaderboard:${type}`,
      fetcher,
      600000, // 10 minutes
      ['community', 'leaderboard', type]
    );
  }
}

// Cache invalidation helper
export class CacheInvalidator {
  constructor(
    private userCache: UserCacheManager,
    private analyticsCache: AnalyticsCacheManager,
    private communityCache: CommunityCacheManager
  ) {}

  // Invalidate on sensor operations
  onSensorChange(userId: string): void {
    this.userCache.clearByTags(['user', 'sensors', userId]);
    this.userCache.clearByTags(['user', 'stats', userId]);
    this.analyticsCache.clearByTags(['analytics', userId]);
  }

  // Invalidate on achievement operations
  onAchievementChange(userId: string): void {
    this.userCache.clearByTags(['user', 'achievements', userId]);
    this.userCache.clearByTags(['user', 'stats', userId]);
  }

  // Invalidate on community operations
  onCommunityChange(): void {
    this.communityCache.clearByTags(['community']);
  }

  // Full user invalidation
  invalidateUser(userId: string): void {
    this.userCache.invalidateUser(userId);
    this.analyticsCache.clearByTags([userId]);
  }
}

// Global cache instances
export const userCache = new UserCacheManager();
export const analyticsCache = new AnalyticsCacheManager();
export const communityCache = new CommunityCacheManager();
export const cacheInvalidator = new CacheInvalidator(userCache, analyticsCache, communityCache);

// Cache middleware for API routes
export function withCache(
  cacheKey: string,
  ttl: number = 300000,
  tags: string[] = []
) {
  return function (_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cache = new CacheManager();
      const key = typeof cacheKey === 'function' ? (cacheKey as any)(...args) : cacheKey;
      
      return cache.getOrSet(key, () => method.apply(this, args), ttl, tags);
    };

    return descriptor;
  };
}

// Performance monitoring for cache
export function monitorCachePerformance() {
  const stats = {
    user: userCache.getStats(),
    analytics: analyticsCache.getStats(),
    community: communityCache.getStats()
  };

  console.log('Cache Performance Stats:', {
    user: {
      ...stats.user,
      hitRate: `${stats.user.hitRate.toFixed(1)}%`,
      size: userCache.size()
    },
    analytics: {
      ...stats.analytics,
      hitRate: `${stats.analytics.hitRate.toFixed(1)}%`,
      size: analyticsCache.size()
    },
    community: {
      ...stats.community,
      hitRate: `${stats.community.hitRate.toFixed(1)}%`,
      size: communityCache.size()
    }
  });

  return stats;
}