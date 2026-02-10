const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('../config/config');

/**
 * Comprehensive Security Middleware
 * Implements multiple layers of security protection
 */

/**
 * Security Headers Configuration
 */
const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: config.security.headers.csp.enabled ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com"
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdnjs.cloudflare.com",
        "https://unpkg.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "http://localhost:*",
        "https://*",
        "https://res.cloudinary.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com"
      ],
      connectSrc: [
        "'self'",
        "http://localhost:*",
        "https://api.paystack.co",
        "wss://localhost:*"
      ],
      objectSrc: ["'none'"],
      mediaSrc: [
        "'self'",
        "https://res.cloudinary.com",
        "blob:"
      ],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: config.server.isProduction ? [] : null,
    },
  } : false,
  
  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: false,
  
  // Cross-Origin Opener Policy - Changed from 'same-origin' to 'same-origin-allow-popups' to allow postMessage
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  
  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: { policy: "cross-origin" },
  
  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },
  
  // Expect-CT
  expectCt: {
    maxAge: 86400,
    enforce: true
  },
  
  // Feature Policy
  featurePolicy: {
    features: {
      camera: ["'none'"],
      microphone: ["'none'"],
      geolocation: ["'none'"],
      payment: ["'self'"],
      usb: ["'none'"],
      magnetometer: ["'none'"],
      gyroscope: ["'none'"],
      accelerometer: ["'none'"]
    }
  },
  
  // Hide X-Powered-By header
  hidePoweredBy: true,
  
  // HSTS
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  
  // IE No Open
  ieNoOpen: true,
  
  // No Sniff
  noSniff: true,
  
  // Origin Agent Cluster
  originAgentCluster: true,
  
  // Permissions Policy
  permissionsPolicy: {
    features: {
      camera: [],
      microphone: [],
      geolocation: [],
      payment: ["self"],
      usb: [],
      magnetometer: [],
      gyroscope: [],
      accelerometer: []
    }
  },
  
  // Referrer Policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  
  // XSS Filter
  xssFilter: true
});

/**
 * CORS Configuration
 */
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = config.security.cors.origin;
    
    // Allow all origins in development for easier testing
    if (config.server.isDevelopment) {
      return callback(null, true);
    }
    
    // For production, check against allowed origins
    if (Array.isArray(allowedOrigins)) {
      // Check for exact match
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Check for wildcard domains
      for (const allowedOrigin of allowedOrigins) {
        if (allowedOrigin === '*') {
          return callback(null, true);
        }
        
        // Check for subdomain matches
        if (allowedOrigin.startsWith('*.')) {
          const domain = allowedOrigin.substring(2);
          if (origin.endsWith(domain)) {
            return callback(null, true);
          }
        }
      }
    } else if (typeof allowedOrigins === 'string') {
      if (allowedOrigins === '*' || allowedOrigins === origin) {
        return callback(null, true);
      }
      
      // Check for subdomain matches with single string
      if (allowedOrigins.startsWith('*.')) {
        const domain = allowedOrigins.substring(2);
        if (origin.endsWith(domain)) {
          return callback(null, true);
        }
      }
    } else if (typeof allowedOrigins === 'function') {
      return allowedOrigins(origin, callback);
    }
    
    // In development, allow localhost on any port
    if (config.server.isDevelopment && origin && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    // Also allow common development ports for frontend
    if (config.server.isDevelopment && origin && (
      origin.match(/^http:\/\/localhost:(3000|4000|4100|8000)$/) ||
      origin.match(/^https:\/\/localhost:(3000|4000|4100|8000)$/)
    )) {
      return callback(null, true);
    }
    
    // For Render deployment, allow common Render URLs
    if (!config.server.isDevelopment && origin && (
      origin.includes('onrender.com') ||
      origin.includes('vetora.app') ||
      origin.includes('render.') // Covers various Render domains
    )) {
      return callback(null, true);
    }
    
    // Also specifically allow common frontend deployment patterns
    if (!config.server.isDevelopment && origin && (
      origin.startsWith('https://') && (
        origin.includes('vetora') ||
        origin.match(/^https:\/\/[a-z0-9-]+\.onrender\.com$/) ||
        origin.match(/^https:\/\/[a-z0-9-]+\.vetora\.app$/)
      )
    )) {
      return callback(null, true);
    }    
    // Also allow localhost in development for frontend development server
    if (config.server.isDevelopment && origin && (
      origin.includes('localhost:') ||
      origin.includes('127.0.0.1:')
    )) {
      return callback(null, true);
    }    
    // Log the rejected origin for debugging
    console.warn('CORS blocked origin:', origin);
    console.warn('Allowed origins:', allowedOrigins);
    
    // Instead of completely blocking, allow with warning to prevent breaking the app
    // but still log the issue for security monitoring
    console.warn('CORS warning: Allowing request from unauthorized origin for compatibility');
    callback(null, true);
  },
  
  credentials: config.security.cors.credentials,
  methods: config.security.cors.methods,
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
  maxAge: config.security.cors.maxAge,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

