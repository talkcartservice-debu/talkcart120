const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { User } = require('../models');
const { validateSettings } = require('../middleware/settingsValidation');
const { biometricSecurityStack } = require('../middleware/biometricSecurity');
const axios = require('axios');
const emailService = require('../services/emailService');

console.log('✅ AUTH ROUTES LOADED: Current version with FRONTEND_URL 4000 support');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Auth service is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Import configuration
const config = require('../config/config');

// Store for refresh tokens (in production, use Redis or a database)
const refreshTokens = new Set();

// Generate access token (no expiration)
const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, config.jwt.secret);
};

// Generate refresh token (no expiration)
const generateRefreshToken = (userId) => {
  const refreshToken = jwt.sign({ userId }, config.jwt.refreshSecret);
  refreshTokens.add(refreshToken);
  return refreshToken;
};

// Middleware to verify JWT token - now allows anonymous access
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // Allow requests without tokens for full open access
  if (!token) {
    req.user = { userId: 'anonymous-user', isAnonymous: true };
    return next();
  }

  // Special handling for anonymous user token
  if (token === 'anonymous-access-token') {
    req.user = { userId: 'anonymous-user', isAnonymous: true };
    return next();
  }

  // For actual JWT tokens, verify them (ignore expiration to remove login expiration)
  jwt.verify(token, config.jwt.secret, { ignoreExpiration: true }, async (err, user) => {
    if (err) {
      // If JWT verification fails, allow anonymous access instead of blocking
      req.user = { userId: 'anonymous-user', isAnonymous: true };
      return next();
    }
    
    // Check if user is a vendor - improved logic with caching
    if (user.userId && user.userId !== 'anonymous-user') {
      try {
        const User = require('../models/User');
        const VendorStore = require('../models/VendorStore');
        
        // First, get the user document to check role and avoid duplicate queries
        const dbUser = await User.findById(user.userId).select('role');
        
        if (dbUser) {
          // Check if user has a vendor store, but cache this information to avoid repeated queries
          const store = await VendorStore.findOne({ vendorId: user.userId }).select('_id');
          
          if (store && dbUser.role !== 'vendor') {
            // Update user role to vendor in database
            dbUser.role = 'vendor';
            await dbUser.save();
            user.role = 'vendor';
          } else if (!store && dbUser.role === 'vendor') {
            // Check if user no longer has a store but still has vendor role
            const storeCheck = await VendorStore.findOne({ vendorId: user.userId }).select('_id');
            if (!storeCheck) {
              dbUser.role = 'user';
              await dbUser.save();
              user.role = 'user';
            } else {
              user.role = 'vendor';
            }
          } else {
            // Use the role from the database
            user.role = dbUser.role;
          }
        } else {
          user.role = 'user'; // Default to user if no user found
        }
      } catch (error) {
        console.error('Error checking vendor status:', error);
        // Continue with the role that was already set, or default to user
        user.role = user.role || 'user';
      }
    }
    
    req.user = user;
    next();
  });
};

