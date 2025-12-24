const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
// Load dotenv with explicit path to backend directory
// Load environment variables first, then check NODE_ENV
const dotenv = require('dotenv');

// Load .env file but don't override existing environment variables
// This allows Render environment variables to take precedence
const envPath = path.resolve(__dirname, '.env');
const envConfig = dotenv.config({ path: envPath, override: false });

// Log if we're in production mode
if (process.env.NODE_ENV === 'production') {
  console.log('🔧 Running in production mode');
} else {
  console.log('🔧 Running in development mode');
}

const connectDB = require('./config/database');
const config = require('./config/config');
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
const { User } = require('./models');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.security.cors.origin,
    credentials: true,
  },
  // Disable all timeouts to prevent connection issues
  connectTimeout: 999999999, // Effectively disable timeout (Socket.IO ignores 0)
  pingTimeout: 999999999, // Effectively disable timeout (Socket.IO ignores 0)
  ackTimeout: 999999999, // Effectively disable timeout (Socket.IO ignores 0)
  timeout: 999999999, // Effectively disable timeout (Socket.IO ignores 0)
  // Set ping interval to keep connection alive
  pingInterval: 25000,
  // Allow both websocket and polling transports
  transports: ['websocket', 'polling'],
});

// Make io globally accessible
global.io = io;

// Socket.IO JWT Authentication Middleware
io.use(async (socket, next) => {
  try {
    // Support multiple token sources and normalize possible "Bearer" prefix
    const rawToken =
      (socket.handshake.auth && socket.handshake.auth.token) ||
      (socket.handshake.query && socket.handshake.query.token) ||
      (socket.handshake.headers && (socket.handshake.headers.authorization || socket.handshake.headers.Authorization));

    let token = typeof rawToken === 'string' ? rawToken : '';
    if (token.startsWith('Bearer ')) token = token.slice(7).trim();

    // Socket connection attempt logged for debugging

    if (!token) {
      // Allow anonymous connections for public features like comment updates
      socket.userId = 'anonymous-user';
      socket.user = { username: 'anonymous', isAnonymous: true };
      return next();
    }

    // Verify JWT token using configuration
    const JWT_SECRET = config.jwt.secret;
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });

    // Check if user exists and is active
    const user = await User.findById(decoded.userId).select('_id username email isActive');

    if (!user) {
      return next(new Error('Authentication failed: User not found'));
    }

    if (!user.isActive) {
      return next(new Error('Authentication failed: Account inactive'));
    }

    // Attach user info to socket
    socket.userId = user._id.toString();
    socket.user = user;
    
    // Register authenticated socket with SocketService
    const socketService = require('./services/socketService');
    if (typeof socketService.getInstance === 'function') {
      socketService.getInstance().registerAuthenticatedSocket(socket);
    } else {
      // If it's a class-based service
      const app = require('./server');
      const service = app.get('socketService');
      if (service && typeof service.registerAuthenticatedSocket === 'function') {
        service.registerAuthenticatedSocket(socket);
      }
    }
    
    next();
  } catch (error) {
    console.error('❌ Socket authentication error:', {
      message: error.message,
      name: error.name,
      stack: (error.stack || '').split('\n')[0]
    });
    // Fall back to anonymous connection instead of hard failing in dev
    if (config.server.isDevelopment) {
      socket.userId = 'anonymous-user';
      socket.user = { username: 'anonymous', isAnonymous: true };
      return next();
    }
    next(new Error('Authentication failed'));
  }
});
// Use the PORT Render provides (default 10000) and bind to 0.0.0.0
// In production, these should come from Render environment variables
const PORT = process.env.PORT || config.server.port || 10000;
const HOST = process.env.HOST || config.server.host || '0.0.0.0';

// Log actual port and host being used
console.log(`🔧 Using PORT: ${PORT}, HOST: ${HOST}`);

// Comprehensive security middleware
const { 
  securityHeaders, 
  corsOptions, 
  requestSizeLimiter, 
  ipFilter, 
  userAgentFilter, 
  requestTimingProtection, 
  sqlInjectionProtection, 
  xssProtection, 
  apiSecurityHeaders 
} = require('./middleware/security');

// Apply security headers
if (config.security.headers.enabled) {
  app.use(securityHeaders);
}

