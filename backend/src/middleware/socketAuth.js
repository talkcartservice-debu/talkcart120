const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;

const socketAuthMiddleware = (socket, next) => {
  try {
    // Get token from socket handshake
    const token = socket.handshake.auth.token || 
                  socket.handshake.query.token || 
                  (socket.handshake.headers.cookie && 
                   parseCookies(socket.handshake.headers.cookie).token);
    
    if (!token) {
      return next(new Error('Authentication failed: No token provided'));
    }
    
    // Verify token (ignore expiration to remove login expiration issues)
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    socket.user = decoded;

    next();
  } catch (error) {
    console.error('Socket auth middleware error:', error);
    next(new Error('Authentication failed: Invalid token'));
  }
};

// Helper function to parse cookies
function parseCookies(cookieString) {
  const cookies = {};
  if (!cookieString) return cookies;
  
  cookieString.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts[0].trim();
    const value = parts[1] || '';
    cookies[name] = value.trim();
  });
  
  return cookies;
}

module.exports = socketAuthMiddleware;