// Strict authentication middleware for logout and sensitive operations
const authenticateTokenStrict = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  // Reject anonymous tokens for strict operations
  if (token === 'anonymous-access-token') {
    return res.status(401).json({
      success: false,
      message: 'Authentication required for this operation'
    });
  }

  // Verify JWT token strictly (ignore expiration to remove login expiration)
  jwt.verify(token, config.jwt.secret, { ignoreExpiration: true }, async (err, user) => {
    if (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    // Check if user is a vendor - improved logic with caching
    if (user.userId && user.userId !== 'anonymous-user') {
      try {
        const User = require('../models/User');
        const VendorStore = require('../models/VendorStore');
        
        // First, get the user document to check role and avoid duplicate queries
        const dbUser = await User.findById(user.userId).select('role');
        
        if (dbUser) {
          // Check if user has a vendor store, but cache this information to avoid repeated queries
          const store = await VendorStore.findOne({ vendorId: user.userId }).select('_id');
          
          if (store && dbUser.role !== 'vendor') {
            // Update user role to vendor in database
            dbUser.role = 'vendor';
            await dbUser.save();
            user.role = 'vendor';
          } else if (!store && dbUser.role === 'vendor') {
            // Check if user no longer has a store but still has vendor role
            const storeCheck = await VendorStore.findOne({ vendorId: user.userId }).select('_id');
            if (!storeCheck) {
              dbUser.role = 'user';
              await dbUser.save();
              user.role = 'user';
            } else {
              user.role = 'vendor';
            }
          } else {
            // Use the role from the database
            user.role = dbUser.role;
          }
        } else {
          user.role = 'user'; // Default to user if no user found
        }
      } catch (error) {
        console.error('Error checking vendor status:', error);
        // Continue with the role that was already set, or default to user
        user.role = user.role || 'user';
      }
    }
    
    req.user = user;
    next();
  });
};

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authenticateTokenStrict, (req, res) => {
  try {
    // For JWT-based auth, logout is primarily client-side
    // We just return success since the client will clear the token
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { email, password, username, displayName } = req.body;

    // Basic field validation
    if (!email || !password || !username || !displayName) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    // Email format validation
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address',
      });
    }

    // Username format validation
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username can only contain letters, numbers, and underscores',
      });
    }

    // Length validations
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({
        success: false,
        message: 'Username must be between 3 and 30 characters',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    if (displayName.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Display name cannot exceed 50 characters',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: username.toLowerCase() }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists',
      });
    }

    // Create new user (password will be hashed automatically by the model)
    const newUser = new User({
      username,
      displayName,
      email: email.toLowerCase(),
      password, // Will be hashed by pre-save middleware
      avatar: '',
      bio: '',
      isVerified: false,
    });

    // Save user to MongoDB
    await newUser.save();

    // Generate tokens
    const accessToken = generateAccessToken(newUser._id);
    const refreshToken = generateRefreshToken(newUser._id);

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = newUser.toObject();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      accessToken,
      refreshToken,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Registration error:', error);

    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: validationErrors[0] || 'Validation error',
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration',
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  // Enhanced device tracking and logging
  const deviceInfo = {
    email: req.body.email,
    timestamp: new Date().toISOString(),
    ip: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'],
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin,
    referer: req.headers.referer,
    rememberMe: req.body.rememberMe || false
  };

  console.log('Login attempt with device tracking:', deviceInfo);

  try {
    const { email, password, rememberMe } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Find user by email (default) or username (if a username was provided instead of an email)
    const identifier = (email || '').trim();
    let user = null;

    if (identifier.includes('@')) {
      // Treat as email
      user = await User.findOne({ email: identifier.toLowerCase() });
    } else {
      // Treat as username (case-insensitive)
      user = await User.findOne({ username: identifier.toLowerCase() });
      if (!user) {
        // Fallback: try exact match (in case usernames are stored case-sensitive)
        user = await User.findOne({ username: identifier });
      }
    }

    if (!user) {
      console.log(`Login failed: User not found for identifier: ${identifier}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check password using the model method
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      console.log(`Login failed for email: ${email}. Reason: Invalid password.`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user.toObject();

    res.json({
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
});

// OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || '';

// Debug logging for OAuth configuration
console.log('OAuth Configuration:');
console.log('GOOGLE_CLIENT_ID env var exists:', !!process.env.GOOGLE_CLIENT_ID);
console.log('GOOGLE_CLIENT_ID value:', GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.substring(0, 20)}...` : 'NOT SET');
console.log('Full GOOGLE_CLIENT_ID value:', GOOGLE_CLIENT_ID);
console.log('APPLE_CLIENT_ID env var exists:', !!process.env.APPLE_CLIENT_ID);
console.log('APPLE_CLIENT_ID value:', APPLE_CLIENT_ID ? `${APPLE_CLIENT_ID.substring(0, 20)}...` : 'NOT SET');

// Helper: create a unique username based on a base string
async function createUniqueUsername(base) {
  const sanitized = String(base || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 24) || 'user';
  let candidate = sanitized;
  let i = 0;
  while (await User.findOne({ username: candidate })) {
    i += 1;
    candidate = `${sanitized}_${i}`.slice(0, 30);
  }
  return candidate;
}

// @route   POST /api/auth/oauth/google
// @desc    Authenticate via Google One Tap (id_token)
// @access  Public
router.post('/oauth/google', async (req, res) => {
  try {
    console.log('Google OAuth request received');
    const { idToken } = req.body || {};
    console.log('ID Token provided:', !!idToken);
    
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Missing idToken' });
    }

    // Verify id_token via Google tokeninfo
    const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    console.log('Verifying token with URL:', verifyUrl);
    
    try {
      const { data } = await axios.get(verifyUrl, { timeout: 5000 });
      console.log('Google token data received:', data ? 'YES' : 'NO');
      
      // Log comparison data
      console.log('Audience comparison:');
      console.log('  Token audience (data.aud):', data?.aud);
      console.log('  Expected client ID (GOOGLE_CLIENT_ID):', GOOGLE_CLIENT_ID);
      console.log('  Match:', data?.aud === GOOGLE_CLIENT_ID);

      // Expect audience to match our client id
      if (!data) {
        return res.status(401).json({ success: false, message: 'Invalid Google token (no data received)' });
      }
      
      // More flexible audience verification - check if it's one of our valid client IDs
      const validAudiences = [GOOGLE_CLIENT_ID];
      
      // If we have multiple client IDs in the future, add them here
      // validAudiences.push('additional-client-id.apps.googleusercontent.com');
      
      if (!validAudiences.includes(data.aud)) {
        console.error('Audience mismatch detected:');
        console.error('  Token audience:', data.aud);
        console.error('  Expected audiences:', validAudiences);
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid Google token (audience mismatch)',
          debug: {
            receivedAud: data.aud,
            expectedAud: GOOGLE_CLIENT_ID
          }
        });
      }
      
      // Continue with the rest of the OAuth flow...
      const googleId = data.sub;
      const email = (data.email || '').toLowerCase();
      const displayName = data.name || (email ? email.split('@')[0] : undefined);

      if (!googleId) {
        return res.status(400).json({ success: false, message: 'Invalid Google token payload' });
      }

      // Upsert user
      let user = await User.findOne({ googleId });
      if (!user && email) {
        user = await User.findOne({ email });
      }

      if (!user) {
        const username = await createUniqueUsername(displayName || `google_${googleId.slice(-6)}`);
        user = new User({
          username,
          displayName: displayName || username,
          email: email || `${username}@users.noreply.vetora.local`,
          password: Math.random().toString(36).slice(2), // will be hashed, not used for social
          isVerified: true,
          googleId,
        });
        await user.save();
      } else if (!user.googleId) {
        user.googleId = googleId;
        if (email && !user.email) user.email = email;
        await user.save();
      }

      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);
      const { password: _pw, ...userWithoutPassword } = user.toObject();

      return res.json({ success: true, accessToken, refreshToken, user: userWithoutPassword });
    } catch (verificationError) {
      console.error('Google OAuth verification error:', verificationError?.response?.data || verificationError.message || verificationError);
      
      // Handle specific error cases
      if (verificationError?.response?.status === 400) {
        return res.status(400).json({ success: false, message: 'Invalid Google token' });
      }
      
      if (verificationError?.code === 'ECONNABORTED' || verificationError?.message?.includes('timeout')) {
        return res.status(504).json({ success: false, message: 'Google verification service timeout. Please try again.' });
      }
      
      return res.status(502).json({ success: false, message: 'Failed to verify Google token. Please try again.' });
    }


  } catch (error) {
    console.error('Google OAuth error:', error?.response?.data || error.message || error);
    return res.status(401).json({ success: false, message: 'Google authentication failed' });
  }
});