// Apply security middleware
app.use(requestSizeLimiter);
app.use(ipFilter);
app.use(userAgentFilter);
app.use(requestTimingProtection);
app.use(sqlInjectionProtection);
app.use(xssProtection);
app.use(apiSecurityHeaders);

// Anonymous access control
const { anonymousAccessControl, logAnonymousAccess } = require('./middleware/anonymousAccess');
app.use(anonymousAccessControl);
app.use(logAnonymousAccess);
app.use(compression());

// Rate limiting
const { generalLimiter, speedLimiter } = require('./middleware/rateLimiting');
app.use('/api/', generalLimiter);
app.use('/api/', speedLimiter);

// CORS configuration
app.use(cors(corsOptions));

// Body parsing middleware (increase limits for large metadata forms)
const BODY_LIMIT = `${config.upload.maxFieldSize}mb`;

// Use body-parser directly for better control
const bodyParser = require('body-parser');

// Skip body parsing for media upload endpoints to avoid corrupting multipart data
app.use((req, res, next) => {
  const url = req.originalUrl || req.url || '';
  const contentType = (req.headers['content-type'] || '').toLowerCase();

  // Skip all body parsing for media upload endpoints
  if (url.startsWith('/api/media/upload') || contentType.startsWith('multipart/form-data')) {
    return next();
  }

  // Continue with normal body parsing for other endpoints
  next();
});

// JSON parser for non-upload endpoints
app.use(bodyParser.json({
  limit: BODY_LIMIT,
  type: (req) => {
    const ct = req.headers['content-type'] || '';
    const url = req.originalUrl || req.url || '';

    // Skip JSON parsing for upload and webhook endpoints (webhooks need raw body)
    if (
      url.startsWith('/api/media/upload') ||
      url.startsWith('/api/webhooks') ||
      ct.startsWith('multipart/form-data')
    ) {
      return false;
    }
    return ct.includes('application/json');
  }
}));

// URL-encoded parser for non-upload endpoints
app.use(bodyParser.urlencoded({
  extended: true,
  limit: BODY_LIMIT,
  type: (req) => {
    const ct = req.headers['content-type'] || '';
    const url = req.originalUrl || req.url || '';

    // Skip URL-encoded parsing for upload endpoints
    if (url.startsWith('/api/media/upload') || ct.startsWith('multipart/form-data')) {
      return false;
    }
    return ct.includes('application/x-www-form-urlencoded');
  }
}));

// Custom middleware for handling browser extension interference (non-upload endpoints only)
app.use((req, res, next) => {
  const url = req.originalUrl || req.url || '';
  const contentType = (req.headers['content-type'] || '').toLowerCase();

  // Skip this middleware for upload endpoints
  if (url.startsWith('/api/media/upload') || contentType.startsWith('multipart/form-data')) {
    return next();
  }

  // Only process JSON requests that might have extension interference
  if (!req.body || typeof req.body !== 'string') {
    return next();
  }

  const rawBody = req.body;

  // Check for "iammirror" pattern (behind env flag to avoid false positives in dev)
  const shouldBlockExtensionPattern = config.development.blockExtensionInterference;
  const isDevelopment = config.server.isDevelopment;

  if (shouldBlockExtensionPattern && rawBody.includes('iammirror')) {
    // In development, try to clean the request instead of blocking it
    if (isDevelopment) {

      try {
        // Try to extract valid JSON by removing the extension interference
        let cleanedBody = rawBody;

        // Remove common browser extension patterns
        cleanedBody = cleanedBody.replace(/iammirror/g, '');
        cleanedBody = cleanedBody.replace(/^\s*"?\s*/, ''); // Remove leading quotes/spaces
        cleanedBody = cleanedBody.replace(/\s*"?\s*$/, ''); // Remove trailing quotes/spaces

        // Try to find JSON-like content
        const jsonMatch = cleanedBody.match(/\{.*\}/);
        if (jsonMatch) {
          cleanedBody = jsonMatch[0];
        }

        // Try to parse the cleaned body
        const parsedBody = JSON.parse(cleanedBody);
        req.body = parsedBody;
        return next();
      } catch (cleanError) {
        console.error('Failed to clean browser extension interference:', cleanError.message);
        // Fall through to the original error handling
      }
    }

    const email = rawBody.replace(/"/g, '').trim();

    // Block all requests with iammirror pattern (or provide helpful error in dev)
    return res.status(400).json({
      success: false,
      message: isDevelopment
        ? 'Browser extension interference detected. Please disable browser extensions that modify form data (like password managers or auto-fill extensions) and try again.'
        : 'Invalid request format detected. This appears to be from a browser extension interfering with the login process.',
      details: isDevelopment
        ? 'Common culprits: LastPass, 1Password, Dashlane, or other form-filling extensions. Try using an incognito/private window.'
        : 'Please disable any browser extensions that might be interfering with form submissions and try again.',
      detected_pattern: 'Browser extension interference',
      extracted_data: email,
      suggestion: isDevelopment ? 'Try using an incognito/private browser window or disable form-filling extensions.' : undefined
    });
  }

  next();
});



// Logging with custom format
if (config.logging.enableRequestLogging) {
  // Custom morgan format to reduce noise
  app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
    skip: (req, res) => {
      // Skip logging for successful health checks and static files
      return (req.url === '/api/health' && res.statusCode === 200) ||
        req.url.includes('favicon.ico') ||
        req.url.includes('_next/static');
    }
  }));
}

