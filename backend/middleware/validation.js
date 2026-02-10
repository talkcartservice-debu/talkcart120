const Joi = require('joi');
const { ValidationError } = require('./errorHandler');
const config = require('../config/config');

/**
 * Input Validation and Sanitization Middleware
 * Comprehensive validation system for API endpoints
 */

// Common validation schemas
const commonSchemas = {
  // MongoDB ObjectId validation
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  
  // Optional ObjectId
  optionalObjectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  
  // Email validation
  email: Joi.string().email().lowercase().trim().required(),
  
  // Username validation
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .required(),
  
  // Password validation
  password: Joi.string()
    .min(6)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    }),
  
  // Display name validation
  displayName: Joi.string().trim().max(50).allow(''),
  
  // Bio validation
  bio: Joi.string().trim().max(500).allow(''),
  
  // URL validation
  url: Joi.string().uri().allow(''),
  
  // Pagination validation
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'name', 'price').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  },
  
  // File upload validation
  fileUpload: {
    maxSize: config.upload.maxFileSize * 1024 * 1024, // Convert MB to bytes
    allowedTypes: config.upload.allowedTypes,
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mov']
  }
};

// User validation schemas
const userSchemas = {
  register: Joi.object({
    username: commonSchemas.username,
    email: commonSchemas.email,
    password: commonSchemas.password,
    displayName: commonSchemas.displayName,
    bio: commonSchemas.bio,
    location: Joi.string().trim().max(100).allow(''),
    website: commonSchemas.url,
    walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).allow('')
  }),
  
  login: Joi.object({
    identifier: Joi.string().required(), // Can be email or username
    password: Joi.string().required()
  }),
  
  updateProfile: Joi.object({
    displayName: commonSchemas.displayName,
    bio: commonSchemas.bio,
    location: Joi.string().trim().max(100).allow(''),
    website: commonSchemas.url,
    avatar: Joi.string().uri().allow(''),
    cover: Joi.string().uri().allow('')
  }),
  
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonSchemas.password
  })
};

// Post validation schemas
const postSchemas = {
  create: Joi.object({
    content: Joi.string().trim().min(1).max(2000).required(),
    type: Joi.string().valid('text', 'image', 'video').default('text'),
    hashtags: Joi.array().items(
      Joi.string().trim().lowercase().max(50).pattern(/^[a-zA-Z0-9_]+$/)
    ).max(10),
    mentions: Joi.array().items(commonSchemas.objectId).max(10),
    location: Joi.object({
      name: Joi.string().trim().max(100),
      coordinates: Joi.array().items(Joi.number()).length(2)
    }).allow(null),
    privacy: Joi.string().valid('public', 'followers', 'private').default('public')
  }),
  
  update: Joi.object({
    content: Joi.string().trim().min(1).max(2000),
    hashtags: Joi.array().items(
      Joi.string().trim().lowercase().max(50).pattern(/^[a-zA-Z0-9_]+$/)
    ).max(10),
    privacy: Joi.string().valid('public', 'followers', 'private')
  }),
  
  query: Joi.object({
    ...commonSchemas.pagination,
    feedType: Joi.string().valid('for-you', 'following', 'recent', 'trending').default('for-you'),
    contentType: Joi.string().valid('all', 'text', 'image', 'video').default('all'),
    authorId: commonSchemas.optionalObjectId,
    hashtag: Joi.string().trim().lowercase().max(50),
    search: Joi.string().trim().max(100)
  })
};

// Product validation schemas
const productSchemas = {
  create: Joi.object({
    name: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().trim().min(1).max(2000).required(),
    price: Joi.number().positive().precision(2).required(),
    currency: Joi.string().valid('ETH', 'BTC', 'USD', 'USDC', 'USDT').default('ETH'),
    category: Joi.string().valid(
      'Digital Art', 'Electronics', 'Fashion', 'Gaming', 'Music', 
      'Books', 'Collectibles', 'Education', 'Accessories', 
      'Food & Beverages', 'Fitness', 'Other'
    ).required(),
    tags: Joi.array().items(Joi.string().trim().max(50)).max(10),
    stock: Joi.number().integer().min(0).default(1),
    isNFT: Joi.boolean().default(false),
    contractAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).allow(''),
    tokenId: Joi.string().allow('')
  }),
  
  update: Joi.object({
    name: Joi.string().trim().min(1).max(200),
    description: Joi.string().trim().min(1).max(2000),
    price: Joi.number().positive().precision(2),
    category: Joi.string().valid(
      'Digital Art', 'Electronics', 'Fashion', 'Gaming', 'Music', 
      'Books', 'Collectibles', 'Education', 'Accessories', 
      'Food & Beverages', 'Fitness', 'Other'
    ),
    tags: Joi.array().items(Joi.string().trim().max(50)).max(10),
    stock: Joi.number().integer().min(0),
    isActive: Joi.boolean(),
    featured: Joi.boolean()
  }),
  
  query: Joi.object({
    ...commonSchemas.pagination,
    category: Joi.string().valid(
      'Digital Art', 'Electronics', 'Fashion', 'Gaming', 'Music', 
      'Books', 'Collectibles', 'Education', 'Accessories', 
      'Food & Beverages', 'Fitness', 'Other'
    ),
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),
    currency: Joi.string().valid('ETH', 'BTC', 'USD', 'USDC', 'USDT'),
    search: Joi.string().trim().max(100),
    featured: Joi.boolean(),
    isNFT: Joi.boolean()
  })
};