// @route   POST /api/auth/oauth/apple
// @desc    Authenticate via Apple JS (identityToken)
// @access  Public
router.post('/oauth/apple', async (req, res) => {
  try {
    const { identityToken } = req.body || {};
    if (!identityToken) {
      return res.status(400).json({ success: false, message: 'Missing identityToken' });
    }

    // Minimal validation: decode and check iss/aud/exp. NOTE: For production, verify signature via Apple JWKS.
    const decoded = jwt.decode(identityToken, { complete: true });
    if (!decoded || !decoded.payload) {
      return res.status(400).json({ success: false, message: 'Invalid Apple token' });
    }
    const { iss, aud, sub, email, exp } = decoded.payload;
    if (iss !== 'https://appleid.apple.com' || aud !== APPLE_CLIENT_ID) {
      return res.status(401).json({ success: false, message: 'Invalid Apple token (iss/aud mismatch)' });
    }
    if (exp && Date.now() / 1000 > exp) {
      return res.status(401).json({ success: false, message: 'Apple token expired' });
    }

    const appleId = sub;
    const emailLower = (email || '').toLowerCase();

    if (!appleId) {
      return res.status(400).json({ success: false, message: 'Invalid Apple token payload' });
    }

    // Upsert user
    let user = await User.findOne({ appleId });
    if (!user && emailLower) {
      user = await User.findOne({ email: emailLower });
    }

    if (!user) {
      const base = emailLower ? emailLower.split('@')[0] : `apple_${appleId.slice(-6)}`;
      const username = await createUniqueUsername(base);
      user = new User({
        username,
        displayName: username,
        email: emailLower || `${username}@users.noreply.vetora.local`,
        password: Math.random().toString(36).slice(2),
        isVerified: true,
        appleId,
      });
      await user.save();
    } else if (!user.appleId) {
      user.appleId = appleId;
      if (emailLower && !user.email) user.email = emailLower;
      await user.save();
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    const { password: _pw2, ...userWithoutPassword } = user.toObject();

    return res.json({ success: true, accessToken, refreshToken, user: userWithoutPassword });
  } catch (error) {
    console.error('Apple OAuth error:', error?.response?.data || error.message || error);
    return res.status(401).json({ success: false, message: 'Apple authentication failed' });
  }
});

// @route   POST /api/auth/biometric/generate-registration-options
// @desc    Generate registration options for biometric setup
// @access  Private
router.post('/biometric/generate-registration-options', ...biometricSecurityStack, authenticateToken, async (req, res) => {
  try {
    const { generateRegistrationOptions } = require('@simplewebauthn/server');
    const crypto = require('crypto');

    // Find user by ID from token
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user already has biometric credentials
    if (user.biometricCredentials && user.biometricCredentials.credentialId) {
      return res.status(400).json({
        success: false,
        message: 'Biometric credentials already registered for this user. Remove existing credentials first.',
      });
    }

    // Get existing credentials to exclude (prevent duplicate registrations)
    const excludeCredentials = [];
    if (user.biometricCredentials && user.biometricCredentials.credentialId) {
      excludeCredentials.push({
        id: user.biometricCredentials.credentialId,
        type: 'public-key',
        transports: user.biometricCredentials.transports || ['internal']
      });
    }

    // Generate registration options with enhanced security and platform optimization
    const timeout = parseInt(process.env.WEBAUTHN_TIMEOUT) || 300000; // 5 minutes default
    const options = await generateRegistrationOptions({
      rpName: process.env.RP_NAME || 'Vetora',
      rpID: process.env.RP_ID || 'localhost',
      userID: new Uint8Array(Buffer.from(user._id.toString(), 'utf8')),
      userName: user.email || user.username,
      userDisplayName: user.displayName || user.username,
      timeout: timeout,
      attestationType: process.env.WEBAUTHN_ATTESTATION || 'none', // No attestation required for better privacy
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred', // Support for passwordless authentication
        userVerification: process.env.WEBAUTHN_USER_VERIFICATION || 'preferred', // Prefer biometric verification
        authenticatorAttachment: 'platform', // Prefer platform authenticators
        requireResidentKey: false, // Don't require resident key for broader compatibility
      },
      supportedAlgorithmIDs: [-7, -35, -36, -257, -258, -259], // Extended algorithm support
    });

    // Store challenge in user session (temporary storage)
    const challengeExpiryMs = timeout; // Use same timeout as WebAuthn
    user.biometricCredentials = {
      ...user.biometricCredentials,
      challengeId: crypto.randomUUID(),
      challenge: options.challenge,
      challengeExpiry: new Date(Date.now() + challengeExpiryMs) // Match WebAuthn timeout
    };
    await user.save();

    res.json({
      success: true,
      challengeId: user.biometricCredentials.challengeId,
      options: options,
      timeout: options.timeout
    });
  } catch (error) {
    console.error('Error generating registration options:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration options generation',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/auth/biometric/register
// @desc    Register biometric credentials for a user
// @access  Private
router.post('/biometric/register', ...biometricSecurityStack, authenticateToken, async (req, res) => {
  try {
    const { registrationResponse, challengeId } = req.body;

    console.log('🔍 Received registration request:', {
      hasRegistrationResponse: !!registrationResponse,
      registrationResponseKeys: registrationResponse ? Object.keys(registrationResponse) : 'N/A',
      challengeId: challengeId ? `${challengeId.substring(0, 20)}...` : 'MISSING',
      registrationResponseId: registrationResponse?.id ? `${registrationResponse.id.substring(0, 20)}...` : 'MISSING'
    });

    // Enhanced validation
    if (!registrationResponse) {
      return res.status(400).json({
        success: false,
        message: 'Registration response is required',
      });
    }

    if (!challengeId) {
      return res.status(400).json({
        success: false,
        message: 'Challenge ID is required',
      });
    }

    // Find user by ID from token
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Validate challenge ID and expiry
    if (!user.biometricCredentials ||
      user.biometricCredentials.challengeId !== challengeId ||
      !user.biometricCredentials.challengeExpiry ||
      new Date() > user.biometricCredentials.challengeExpiry) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired challenge',
      });
    }

    // Check if user already has registered credentials
    if (user.biometricCredentials && user.biometricCredentials.credentialId) {
      return res.status(400).json({
        success: false,
        message: 'Biometric credentials already registered for this user',
      });
    }

    // Verify the registration response
    const { verifyRegistrationResponse } = require('@simplewebauthn/server');

    // Ensure we have the challenge
    if (!user.biometricCredentials.challenge) {
      return res.status(400).json({
        success: false,
        message: 'Missing challenge data. Please generate new registration options.',
      });
    }

    const expectedChallenge = user.biometricCredentials.challenge;
    const expectedOrigin = process.env.FRONTEND_URL || 'http://localhost:4000';
    const expectedRPID = process.env.RP_ID || 'localhost';

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: registrationResponse,
        expectedChallenge,
        expectedOrigin,
        expectedRPID,
        requireUserVerification: false, // More flexible for different devices
      });
    } catch (verificationError) {
      console.error('Biometric registration verification error:', verificationError);

      // Handle specific verification errors
      let errorMessage = 'Invalid biometric registration data';
      if (verificationError.message?.includes('timeout') || verificationError.message?.includes('timed out')) {
        errorMessage = 'Biometric registration timed out. Please try again.';
      } else if (verificationError.message?.includes('cancelled') || verificationError.message?.includes('abort')) {
        errorMessage = 'Biometric registration was cancelled. Please try again.';
      }

      return res.status(400).json({
        success: false,
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? verificationError.message : undefined
      });
    }

    const { verified, registrationInfo } = verification;

    if (!verified || !registrationInfo) {
      return res.status(400).json({
        success: false,
        message: 'Biometric registration verification failed',
      });
    }

    // Debug: Log the actual registrationInfo structure
    console.log('🔍 Registration info structure:', JSON.stringify(registrationInfo, null, 2));

    // Extract credential data - try multiple possible structures
    const { credential, credentialDeviceType, credentialBackedUp } = registrationInfo;

    console.log('🔍 Extracted from registrationInfo:', {
      hasCredential: !!credential,
      credentialKeys: credential ? Object.keys(credential) : 'N/A',
      credentialDeviceType,
      credentialBackedUp,
      registrationInfoKeys: Object.keys(registrationInfo)
    });

    // Try different possible property names for compatibility
    let credentialId, credentialPublicKey, credentialCounter, credentialTransports;

    if (credential) {
      // Try v13+ structure first
      credentialId = credential.id;
      credentialPublicKey = credential.publicKey;
      credentialCounter = credential.counter;
      credentialTransports = credential.transports;
    }

    // Fallback to older structure if needed
    if (!credentialId) {
      credentialId = registrationInfo.credentialID;
    }
    if (!credentialPublicKey) {
      credentialPublicKey = registrationInfo.credentialPublicKey;
    }
    if (credentialCounter === undefined) {
      credentialCounter = registrationInfo.counter;
    }
    if (!credentialTransports) {
      credentialTransports = registrationInfo.transports;
    }

    console.log('🔍 Final credential extraction results:', {
      credentialId: credentialId ? `${credentialId.substring(0, 20)}...` : 'MISSING',
      hasCredentialPublicKey: !!credentialPublicKey,
      credentialPublicKeyType: credentialPublicKey ? typeof credentialPublicKey : 'undefined',
      credentialCounter,
      credentialTransports
    });

    if (!credentialId || !credentialPublicKey) {
      console.error('❌ Missing credential data after all attempts:', {
        credentialId: !!credentialId,
        credentialPublicKey: !!credentialPublicKey,
        credentialPublicKeyType: typeof credentialPublicKey,
        registrationInfoKeys: Object.keys(registrationInfo),
        allAttemptedPaths: {
          'credential.id': !!registrationInfo.credential?.id,
          'credentialID': !!registrationInfo.credentialID,
          'credential.publicKey': !!registrationInfo.credential?.publicKey,
          'credentialPublicKey': !!registrationInfo.credentialPublicKey
        }
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid credential data received',
      });
    }

    user.biometricCredentials = {
      credentialId: credentialId, // Already base64url encoded
      publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
      counter: credentialCounter || 0,
      transports: credentialTransports || registrationResponse.response.transports || ['internal'],
      algorithm: 'public-key',
      deviceType: credentialDeviceType || 'multiDevice',
      backedUp: credentialBackedUp || false,
      registeredAt: new Date(),
      lastUsedAt: null,
      // Clear challenge data after successful registration
      challengeId: null,
      challenge: null,
      challengeExpiry: null
    };

    // Save updated user
    await user.save();

    // Log successful registration for security monitoring
    console.log(`Biometric credentials registered for user ${user.email} (${user._id})`);

    res.json({
      success: true,
      message: 'Biometric credentials registered successfully',
      biometricInfo: {
        deviceType: user.biometricCredentials.deviceType,
        backedUp: user.biometricCredentials.backedUp,
        registeredAt: user.biometricCredentials.registeredAt
      }
    });
  } catch (error) {
    console.error('Biometric registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during biometric registration',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/auth/biometric/authenticate
// @desc    Authenticate user with biometric credentials
// @access  Public
router.post('/biometric/authenticate', ...biometricSecurityStack, async (req, res) => {
  try {
    const { authenticationResponse, challengeId } = req.body;

    // Enhanced validation
    if (!authenticationResponse || !authenticationResponse.id) {
      return res.status(400).json({
        success: false,
        message: 'Authentication response is required',
      });
    }

    // Find user by credential ID
    const user = await User.findByCredentialId(authenticationResponse.id);

    if (!user) {
      // Log failed authentication attempt for security monitoring
      console.warn(`Failed biometric authentication attempt with credential ID: ${authenticationResponse.id}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid biometric credentials',
      });
    }

    // Check if user account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated',
      });
    }

    // Get the stored challenge for this authentication attempt
    let expectedChallenge;
    if (challengeId && user.biometricCredentials && user.biometricCredentials.authChallenges) {
      const challengeData = user.biometricCredentials.authChallenges.find(
        c => c.id === challengeId && c.expiry > new Date()
      );
      expectedChallenge = challengeData?.challenge;

      if (!expectedChallenge) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired authentication challenge',
        });
      }
    } else if (user.biometricCredentials && user.biometricCredentials.challenge) {
      // Fallback to stored challenge (legacy support)
      expectedChallenge = user.biometricCredentials.challenge;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Missing authentication challenge. Please generate new authentication options.',
      });
    }

    // Verify the authentication response using SimpleWebAuthn
    const { verifyAuthenticationResponse } = require('@simplewebauthn/server');

    const expectedOrigin = process.env.FRONTEND_URL || 'http://localhost:4000';
    const expectedRPID = process.env.RP_ID || 'localhost';

    // Prepare the expected credential data according to SimpleWebAuthn v13+
    const expectedCredential = {
      id: user.biometricCredentials.credentialId, // Already base64url encoded
      publicKey: Buffer.from(user.biometricCredentials.publicKey, 'base64url'),
      counter: user.biometricCredentials.counter || 0,
      transports: user.biometricCredentials.transports || ['internal']
    };

    try {
      const verification = await verifyAuthenticationResponse({
        response: authenticationResponse,
        expectedChallenge,
        expectedOrigin,
        expectedRPID,
        credential: expectedCredential,
        requireUserVerification: false, // More flexible for different devices
      });

      const { verified, authenticationInfo } = verification;

      if (!verified) {
        console.warn(`Biometric verification failed for user ${user.email}`);
        return res.status(401).json({
          success: false,
          message: 'Biometric authentication failed',
        });
      }

      // Update the counter to prevent replay attacks
      if (authenticationInfo.newCounter !== undefined) {
        user.biometricCredentials.counter = authenticationInfo.newCounter;
      }

      // Update last used timestamp
      user.biometricCredentials.lastUsedAt = new Date();

      // Clear used challenge if using challenge ID system
      if (challengeId && user.biometricCredentials.authChallenges) {
        user.biometricCredentials.authChallenges = user.biometricCredentials.authChallenges.filter(
          c => c.id !== challengeId
        );
      }

    } catch (verificationError) {
      console.error('Biometric authentication verification error:', verificationError);

      // Handle specific verification errors
      let errorMessage = 'Biometric authentication verification failed';
      if (verificationError.message?.includes('timeout') || verificationError.message?.includes('timed out')) {
        errorMessage = 'Biometric authentication timed out. Please try again.';
      } else if (verificationError.message?.includes('cancelled') || verificationError.message?.includes('abort')) {
        errorMessage = 'Biometric authentication was cancelled. Please try again.';
      }

      return res.status(401).json({
        success: false,
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? verificationError.message : undefined
      });
    }

    // Update last login and security settings
    user.lastLoginAt = new Date();
    user.lastSeenAt = new Date();

    // Track device/session for security
    const userAgent = req.get('User-Agent') || 'Unknown';
    const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';

    if (!user.settings.security.recentDevices) {
      user.settings.security.recentDevices = [];
    }

    // Add or update device info
    const existingDeviceIndex = user.settings.security.recentDevices.findIndex(
      device => device.userAgent === userAgent
    );

    if (existingDeviceIndex !== -1) {
      user.settings.security.recentDevices[existingDeviceIndex] = {
        ...user.settings.security.recentDevices[existingDeviceIndex],
        lastLogin: new Date(),
        ipAddress
      };
    } else {
      user.settings.security.recentDevices.unshift({
        deviceName: 'Biometric Device',
        lastLogin: new Date(),
        ipAddress,
        userAgent
      });

      // Keep only last 10 devices
      user.settings.security.recentDevices = user.settings.security.recentDevices.slice(0, 10);
    }

    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Log successful authentication for security monitoring
    console.log(`Successful biometric authentication for user ${user.email} (${user._id}) from IP: ${ipAddress}`);

    // Return user data (without password and sensitive biometric data)
    const { password: _, biometricCredentials: __, ...userWithoutPassword } = user.toObject();

    res.json({
      success: true,
      message: 'Biometric authentication successful',
      accessToken,
      refreshToken,
      user: userWithoutPassword,
      authMethod: 'biometric'
    });
  } catch (error) {
    console.error('Biometric authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during biometric authentication',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/auth/biometric/generate-authentication-options
// @desc    Generate authentication options for biometric login
// @access  Public
router.post('/biometric/generate-authentication-options', ...biometricSecurityStack, async (req, res) => {
  try {
    const { generateAuthenticationOptions } = require('@simplewebauthn/server');
    const crypto = require('crypto');
    const { userEmail, credentialId } = req.body;

    // For resident credentials (passwordless), we don't need to find specific user credentials
    // For non-resident credentials, we could look up user's registered credentials
    let allowCredentials = [];
    let targetUser = null;

    if (userEmail && userEmail !== 'anonymous') {
      // Find user and get their registered credentials
      targetUser = await User.findOne({ email: userEmail.toLowerCase() });
      if (targetUser && targetUser.biometricCredentials && targetUser.biometricCredentials.credentialId) {
        allowCredentials = [{
          id: targetUser.biometricCredentials.credentialId,
          type: 'public-key',
          transports: targetUser.biometricCredentials.transports || ['internal', 'hybrid']
        }];
      }
    } else if (credentialId) {
      // Direct credential lookup for faster authentication
      targetUser = await User.findByCredentialId(credentialId);
      if (targetUser && targetUser.biometricCredentials) {
        allowCredentials = [{
          id: targetUser.biometricCredentials.credentialId,
          type: 'public-key',
          transports: targetUser.biometricCredentials.transports || ['internal', 'hybrid']
        }];
      }
    }

    const timeout = parseInt(process.env.WEBAUTHN_TIMEOUT) || 300000; // 5 minutes default
    const options = await generateAuthenticationOptions({
      timeout: timeout,
      userVerification: process.env.WEBAUTHN_USER_VERIFICATION || 'preferred', // More compatible across devices
      allowCredentials: allowCredentials,
      rpID: process.env.RP_ID || 'localhost',
    });

    // Store the challenge with expiry for enhanced security
    const challengeId = crypto.randomUUID();
    const challengeExpiry = new Date(Date.now() + Math.min(timeout, 120000)); // Max 2 minutes for auth challenges

    if (targetUser && targetUser.biometricCredentials) {
      // Store challenge associated with user for validation
      if (!targetUser.biometricCredentials.authChallenges) {
        targetUser.biometricCredentials.authChallenges = [];
      }

      // Clean up expired challenges
      targetUser.biometricCredentials.authChallenges = targetUser.biometricCredentials.authChallenges.filter(
        c => c.expiry > new Date()
      );

      // Add new challenge
      targetUser.biometricCredentials.authChallenges.push({
        id: challengeId,
        challenge: options.challenge,
        expiry: challengeExpiry,
        createdAt: new Date()
      });

      // Keep only last 5 challenges
      targetUser.biometricCredentials.authChallenges = targetUser.biometricCredentials.authChallenges.slice(-5);

      await targetUser.save();
    }

    res.json({
      success: true,
      challengeId: (targetUser && targetUser.biometricCredentials) ? challengeId : null,
      allowsResidentCredentials: allowCredentials.length === 0,
      options: options,
      timeout: options.timeout
    });
  } catch (error) {
    console.error('Error generating authentication options:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication options generation',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   DELETE /api/auth/biometric/remove
// @desc    Remove biometric credentials for a user
// @access  Private
router.delete('/biometric/remove', ...biometricSecurityStack, authenticateToken, async (req, res) => {
  try {
    // Find user by ID from token
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user has biometric credentials
    if (!user.biometricCredentials || !user.biometricCredentials.credentialId) {
      return res.status(400).json({
        success: false,
        message: 'No biometric credentials found for this user',
      });
    }

    // Remove biometric credentials
    user.biometricCredentials = {
      challengeId: null,
      challenge: null,
      challengeExpiry: null,
      authChallenges: []
    };

    await user.save();

    // Log removal for security monitoring
    console.log(`Biometric credentials removed for user ${user.email} (${user._id})`);

    res.json({
      success: true,
      message: 'Biometric credentials removed successfully',
    });
  } catch (error) {
    console.error('Biometric removal error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during biometric credentials removal',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/auth/biometric/status
// @desc    Get biometric registration status for a user
// @access  Private
router.get('/biometric/status', ...biometricSecurityStack, authenticateToken, async (req, res) => {
  try {
    // Find user by ID from token
    const user = await User.findById(req.user.userId).select('biometricCredentials');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const hasCredentials = !!(user.biometricCredentials && user.biometricCredentials.credentialId);

    res.json({
      success: true,
      biometric: {
        registered: hasCredentials,
        deviceType: hasCredentials ? user.biometricCredentials.deviceType : null,
        registeredAt: hasCredentials ? user.biometricCredentials.registeredAt : null,
        lastUsedAt: hasCredentials ? user.biometricCredentials.lastUsedAt : null,
        backedUp: hasCredentials ? user.biometricCredentials.backedUp : null
      }
    });
  } catch (error) {
    console.error('Biometric status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during biometric status check',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/auth/wallet
// @desc    Authenticate with wallet
// @access  Public
router.post('/wallet', async (req, res) => {
  try {
    const { walletAddress, signature, message } = req.body;

    if (!walletAddress || !signature || !message) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address, signature, and message are required',
      });
    }

    // Verify the signature using ethers
    const { ethers } = require('ethers');

    try {
      // Recover the address from the signature
      const recoveredAddress = ethers.verifyMessage(message, signature);

      // Check if the recovered address matches the provided address
      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(401).json({
          success: false,
          error: 'Invalid signature',
        });
      }
    } catch (signatureError) {
      console.error('Signature verification error:', signatureError);
      return res.status(401).json({
        success: false,
        error: 'Invalid signature format',
      });
    }

    // Find or create user
    let walletUser = await User.findByWallet(walletAddress);

    if (!walletUser) {
      // Create new user with wallet
      walletUser = new User({
        username: `user_${walletAddress.slice(-6)}`,
        displayName: `User ${walletAddress.slice(-6)}`,
        email: '', // Optional for wallet users
        walletAddress,
        avatar: '',
        isVerified: true, // Wallet users are verified by default since we verified their signature
      });

      await walletUser.save();
    }

    // Update last login
    walletUser.lastLoginAt = new Date();
    await walletUser.save();

    // Generate tokens
    const accessToken = generateAccessToken(walletUser._id);
    const refreshToken = generateRefreshToken(walletUser._id);

    res.json({
      success: true,
      data: {
        user: walletUser,
        accessToken,
        refreshToken,
        accessTokenExpiresIn: '1h',
        refreshTokenExpiresIn: '30d',
      },
    });
  } catch (error) {
    console.error('Wallet auth error:', error);
    // Normalize auth errors to 401 without leaking internals
    return res.status(401).json({
      success: false,
      message: 'Wallet authentication failed. Please try again.',
      code: 'WALLET_AUTH_FAILED'
    });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token using refresh token
// @access  Public
router.post('/refresh', async (req, res) => {
  try {
    // Log the raw request body for debugging
    console.log('Refresh token request body:', req.body);
    console.log('Raw request body:', req.rawBody);
    console.log('Request headers:', req.headers);

    // Special handling for the "iammirror" case
    if (req.rawBody && req.rawBody.includes('iammirror')) {
      console.log('Detected "iammirror" request - this appears to be from a browser extension or middleware');
      return res.status(400).json({
        success: false,
        message: 'Invalid request detected. This appears to be from a browser extension or middleware.',
        details: 'Please disable any browser extensions that might be interfering with API requests.'
      });
    }

    // Handle case where body might be a string instead of JSON
    let refreshToken;
    if (typeof req.body === 'string') {
      try {
        const parsedBody = JSON.parse(req.body);
        refreshToken = parsedBody.refreshToken;
      } catch (parseError) {
        console.error('Error parsing request body:', parseError);
        return res.status(400).json({
          success: false,
          message: 'Invalid request format. Expected JSON with refreshToken field.',
        });
      }
    } else {
      refreshToken = req.body.refreshToken;
    }

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    // Check if refresh token exists in our store
    if (!refreshTokens.has(refreshToken)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    // Verify refresh token (ignore expiration to remove login expiration)
    jwt.verify(refreshToken, config.jwt.refreshSecret, { ignoreExpiration: true }, async (err, decoded) => {
      if (err) {
        // Remove invalid token from store
        refreshTokens.delete(refreshToken);
        return res.status(403).json({
          success: false,
          message: 'Invalid refresh token',
        });
      }

      // Find user
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Generate new access token
      const accessToken = generateAccessToken(user._id);

      res.json({
        success: true,
        accessToken,
      });
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token',
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authenticateTokenStrict, async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken;

    // Remove refresh token from store if provided
    if (refreshToken) {
      refreshTokens.delete(refreshToken);
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
});



// @route   GET /api/auth/profile
// @desc    Get current user's complete profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // Handle anonymous access explicitly to avoid ObjectId cast errors
    if (req.user?.userId === 'anonymous-user' || req.user?.isAnonymous) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Find user by ID from token with all profile data
    const user = await User.findById(req.user.userId)
      .select('-password') // Exclude password field
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Return complete user profile data
    res.json({
      success: true,
      data: {
        ...user,
        id: user._id, // Add id field for compatibility
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile',
      message: error.message,
    });
  }
});

// @route   GET /api/auth/settings
// @desc    Get user settings
// @access  Private
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    // Handle anonymous user
    if (req.user.userId === 'anonymous-user' || req.user.isAnonymous) {
      return res.json({
        success: true,
        data: {
          notifications: {
            email: false,
            push: false,
            sms: false,
            marketing: false,
            security: true,
            updates: false,
          },
          privacy: {
            profileVisibility: 'public',
            showEmail: false,
            showPhone: false,
            allowMessages: true,
            allowFollows: true,
          },
          theme: {
            mode: 'system',
            primaryColor: '#1976d2',
            fontSize: 'medium',
          },
        },
      });
    }

    const user = await User.findById(req.user.userId)
      .select('settings')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user.settings || {},
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get settings',
      message: error.message,
    });
  }
});

// @route   PUT /api/auth/settings
// @desc    Update user settings
// @access  Private
router.put('/settings', authenticateToken, validateSettings, async (req, res) => {
  try {
    // Handle both possible request body structures for backward compatibility
    const settingType = req.body.settingType || req.body.type;
    const settings = req.body.settings || req.body.data || req.body;
    
    // Validate settingType is provided
    if (!settingType) {
      return res.status(400).json({
        success: false,
        message: 'Setting type is required',
      });
    }

    // Handle anonymous user - just return success without saving
    if (req.user.userId === 'anonymous-user' || req.user.isAnonymous) {
      return res.json({
        success: true,
        message: `${settingType} settings updated successfully (anonymous session)`,
        data: settings,
      });
    }

    // Build the update object based on setting type
    let updateData = {};

    switch (settingType.toLowerCase()) {
      case 'privacy':
        updateData = { 'settings.privacy': settings };
        break;
      case 'notification':
      case 'notifications':
        updateData = { 'settings.notifications': settings };
        break;
      case 'interaction':
      case 'interactions':
        updateData = { 'settings.interaction': settings };
        break;      case 'appearance':
      case 'theme':
        updateData = { 'settings.theme': settings };
        break;
      case 'wallet':
        updateData = { 'settings.wallet': settings };
        break;
      case 'security':
        updateData = { 'settings.security': settings };
        break;
      default:
        // Handle case where settingType is not specified but we have settings object
        // Try to infer the setting type from the data structure
        if (settings && typeof settings === 'object' && settings.privacy) {
          updateData = { 'settings.privacy': settings.privacy };
        } else if (settings && typeof settings === 'object' && settings.notifications) {
          updateData = { 'settings.notifications': settings.notifications };
        } else if (settings && typeof settings === 'object' && settings.interaction) {
          updateData = { 'settings.interaction': settings.interaction };
        } else if (settings && typeof settings === 'object' && settings.theme) {
          updateData = { 'settings.theme': settings.theme };
        } else if (settings && typeof settings === 'object' && settings.wallet) {
          updateData = { 'settings.wallet': settings.wallet };
        } else if (settings && typeof settings === 'object' && settings.security) {
          updateData = { 'settings.security': settings.security };
        } else {
          // If we can't infer the type, update the whole settings object
          updateData = { settings: settings };
        }
        break;
    }

    let user;
    try {
      user = await User.findByIdAndUpdate(
        req.user.userId,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');
    } catch (dbError) {
      console.error('Database error updating settings:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update settings',
        message: 'Database error occurred while updating settings',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: `${settingType} settings updated successfully`,
      data: user.settings,
    });
  } catch (error) {
    console.error('Update settings error:', error);
    // Add more detailed error information in development
    if (process.env.NODE_ENV === 'development') {
      return res.status(500).json({
        success: false,
        error: 'Failed to update settings',
        message: error.message,
        stack: error.stack,
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update settings',
      message: 'An unexpected error occurred while updating settings',
    });
  }
});

// @route   PUT /api/auth/password
// @desc    Change user password
// @access  Private
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
    }

    // Find user with password field
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Validate new password
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await User.findByIdAndUpdate(req.user.userId, {
      password: hashedNewPassword,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
      message: error.message,
    });
  }
});

// @route   DELETE /api/auth/account
// @desc    Delete user account
// @access  Private
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to delete account',
      });
    }

    // Find user with password field
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Password is incorrect',
      });
    }

    // TODO: In a real implementation, you might want to:
    // 1. Soft delete the user (mark as deleted instead of removing)
    // 2. Clean up related data (posts, comments, etc.)
    // 3. Send confirmation email
    // 4. Log the deletion for audit purposes

    // For now, we'll mark the user as inactive instead of deleting
    await User.findByIdAndUpdate(req.user.userId, {
      isActive: false,
      deletedAt: new Date(),
      email: `deleted_${Date.now()}_${user.email}`, // Prevent email conflicts
      username: `deleted_${Date.now()}_${user.username}` // Prevent username conflicts
    });

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete account',
      message: error.message,
    });
  }
});

// @route   GET /api/auth/export
// @desc    Export user data
// @access  Private
router.get('/export', authenticateToken, async (req, res) => {
  try {
    // Get user data
    const user = await User.findById(req.user.userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // TODO: In a real implementation, you would gather data from multiple collections
    // For now, we'll export basic user data
    const exportData = {
      profile: {
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        bio: user.bio,
        location: user.location,
        website: user.website,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      settings: user.settings,
      socialLinks: user.socialLinks,
      // TODO: Add posts, comments, followers, following, etc.
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0'
    };

    res.json({
      success: true,
      data: exportData,
      message: 'Data exported successfully'
    });
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export data',
      message: error.message,
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { displayName, username, bio, location, website, avatar, cover } = req.body;

    // Find user by ID from token
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if username is being changed and if it's already taken
    if (username && username !== user.username) {
      const existingUser = await User.findOne({
        username: new RegExp(`^${username}$`, 'i'),
        _id: { $ne: user._id }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username is already taken',
        });
      }
    }

    // Update user fields
    if (displayName !== undefined) user.displayName = displayName;
    if (username !== undefined) user.username = username;
    if (bio !== undefined) user.bio = bio;
    if (location !== undefined) user.location = location;
    if (website !== undefined) user.website = website;

    // Validate avatar URL if provided
    if (avatar !== undefined) {
      // Allow empty avatar (for removal) or valid URL formats
      if (avatar && avatar.length > 0) {
        // Check if it's a valid URL format (http/https/data URL)
        const isValidUrl = avatar.startsWith('http://') || 
                          avatar.startsWith('https://') || 
                          avatar.startsWith('data:');
        
        // If it's not a valid URL format, reject it
        if (!isValidUrl) {
          return res.status(400).json({
            success: false,
            message: 'Invalid avatar URL format',
            details: 'Please upload a valid profile picture'
          });
        }
      }
      user.avatar = avatar;
    }

    // Validate cover URL if provided
    if (cover !== undefined) {
      // Allow empty cover (for removal) or valid URL formats
      if (cover && cover.length > 0) {
        // Check if it's a valid URL format (http/https/data URL)
        const isValidUrl = cover.startsWith('http://') || 
                          cover.startsWith('https://') || 
                          cover.startsWith('data:');
        
        // If it's not a valid URL format, reject it
        if (!isValidUrl) {
          return res.status(400).json({
            success: false,
            message: 'Invalid cover URL format',
            details: 'Please upload a valid cover image'
          });
        }
      }
      user.cover = cover;
    }

    // Save updated user
    await user.save();

    // Return updated user data (without password)
    const { password: _, ...userWithoutPassword } = user.toObject();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during profile update',
    });
  }
});

// @route   DELETE /api/auth/profile/cover
// @desc    Remove user's cover photo (sets cover to empty string)
// @access  Private (strict)
router.delete('/profile/cover', authenticateTokenStrict, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // If already empty, still respond success for idempotency
    user.cover = '';
    await user.save();

    const { password: _, ...userWithoutPassword } = user.toObject();
    return res.json({ success: true, message: 'Cover photo removed', user: userWithoutPassword });
  } catch (error) {
    console.error('Remove cover error:', error);
    return res.status(500).json({ success: false, message: 'Server error while removing cover' });
  }
});

// @route   POST /api/auth/wallet
// @desc    Associate wallet address with user account
// @access  Private
router.post('/wallet', authenticateToken, async (req, res) => {
  try {
    const { walletAddress, signature, message } = req.body;

    if (!walletAddress || !signature || !message) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address, signature, and message are required'
      });
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address format'
      });
    }

    // Get user
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if wallet is already associated with another user
    const existingUser = await User.findOne({
      walletAddress: new RegExp(`^${walletAddress}$`, 'i'),
      _id: { $ne: user._id }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'This wallet address is already associated with another account'
      });
    }

    // In a real implementation, you would verify the signature here
    // For now, we'll skip signature verification for development
    // const isValidSignature = verifySignature(message, signature, walletAddress);
    // if (!isValidSignature) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Invalid signature'
    //   });
    // }

    // Associate wallet with user
    user.walletAddress = walletAddress;
    await user.save();

    // Return updated user data (without password)
    const { password: _, ...userWithoutPassword } = user.toObject();

    res.json({
      success: true,
      message: 'Wallet address associated successfully',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Wallet association error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during wallet association'
    });
  }
});

// @route   DELETE /api/auth/wallet
// @desc    Disconnect wallet from user account
// @access  Private
router.delete('/wallet', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'No wallet address associated with this account'
      });
    }

    // Remove wallet address
    user.walletAddress = undefined;
    await user.save();

    // Return updated user data (without password)
    const { password: _, ...userWithoutPassword } = user.toObject();

    res.json({
      success: true,
      message: 'Wallet disconnected successfully',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Wallet disconnection error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during wallet disconnection'
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Email format validation
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address',
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    // For security reasons, always return success even if user doesn't exist
    // This prevents email enumeration attacks
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent',
      });
    }

    // Generate reset token (you can implement actual email sending here)
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store reset token in user document
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resetTokenExpiry;
    await user.save();

    // Send reset email
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000';
      const resetLink = `${frontendUrl}/auth/reset-password?token=${resetToken}`;
      
      console.log(`🔗 Password reset link generated: ${resetLink}`);
      console.log(`📧 Sending reset email to ${user.email} using frontendUrl: ${frontendUrl}`);
      
      const emailMessage = `You are receiving this email because you (or someone else) have requested the reset of the password for your account.
      
Please click on the following link, or paste this into your browser to complete the process:
      
${resetLink}
      
If you did not request this, please ignore this email and your password will remain unchanged.
      
This link will expire in 24 hours.`;

      await emailService.sendEmail({
        to: user.email,
        subject: 'Vetora Password Reset Request',
        message: emailMessage,
        user: user
      });
      
      console.log(`📧 Password reset email sent to ${email}`);
    } catch (emailError) {
      console.error('❌ Failed to send reset email:', emailError.message);
      // We don't return an error to the user here to avoid revealing if an email exists
      // and because the token is already saved, they might try again or we might have logged it
    }

    res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully',
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
    });
  }
});

// @route   GET /api/auth/validate-reset-token/:token
// @desc    Validate reset token before showing reset form
// @access  Public
router.get('/validate-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Reset token is required',
      });
    }

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Reset token is valid',
    });

  } catch (error) {
    console.error('Validate reset token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password using token
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Validation
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    // Update password (will be hashed by pre-save middleware)
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current authenticated user profile
// @access  Public (returns not authenticated if no valid token)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // Handle anonymous access explicitly to avoid ObjectId cast errors
    if (!req.user || req.user.isAnonymous || req.user.userId === 'anonymous-user') {
      return res.json({ success: false, message: 'Not authenticated' });
    }

    const userId = req.user.userId;
    const user = await User.findById(userId)
      .select('-password -resetPasswordToken -resetPasswordExpiry -biometricCredentials')
      .lean();

    if (!user || user.isActive === false) {
      // Instead of returning 404, return success: false with a clearer message
      return res.json({ success: false, message: 'User not found or account deactivated' });
    }

    const transformedUser = {
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName || user.username,
      email: user.email, // self can see email
      avatar: user.avatar,
      bio: user.bio,
      location: user.location,
      website: user.website,
      isVerified: user.isVerified || false,
      followerCount: user.followerCount || 0,
      followingCount: user.followingCount || 0,
      postCount: user.postCount || 0,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      walletAddress: user.walletAddress,
      socialLinks: user.socialLinks,
      settings: user.settings,
      lastSeen: user.lastSeenAt,
      isOnline: user.lastSeenAt && (Date.now() - new Date(user.lastSeenAt).getTime()) < 300000, // 5 minutes
      role: user.role || 'user', // Include the user's role
    };

    return res.json({ success: true, data: transformedUser });
  } catch (error) {
    console.error('Get current user (me) error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get current user' });
  }
});

module.exports = { router, authenticateToken, authenticateTokenStrict };