// Image proxy endpoint with proper CORS - accessed from frontend
app.get('/api/image-proxy', cors({
  origin: config.security.cors.origin,
  credentials: true,
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}), (req, res) => {
  const { path: imagePath } = req.query;
  
  if (!imagePath || typeof imagePath !== 'string') {
    return res.status(400).json({ error: 'Image path parameter is required' });
  }

  // Extract the uploads path from the full URL if provided
  let relPath = imagePath;
  if (imagePath.includes('/uploads/')) {
    relPath = imagePath.split('/uploads/')[1];
  }

  // Prevent directory traversal
  const uploadsDir = path.join(__dirname, 'uploads');
  const normalizedPath = path.normalize(path.join(uploadsDir, relPath));
  if (!normalizedPath.startsWith(uploadsDir)) {
    return res.status(400).json({ error: 'Invalid image path' });
  }
  let fullPath = normalizedPath;

  // Check if file exists; if not, attempt to find a matching file with a known extension
  const fs = require('fs');
  if (!fs.existsSync(fullPath)) {
    try {
      const dir = path.dirname(fullPath);
      const base = path.basename(fullPath).toLowerCase();
  const allowedExts = ['.mp4', '.mp4v', '.webm', '.ogg', '.mov', '.mkv', '.avi', '.flv', '.mp3', '.wav', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
      if (fs.existsSync(dir)) {
        const candidates = fs.readdirSync(path.basename(dir));
        const match = candidates.find(f => {
          const lower = f.toLowerCase();
          // exact match (case-insensitive)
          if (lower === base) return true;
          // match with allowed extension
          const ext = path.extname(lower);
          return lower === `${base}${ext}` && allowedExts.includes(ext);
        });
        if (match) {
          fullPath = path.join(dir, match);
        } else {
          return res.status(404).json({ error: 'Image not found' });
        }
      } else {
        return res.status(404).json({ error: 'Image not found' });
      }
    } catch (err) {
      console.error('Error while searching for fallback file:', err);
      return res.status(500).json({ error: 'Image not found' });
    }
  }
  
  // Set CORS and cache headers
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'public, max-age=3600',
    'Content-Type': 'image/jpeg', // Default, will be overridden by sendFile
  });
  
  // If file is extremely small it may not be a valid media file - fallback to placeholder
  try {
    const stat = fs.statSync(fullPath);
    if (stat.size < 128) {
      // Use frontend placeholder video if available
      const placeholder = path.join(__dirname, '..', 'frontend', 'public', 'videos', 'placeholder-video.mp4');
      if (fs.existsSync(placeholder)) {
        res.set('Content-Type', 'video/mp4');
        return res.sendFile(placeholder);
      }
    }
  } catch (e) {
    // ignore and attempt to send the original file
  }

  // Send the file
  res.sendFile(fullPath, (err) => {
    if (err) {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to send image' });
      }
    }
  });
});

