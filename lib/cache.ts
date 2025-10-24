/**
 * Redis Cache Utilities
 *
 * Provides caching layer for frequently accessed data to reduce database load.
 * Uses Redis for high-performance key-value storage.
 */

import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
});

// Connect to Redis
redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

redis.on("connect", () => {
  console.log("Redis connected successfully");
});

export { redis };

/**
 * Cache a value with optional TTL (in seconds)
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttl: number = 60
): Promise<void> {
  try {
    const serialized = JSON.stringify(value);
    await redis.setex(key, ttl, serialized);
  } catch (error) {
    console.error("Cache set error:", error);
  }
}

/**
 * Get a value from cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get(key);
    if (!cached) return null;
    return JSON.parse(cached) as T;
  } catch (error) {
    console.error("Cache get error:", error);
    return null;
  }
}

/**
 * Delete a key from cache
 */
export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error("Cache delete error:", error);
  }
}

/**
 * Delete multiple keys matching a pattern
 */
export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error("Cache delete pattern error:", error);
  }
}

/**
 * Increment a counter (useful for rate limiting)
 */
export async function cacheIncr(key: string, ttl: number = 60): Promise<number> {
  try {
    const value = await redis.incr(key);
    if (value === 1) {
      // First increment, set expiry
      await redis.expire(key, ttl);
    }
    return value;
  } catch (error) {
    console.error("Cache increment error:", error);
    return 0;
  }
}

/**
 * Cache keys for common entities
 */
export const CacheKeys = {
  user: (userId: string) => `user:${userId}`,
  customer: (customerId: string) => `customer:${customerId}`,
  loan: (loanId: string) => `loan:${loanId}`,
  loansByCustomer: (customerId: string) => `loans:customer:${customerId}`,
  agentCustomers: (agentId: string) => `agent:${agentId}:customers`,
  dashboardStats: (userId: string) => `dashboard:${userId}`,
  rateLimit: (key: string) => `ratelimit:${key}`,
};

/**
 * Rate limiting helper
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number }> {
  const count = await cacheIncr(CacheKeys.rateLimit(key), windowSeconds);
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
  };
}
