const { createClient } = require('redis');
const config = require('./config');

/**
 * Redis Configuration and Connection Management
 */

class RedisConfig {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = Infinity; // Changed from 5 to Infinity for unlimited reconnection attempts
  }

  /**
   * Create Redis client with configuration
   */
  createClient() {
    const redisConfig = {
      url: config.redis.url,
      socket: {
        connectTimeout: config.redis.connectTimeout,
        lazyConnect: true,
        reconnectStrategy: (retries) => {
          if (this.maxConnectionAttempts !== Infinity && retries > this.maxConnectionAttempts) {
            console.error('❌ Redis: Max connection attempts reached');
            return new Error('Max connection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        }
      },
      password: config.redis.password || undefined,
      database: config.redis.database || 0
    };

    // Remove undefined values
    Object.keys(redisConfig).forEach(key => {
      if (redisConfig[key] === undefined) {
        delete redisConfig[key];
      }
    });

    this.client = createClient(redisConfig);
    this.setupEventHandlers();
    
    return this.client;
  }

  /**
   * Setup Redis event handlers
   */
  setupEventHandlers() {
    if (!this.client) return;

    this.client.on('connect', () => {
      console.log('🔗 Redis: Connecting...');
    });

    this.client.on('ready', () => {
      console.log('✅ Redis: Connected and ready');
      this.isConnected = true;
      this.connectionAttempts = 0;
    });

    this.client.on('error', (err) => {
      console.error('❌ Redis Error:', err.message);
      this.isConnected = false;
      this.connectionAttempts++;
    });

    this.client.on('end', () => {
      console.log('🔌 Redis: Connection ended');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      console.log('🔄 Redis: Reconnecting...');
    });
  }

  /**
   * Connect to Redis
   */
  async connect() {
    try {
      if (!this.client) {
        this.createClient();
      }

      if (!this.isConnected) {
        await this.client.connect();
      }

      return this.client;
    } catch (error) {
      console.error('❌ Redis connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
        this.isConnected = false;
        console.log('🔌 Redis: Disconnected');
      }
    } catch (error) {
      console.error('❌ Redis disconnect error:', error.message);
    }
  }

  /**
   * Get Redis client instance
   */
  getClient() {
    return this.client;
  }

  /**
   * Check if Redis is connected
   */
  isRedisConnected() {
    return this.isConnected && this.client;
  }

  /**
   * Health check for Redis
   */
  async healthCheck() {
    try {
      if (!this.isRedisConnected()) {
        return { status: 'disconnected', error: 'Redis client not connected' };
      }

      const pong = await this.client.ping();
      return { status: 'healthy', response: pong };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}

// Create singleton instance
const redisConfig = new RedisConfig();

module.exports = redisConfig;
