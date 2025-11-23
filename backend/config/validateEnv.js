const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

/**
 * Environment Configuration Validator
 * Validates that all required environment variables are set
 */

class EnvValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Validate required environment variables
   */
  validate() {
    this.validateServerConfig();
    this.validateDatabaseConfig();
    this.validateJWTSecrets();
    this.validateSecurityConfig();
    this.validateOptionalConfigs();

    if (this.errors.length > 0) {
      console.error('❌ Environment validation failed:');
      this.errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }

    if (this.warnings.length > 0) {
      console.warn('⚠️ Environment validation warnings:');
      this.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }

    console.log('✅ Environment validation passed');
    return true;
  }

  /**
   * Validate server configuration
   */
  validateServerConfig() {
    const required = ['NODE_ENV', 'PORT'];
    const optional = ['LOG_LEVEL', 'ENABLE_REQUEST_LOGGING'];

    required.forEach(key => {
      if (!process.env[key]) {
        this.errors.push(`Missing required environment variable: ${key}`);
      }
    });

    // Validate NODE_ENV
    if (process.env.NODE_ENV && !['development', 'production', 'test'].includes(process.env.NODE_ENV)) {
      this.errors.push('NODE_ENV must be one of: development, production, test');
    }

    // Validate PORT
    if (process.env.PORT && isNaN(parseInt(process.env.PORT))) {
      this.errors.push('PORT must be a valid number');
    }
  }

  /**
   * Validate database configuration
   */
  validateDatabaseConfig() {
    // MONGODB_URI is now optional since we provide a default value
    if (process.env.MONGODB_URI) {
      // Basic MongoDB URI validation
      if (!process.env.MONGODB_URI.startsWith('mongodb://') && !process.env.MONGODB_URI.startsWith('mongodb+srv://')) {
        this.errors.push('MONGODB_URI must be a valid MongoDB connection string');
      }
    } else if (process.env.NODE_ENV === 'production') {
      this.errors.push('MONGODB_URI is required in production environment');
    }
  }

  /**
   * Validate JWT secrets
   */
  validateJWTSecrets() {
    const required = ['JWT_SECRET', 'REFRESH_TOKEN_SECRET'];

    required.forEach(key => {
      if (!process.env[key]) {
        this.errors.push(`Missing required environment variable: ${key}`);
      } else if (process.env[key].length < 32) {
        this.errors.push(`${key} must be at least 32 characters long for security`);
      } else if (process.env[key].includes('your-secret-key') || process.env[key].includes('change-this')) {
        this.errors.push(`${key} must be changed from the default value`);
      }
    });

    // Ensure JWT secrets are different
    if (process.env.JWT_SECRET && process.env.REFRESH_TOKEN_SECRET && 
        process.env.JWT_SECRET === process.env.REFRESH_TOKEN_SECRET) {
      this.errors.push('JWT_SECRET and REFRESH_TOKEN_SECRET must be different');
    }
  }

  /**
   * Validate security configuration
   */
  validateSecurityConfig() {
    // Rate limiting
    if (process.env.RATE_LIMIT_WINDOW_MS && isNaN(parseInt(process.env.RATE_LIMIT_WINDOW_MS))) {
      this.errors.push('RATE_LIMIT_WINDOW_MS must be a valid number');
    }

    if (process.env.RATE_LIMIT_MAX_REQUESTS && isNaN(parseInt(process.env.RATE_LIMIT_MAX_REQUESTS))) {
      this.errors.push('RATE_LIMIT_MAX_REQUESTS must be a valid number');
    }

    // CORS origins
    if (process.env.CORS_ORIGINS) {
      const origins = process.env.CORS_ORIGINS.split(',');
      origins.forEach(origin => {
        if (!origin.trim()) {
          this.errors.push('CORS_ORIGINS contains empty values');
        }
      });
    }

    // Production security checks
    if (process.env.NODE_ENV === 'production') {
      if (process.env.ENABLE_ANONYMOUS_ACCESS === 'true') {
        this.warnings.push('Anonymous access is enabled in production - consider disabling for security');
      }

      if (process.env.DEBUG_MODE === 'true') {
        this.warnings.push('Debug mode is enabled in production - consider disabling for security');
      }

      if (process.env.ENABLE_DEBUG_LOGGING === 'true') {
        this.warnings.push('Debug logging is enabled in production - consider disabling for security');
      }
    }
  }

  /**
   * Validate optional configurations
   */
  validateOptionalConfigs() {
    // Cloudinary configuration
    const cloudinaryVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
    const cloudinarySet = cloudinaryVars.filter(key => process.env[key]).length;
    
    if (cloudinarySet > 0 && cloudinarySet < 3) {
      this.warnings.push('Incomplete Cloudinary configuration - all three variables must be set');
    }

    // Payment processing
    if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
      this.warnings.push('STRIPE_SECRET_KEY should start with "sk_"');
    }

    if (process.env.FLW_SECRET_KEY && !process.env.FLW_SECRET_KEY.startsWith('FLWSECK_')) {
      this.warnings.push('FLW_SECRET_KEY should start with "FLWSECK_"');
    }

    // Email configuration
    const emailVars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS'];
    const emailSet = emailVars.filter(key => process.env[key]).length;
    
    if (emailSet > 0 && emailSet < 4) {
      this.warnings.push('Incomplete email configuration - all four variables must be set');
    }

    // Redis configuration
    if (process.env.REDIS_ENABLED === 'true') {
      if (!process.env.REDIS_URL) {
        this.errors.push('REDIS_URL is required when REDIS_ENABLED is true');
      } else if (!process.env.REDIS_URL.startsWith('redis://')) {
        this.warnings.push('REDIS_URL should start with "redis://"');
      }
    }

    if (process.env.REDIS_DATABASE && (isNaN(parseInt(process.env.REDIS_DATABASE)) || parseInt(process.env.REDIS_DATABASE) < 0 || parseInt(process.env.REDIS_DATABASE) > 15)) {
      this.errors.push('REDIS_DATABASE must be a number between 0 and 15');
    }

    if (process.env.REDIS_CONNECT_TIMEOUT && (isNaN(parseInt(process.env.REDIS_CONNECT_TIMEOUT)) || parseInt(process.env.REDIS_CONNECT_TIMEOUT) < 1000)) {
      this.errors.push('REDIS_CONNECT_TIMEOUT must be a number >= 1000');
    }

    // File upload limits
    if (process.env.UPLOAD_MAX_FILE_SIZE_MB && isNaN(parseInt(process.env.UPLOAD_MAX_FILE_SIZE_MB))) {
      this.errors.push('UPLOAD_MAX_FILE_SIZE_MB must be a valid number');
    }

    if (process.env.UPLOAD_MAX_FIELD_SIZE_MB && isNaN(parseInt(process.env.UPLOAD_MAX_FIELD_SIZE_MB))) {
      this.errors.push('UPLOAD_MAX_FIELD_SIZE_MB must be a valid number');
    }
  }

  /**
   * Get environment summary
   */
  getSummary() {
    return {
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 8000,
      database: process.env.MONGODB_URI || 'using default (mongodb://localhost:27017/talkcart)',
      jwt: process.env.JWT_SECRET ? 'configured' : 'missing',
      cloudinary: process.env.CLOUDINARY_CLOUD_NAME ? 'configured' : 'not configured',
      payments: {
        flutterwave: process.env.FLW_SECRET_KEY ? 'configured' : 'not configured'
      },
      email: process.env.EMAIL_HOST ? 'configured' : 'not configured',
      redis: process.env.REDIS_URL ? 'configured' : 'not configured',
      security: {
        rateLimiting: process.env.RATE_LIMIT_MAX_REQUESTS ? 'enabled' : 'default',
        cors: process.env.CORS_ORIGINS ? 'custom' : 'default',
        anonymousAccess: process.env.ENABLE_ANONYMOUS_ACCESS === 'true' ? 'enabled' : 'disabled'
      }
    };
  }
}

module.exports = EnvValidator;