// Handle favicon requests
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Middleware: when a requested upload file is missing, serve a placeholder if available
app.use('/uploads', (req, res, next) => {
  try {
    const reqPath = req.path || '';
    const uploadsDir = path.join(__dirname, 'uploads');
    const fsPath = path.normalize(path.join(uploadsDir, reqPath));

    // Security: ensure path is within uploadsDir
    if (!fsPath.startsWith(uploadsDir)) return next();

    const fs = require('fs');

    if (fs.existsSync(fsPath)) return next();

    console.log('🔧 Upload fallback middleware triggered for:', reqPath);
    console.log('   fsPath:', fsPath);
    console.log('   File exists:', fs.existsSync(fsPath));

    // For video files, return a data URL MP4 placeholder
    if (reqPath.endsWith('.mp4') || reqPath.includes('video')) {
      console.log('   Serving video data URL placeholder');
      
      // Return a minimal MP4 file as data URL
      // This is a valid MP4 file with a single black frame
      const mp4Data = 'AAAAHGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAw1tZGF0AAAA0G1vb3YAAABsbXZoZAAAAAAAAAAAAAAAA+gAAPqEAAEAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAIgAAACAAAAACGpmdHlwAAAAAAAACJtb292AAAAAAAALmNvdQAAAwB0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAJGVkdHMAAAAcZWlzdAAAAAAAAAABAAAD6QAAAAEAAAPpAAAAAAABjHN0dHMAAAAAAAAAAgAAABRjdHRzAAAAAAAAAAEAAAABAAAAHHN0c2MAAAAAAAAAAQAAAAEAAAABAAAAAQAAABRzdHN6AAAAAAAAAAAAAAABjHN0Y28AAAAAAAAAAQAAAFXQcGFzcAAAAJx0aGRmAAAAAQAAAAAAAAAAABBjdHRhAAAAAHZpdG0AAAAAeG1lZGlhAAAAIG1kaGQAAAAA7gAAB9AAAAAALWhkbHIAAAAAAAB2aWRlAAAAAAAAAAAAAAAAVmlkZW9IYW5kbGVyAAAAAVxtaW5mAAAAFHZtaGQAAAABAAAAAAAAAAAAAAAkZGluZgAAABxkcmVmAAAAAAAAAAEAAAAMdXJsIAAAAAEAAAHsc3RibAAAAJdzdHNkAAAAAAAAAAEAAACobXA0YQAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAEgAAADIAAAAzAAAAFAAAABgAAAAaAAAAPIAAAA4AAAAP6AAAABRAAAAfQAAAFxAAAAkAAA';
      
      // Set proper headers for MP4 video
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Length', Buffer.from(mp4Data, 'base64').length);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      // Send the base64 decoded MP4 data
      return res.send(Buffer.from(mp4Data, 'base64'));
    }

    // Not found: check for the user's specific fallback file first, then general placeholders
    const fallbackFilename = 'file_1760472876401_eul3ctkpyr8.mp4';
    const candidates = [
      path.join(uploadsDir, fallbackFilename),
      path.join(uploadsDir, 'talkcart', fallbackFilename),
      path.join(uploadsDir, 'placeholder.png'), // New: generic placeholder
      path.join(uploadsDir, 'talkcart', 'placeholder-image.png'), // New: specific image placeholder
      path.join(uploadsDir, 'talkcart', 'placeholder-video.png'), // New: specific video placeholder
      path.join(uploadsDir, 'placeholder-image.png'), // Fallback to image placeholder
      path.join(uploadsDir, 'placeholder-video.png'), // Fallback to video placeholder
      path.join(__dirname, '..', 'frontend', 'public', 'images', 'placeholder-image-new.png'), // Frontend placeholder
      path.join(__dirname, '..', 'frontend', 'public', 'images', 'placeholder-image.png') // Alternative frontend placeholder
    ];

    const found = candidates.find(p => {
      try {
        if (!fs.existsSync(p)) return false;
        const stat = fs.statSync(p);
        // Only use a placeholder if file size is reasonable (avoid zero-length files)
        return stat.isFile() && stat.size > 10; // >10 bytes
      } catch (e) {
        return false;
      }
    });
    
    console.log('   Found valid fallback:', !!found);
    
    if (found) {
      // Redirect to the uploads URL so the static middleware can serve it (supports range requests)
      const rel = path.relative(uploadsDir, found).replace(/\\/g, '/');
      const redirectPath = `/uploads/${rel}`;
      
      console.log('   Redirecting to:', redirectPath);
      
      // Use 302 temporary redirect; browser will then request via the static handler which supports Range
      return res.redirect(302, redirectPath);
    } else {
      // If no file-based fallback found, serve a data URL PNG placeholder
      console.log('   No file fallback found, serving data URL placeholder');
      
      // Create a simple 1x1 transparent PNG as base64
      const pngData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      
      // Set proper headers for PNG image
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      // Send the base64 decoded PNG data
      return res.send(Buffer.from(pngData, 'base64'));
    }
  } catch (e) {
    console.error('❌ Error in upload fallback middleware:', e);
    return next();
  }
});

