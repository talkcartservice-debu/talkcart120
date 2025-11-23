const config = require('../config/config');

/**
 * Error Tracking and Monitoring
 * Enhanced error tracking for production environments
 */

class ErrorTracker {
  constructor() {
    this.errorCounts = new Map();
    this.recentErrors = [];
    this.maxRecentErrors = 100;
  }

  /**
   * Track an error occurrence
   */
  trackError(error, req, additionalData = {}) {
    const errorKey = this.getErrorKey(error, req);
    const errorInfo = {
      key: errorKey,
      name: error.name,
      message: error.message,
      statusCode: error.statusCode || 500,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.userId || 'anonymous',
      timestamp: new Date().toISOString(),
      stack: config.server.isDevelopment ? error.stack : undefined,
      ...additionalData
    };

    // Update error count
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);

    // Add to recent errors
    this.recentErrors.unshift(errorInfo);
    if (this.recentErrors.length > this.maxRecentErrors) {
      this.recentErrors.pop();
    }

    // Log critical errors
    if (error.statusCode >= 500) {
      this.logCriticalError(errorInfo);
    }

    // Check for error patterns
    this.checkErrorPatterns(errorKey, currentCount + 1);

    return errorInfo;
  }

  /**
   * Generate a unique key for error grouping
   */
  getErrorKey(error, req) {
    const baseKey = `${error.name}:${error.message}`;
    const contextKey = `${req.method}:${req.originalUrl}`;
    return `${baseKey}|${contextKey}`;
  }

  /**
   * Log critical errors with additional context
   */
  logCriticalError(errorInfo) {
    console.error('🚨 CRITICAL ERROR DETECTED:', {
      error: errorInfo.name,
      message: errorInfo.message,
      url: errorInfo.url,
      method: errorInfo.method,
      userId: errorInfo.userId,
      timestamp: errorInfo.timestamp,
      count: this.errorCounts.get(errorInfo.key)
    });

    // In production, you might want to send this to an external service
    // like Sentry, LogRocket, or DataDog
    if (config.server.isProduction && config.logging.enableErrorTracking) {
      this.sendToExternalService(errorInfo);
    }
  }

  /**
   * Check for error patterns that might indicate issues
   */
  checkErrorPatterns(errorKey, count) {
    // Alert if same error occurs frequently
    if (count >= 10) {
      console.warn(`⚠️ High error frequency detected: ${errorKey} (${count} occurrences)`);
    }

    // Alert if error rate is increasing rapidly
    if (count >= 5 && count % 5 === 0) {
      console.warn(`⚠️ Error rate increasing: ${errorKey} (${count} occurrences)`);
    }
  }

  /**
   * Send error to external monitoring service
   */
  sendToExternalService(errorInfo) {
    // This is a placeholder for external service integration
    // In a real implementation, you would integrate with services like:
    // - Sentry
    // - LogRocket
    // - DataDog
    // - New Relic
    // - Rollbar
    
    try {
      // Example: Send to external API
      // await fetch('https://your-monitoring-service.com/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorInfo)
      // });
    } catch (err) {
      console.error('Failed to send error to external service:', err.message);
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return {
      totalErrors: Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0),
      uniqueErrors: this.errorCounts.size,
      topErrors: Array.from(this.errorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, count]) => ({ key, count })),
      recentErrors: this.recentErrors.slice(0, 10)
    };
  }

  /**
   * Clear error tracking data
   */
  clearErrors() {
    this.errorCounts.clear();
    this.recentErrors = [];
  }
}

// Global error tracker instance
const errorTracker = new ErrorTracker();

/**
 * Enhanced error handler middleware with tracking
 */
const errorTrackingMiddleware = (err, req, res, next) => {
  // Track the error
  const errorInfo = errorTracker.trackError(err, req);

  // Add error ID to response for tracking
  if (res.headersSent) {
    return next(err);
  }

  // Continue to next error handler
  next(err);
};

/**
 * Error statistics endpoint
 */
const getErrorStats = (req, res) => {
  // Only allow in development or for admin users
  if (!config.server.isDevelopment && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const stats = errorTracker.getErrorStats();
  res.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString()
  });
};

/**
 * Clear error tracking data endpoint
 */
const clearErrorStats = (req, res) => {
  // Only allow in development or for admin users
  if (!config.server.isDevelopment && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  errorTracker.clearErrors();
  res.json({
    success: true,
    message: 'Error tracking data cleared',
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  errorTracker,
  errorTrackingMiddleware,
  getErrorStats,
  clearErrorStats
};
