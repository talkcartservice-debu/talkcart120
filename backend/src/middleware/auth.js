// Ensure your auth middleware properly validates tokens
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;

const authMiddleware = (req, res, next) => {
  try {
    // Get token from different sources based on connection type
    let token;
    
    // For HTTP requests (with headers)
    if (req.headers && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }
    
    // For WebSocket connections (typically in handshake query or cookies)
    if (!token && req.query && req.query.token) {
      token = req.query.token;
    }
    
    // For cookie-based authentication
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    // If no token found in any source
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication failed: No token provided' 
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication failed: Invalid token' 
    });
  }
};

module.exports = authMiddleware;