// Add a specific route for Cloudinary-like video URLs to handle transformation errors
app.get('/video/upload/*', (req, res, next) => {
  console.log('🔧 Cloudinary video URL requested:', req.url);
  
  // For Cloudinary-like URLs that might have failed due to transformations,
  // try to serve a simplified version
  const simplifiedPath = req.url.replace('/c_fill,h_300,w_400/q_auto/', '/')
                                .replace('/c_fill,h_300,w_400/', '/')
                                .replace('/q_auto/', '/');
  
  if (simplifiedPath !== req.url) {
    console.log('🔧 Trying simplified path:', simplifiedPath);
    // Try the simplified path
    req.url = simplifiedPath;
    next();
  } else {
    // If no simplification possible, use the fallback middleware
    next();
  }
});

// Static files with CORS headers and proper MIME types
app.use('/uploads', cors({
  origin: config.security.cors.origin,
  credentials: true,
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}), express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    // Set proper MIME types for common image formats
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.bmp': 'image/bmp',
      '.ico': 'image/x-icon',
      '.tiff': 'image/tiff',
      '.tif': 'image/tiff',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',
      '.mov': 'video/quicktime'
    };
    
    // Special handling for files that might be misnamed
    // Check file content to determine actual type
    try {
      const fs = require('fs');
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath, { encoding: null });
        // Check if it's actually an SVG file
        if (buffer && buffer.length > 10) {
          const start = buffer.toString('utf8', 0, 100);
          if (start.includes('<svg')) {
            res.setHeader('Content-Type', 'image/svg+xml');
            console.log('🔧 Detected SVG file with incorrect extension:', filePath);
            return; // Exit early since we've set the correct header
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Error checking file type:', e.message);
    }
    
    // If file has a known extension, use it
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    } else if (!ext || ext === '') {
      // For files without extension, try to detect from content or default to svg+xml
      // (since we're creating SVG placeholders)
      res.setHeader('Content-Type', 'image/svg+xml');
    }
    
    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Override restrictive CSP for static files to allow cross-origin loading
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src * data: blob:; connect-src *");
  }
}));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    // Set proper MIME types for common image formats
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.bmp': 'image/bmp',
      '.ico': 'image/x-icon',
      '.tiff': 'image/tiff',
      '.tif': 'image/tiff',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',
      '.mov': 'video/quicktime'
    };
    
    // Special handling for files that might be misnamed
    // Check file content to determine actual type
    try {
      const fs = require('fs');
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath, { encoding: null });
        // Check if it's actually an SVG file
        if (buffer && buffer.length > 10) {
          const start = buffer.toString('utf8', 0, 100);
          if (start.includes('<svg')) {
            res.setHeader('Content-Type', 'image/svg+xml');
            console.log('🔧 Detected SVG file with incorrect extension:', filePath);
            return; // Exit early since we've set the correct header
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Error checking file type:', e.message);
    }
    
    // If file has a known extension, use it
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    } else if (!ext || ext === '') {
      // For files without extension, try to detect from content or default to svg+xml
      // (since we're creating SVG placeholders)
      res.setHeader('Content-Type', 'image/svg+xml');
    }
    
    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Override restrictive CSP for static files to allow cross-origin loading
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src * data: blob:; connect-src *");
  }
}));

// Initialize SocketService
const SocketService = require('./services/socketService');
const socketService = new SocketService(io);

// Make Socket.IO instance and SocketService available to routes
app.set('io', io);
app.set('socketService', socketService);

