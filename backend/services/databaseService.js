const mongoose = require('mongoose');
const config = require('../config/config');

/**
 * Database Performance Monitoring and Optimization Service
 * Provides database health monitoring, query optimization, and performance metrics
 */

class DatabaseService {
  constructor() {
    this.connection = null;
    this.stats = {
      queries: 0,
      slowQueries: 0,
      errors: 0,
      connections: 0,
      lastHealthCheck: null
    };
    this.slowQueryThreshold = 100; // milliseconds
    this.healthCheckInterval = null;
  }

  /**
   * Initialize database service
   */
  async initialize() {
    try {
      this.connection = mongoose.connection;
      this.setupEventListeners();
      this.startHealthMonitoring();
      console.log('✅ Database Service: Initialized');
    } catch (error) {
      console.error('❌ Database Service: Initialization failed:', error.message);
    }
  }

  /**
   * Setup database event listeners
   */
  setupEventListeners() {
    if (!this.connection) return;

    // Connection events
    this.connection.on('connected', () => {
      console.log('🔗 Database: Connected');
      this.stats.connections++;
    });

    this.connection.on('disconnected', () => {
      console.log('🔌 Database: Disconnected');
    });

    this.connection.on('error', (error) => {
      console.error('❌ Database Error:', error.message);
      this.stats.errors++;
    });

    // Query monitoring
    mongoose.set('debug', (collectionName, method, query, doc) => {
      this.stats.queries++;
      
      // Log slow queries
      if (config.server.isDevelopment) {
        console.log(`🔍 Query: ${collectionName}.${method}`, {
          query: JSON.stringify(query),
          doc: doc ? JSON.stringify(doc) : 'N/A'
        });
      }
    });
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 60000); // Check every minute
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Perform database health check
   */
  async performHealthCheck() {
    try {
      const db = this.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }

      // Ping the database
      await db.admin().ping();
      
      // Get server status
      const serverStatus = await db.admin().serverStatus();
      
      // Get database stats
      const dbStats = await db.stats();
      
      this.stats.lastHealthCheck = new Date();
      
      // Log health status
      if (config.server.isDevelopment) {
        console.log('💚 Database Health Check:', {
          status: 'healthy',
          uptime: serverStatus.uptime,
          connections: serverStatus.connections?.current || 0,
          operations: serverStatus.opcounters || {},
          memory: serverStatus.mem || {},
          lastCheck: this.stats.lastHealthCheck
        });
      }

      return {
        status: 'healthy',
        uptime: serverStatus.uptime,
        connections: serverStatus.connections?.current || 0,
        operations: serverStatus.opcounters || {},
        memory: serverStatus.mem || {},
        lastCheck: this.stats.lastHealthCheck
      };
    } catch (error) {
      console.error('❌ Database Health Check Failed:', error.message);
      this.stats.errors++;
      
      return {
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date()
      };
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    try {
      const db = this.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }

      const stats = await db.stats();
      const serverStatus = await db.admin().serverStatus();
      
      return {
        database: {
          name: stats.db,
          collections: stats.collections,
          dataSize: stats.dataSize,
          storageSize: stats.storageSize,
          indexes: stats.indexes,
          indexSize: stats.indexSize,
          objects: stats.objects,
          avgObjSize: stats.avgObjSize
        },
        server: {
          uptime: serverStatus.uptime,
          version: serverStatus.version,
          connections: serverStatus.connections,
          operations: serverStatus.opcounters,
          memory: serverStatus.mem,
          network: serverStatus.network
        },
        service: this.stats
      };
    } catch (error) {
      console.error('❌ Failed to get database stats:', error.message);
      return {
        error: error.message,
        service: this.stats
      };
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(collectionName) {
    try {
      const db = this.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }

      const collection = db.collection(collectionName);
      const stats = await collection.stats();
      
      return {
        name: collectionName,
        count: stats.count,
        size: stats.size,
        avgObjSize: stats.avgObjSize,
        storageSize: stats.storageSize,
        totalIndexSize: stats.totalIndexSize,
        indexes: stats.nindexes,
        indexSizes: stats.indexSizes
      };
    } catch (error) {
      console.error(`❌ Failed to get collection stats for ${collectionName}:`, error.message);
      return {
        name: collectionName,
        error: error.message
      };
    }
  }

