const redisConfig = require('../config/redis');
const config = require('../config/config');

/**
 * Comprehensive Caching Service
 * Provides Redis-based caching with fallback to memory cache
 */

class CacheService {
  constructor() {
    this.redis = null;
    this.memoryCache = new Map();
    this.memoryCacheTTL = new Map();
    this.isRedisAvailable = false;
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  /**
   * Initialize cache service
   */
  async initialize() {
    try {
      if (config.redis.enabled) {
        this.redis = await redisConfig.connect();
        this.isRedisAvailable = true;
        console.log('✅ Cache Service: Redis initialized');
      } else {
        console.log('⚠️ Cache Service: Redis disabled, using memory cache');
      }
    } catch (error) {
      console.error('❌ Cache Service: Redis initialization failed:', error.message);
      this.isRedisAvailable = false;
    }
  }

  /**
   * Generate cache key with namespace
   */
  generateKey(namespace, key, userId = null) {
    const parts = [namespace];
    
    if (userId && userId !== 'anonymous-user') {
      parts.push('user', userId);
    }
    
    parts.push(key);
    
    return parts.join(':');
  }

  /**
   * Set cache value
   */
  async set(namespace, key, value, ttl = 3600, userId = null) {
    try {
      const cacheKey = this.generateKey(namespace, key, userId);
      const serializedValue = JSON.stringify(value);
      
      if (this.isRedisAvailable) {
        await this.redis.setEx(cacheKey, ttl, serializedValue);
      } else {
        // Fallback to memory cache
        this.memoryCache.set(cacheKey, serializedValue);
        this.memoryCacheTTL.set(cacheKey, Date.now() + (ttl * 1000));
      }
      
      this.cacheStats.sets++;
      return true;
    } catch (error) {
      console.error('❌ Cache set error:', error.message);
      this.cacheStats.errors++;
      return false;
    }
  }

  /**
   * Get cache value
   */
  async get(namespace, key, userId = null) {
    try {
      const cacheKey = this.generateKey(namespace, key, userId);
      let value = null;
      
      if (this.isRedisAvailable) {
        value = await this.redis.get(cacheKey);
      } else {
        // Fallback to memory cache
        const ttl = this.memoryCacheTTL.get(cacheKey);
        if (ttl && Date.now() < ttl) {
          value = this.memoryCache.get(cacheKey);
        } else if (ttl) {
          // Expired, remove from memory cache
          this.memoryCache.delete(cacheKey);
          this.memoryCacheTTL.delete(cacheKey);
        }
      }
      
      if (value) {
        this.cacheStats.hits++;
        return JSON.parse(value);
      } else {
        this.cacheStats.misses++;
        return null;
      }
    } catch (error) {
      console.error('❌ Cache get error:', error.message);
      this.cacheStats.errors++;
      this.cacheStats.misses++;
      return null;
    }
  }

  /**
   * Delete cache value
   */
  async delete(namespace, key, userId = null) {
    try {
      const cacheKey = this.generateKey(namespace, key, userId);
      
      if (this.isRedisAvailable) {
        await this.redis.del(cacheKey);
      } else {
        this.memoryCache.delete(cacheKey);
        this.memoryCacheTTL.delete(cacheKey);
      }
      
      this.cacheStats.deletes++;
      return true;
    } catch (error) {
      console.error('❌ Cache delete error:', error.message);
      this.cacheStats.errors++;
      return false;
    }
  }

  /**
   * Delete multiple cache keys with pattern
   */
  async deletePattern(pattern) {
    try {
      if (this.isRedisAvailable) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(keys);
        }
      } else {
        // Fallback to memory cache
        for (const key of this.memoryCache.keys()) {
          if (key.includes(pattern.replace('*', ''))) {
            this.memoryCache.delete(key);
            this.memoryCacheTTL.delete(key);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Cache delete pattern error:', error.message);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(namespace, key, userId = null) {
    try {
      const cacheKey = this.generateKey(namespace, key, userId);
      
      if (this.isRedisAvailable) {
        return await this.redis.exists(cacheKey);
      } else {
        const ttl = this.memoryCacheTTL.get(cacheKey);
        return ttl && Date.now() < ttl;
      }
    } catch (error) {
      console.error('❌ Cache exists error:', error.message);
      return false;
    }
  }

  /**
   * Set expiration for key
   */
  async expire(namespace, key, ttl, userId = null) {
    try {
      const cacheKey = this.generateKey(namespace, key, userId);
      
      if (this.isRedisAvailable) {
        await this.redis.expire(cacheKey, ttl);
      } else {
        this.memoryCacheTTL.set(cacheKey, Date.now() + (ttl * 1000));
      }
      
      return true;
    } catch (error) {
      console.error('❌ Cache expire error:', error.message);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = total > 0 ? (this.cacheStats.hits / total * 100).toFixed(2) : 0;
    
    return {
      ...this.cacheStats,
      hitRate: `${hitRate}%`,
      isRedisAvailable: this.isRedisAvailable,
      memoryCacheSize: this.memoryCache.size
    };
  }

  /**
   * Clear all cache
   */
  async clear() {
    try {
      if (this.isRedisAvailable) {
        await this.redis.flushAll();
      } else {
        this.memoryCache.clear();
        this.memoryCacheTTL.clear();
      }
      
      return true;
    } catch (error) {
      console.error('❌ Cache clear error:', error.message);
      return false;
    }
  }

  /**
   * Cache middleware for Express routes
   */
  cacheMiddleware(namespace, ttl = 3600, keyGenerator = null) {
    return async (req, res, next) => {
      try {
        const userId = req.user?.userId;
        const cacheKey = keyGenerator ? keyGenerator(req) : req.originalUrl;
        
        // Try to get from cache
        const cachedData = await this.get(namespace, cacheKey, userId);
        
        if (cachedData) {
          return res.json({
            success: true,
            data: cachedData,
            cached: true,
            timestamp: new Date().toISOString()
          });
        }
        
        // Store original res.json
        const originalJson = res.json;
        
        // Override res.json to cache the response
        res.json = function(data) {
          // Cache the response
          if (data.success && data.data) {
            cacheService.set(namespace, cacheKey, data.data, ttl, userId);
          }
          
          return originalJson.call(this, data);
        };
        
        next();
      } catch (error) {
        console.error('❌ Cache middleware error:', error.message);
        next();
      }
    };
  }

  /**
   * Invalidate cache for specific patterns
   */
  async invalidate(namespace, patterns = []) {
    try {
      for (const pattern of patterns) {
        const fullPattern = this.generateKey(namespace, pattern);
        await this.deletePattern(fullPattern);
      }
      return true;
    } catch (error) {
      console.error('❌ Cache invalidate error:', error.message);
      return false;
    }
  }

  /**
   * Get or set pattern (cache-aside pattern)
   */
  async getOrSet(namespace, key, fetchFunction, ttl = 3600, userId = null) {
    try {
      // Try to get from cache first
      let data = await this.get(namespace, key, userId);
      
      if (data === null) {
        // Not in cache, fetch from source
        data = await fetchFunction();
        
        // Store in cache
        if (data !== null) {
          await this.set(namespace, key, data, ttl, userId);
        }
      }
      
      return data;
    } catch (error) {
      console.error('❌ Cache getOrSet error:', error.message);
      // Fallback to direct fetch
      return await fetchFunction();
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
