const config = require('../config/config');

/**
 * Anonymous Access Control Middleware
 * Manages and restricts anonymous user permissions
 */

/**
 * Anonymous user permissions configuration
 */
const ANONYMOUS_PERMISSIONS = {
  // Read permissions
  read: {
    posts: {
      allowed: true,
      restrictions: ['public_posts_only', 'no_private_content', 'limited_metadata']
    },
    comments: {
      allowed: true,
      restrictions: ['public_comments_only', 'no_private_replies']
    },
    users: {
      allowed: true,
      restrictions: ['public_profiles_only', 'no_private_info', 'no_contact_details']
    },
    products: {
      allowed: true,
      restrictions: ['public_products_only', 'no_pricing_details', 'no_vendor_info']
    },
    marketplace: {
      allowed: true,
      restrictions: ['browse_only', 'no_purchase', 'no_bidding']
    }
  },
  
  // Write permissions (mostly restricted)
  write: {
    posts: {
      allowed: false,
      reason: 'Authentication required for content creation'
    },
    comments: {
      allowed: false,
      reason: 'Authentication required for commenting'
    },
    orders: {
      allowed: false,
      reason: 'Authentication required for purchases'
    },
    messages: {
      allowed: false,
      reason: 'Authentication required for messaging'
    },
    profile: {
      allowed: false,
      reason: 'Authentication required for profile updates'
    }
  },
  
  // Rate limiting for anonymous users
  rateLimits: {
    general: { max: 100, windowMs: 15 * 60 * 1000 }, // 100 requests per 15 minutes
    read: { max: 200, windowMs: 15 * 60 * 1000 },    // 200 reads per 15 minutes
    search: { max: 30, windowMs: 60 * 1000 },        // 30 searches per minute
    upload: { max: 0, windowMs: 60 * 60 * 1000 }     // No uploads allowed
  }
};

/**
 * Check if anonymous access is allowed for a specific operation
 */
const isAnonymousOperationAllowed = (operation, resource, action) => {
  const permissions = ANONYMOUS_PERMISSIONS[operation];
  
  if (!permissions || !permissions[resource]) {
    return { allowed: false, reason: 'Operation not defined for anonymous users' };
  }
  
  return permissions[resource];
};

/**
 * Apply anonymous access restrictions to data
 */
const applyAnonymousRestrictions = (data, resource, action) => {
  if (!data) return data;
  
  const restrictions = ANONYMOUS_PERMISSIONS.read[resource]?.restrictions || [];
  
  switch (resource) {
    case 'posts':
      return applyPostRestrictions(data, restrictions);
    case 'users':
      return applyUserRestrictions(data, restrictions);
    case 'products':
      return applyProductRestrictions(data, restrictions);
    case 'comments':
      return applyCommentRestrictions(data, restrictions);
    default:
      return data;
  }
};

/**
 * Apply restrictions to post data for anonymous users
 */
const applyPostRestrictions = (data, restrictions) => {
  if (Array.isArray(data)) {
    return data.map(post => applyPostRestrictions(post, restrictions));
  }
  
  const restrictedPost = { ...data };
  
  if (restrictions.includes('public_posts_only')) {
    // Only show public posts
    if (restrictedPost.privacy && restrictedPost.privacy !== 'public') {
      return null; // Filter out non-public posts
    }
  }
  
  if (restrictions.includes('no_private_content')) {
    // Remove private content fields
    delete restrictedPost.privateNotes;
    delete restrictedPost.internalTags;
  }
  
  if (restrictions.includes('limited_metadata')) {
    // Limit metadata exposure
    delete restrictedPost.ipAddress;
    delete restrictedPost.userAgent;
    delete restrictedPost.editHistory;
  }
  
  return restrictedPost;
};

/**
 * Apply restrictions to user data for anonymous users
 */
const applyUserRestrictions = (data, restrictions) => {
  if (Array.isArray(data)) {
    return data.map(user => applyUserRestrictions(user, restrictions));
  }
  
  const restrictedUser = { ...data };
  
  if (restrictions.includes('public_profiles_only')) {
    // Only show public profile information
    if (restrictedUser.privacy && restrictedUser.privacy.profileVisibility === 'private') {
      return {
        id: restrictedUser.id,
        username: restrictedUser.username,
        displayName: restrictedUser.displayName,
        avatar: restrictedUser.avatar,
        isVerified: restrictedUser.isVerified || false
      };
    }
  }
  
  if (restrictions.includes('no_private_info')) {
    // Remove private information
    delete restrictedUser.email;
    delete restrictedUser.phone;
    delete restrictedUser.dateOfBirth;
    delete restrictedUser.address;
    delete restrictedUser.settings;
    delete restrictedUser.lastSeenAt;
    delete restrictedUser.isOnline;
  }
  
  if (restrictions.includes('no_contact_details')) {
    // Remove contact details
    delete restrictedUser.email;
    delete restrictedUser.phone;
    delete restrictedUser.socialLinks;
    delete restrictedUser.website;
  }
  
  return restrictedUser;
};

