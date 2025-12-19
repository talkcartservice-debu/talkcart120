const Joi = require('joi');

// Privacy settings validation schema
const privacySchema = Joi.object({
  // Profile Privacy
  profileVisibility: Joi.string().valid('public', 'followers', 'private').default('followers'),
  activityVisibility: Joi.string().valid('public', 'followers', 'private').default('followers'),
  profilePublic: Joi.boolean().default(false),
  showWallet: Joi.boolean().default(false),
  showActivity: Joi.boolean().default(false),
  showOnlineStatus: Joi.boolean().default(false),
  showLastSeen: Joi.boolean().default(false),
  
  // Communication Privacy
  allowTagging: Joi.boolean().default(true),
  allowDirectMessages: Joi.boolean().default(true),
  allowGroupInvites: Joi.boolean().default(true),
  allowMentions: Joi.boolean().default(true),
  messageRequestsFromFollowers: Joi.boolean().default(true),
  
  // Data Privacy
  dataSharing: Joi.string().valid('minimal', 'standard', 'enhanced').default('minimal'),
  analyticsOptOut: Joi.boolean().default(false),
  personalizedAds: Joi.boolean().default(false),
  locationTracking: Joi.boolean().default(false),
  activityTracking: Joi.boolean().default(false),
  
  // Search & Discovery
  searchableByEmail: Joi.boolean().default(false),
  searchableByPhone: Joi.boolean().default(false),
  suggestToContacts: Joi.boolean().default(false),
  showInDirectory: Joi.boolean().default(false),
  
  // Content Privacy
  downloadableContent: Joi.boolean().default(false),
  contentIndexing: Joi.boolean().default(false),
  shareAnalytics: Joi.boolean().default(false),
});

// Notification settings validation schema
const notificationSchema = Joi.object({
  // Channels
  email: Joi.boolean().default(true),
  push: Joi.boolean().default(true),
  inApp: Joi.boolean().default(true),
  sms: Joi.boolean().default(false),
  
  // Types
  mentions: Joi.boolean().default(true),
  follows: Joi.boolean().default(true),
  likes: Joi.boolean().default(false),
  comments: Joi.boolean().default(true),
  shares: Joi.boolean().default(false),
  directMessages: Joi.boolean().default(true),
  groupMessages: Joi.boolean().default(true),
  
  // Platform-specific
  social: Joi.boolean().default(true),
  marketplace: Joi.boolean().default(false),
  dao: Joi.boolean().default(true),
  wallet: Joi.boolean().default(true),
  security: Joi.boolean().default(true),
  
  // Frequency
  frequency: Joi.string().valid('immediate', 'hourly', 'daily', 'weekly', 'never').default('immediate'),
  quietHours: Joi.boolean().default(false),
  quietStart: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).default('22:00'),
  quietEnd: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).default('08:00'),
});

// Interaction settings validation schema
const interactionSchema = Joi.object({
  // Media Settings
  media: Joi.object({
    autoPlayVideos: Joi.string().valid('always', 'wifi-only', 'never').default('wifi-only'),
    autoPlayGifs: Joi.boolean().default(true),
    autoLoadImages: Joi.boolean().default(true),
    highQualityUploads: Joi.boolean().default(false),
    compressImages: Joi.boolean().default(true),
    showImagePreviews: Joi.boolean().default(true),
    enableVideoControls: Joi.boolean().default(true),
  }).default({}),
  
  // Sound Settings
  sound: Joi.object({
    masterVolume: Joi.string().valid('muted', 'low', 'medium', 'high').default('medium'),
    notificationSounds: Joi.boolean().default(true),
    messageSounds: Joi.boolean().default(true),
    uiSounds: Joi.boolean().default(false),
    keyboardSounds: Joi.boolean().default(false),
    customSoundPack: Joi.string().default('default'),
  }).default({}),
  
  // Keyboard Settings
  keyboard: Joi.object({
    shortcutsEnabled: Joi.boolean().default(true),
    customShortcuts: Joi.object().pattern(Joi.string(), Joi.string()).default({}),
    vimMode: Joi.boolean().default(false),
    quickActions: Joi.boolean().default(true),
  }).default({}),
  
  // UI Settings
  ui: Joi.object({
    compactMode: Joi.boolean().default(false),
    showAvatars: Joi.boolean().default(true),
    showTimestamps: Joi.boolean().default(true),
    showReadReceipts: Joi.boolean().default(true),
    showTypingIndicators: Joi.boolean().default(true),
    showOnlineStatus: Joi.boolean().default(true),
    animatedEmojis: Joi.boolean().default(true),
    stickyHeader: Joi.boolean().default(true),
    infiniteScroll: Joi.boolean().default(true),
    autoRefresh: Joi.boolean().default(true),
    refreshInterval: Joi.number().integer().min(5).max(300).default(30),
  }).default({}),
});

