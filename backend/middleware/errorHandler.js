const Joi = require('joi');
const config = require('../config/config');

// Response formatter for consistent API responses
const formatResponse = (success, data = null, message = '', error = null, statusCode = 200) => {
  const response = {
    success,
    timestamp: new Date().toISOString(),
    statusCode
  };

  if (data !== null) response.data = data;
  if (message) response.message = message;
  if (error) response.error = error;

  return response;
};

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400);
    this.details = details;
    this.name = 'ValidationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden access') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  const errorLog = {
    name: err.name,
    message: err.message,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    userId: req.user?.userId || 'anonymous'
  };

  // Add stack trace in development
  if (config.server.isDevelopment) {
    errorLog.stack = err.stack;
  }

  // Log error based on severity
  if (err.statusCode >= 500) {
    console.error('🚨 Server Error:', errorLog);
  } else if (err.statusCode >= 400) {
    console.warn('⚠️ Client Error:', errorLog);
  } else {
    console.log('ℹ️ Info:', errorLog);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Invalid resource ID format';
    error = new ValidationError(message);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `${field} '${value}' already exists`;
    error = new ConflictError(message);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message,
      value: val.value
    }));
    error = new ValidationError('Validation failed', details);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new UnauthorizedError('Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = new UnauthorizedError('Token expired');
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new ValidationError('File too large');
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = new ValidationError('Unexpected file field');
  }

  // Rate limiting errors
  if (err.status === 429) {
    error = new RateLimitError('Too many requests, please try again later');
  }

  // Default to 500 server error
  if (!error.statusCode) {
    error = new AppError('Internal server error', 500, false);
  }

  // Send error response
  const response = formatResponse(
    false,
    null,
    error.message,
    {
      type: error.name || 'Error',
      ...(error.details && { details: error.details }),
      ...(config.server.isDevelopment && { 
        stack: err.stack,
        originalError: err.message 
      })
    },
    error.statusCode
  );

  res.status(error.statusCode).json(response);
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 404 handler for undefined routes
const notFound = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

// Request logger middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Skip logging for health checks and static files
  const skipLogging = [
    '/api/health',
    '/favicon.ico',
    '/_next',
    '/static'
  ].some(path => req.url.includes(path));

  if (!skipLogging && config.logging.enableRequestLogging) {
    console.log(`📥 ${req.method} ${req.originalUrl}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent')?.substring(0, 50) + '...',
      timestamp: new Date().toISOString()
    });
  }

  // Add response time logging
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!skipLogging && config.logging.enableRequestLogging) {
      console.log(`📤 ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });

  next();
};

// Success response helper
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = formatResponse(true, data, message, null, statusCode);
  res.status(statusCode).json(response);
};

// Error response helper
const sendError = (res, message = 'Error', statusCode = 500, details = null) => {
  const response = formatResponse(false, null, message, details, statusCode);
  res.status(statusCode).json(response);
};

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  
  // Middleware
  errorHandler,
  asyncHandler,
  notFound,
  requestLogger,
  
  // Helpers
  formatResponse,
  sendSuccess,
  sendError
};