// Comment validation schemas
const commentSchemas = {
  create: Joi.object({
    content: Joi.string().trim().min(1).max(1000).required(),
    postId: commonSchemas.objectId,
    parentId: commonSchemas.optionalObjectId
  }),
  
  update: Joi.object({
    content: Joi.string().trim().min(1).max(1000).required()
  })
};

// Product review validation schemas
const reviewSchemas = {
  create: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    title: Joi.string().trim().max(100).allow(''),
    comment: Joi.string().trim().max(1000).allow('')
  }),
  
  update: Joi.object({
    rating: Joi.number().integer().min(1).max(5),
    title: Joi.string().trim().max(100).allow(''),
    comment: Joi.string().trim().max(1000).allow('')
  })
};

// Order validation schemas
const orderSchemas = {
  create: Joi.object({
    items: Joi.array().items(
      Joi.object({
        productId: commonSchemas.objectId,
        quantity: Joi.number().integer().min(1).required()
      })
    ).min(1).required(),
    paymentMethod: Joi.string().valid(
      'paystack', 'crypto', 'mobile_money', 'airtel_money', 'cash_on_delivery', 'card_payment'
    ).required(),
    shippingAddress: Joi.object({
      name: Joi.string().trim().min(1).max(100).required(),
      email: commonSchemas.email,
      address: Joi.string().trim().min(1).max(200).required(),
      city: Joi.string().trim().min(1).max(100).required(),
      state: Joi.string().trim().min(1).max(100).required(),
      country: Joi.string().trim().min(1).max(100).required(),
      zipCode: Joi.string().trim().min(1).max(20).required(),
      phone: Joi.string().trim().min(1).max(20).required()
    }).required()
  }),
  
  update: Joi.object({
    status: Joi.string().valid(
      'pending', 'processing', 'shipped', 'delivered', 
      'completed', 'cancelled', 'refunded'
    ),
    trackingNumber: Joi.string().trim().max(100),
    carrier: Joi.string().trim().max(100),
    notes: Joi.string().trim().max(500)
  })
};

// Message validation schemas
const messageSchemas = {
  send: Joi.object({
    content: Joi.string().trim().min(1).max(2000).required(),
    recipientId: commonSchemas.objectId,
    conversationId: commonSchemas.optionalObjectId,
    type: Joi.string().valid('text', 'image', 'video', 'audio').default('text')
  }),
  
  update: Joi.object({
    content: Joi.string().trim().min(1).max(2000).required()
  })
};

/**
 * Validation middleware factory
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return next(new ValidationError('Validation failed', details));
    }

    // Replace the original data with sanitized data
    req[property] = value;
    next();
  };
};

/**
 * Sanitize input data
 */
const sanitizeInput = (data) => {
  if (typeof data === 'string') {
    return data
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, ''); // Remove event handlers
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeInput);
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return data;
};

/**
 * Sanitization middleware
 */
const sanitize = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }
  if (req.params) {
    req.params = sanitizeInput(req.params);
  }
  next();
};

/**
 * File upload validation
 */
const validateFileUpload = (req, res, next) => {
  if (!req.file && !req.files) {
    return next();
  }

  const files = req.files || [req.file];
  const errors = [];

  files.forEach((file, index) => {
    // Check file size
    if (file.size > commonSchemas.fileUpload.maxSize) {
      errors.push({
        field: `file_${index}`,
        message: `File size exceeds maximum allowed size of ${config.upload.maxFileSize}MB`,
        value: file.originalname
      });
    }

    // Check file type
    if (!commonSchemas.fileUpload.allowedTypes.includes(file.mimetype)) {
      errors.push({
        field: `file_${index}`,
        message: `File type ${file.mimetype} is not allowed`,
        value: file.originalname
      });
    }

    // Check file extension
    const ext = require('path').extname(file.originalname).toLowerCase();
    if (!commonSchemas.fileUpload.allowedExtensions.includes(ext)) {
      errors.push({
        field: `file_${index}`,
        message: `File extension ${ext} is not allowed`,
        value: file.originalname
      });
    }
  });

  if (errors.length > 0) {
    return next(new ValidationError('File validation failed', errors));
  }

  next();
};

module.exports = {
  // Validation schemas
  schemas: {
    common: commonSchemas,
    user: userSchemas,
    post: postSchemas,
    product: productSchemas,
    comment: commentSchemas,
    review: reviewSchemas,
    order: orderSchemas,
    message: messageSchemas
  },
  
  // Middleware functions
  validate,
  sanitize,
  validateFileUpload,
  
  // Helper functions
  sanitizeInput
};