// Theme settings validation schema
const themeSchema = Joi.object({
  theme: Joi.string().valid('light', 'dark', 'system').default('system'),
  reducedMotion: Joi.boolean().default(false),
  highContrast: Joi.boolean().default(false),
  fontSize: Joi.string().valid('small', 'medium', 'large', 'extra-large').default('medium'),
  language: Joi.string().valid('en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'ar').default('en'),
});

// Wallet settings validation schema
const walletSchema = Joi.object({
  showBalance: Joi.boolean().default(true),
  autoConnect: Joi.boolean().default(true),
  defaultNetwork: Joi.string().valid('ethereum', 'polygon', 'bsc', 'arbitrum').default('ethereum'),
  gasPreference: Joi.string().valid('slow', 'standard', 'fast').default('standard'),
});

// Security settings validation schema
const securitySchema = Joi.object({
  twoFactorEnabled: Joi.boolean().default(false),
  loginNotifications: Joi.boolean().default(true),
  sessionTimeout: Joi.number().integer().min(5).max(1440).default(30), // 5 minutes to 24 hours
  recentDevices: Joi.array().items(Joi.object({
    deviceName: Joi.string(),
    lastLogin: Joi.date(),
    ipAddress: Joi.string().ip(),
    userAgent: Joi.string(),
  })).default([]),
});

// Main validation schemas map
const validationSchemas = {
  privacy: privacySchema,
  notifications: notificationSchema,
  interaction: interactionSchema,
  theme: themeSchema,
  wallet: walletSchema,
  security: securitySchema,
};

/**
 * Middleware to validate settings data
 */
const validateSettings = (req, res, next) => {
  try {
    // Handle both possible request body structures for backward compatibility
    let settingType = req.body.settingType || req.body.type;
    let settings = req.body.settings || req.body.data || req.body;
    
    // If settingType is not provided but we have a settings object with known keys, try to infer the type
    if (!settingType) {
      if (settings && typeof settings === 'object' && settings.privacy) {
        settingType = 'privacy';
        settings = settings.privacy;
      } else if (settings && typeof settings === 'object' && settings.notifications) {
        settingType = 'notifications';
        settings = settings.notifications;
      } else if (settings && typeof settings === 'object' && settings.interaction) {
        settingType = 'interaction';
        settings = settings.interaction;
      } else if (settings && typeof settings === 'object' && settings.theme) {
        settingType = 'theme';
        settings = settings.theme;
      } else if (settings && typeof settings === 'object' && settings.wallet) {
        settingType = 'wallet';
        settings = settings.wallet;
      } else if (settings && typeof settings === 'object' && settings.security) {
        settingType = 'security';
        settings = settings.security;
      }
    }

    // Validate settingType is provided
    if (!settingType) {
      return res.status(400).json({
        success: false,
        message: 'Setting type is required',
      });
    }

    const schema = validationSchemas[settingType.toLowerCase()];
    if (!schema) {
      return res.status(400).json({
        success: false,
        message: `Invalid setting type: ${settingType}. Supported types: ${Object.keys(validationSchemas).join(', ')}`,
      });
    }

    // Validate the settings data
    const { error, value } = schema.validate(settings, {
      allowUnknown: false, // Don't allow unknown fields
      stripUnknown: true,  // Remove unknown fields
      abortEarly: false,   // Return all validation errors
    });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return res.status(400).json({
        success: false,
        message: 'Settings validation failed',
        errors: errorMessages,
      });
    }

    // Replace the settings with validated and sanitized data
    req.body.settingType = settingType;
    req.body.settings = value;
    next();
  } catch (error) {
    console.error('Settings validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Settings validation failed',
      error: error.message,
    });
  }
};

/**
 * Validate specific setting type
 */
const validateSpecificSetting = (settingType) => {
  return (req, res, next) => {
    req.body.settingType = settingType;
    validateSettings(req, res, next);
  };
};

/**
 * Sanitize settings for safe storage
 */
const sanitizeSettings = (settingType, settings) => {
  const schema = validationSchemas[settingType.toLowerCase()];
  if (!schema) {
    throw new Error(`Invalid setting type: ${settingType}`);
  }

  const { error, value } = schema.validate(settings, {
    allowUnknown: false,
    stripUnknown: true,
    abortEarly: false,
  });

  if (error) {
    throw new Error(`Settings validation failed: ${error.details.map(d => d.message).join(', ')}`);
  }

  return value;
};

module.exports = {
  validateSettings,
  validateSpecificSetting,
  sanitizeSettings,
  validationSchemas,
};
