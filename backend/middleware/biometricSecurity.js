/**
 * Biometric Security Middleware
 * Implements rate limiting, device fingerprinting, and additional security measures
 */

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const crypto = require('crypto');

// Rate limiting for biometric operations
const biometricRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 biometric requests per windowMs
  message: {
    success: false,
    message: 'Too many biometric authentication attempts. Please try again later.',
    retryAfter: Math.ceil(15 * 60 / 60) // minutes
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for successful authentications
  skip: (req, res) => {
    return res.statusCode < 400;
  },
  // Custom key generator to include user info if available
  keyGenerator: (req) => {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || '';
    const userId = req.user?.userId || 'anonymous';
    
    // Create a hash of IP + User Agent + User ID for more specific rate limiting
    return crypto.createHash('sha256')
      .update(`${ip}:${userAgent}:${userId}`)
      .digest('hex');
  }
});

// Slow down repeated requests
const biometricSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 3, // Allow 3 requests per windowMs without delay
  delayMs: () => 500, // Add 500ms delay per request after delayAfter (new v2 behavior)
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  // Skip slow down for successful authentications
  skip: (req, res) => {
    return res.statusCode < 400;
  },
  validate: { delayMs: false } // Disable the warning message
});

// Device fingerprinting middleware
const deviceFingerprinting = (req, res, next) => {
  try {
    const userAgent = req.get('User-Agent') || '';
    const acceptLanguage = req.get('Accept-Language') || '';
    const acceptEncoding = req.get('Accept-Encoding') || '';
    const ip = req.ip || req.connection.remoteAddress || '';
    
    // Create device fingerprint
    const deviceFingerprint = crypto.createHash('sha256')
      .update(`${userAgent}:${acceptLanguage}:${acceptEncoding}:${ip}`)
      .digest('hex');
    
    // Add to request object for use in handlers
    req.deviceFingerprint = deviceFingerprint;
    
    // Extract useful device information
    req.deviceInfo = {
      userAgent,
      ip,
      timestamp: new Date(),
      fingerprint: deviceFingerprint
    };
    
    next();
  } catch (error) {
    console.error('Device fingerprinting error:', error);
    // Continue without fingerprinting rather than blocking the request
    req.deviceFingerprint = 'unknown';
    req.deviceInfo = {
      userAgent: 'unknown',
      ip: 'unknown',
      timestamp: new Date(),
      fingerprint: 'unknown'
    };
    next();
  }
};

// Security headers middleware for biometric endpoints
const biometricSecurityHeaders = (req, res, next) => {
  // Ensure HTTPS for biometric operations
  if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      message: 'Biometric authentication requires HTTPS connection'
    });
  }
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.paystack.co https://checkout.paystack.com; img-src * data: blob:; connect-src *; frame-src 'self' https://checkout.paystack.com https://js.paystack.co");
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Prevent caching of biometric responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  next();
};

// Suspicious activity detection
const suspiciousActivityDetection = async (req, res, next) => {
  try {
    const deviceFingerprint = req.deviceFingerprint;
    const userAgent = req.get('User-Agent') || '';
    const ip = req.ip || req.connection.remoteAddress;
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /bot|crawler|spider|scraper/i,
      /curl|wget|python|postman/i,
      /automated|headless/i
    ];
    
    const isSuspiciousUserAgent = suspiciousPatterns.some(pattern => pattern.test(userAgent));
    
    // Check for rapid requests from same fingerprint
    const requestKey = `biometric_requests:${deviceFingerprint}`;
    // Note: In production, use Redis for this
    // For now, we'll just log suspicious activity
    
    if (isSuspiciousUserAgent) {
      console.warn(`Suspicious biometric request detected:`, {
        ip,
        userAgent,
        deviceFingerprint,
        timestamp: new Date().toISOString(),
        endpoint: req.originalUrl
      });
      
      // You might want to block or add additional verification here
      // For now, we'll just continue with logging
    }
    
    // Add request tracking info to request object
    req.securityInfo = {
      isSuspicious: isSuspiciousUserAgent,
      deviceFingerprint,
      timestamp: new Date()
    };
    
    next();
  } catch (error) {
    console.error('Suspicious activity detection error:', error);
    next(); // Continue on error
  }
};

// Challenge validation middleware
const challengeValidation = (req, res, next) => {
  try {
    const { challengeId } = req.body;
    
    // Enhanced challenge validation
    if (challengeId) {
      // Validate challenge ID format (UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(challengeId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid challenge ID format'
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Challenge validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during challenge validation'
    });
  }
};

// Credential validation middleware
const credentialValidation = (req, res, next) => {
  try {
    const { registrationResponse, authenticationResponse } = req.body;
    
    if (registrationResponse) {
      // Validate registration response structure
      if (!registrationResponse.id || !registrationResponse.response) {
        return res.status(400).json({
          success: false,
          message: 'Invalid registration response structure'
        });
      }
      
      // Check credential ID length (prevent extremely long IDs)
      if (registrationResponse.id.length > 1024) {
        return res.status(400).json({
          success: false,
          message: 'Credential ID too long'
        });
      }
    }
    
    if (authenticationResponse) {
      // Validate authentication response structure
      if (!authenticationResponse.id || !authenticationResponse.response) {
        return res.status(400).json({
          success: false,
          message: 'Invalid authentication response structure'
        });
      }
      
      // Check credential ID length
      if (authenticationResponse.id.length > 1024) {
        return res.status(400).json({
          success: false,
          message: 'Credential ID too long'
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Credential validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during credential validation'
    });
  }
};

// Security audit logging
const securityAuditLogging = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    try {
      // Log security-relevant events
      const logData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        deviceFingerprint: req.deviceFingerprint,
        userId: req.user?.userId,
        statusCode: res.statusCode,
        success: res.statusCode < 400,
        securityInfo: req.securityInfo
      };
      
      // In production, send this to your security monitoring system
      if (process.env.NODE_ENV === 'production') {
        console.log('BIOMETRIC_SECURITY_AUDIT:', JSON.stringify(logData));
      } else {
        console.log('Biometric security audit:', logData);
      }
      
      // Log failed attempts with more detail
      if (res.statusCode >= 400) {
        console.warn('BIOMETRIC_SECURITY_FAILURE:', {
          ...logData,
          responseData: typeof data === 'string' ? JSON.parse(data) : data
        });
      }
    } catch (error) {
      console.error('Security audit logging error:', error);
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

// Combine all security middleware
const biometricSecurityStack = [
  biometricSecurityHeaders,
  deviceFingerprinting,
  suspiciousActivityDetection,
  biometricSlowDown,
  biometricRateLimit,
  challengeValidation,
  credentialValidation,
  securityAuditLogging
];

module.exports = {
  biometricRateLimit,
  biometricSlowDown,
  deviceFingerprinting,
  biometricSecurityHeaders,
  suspiciousActivityDetection,
  challengeValidation,
  credentialValidation,
  securityAuditLogging,
  biometricSecurityStack
};