  /**
   * Get all collections statistics
   */
  async getAllCollectionsStats() {
    try {
      const db = this.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }

      const collections = await db.listCollections().toArray();
      const stats = [];

      for (const collection of collections) {
        const collectionStats = await this.getCollectionStats(collection.name);
        stats.push(collectionStats);
      }

      return stats;
    } catch (error) {
      console.error('❌ Failed to get all collections stats:', error.message);
      return [];
    }
  }

  /**
   * Analyze slow queries
   */
  async analyzeSlowQueries() {
    try {
      const db = this.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }

      // Get current profiling level
      const profilingLevel = await db.command({ profile: -1 });
      
      if (profilingLevel.was === 0) {
        return {
          message: 'Profiling is disabled. Enable profiling to analyze slow queries.',
          profilingLevel: profilingLevel.was
        };
      }

      // Get slow queries from profiler
      const slowQueries = await db.collection('system.profile')
        .find({ millis: { $gt: this.slowQueryThreshold } })
        .sort({ ts: -1 })
        .limit(100)
        .toArray();

      return {
        profilingLevel: profilingLevel.was,
        slowQueryThreshold: this.slowQueryThreshold,
        slowQueries: slowQueries.map(query => ({
          timestamp: query.ts,
          duration: query.millis,
          operation: query.op,
          namespace: query.ns,
          command: query.command,
          planSummary: query.planSummary
        }))
      };
    } catch (error) {
      console.error('❌ Failed to analyze slow queries:', error.message);
      return {
        error: error.message
      };
    }
  }

  /**
   * Enable query profiling
   */
  async enableProfiling(level = 1, slowMs = 100) {
    try {
      const db = this.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }

      await db.command({ profile: level, slowms: slowMs });
      this.slowQueryThreshold = slowMs;
      
      console.log(`✅ Database profiling enabled (level: ${level}, slowms: ${slowMs})`);
      return { success: true, level, slowMs };
    } catch (error) {
      console.error('❌ Failed to enable profiling:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Disable query profiling
   */
  async disableProfiling() {
    try {
      const db = this.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }

      await db.command({ profile: 0 });
      console.log('✅ Database profiling disabled');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to disable profiling:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get index usage statistics
   */
  async getIndexUsageStats() {
    try {
      const db = this.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }

      const collections = await db.listCollections().toArray();
      const indexStats = [];

      for (const collection of collections) {
        try {
          const stats = await db.collection(collection.name).aggregate([
            { $indexStats: {} }
          ]).toArray();
          
          indexStats.push({
            collection: collection.name,
            indexes: stats
          });
        } catch (error) {
          // Some collections might not support indexStats
          console.warn(`⚠️ Could not get index stats for ${collection.name}:`, error.message);
        }
      }

      return indexStats;
    } catch (error) {
      console.error('❌ Failed to get index usage stats:', error.message);
      return [];
    }
  }

  /**
   * Optimize database performance
   */
  async optimizePerformance() {
    try {
      const db = this.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }

      const optimizations = [];

      // Get all collections
      const collections = await db.listCollections().toArray();

      for (const collection of collections) {
        const collectionName = collection.name;
        
        // Skip system collections
        if (collectionName.startsWith('system.')) {
          continue;
        }

        try {
          // Compact collection to reclaim space
          await db.command({ compact: collectionName });
          optimizations.push({
            collection: collectionName,
            operation: 'compact',
            status: 'completed'
          });
        } catch (error) {
          optimizations.push({
            collection: collectionName,
            operation: 'compact',
            status: 'failed',
            error: error.message
          });
        }
      }

      return {
        success: true,
        optimizations,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Failed to optimize database performance:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get database service statistics
   */
  getServiceStats() {
    return {
      ...this.stats,
      slowQueryThreshold: this.slowQueryThreshold,
      isMonitoring: !!this.healthCheckInterval,
      uptime: process.uptime()
    };
  }

  /**
   * Reset service statistics
   */
  resetStats() {
    this.stats = {
      queries: 0,
      slowQueries: 0,
      errors: 0,
      connections: 0,
      lastHealthCheck: null
    };
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService;
