const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: [50, 'Display name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: function() {
      return !this.walletAddress && !this.biometricCredentials; // Password required if no wallet address or biometric credentials
    },
    minlength: [6, 'Password must be at least 6 characters']
  },
  walletAddress: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
    trim: true,
    match: [/^0x[a-fA-F0-9]{40}$/, 'Please enter a valid Ethereum wallet address']
  },
  // Social provider IDs (optional)
  googleId: { type: String, unique: true, sparse: true },
  appleId: { type: String, unique: true, sparse: true },
  biometricCredentials: {
    type: {
      publicKey: String,
      credentialId: String,
      transports: [String],
      counter: Number,
      algorithm: String,
      deviceType: String,
      backedUp: Boolean,
      registeredAt: Date,
      lastUsedAt: Date,
      // For registration challenges
      challengeId: String,
      challenge: String,
      challengeExpiry: Date,
      // For authentication challenges (multiple challenges support)
      authChallenges: [{
        id: String,
        challenge: String,
        expiry: Date,
        createdAt: Date
      }]
    },
    default: null
  },
  avatar: {
    type: String,
    default: ''
  },

  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
    default: ''
  },
  location: {
    type: String,
    maxlength: [100, 'Location cannot exceed 100 characters'],
    default: ''
  },
  website: {
    type: String,
    maxlength: [200, 'Website URL cannot exceed 200 characters'],
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Admin moderation flags
  isSuspended: {
    type: Boolean,
    default: false,
    index: true
  },
  kycStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'none'],
    default: 'none',
    index: true
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'vendor', 'moderator', 'admin'],
    default: 'user'
  },
  followerCount: {
    type: Number,
    default: 0,
    min: 0
  },
  followingCount: {
    type: Number,
    default: 0,
    min: 0
  },
  postCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastLoginAt: {
    type: Date
  },
  lastSeenAt: {
    type: Date
  },
  emailVerifiedAt: {
    type: Date
  },
  settings: {
    privacy: {
      // Profile Privacy
      profileVisibility: {
        type: String,
        enum: ['public', 'followers', 'private'],
        default: 'followers'
      },
      activityVisibility: {
        type: String,
        enum: ['public', 'followers', 'private'],
        default: 'followers'
      },
      profilePublic: { type: Boolean, default: false },
      showWallet: { type: Boolean, default: false },
      showActivity: { type: Boolean, default: false },
      showOnlineStatus: { type: Boolean, default: false },
      showLastSeen: { type: Boolean, default: false },

      // Communication Privacy
      allowTagging: { type: Boolean, default: true },
      allowDirectMessages: { type: Boolean, default: true },
      allowGroupInvites: { type: Boolean, default: true },
      allowMentions: { type: Boolean, default: true },
      messageRequestsFromFollowers: { type: Boolean, default: true },

      // Data Privacy
      dataSharing: {
        type: String,
        enum: ['minimal', 'standard', 'enhanced'],
        default: 'minimal'
      },
      analyticsOptOut: { type: Boolean, default: false },
      personalizedAds: { type: Boolean, default: false },
      locationTracking: { type: Boolean, default: false },
      activityTracking: { type: Boolean, default: false },

      // Search & Discovery
      searchableByEmail: { type: Boolean, default: false },
      searchableByPhone: { type: Boolean, default: false },
      suggestToContacts: { type: Boolean, default: false },
      showInDirectory: { type: Boolean, default: false },

      // Content Privacy
      downloadableContent: { type: Boolean, default: false },
      contentIndexing: { type: Boolean, default: false },
      shareAnalytics: { type: Boolean, default: false }
    },
    notifications: {
      // Channels
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },

      // Types
      mentions: { type: Boolean, default: true },
      follows: { type: Boolean, default: true },
      likes: { type: Boolean, default: false },
      comments: { type: Boolean, default: true },
      shares: { type: Boolean, default: false },
      directMessages: { type: Boolean, default: true },
      groupMessages: { type: Boolean, default: true },

      // Platform-specific
      social: { type: Boolean, default: true },
      marketplace: { type: Boolean, default: false },
      dao: { type: Boolean, default: true },
      wallet: { type: Boolean, default: true },
      security: { type: Boolean, default: true },

      // Frequency
      frequency: {
        type: String,
        enum: ['immediate', 'hourly', 'daily', 'weekly', 'never'],
        default: 'immediate'
      },
      quietHours: { type: Boolean, default: false },
      quietStart: { type: String, default: '22:00' },
      quietEnd: { type: String, default: '08:00' }
    },
    interaction: {
      // Media Settings
      media: {
        autoPlayVideos: {
          type: String,
          enum: ['always', 'wifi-only', 'never'],
          default: 'wifi-only'
        },
        autoPlayGifs: { type: Boolean, default: true },
        autoLoadImages: { type: Boolean, default: true },
        highQualityUploads: { type: Boolean, default: false },
        compressImages: { type: Boolean, default: true },
        showImagePreviews: { type: Boolean, default: true },
        enableVideoControls: { type: Boolean, default: true }
      },

      // Sound Settings
      sound: {
        masterVolume: {
          type: String,
          enum: ['muted', 'low', 'medium', 'high'],
          default: 'medium'
        },
        notificationSounds: { type: Boolean, default: true },
        messageSounds: { type: Boolean, default: true },
        uiSounds: { type: Boolean, default: false },
        keyboardSounds: { type: Boolean, default: false },
        customSoundPack: { type: String, default: 'default' }
      },

      // Keyboard Settings
      keyboard: {
        shortcutsEnabled: { type: Boolean, default: true },
        customShortcuts: { type: Map, of: String, default: {} },
        vimMode: { type: Boolean, default: false },
        quickActions: { type: Boolean, default: true }
      },

      // UI Settings
      ui: {
        compactMode: { type: Boolean, default: false },
        showAvatars: { type: Boolean, default: true },
        showTimestamps: { type: Boolean, default: true },
        showReadReceipts: { type: Boolean, default: true },
        showTypingIndicators: { type: Boolean, default: true },
        showOnlineStatus: { type: Boolean, default: true },
        animatedEmojis: { type: Boolean, default: true },
        stickyHeader: { type: Boolean, default: true },
        infiniteScroll: { type: Boolean, default: true },
        autoRefresh: { type: Boolean, default: true },
        refreshInterval: { type: Number, default: 30 }
      }
    },
    theme: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system'
      },
      reducedMotion: { type: Boolean, default: false },
      highContrast: { type: Boolean, default: false },
      fontSize: {
        type: String,
        enum: ['small', 'medium', 'large'],
        default: 'medium'
      },
      language: {
        type: String,
        default: 'en'
      }
    },
    wallet: {
      showBalance: { type: Boolean, default: true },
      autoConnect: { type: Boolean, default: true },
      defaultNetwork: {
        type: String,
        enum: ['ethereum', 'polygon', 'bsc', 'arbitrum'],
        default: 'ethereum'
      },
      gasPreference: {
        type: String,
        enum: ['slow', 'standard', 'fast'],
        default: 'standard'
      }
    },
    security: {
      twoFactorEnabled: { type: Boolean, default: false },
      loginNotifications: { type: Boolean, default: true },
      sessionTimeout: { type: Number, default: 30 }, // minutes
      recentDevices: [{
        deviceName: String,
        lastLogin: Date,
        ipAddress: String,
        userAgent: String
      }]
    }
  },
  socialLinks: {
    twitter: String,
    discord: String,
    telegram: String,
    instagram: String,
    linkedin: String
  },
  
  // E-commerce related fields
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  recentlyViewed: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  
  // Password reset fields
  resetPasswordToken: {
    type: String,
    sparse: true // Allows multiple null/undefined values
  },
  resetPasswordExpiry: {
    type: Date
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password; // Never return password in JSON
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for better query performance (removed duplicates)
userSchema.index({ isVerified: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ followerCount: -1 });
// Search-related indexes
// userSchema.index({ username: 1 }); // Removed to avoid duplicate index; unique constraint already creates an index
userSchema.index({ displayName: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.displayName || this.username;
});

// Virtual for profile URL
userSchema.virtual('profileUrl').get(function() {
  return `/profile/${this.username}`;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    return false;
  }
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  return isMatch;
};

// Instance method to generate auth token payload
userSchema.methods.getAuthPayload = function() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    walletAddress: this.walletAddress,
    isVerified: this.isVerified,
    role: this.role
  };
};