// Set up global broadcast function for routes
global.broadcastToAll = (event, data) => {
  io.emit(event, data);
};

// Set up targeted broadcast function for post-specific events
// NOTE: Use the same room naming as join-post (post:${postId})
global.broadcastToPost = (postId, event, data) => {
  io.to(`post:${postId}`).emit(event, data);
};

// API Routes
app.use('/api/auth', require('./routes/auth').router);
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/posts-enhanced', require('./routes/posts-enhanced'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/chatbot', require('./routes/chatbot'));
app.use('/api/marketplace', require('./routes/marketplace'));
app.use('/api/support', require('./routes/support'));
// Cart routes re-enabled with new implementation
app.use('/api/orders', require('./routes/orders'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/dao', require('./routes/dao'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/media', require('./routes/media'));
app.use('/api/nfts', require('./routes/nfts'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/defi', require('./routes/defi'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/search', require('./routes/search'));
// Remove the separate product comparison route as it should be part of marketplace
// app.use('/api/products', require('./routes/productComparison'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/ads', require('./routes/ads'));
// AI routes removed as part of AI functionality removal
// Admin routes
const adminRouter = require('./routes/admin');
const adminSignupRouter = require('./routes/adminSignup');
app.use('/api/admin', adminSignupRouter);
app.use('/api/admin', adminRouter);
app.use('/api/webhooks', require('./routes/webhooks'));

// Error tracking and rate limiting endpoints
const { getErrorStats, clearErrorStats } = require('./middleware/errorTracking');
const { getRateLimitStatus, clearRateLimit } = require('./middleware/rateLimiting');
app.get('/api/error-stats', getErrorStats);
app.delete('/api/error-stats', clearErrorStats);
app.get('/api/rate-limit-status', getRateLimitStatus);
app.post('/api/rate-limit/clear', clearRateLimit);

// Cache management endpoints
app.get('/api/cache/stats', async (req, res) => {
  try {
    const cacheService = require('./services/cacheService');
    const stats = cacheService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get cache stats' });
  }
});

app.delete('/api/cache/clear', async (req, res) => {
  try {
    const cacheService = require('./services/cacheService');
    await cacheService.clear();
    res.json({ success: true, message: 'Cache cleared successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to clear cache' });
  }
});

app.get('/api/cache/health', async (req, res) => {
  try {
    const redisConfig = require('./config/redis');
    const health = await redisConfig.healthCheck();
    res.json({ success: true, data: health });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to check cache health' });
  }
});



// Function to update and emit trending hashtags
const updateAndEmitTrendingHashtags = async () => {
  try {
    const Post = require('./models/Post');
    
    // Skip trending hashtags update if MongoDB is not connected
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️ MongoDB not connected, skipping trending hashtags update');
      return;
    }
    
    // Add timeout protection for the aggregation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Trending hashtags aggregation timeout')), 60000); // 60 second timeout
    });
    
    const aggregationPromise = Post.aggregate([
      {
        $match: {
          isActive: true,
          hashtags: { $exists: true, $ne: [] }
        }
      },
      { $unwind: '$hashtags' },
      // Compute per-post engagement metrics
      {
        $addFields: {
          likesCount: { $size: { $ifNull: ['$likes', []] } },
          sharesCount: { $size: { $ifNull: ['$shares', []] } },
          viewsCount: { $ifNull: ['$views', 0] }
        }
      },
      // Lookup comment count for each post
      {
        $lookup: {
          from: 'comments',
          let: { postId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [ { $eq: ['$post', '$$postId'] }, { $eq: ['$isActive', true] } ] } } },
            { $count: 'count' }
          ],
          as: 'commentAgg'
        }
      },
      {
        $addFields: {
          commentCount: { $ifNull: [ { $arrayElemAt: ['$commentAgg.count', 0] }, 0 ] }
        }
      },
      // Time decay weight based on post age (so newer posts weigh more)
      {
        $addFields: {
          ageHours: { $divide: [ { $subtract: [ new Date(), '$createdAt' ] }, 3600000 ] },
          decayWeight: { $divide: [ 1, { $add: [ 1, { $divide: [ { $divide: [ { $subtract: [ new Date(), '$createdAt' ] }, 3600000 ] }, 24 ] } ] } ] }
        }
      },
      // Per-post score with weights
      {
        $addFields: {
          postScore: {
            $multiply: [
              { $add: [
                1, // base
                { $multiply: ['$likesCount', 2] },
                { $multiply: ['$commentCount', 3] },
                { $multiply: ['$sharesCount', 4] },
                { $multiply: ['$viewsCount', 0.1] }
              ] },
              '$decayWeight'
            ]
          }
        }
      },
      // Group by hashtag
      {
        $group: {
          _id: '$hashtags',
          count: { $sum: 1 },
          totalLikes: { $sum: '$likesCount' },
          totalComments: { $sum: '$commentCount' },
          totalShares: { $sum: '$sharesCount' },
          totalViews: { $sum: '$viewsCount' },
          score: { $sum: '$postScore' }
        }
      },
      { $sort: { score: -1 } },
      { $limit: 5 }, // Limit to top 5 trending hashtags
      {
        $project: {
          hashtag: '$_id',
          count: 1,
          totalLikes: 1,
          totalComments: 1,
          totalShares: 1,
          totalViews: 1,
          score: 1,
          _id: 0
        }
      }
    ]);
    
    // Execute with timeout protection
    const trendingHashtags = await Promise.race([aggregationPromise, timeoutPromise]);
    
    // Emit trending update to all connected clients
    io.emit('trending:update', trendingHashtags);
    console.log('✅ Trending hashtags updated successfully');
  } catch (error) {
    console.error('Error updating trending hashtags:', error.message);
    // Don't throw error to prevent crashing the cron job
  }
};

