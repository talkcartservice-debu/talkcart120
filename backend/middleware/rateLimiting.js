const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const config = require('../config/config');
const { RateLimitError } = require('./errorHandler');

/**
 * Advanced Rate Limiting System
 * Multiple rate limiting strategies for different endpoints
 */

// In-memory store for rate limiting (in production, use Redis)
const store = new Map();

/**
 * Custom store for rate limiting
 */
const customStore = {
  increment: (key, cb) => {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const max = 100; // Default max requests
    
    if (!store.has(key)) {
      store.set(key, { count: 1, resetTime: now + windowMs });
      return cb(null, { totalHits: 1, resetTime: now + windowMs });
    }
    
    const record = store.get(key);
    
    if (now > record.resetTime) {
      // Reset the window
      store.set(key, { count: 1, resetTime: now + windowMs });
      return cb(null, { totalHits: 1, resetTime: now + windowMs });
    }
    
    record.count++;
    store.set(key, record);
    
    return cb(null, { 
      totalHits: record.count, 
      resetTime: record.resetTime 
    });
  },
  
  decrement: (key) => {
    if (store.has(key)) {
      const record = store.get(key);
      if (record.count > 0) {
        record.count--;
        store.set(key, record);
      }
    }
  },
  
  resetKey: (key) => {
    store.delete(key);
  }
};

/**
 * Normalize client IP from request across IPv4/IPv6/proxies
 */
const getClientIp = (req) => {
  try {
    const xff = (req.headers['x-forwarded-for'] || '').toString();
    const forwarded = xff.split(',').map(s => s.trim()).filter(Boolean)[0];
    let ip = forwarded || req.ip || (req.connection && req.connection.remoteAddress) || '';
    if (typeof ip !== 'string') ip = String(ip || '');
    if (ip.startsWith('::ffff:')) ip = ip.substring(7); // IPv4-mapped IPv6
    if (ip === '::1') ip = '127.0.0.1';
    return ip || 'unknown';
  } catch {
    return 'unknown';
  }
};

/**
 * General API rate limiter
 */
const generalLimiter = rateLimit({
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.max,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(config.security.rateLimit.windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: config.security.rateLimit.skip,
  store: customStore,
  keyGenerator: (req) => getClientIp(req),
  handler: (req, res) => {
    const error = new RateLimitError('Too many requests, please try again later');
    res.status(429).json({
      success: false,
      error: error.message,
      retryAfter: Math.ceil(config.security.rateLimit.windowMs / 1000),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Strict rate limiter for authentication endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Increased from 5 to 100 attempts per window for more lenient authentication
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 900 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip for successful authentications
    return req.user && req.user.userId !== 'anonymous-user';
  },
  // Base limiter key on properly parsed IP (avoid IPv6 pitfalls)
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    const identifier = req.body?.identifier || req.body?.email || 'unknown';
    return `auth:${ip}:${identifier}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: 900,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Upload rate limiter
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: {
    success: false,
    error: 'Upload limit exceeded, please try again later.',
    retryAfter: 3600 // 1 hour in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    const userId = req.user?.userId;
    return userId ? `upload:${userId}` : `upload:${ip}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Upload limit exceeded, please try again later.',
      retryAfter: 3600,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Search rate limiter
 */
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: {
    success: false,
    error: 'Search limit exceeded, please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    const userId = req.user?.userId;
    return userId ? `search:${userId}` : `search:${ip}`;
  }
});

/**
 * Comment rate limiter
 */
const commentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 comments per minute
  message: {
    success: false,
    error: 'Comment limit exceeded, please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    const userId = req.user?.userId;
    return userId ? `comment:${userId}` : `comment:${ip}`;
  }
});

/**
 * Message rate limiter
 */
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 messages per minute
  message: {
    success: false,
    error: 'Message limit exceeded, please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    const userId = req.user?.userId;
    return userId ? `message:${userId}` : `message:${ip}`;
  }
});

/**
 * Slow down middleware for repeated requests
 */
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per window without delay
  // Per express-slow-down v3, delayMs should be a function for old behavior
  delayMs: (used, req) => {
    const delayAfter = 50;
    const over = Math.max(0, used - delayAfter);
    return over * 500;
  },
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  skip: (req) => {
    // Skip for authenticated users with high reputation
    return req.user?.role === 'admin' || req.user?.role === 'moderator';
  },
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    const userId = req.user?.userId;
    return userId ? `speed:${userId}` : `speed:${ip}`;
  }
});

/**
 * Dynamic rate limiter based on user role
 */
const dynamicLimiter = (req, res, next) => {
  const userRole = req.user?.role || 'anonymous';
  
  let maxRequests;
  let windowMs;
  
  switch (userRole) {
    case 'admin':
      maxRequests = 10000;
      windowMs = 15 * 60 * 1000;
      break;
    case 'moderator':
      maxRequests = 5000;
      windowMs = 15 * 60 * 1000;
      break;
    case 'vendor':
      maxRequests = 2000;
      windowMs = 15 * 60 * 1000;
      break;
    case 'user':
      maxRequests = 1000;
      windowMs = 15 * 60 * 1000;
      break;
    default: // anonymous
      maxRequests = 100;
      windowMs = 15 * 60 * 1000;
  }
  
  const limiter = rateLimit({
    windowMs,
    max: maxRequests,
    message: {
      success: false,
      error: 'Rate limit exceeded for your user type.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const ip = getClientIp(req);
      const userId = req.user?.userId;
      return userId ? `dynamic:${userId}` : `dynamic:${ip}`;
    }
  });
  
  limiter(req, res, next);
};

/**
 * Rate limit status endpoint
 */
const getRateLimitStatus = (req, res) => {
  const key = req.user?.userId ? `dynamic:${req.user.userId}` : `dynamic:${req.ip}`;
  const record = store.get(key);
  
  if (!record) {
    return res.json({
      success: true,
      data: {
        remaining: 1000,
        resetTime: Date.now() + (15 * 60 * 1000),
        limit: 1000
      }
    });
  }
  
  const remaining = Math.max(0, 1000 - record.count);
  const resetTime = record.resetTime;
  
  res.json({
    success: true,
    data: {
      remaining,
      resetTime,
      limit: 1000
    }
  });
};

/**
 * Clear rate limit for a specific key
 */
const clearRateLimit = (req, res) => {
  // Only allow admins to clear rate limits
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }
  
  const { key } = req.body;
  if (!key) {
    return res.status(400).json({
      success: false,
      error: 'Key is required'
    });
  }
  
  customStore.resetKey(key);
  
  res.json({
    success: true,
    message: 'Rate limit cleared',
    key
  });
};

module.exports = {
  // Rate limiters
  generalLimiter,
  authLimiter,
  uploadLimiter,
  searchLimiter,
  commentLimiter,
  messageLimiter,
  speedLimiter,
  dynamicLimiter,
  
  // Utility functions
  getRateLimitStatus,
  clearRateLimit,
  customStore
};
