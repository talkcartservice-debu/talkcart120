const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User } = require('../models');

// JWT Secrets
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh-token-secret-change-in-production';

// Generate tokens (no expiration for persistent login)
const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET);
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, REFRESH_TOKEN_SECRET);
};

// POST /api/admin/signup
// Create new admin user (requires admin key if admin already exists)
router.post('/signup', async (req, res) => {
  try {
    const { email, password, username, displayName, adminKey } = req.body;

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

    // Check if any admin exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    // If admin exists, require admin key
    if (existingAdmin) {
      const ADMIN_SIGNUP_KEY = process.env.ADMIN_SIGNUP_KEY || 'vetora-admin-2024';
      
      if (!adminKey || adminKey !== ADMIN_SIGNUP_KEY) {
        return res.status(403).json({
          success: false,
          message: 'Valid admin key required for admin registration',
        });
      }
    }

    // Create new admin user
    const newUser = new User({
      username,
      displayName,
      email: email.toLowerCase(),
      password, // Will be hashed by pre-save middleware
      role: 'admin',
      isVerified: true,
      isActive: true,
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
      message: 'Admin user created successfully',
      accessToken,
      refreshToken,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Admin signup error:', error);
    
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
      message: 'Server error during admin registration',
    });
  }
});

module.exports = router;