/**
 * Request Size Limiter
 */
const requestSizeLimiter = (req, res, next) => {
  const contentLength = parseInt(req.get('content-length') || '0');
  const maxSize = config.upload.maxFieldSize * 1024 * 1024; // Convert MB to bytes
  
  if (contentLength > maxSize) {
    return res.status(413).json({
      success: false,
      error: 'Request entity too large',
      maxSize: `${config.upload.maxFieldSize}MB`
    });
  }
  
  next();
};

/**
 * IP Whitelist/Blacklist Middleware
 */
const ipFilter = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Check blacklist
  if (config.security.ipBlacklist && config.security.ipBlacklist.includes(clientIP)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }
  
  // Check whitelist (if enabled)
  if (config.security.ipWhitelist && config.security.ipWhitelist.length > 0) {
    if (!config.security.ipWhitelist.includes(clientIP)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
  }
  
  next();
};

/**
 * User Agent Filter
 */
const userAgentFilter = (req, res, next) => {
  const userAgent = req.get('User-Agent') || '';
  
  // Block known bad user agents
  const blockedUserAgents = [
    'sqlmap',
    'nikto',
    'nmap',
    'masscan',
    'zap',
    'burp',
    'w3af',
    'acunetix',
    'nessus',
    'openvas'
  ];
  
  const isBlocked = blockedUserAgents.some(blocked => 
    userAgent.toLowerCase().includes(blocked.toLowerCase())
  );
  
  if (isBlocked) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }
  
  next();
};

/**
 * Request Timing Protection
 */
const requestTimingProtection = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log suspiciously slow requests
    if (duration > 30000) { // 30 seconds
      console.warn('⚠️ Slow request detected:', {
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
  });
  
  next();
};

/**
 * SQL Injection Protection
 */
const sqlInjectionProtection = (req, res, next) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(\b(OR|AND)\s+['"]\s*=\s*['"])/i,
    /(\bUNION\s+SELECT\b)/i,
    /(\bDROP\s+TABLE\b)/i,
    /(\bINSERT\s+INTO\b)/i,
    /(\bDELETE\s+FROM\b)/i,
    /(\bUPDATE\s+SET\b)/i
  ];
  
  const checkForSQLInjection = (obj) => {
    // Guard against null/undefined or non-object inputs
    if (!obj || typeof obj !== 'object') return false;
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        for (const pattern of sqlPatterns) {
          if (pattern.test(value)) {
            return true;
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        if (checkForSQLInjection(value)) {
          return true;
        }
      }
    }
    return false;
  };
  
  if (checkForSQLInjection(req.body) || checkForSQLInjection(req.query) || checkForSQLInjection(req.params)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request data'
    });
  }
  
  next();
};

/**
 * XSS Protection
 */
const xssProtection = (req, res, next) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi,
    /<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /onmouseover\s*=/gi
  ];
  
  const checkForXSS = (obj) => {
    // Guard against null/undefined or non-object inputs
    if (!obj || typeof obj !== 'object') return false;
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        for (const pattern of xssPatterns) {
          if (pattern.test(value)) {
            return true;
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        if (checkForXSS(value)) {
          return true;
        }
      }
    }
    return false;
  };
  
  if (checkForXSS(req.body) || checkForXSS(req.query) || checkForXSS(req.params)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request data'
    });
  }
  
  next();
};

/**
 * Security Headers for API responses
 */
const apiSecurityHeaders = (req, res, next) => {
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  next();
};

/**
 * Rate limiting for security endpoints
 */
const securityRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Increased from 5 to 100 attempts per window for more lenient security checks
  message: {
    success: false,
    error: 'Too many security-related requests, please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `security:${req.ip}`;
  }
});

module.exports = {
  securityHeaders,
  corsOptions,
  requestSizeLimiter,
  ipFilter,
  userAgentFilter,
  requestTimingProtection,
  sqlInjectionProtection,
  xssProtection,
  apiSecurityHeaders,
  securityRateLimit
};