// Schedule periodic trending hashtags updates (every 5 minutes)
cron.schedule('*/5 * * * *', updateAndEmitTrendingHashtags);

// Initial trending hashtags update when server starts
setTimeout(updateAndEmitTrendingHashtags, 5000);

// Root route - API documentation
app.get('/', (req, res) => {
  res.json({
    name: 'TalkCart API',
    version: '1.0.0',
    description: 'Web3 Super Application Backend API',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      posts: '/api/posts',
      comments: '/api/comments',
      marketplace: '/api/marketplace',
      support: '/api/support',
      messages: '/api/messages',
      chatbot: '/api/chatbot',
      dao: '/api/dao',
      analytics: '/api/analytics',
      media: '/api/media',
      nfts: '/api/nfts',
      wallet: '/api/wallet',
      defi: '/api/defi'
    },
    documentation: {
      frontend: 'http://localhost:4000',
      health_check: '/api/health',
      api_base: '/api'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');

  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: {
      type: 'MongoDB',
      status: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      port: mongoose.connection.port,
      readyState: mongoose.connection.readyState,
      collections: Object.keys(mongoose.connection.collections).length
    },
    storage: 'MongoDB Only',
    features: [
      'User Management',
      'Post Creation',
      'Comment System',
      'Real-time Updates',
      'Media Upload',
      'Search & Discovery'
    ]
  });
});

// Error tracking and handling middleware
const { errorTrackingMiddleware } = require('./middleware/errorTracking');
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorTrackingMiddleware);
app.use(errorHandler);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

