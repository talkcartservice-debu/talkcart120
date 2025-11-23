const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

/**
 * Application Configuration
 * Centralized configuration management with environment variable validation
 */

class Config {
  constructor() {
    this.validateRequired();
  }

  /**
   * Validate required environment variables
   */
  validateRequired() {
    const required = [
      'NODE_ENV',
      'PORT',
      'JWT_SECRET',
      'REFRESH_TOKEN_SECRET'
      // Note: MONGODB_URI is now optional since we provide a default, but it's still recommended
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error('❌ Missing required environment variables:', missing.join(', '));
      process.exit(1);
    }
  }

  // Server Configuration
  get server() {
    return {
      env: process.env.NODE_ENV || 'development',
      port: parseInt(process.env.PORT) || 8000,
      host: process.env.HOST || '0.0.0.0',
      isDevelopment: process.env.NODE_ENV === 'development',
      isProduction: process.env.NODE_ENV === 'production',
      isTest: process.env.NODE_ENV === 'test'
    };
  }

  // Database Configuration
  get database() {
    return {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/talkcart',
      options: {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 30000, // 30 seconds timeout for server selection
        socketTimeoutMS: 45000 // 45 seconds timeout for socket operations
      }
    };
  }

  // JWT Configuration
  get jwt() {
    return {
      secret: process.env.JWT_SECRET,
      refreshSecret: process.env.REFRESH_TOKEN_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      refreshExpiresIn: process.env.REFRESH_EXPIRES_IN || '30d'
    };
  }

  // Security Configuration
  get security() {
    return {
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (this.server.isProduction ? 1000 : 10000),
        skip: (req) => !this.server.isProduction
      },
      cors: {
        origin: this.getCorsOrigins(),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'X-Requested-With',
          'Cache-Control',
          'Pragma',
          'Expires'
        ],
        exposedHeaders: ['Content-Length', 'X-Request-ID'],
        maxAge: 86400 // 24 hours
      },
      headers: {
        enabled: process.env.SECURITY_HEADERS_ENABLED !== 'false',
        csp: {
          enabled: process.env.CONTENT_SECURITY_POLICY_ENABLED !== 'false'
        }
      }
    };
  }

  // File Upload Configuration
  get upload() {
    return {
      maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE_MB) || 200,
      maxFieldSize: parseInt(process.env.UPLOAD_MAX_FIELD_SIZE_MB) || 200,
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
    };
  }

  // Cloudinary Configuration
  get cloudinary() {
    return {
      enabled: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET
    };
  }

  // Payment Configuration
  get payments() {
    return {
      flutterwave: {
        enabled: !!process.env.FLW_SECRET_KEY,
        secretKey: process.env.FLW_SECRET_KEY,
        publicKey: process.env.FLW_PUBLIC_KEY
      }
    };
  }

  // Email Configuration
  get email() {
    return {
      enabled: !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS),
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER
    };
  }

  // Redis Configuration
  get redis() {
    return {
      enabled: process.env.REDIS_ENABLED === 'true',
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD || null,
      database: parseInt(process.env.REDIS_DATABASE) || 0,
      connectTimeout: 0, // No timeout for Redis connections
      retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY) || 100,
      maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES) || 3
    };
  }

  // Web3 Configuration
  get web3() {
    return {
      ethereum: {
        rpcUrl: process.env.ETHEREUM_RPC_URL
      },
      polygon: {
        rpcUrl: process.env.POLYGON_RPC_URL
      },
      bsc: {
        rpcUrl: process.env.BSC_RPC_URL
      }
    };
  }

  // Feature Flags
  get features() {
    return {
      anonymousAccess: process.env.ENABLE_ANONYMOUS_ACCESS === 'true',
      biometricAuth: process.env.ENABLE_BIOMETRIC_AUTH !== 'false',
      web3Auth: process.env.ENABLE_WEB3_AUTH !== 'false',
      aiFeatures: process.env.ENABLE_AI_FEATURES === 'true',
      streaming: process.env.ENABLE_STREAMING === 'true'
    };
  }

  // Logging Configuration
  get logging() {
    return {
      level: process.env.LOG_LEVEL || 'info',
      enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'false',
      enableErrorTracking: process.env.ENABLE_ERROR_TRACKING !== 'false',
      enableDebugLogging: process.env.ENABLE_DEBUG_LOGGING === 'true' && this.server.isDevelopment
    };
  }

  // Development Configuration
  get development() {
    return {
      blockExtensionInterference: process.env.BLOCK_EXTENSION_INTERFERENCE === 'true',
      debugMode: process.env.DEBUG_MODE === 'true'
    };
  }

  /**
   * Get CORS origins from environment variable
   */
  getCorsOrigins() {
    if (process.env.CORS_ORIGINS) {
      return process.env.CORS_ORIGINS.split(',').map(origin => origin.trim());
    }

    // Default origins based on environment
    if (this.server.isProduction) {
      return ['https://talkcart.app', 'https://www.talkcart.app'];
    }

    return [
      'http://localhost:3000',
      'http://localhost:4000',
      'http://localhost:4100',
      'http://localhost:8000'
    ];
  }

  /**
   * Get configuration summary
   */
  getSummary() {
    return {
      environment: this.server.env,
      port: this.server.port,
      database: this.database.uri ? 'configured' : 'using default (mongodb://localhost:27017/talkcart)',
      jwt: this.jwt.secret ? 'configured' : 'missing',
      cloudinary: this.cloudinary.enabled ? 'enabled' : 'disabled',
      payments: {
        flutterwave: this.payments.flutterwave.enabled ? 'enabled' : 'disabled'
      },
      email: this.email.enabled ? 'enabled' : 'disabled',
      redis: this.redis.enabled ? 'enabled' : 'disabled',
      features: this.features,
      security: {
        rateLimiting: this.security.rateLimit.max,
        cors: this.security.cors.origin.length,
        headers: this.security.headers.enabled
      }
    };
  }
}

module.exports = new Config();