/**
 * Apply restrictions to product data for anonymous users
 */
const applyProductRestrictions = (data, restrictions) => {
  if (Array.isArray(data)) {
    return data.map(product => applyProductRestrictions(product, restrictions));
  }
  
  const restrictedProduct = { ...data };
  
  if (restrictions.includes('public_products_only')) {
    // Only show public products
    if (restrictedProduct.isActive === false) {
      return null; // Filter out inactive products
    }
  }
  
  if (restrictions.includes('no_pricing_details')) {
    // Hide pricing details
    delete restrictedProduct.cost;
    delete restrictedProduct.profitMargin;
    delete restrictedProduct.vendorPrice;
  }
  
  if (restrictions.includes('no_vendor_info')) {
    // Hide vendor information
    delete restrictedProduct.vendor;
    delete restrictedProduct.vendorContact;
    delete restrictedProduct.vendorNotes;
  }
  
  return restrictedProduct;
};

/**
 * Apply restrictions to comment data for anonymous users
 */
const applyCommentRestrictions = (data, restrictions) => {
  if (Array.isArray(data)) {
    return data.map(comment => applyCommentRestrictions(comment, restrictions));
  }
  
  const restrictedComment = { ...comment };
  
  if (restrictions.includes('public_comments_only')) {
    // Only show public comments
    if (restrictedComment.isPrivate) {
      return null; // Filter out private comments
    }
  }
  
  if (restrictions.includes('no_private_replies')) {
    // Hide private replies
    if (restrictedComment.parentId && restrictedComment.isPrivate) {
      return null;
    }
  }
  
  return restrictedComment;
};

/**
 * Anonymous access middleware
 */
const anonymousAccessControl = (req, res, next) => {
  // Check if user is anonymous
  if (!req.user || req.user.isAnonymous || req.user.userId === 'anonymous-user') {
    req.isAnonymous = true;
    req.anonymousPermissions = ANONYMOUS_PERMISSIONS;
    
    // Add anonymous user info
    req.user = {
      userId: 'anonymous-user',
      isAnonymous: true,
      role: 'anonymous',
      permissions: ANONYMOUS_PERMISSIONS
    };
  } else {
    req.isAnonymous = false;
  }
  
  next();
};

/**
 * Check if operation is allowed for anonymous users
 */
const requireAuthentication = (operation, resource, action) => {
  return (req, res, next) => {
    if (req.isAnonymous) {
      const permission = isAnonymousOperationAllowed(operation, resource, action);
      
      if (!permission.allowed) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: permission.reason || 'This operation requires authentication',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }
    }
    
    next();
  };
};

/**
 * Apply data restrictions for anonymous users
 */
const applyDataRestrictions = (resource, action = 'read') => {
  return (req, res, next) => {
    if (req.isAnonymous) {
      // Store original response methods
      const originalJson = res.json;
      const originalSend = res.send;
      
      // Override response methods to apply restrictions
      res.json = function(data) {
        const restrictedData = applyAnonymousRestrictions(data, resource, action);
        return originalJson.call(this, restrictedData);
      };
      
      res.send = function(data) {
        const restrictedData = applyAnonymousRestrictions(data, resource, action);
        return originalSend.call(this, restrictedData);
      };
    }
    
    next();
  };
};

/**
 * Anonymous rate limiting middleware
 */
const anonymousRateLimit = (operation) => {
  const rateLimit = require('express-rate-limit');
  const limits = ANONYMOUS_PERMISSIONS.rateLimits[operation] || ANONYMOUS_PERMISSIONS.rateLimits.general;
  
  return rateLimit({
    windowMs: limits.windowMs,
    max: limits.max,
    message: {
      success: false,
      error: 'Rate limit exceeded for anonymous users',
      message: 'Please authenticate or try again later',
      retryAfter: Math.ceil(limits.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for authenticated users
      return !req.isAnonymous;
    },
    keyGenerator: (req) => {
      // Use IP address for anonymous users
      return `anonymous:${req.ip}`;
    }
  });
};

/**
 * Log anonymous access attempts
 */
const logAnonymousAccess = (req, res, next) => {
  if (req.isAnonymous) {
    const logData = {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      method: req.method,
      url: req.originalUrl,
      endpoint: req.route?.path,
      operation: req.body?.operation || 'unknown'
    };
    
    // Log anonymous access (in production, send to monitoring service)
    if (config.server.isDevelopment) {
      console.log('🔍 Anonymous access:', logData);
    }
  }
  
  next();
};

module.exports = {
  ANONYMOUS_PERMISSIONS,
  isAnonymousOperationAllowed,
  applyAnonymousRestrictions,
  anonymousAccessControl,
  requireAuthentication,
  applyDataRestrictions,
  anonymousRateLimit,
  logAnonymousAccess,
  
  // Helper functions
  applyPostRestrictions,
  applyUserRestrictions,
  applyProductRestrictions,
  applyCommentRestrictions
};