// Virtual for avatar URL with fallback
userSchema.virtual('avatarUrl').get(function() {
  if (this.avatar && this.avatar.trim()) {
    // If avatar is a full URL (http/https) or data URL, return as is
    if (this.avatar.startsWith('http://') || this.avatar.startsWith('https://') || this.avatar.startsWith('data:')) {
      return this.avatar;
    }
    // If avatar is a Cloudinary public_id (contains / but doesn't start with protocol)
    if (this.avatar.includes('/') && !this.avatar.includes('://')) {
      return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${this.avatar}`;
    }
    // If avatar is just a filename, assume it's in the avatars folder
    return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/avatars/${this.avatar}`;
  }
  return null;
});

// Virtual for fallback avatar text
userSchema.virtual('avatarFallback').get(function() {
  if (this.displayName) {
    return this.displayName.charAt(0).toUpperCase();
  }
  if (this.username) {
    return this.username.charAt(0).toUpperCase();
  }
  return '?';
});

// Instance method to get avatar with fallback
userSchema.methods.getAvatarData = function() {
  return {
    src: this.avatarUrl,
    fallback: this.avatarFallback,
    alt: `${this.displayName || this.username}'s avatar`
  };
};

// Static method to find by username or email
userSchema.statics.findByUsernameOrEmail = function(identifier) {
  return this.findOne({
    $or: [
      { username: { $eq: identifier } },
      { email: { $eq: identifier.toLowerCase() } }
    ]
  });
};

// Static method to find by wallet address
userSchema.statics.findByWallet = function(walletAddress) {
  return this.findOne({ 
    walletAddress: { $eq: walletAddress }
  });
};

// Static method to find by biometric credential ID
userSchema.statics.findByCredentialId = function(credentialId) {
  return this.findOne({ 
    'biometricCredentials.credentialId': { $eq: credentialId }
  });
};

// Static method to search users
userSchema.statics.searchUsers = function(query, options = {}) {
  const { limit = 20, skip = 0, sortBy = 'createdAt', sortOrder = -1 } = options;
  
  const searchRegex = new RegExp(query, 'i');
  
  return this.find({
    $or: [
      { username: searchRegex },
      { displayName: searchRegex },
      { bio: searchRegex }
    ],
    isActive: true
  })
  .select('-password')
  .sort({ [sortBy]: sortOrder })
  .limit(limit)
  .skip(skip);
};

// Instance method to check if user is a vendor
userSchema.methods.isVendor = async function() {
  // If role is already set to vendor, return true
  if (this.role === 'vendor') {
    return true;
  }
  
  // Check if user has a vendor store
  const VendorStore = require('./VendorStore');
  const store = await VendorStore.findOne({ vendorId: this._id });
  
  // If user has a store, update their role to vendor
  if (store) {
    this.role = 'vendor';
    await this.save();
    return true;
  }
  
  return false;
};

// Static method to check if user is a vendor
userSchema.statics.isVendor = async function(userId) {
  const user = await this.findById(userId);
  if (!user) return false;
  
  return await user.isVendor();
};

module.exports = mongoose.model('User', userSchema);