// Initialize MongoDB and start server
const initializeApp = async () => {
  try {
    // Log environment summary
    const envSummary = config.getSummary();
    console.log('🔧 Environment Configuration:', JSON.stringify(envSummary, null, 2));
    
    // Log actual environment variables for debugging
    console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
    console.log('🔧 MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
    console.log('🔧 MONGODB_URI value:', process.env.MONGODB_URI || 'NOT SET');
    console.log('🔧 MONGODB_URI length:', process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0);
    console.log('🔧 PORT:', process.env.PORT);
    console.log('🔧 HOST:', process.env.HOST);
    console.log('🔧 Process env keys count:', Object.keys(process.env).length);
    
    // Show some environment variables (without sensitive data)
    const safeEnvVars = Object.keys(process.env)
      .filter(key => !key.includes('SECRET') && !key.includes('PASS') && !key.includes('KEY'))
      .slice(0, 10);
    console.log('🔧 Safe env vars (first 10):', safeEnvVars.join(', '));
    
    // Warn in production if using localhost for MongoDB
    if (process.env.NODE_ENV === 'production') {
      const mongoose = require('mongoose');
      const dbUri = process.env.MONGODB_URI || config.database.uri;
      console.log('🔧 Production DB URI check:', {
        dbUriSet: !!dbUri,
        isLocalhost: dbUri && (dbUri.includes('localhost') || dbUri.includes('127.0.0.1')),
        isAtlas: dbUri && dbUri.includes('mongodb.net'),
        isValidFormat: dbUri && (dbUri.startsWith('mongodb://') || dbUri.startsWith('mongodb+srv://'))
      });
      
      // Validate MongoDB URI format
      if (dbUri && !dbUri.startsWith('mongodb://') && !dbUri.startsWith('mongodb+srv://')) {
        console.warn('⚠️ WARNING: MONGODB_URI does not appear to be a valid MongoDB connection string');
        console.warn('⚠️ Expected format: mongodb:// or mongodb+srv://');
      }
      
      if (dbUri && (dbUri.includes('localhost') || dbUri.includes('127.0.0.1'))) {
        console.warn('⚠️ WARNING: Using localhost MongoDB URI in production! This will not work on Render.');
        console.warn('⚠️ Please set MONGODB_URI environment variable to a cloud MongoDB connection string.');
      }
    }

    // Attempt to connect to MongoDB first, but don't fail immediately in production
    let dbConnection;
    try {
      console.log('🔧 Attempting to connect to MongoDB...');
      dbConnection = await connectDB();
      console.log('✅ MongoDB connected successfully');
    } catch (dbError) {
      console.warn('⚠️ MongoDB connection failed:', dbError.message);
      console.warn('🔧 MongoDB connection error stack:', dbError.stack);
      if (process.env.NODE_ENV === 'production') {
        console.warn('⚠️ Running in production without MongoDB - some features will be limited');
      } else {
        // In development, we still want to exit on DB failure
        throw dbError;
      }
    }

    // Initialize cache service
    console.log('🔧 Initializing cache service...');
    try {
      const cacheService = require('./services/cacheService');
      await cacheService.initialize();
      console.log('✅ Cache service initialized');
    } catch (cacheError) {
      console.warn('⚠️ Cache service initialization failed:', cacheError.message);
    }

    // Start vendor payout job
    console.log('🔧 Starting vendor payout job...');
    try {
      const vendorPayoutJob = require('./jobs/vendorPayoutJob');
      vendorPayoutJob.start();
      console.log('✅ Vendor payout job started');
    } catch (jobError) {
      console.warn('⚠️ Vendor payout job failed to start:', jobError.message);
    }

    // Start server
    console.log(`🔧 Attempting to start server on ${HOST}:${PORT}...`);
    const serverInstance = server.listen(PORT, HOST, () => {
      console.log(`🚀 TalkCart Backend Started on http://${HOST}:${PORT}`);
      console.log(`📊 Environment: ${config.server.env}`);
      if (!dbConnection) {
        console.warn('⚠️ Warning: Application running without database connection');
      }
    });
    
    // Add error handler for server
    serverInstance.on('error', (err) => {
      console.error('❌ Server failed to start:', err);
    });
    
    // Log that we've reached this point
    console.log('🔧 Server initialization completed');
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    console.error('💡 Please ensure MongoDB is running and accessible');
    
    // In development, exit so we don't run in a bad state
    // In production, we might want to continue with limited functionality
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔧 Exiting in development mode due to MongoDB connection failure');
      process.exit(1);
    } else {
      console.warn('⚠️ Continuing in production with limited functionality...');
      // Start server even without DB connection in production
      console.log('🔧 Attempting to start server without database connection...');
      const serverInstance = server.listen(PORT, HOST, () => {
        console.log(`🚀 TalkCart Backend Started on http://${HOST}:${PORT}`);
        console.log(`📊 Environment: ${config.server.env}`);
        console.warn('⚠️ Warning: Application running without database connection');
      });
      
      // Add error handler for server
      serverInstance.on('error', (err) => {
        console.error('❌ Server failed to start in production mode:', err);
      });
      // Don't exit the process - let the server run
      console.log('🔧 Server start process initiated in production mode');
    }
  }
};

// Initialize the application
console.log('🔧 Initializing application...');
initializeApp();
console.log('🔧 Application initialization started');

module.exports = app;