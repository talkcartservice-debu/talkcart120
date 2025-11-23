import { SOCIAL_CONFIG, UPLOAD_CONFIG } from '@/lib/constants';

/**
 * Validation utility functions
 */

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation
export const isValidPassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Username validation
export const isValidUsername = (username: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (username.length < SOCIAL_CONFIG.MIN_USERNAME_LENGTH) {
    errors.push(`Username must be at least ${SOCIAL_CONFIG.MIN_USERNAME_LENGTH} characters long`);
  }
  
  if (username.length > SOCIAL_CONFIG.MAX_USERNAME_LENGTH) {
    errors.push(`Username must be no more than ${SOCIAL_CONFIG.MAX_USERNAME_LENGTH} characters long`);
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }
  
  if (/^[0-9]/.test(username)) {
    errors.push('Username cannot start with a number');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Wallet address validation
export const isValidWalletAddress = (address: string): boolean => {
  // Ethereum address validation
  const ethRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethRegex.test(address);
};

// Post content validation
export const isValidPostContent = (content: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (content.trim().length === 0) {
    errors.push('Post content cannot be empty');
  }
  
  if (content.length > SOCIAL_CONFIG.MAX_POST_LENGTH) {
    errors.push(`Post content must be no more than ${SOCIAL_CONFIG.MAX_POST_LENGTH} characters long`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Comment content validation
export const isValidCommentContent = (content: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (content.trim().length === 0) {
    errors.push('Comment content cannot be empty');
  }
  
  if (content.length > SOCIAL_CONFIG.MAX_COMMENT_LENGTH) {
    errors.push(`Comment content must be no more than ${SOCIAL_CONFIG.MAX_COMMENT_LENGTH} characters long`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Bio validation
export const isValidBio = (bio: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (bio.length > SOCIAL_CONFIG.MAX_BIO_LENGTH) {
    errors.push(`Bio must be no more than ${SOCIAL_CONFIG.MAX_BIO_LENGTH} characters long`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// File validation
export const isValidFile = (file: File, type: 'image' | 'video' | 'audio'): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check file size
  if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
    errors.push(`File size must be less than ${UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }
  
  // Check file type
  let allowedTypes: readonly string[] = [];
  switch (type) {
    case 'image':
      allowedTypes = UPLOAD_CONFIG.ALLOWED_IMAGE_TYPES;
      break;
    case 'video':
      allowedTypes = UPLOAD_CONFIG.ALLOWED_VIDEO_TYPES;
      break;
    case 'audio':
      allowedTypes = UPLOAD_CONFIG.ALLOWED_AUDIO_TYPES;
      break;
  }
  
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed for ${type} uploads`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Multiple files validation
export const isValidFileList = (files: FileList | File[], type: 'image' | 'video' | 'audio'): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const fileArray = Array.from(files);
  
  // Check number of files
  if (fileArray.length > UPLOAD_CONFIG.MAX_FILES) {
    errors.push(`You can only upload up to ${UPLOAD_CONFIG.MAX_FILES} files at once`);
  }
  
  // Validate each file
  fileArray.forEach((file, index) => {
    const fileValidation = isValidFile(file, type);
    if (!fileValidation.isValid) {
      errors.push(`File ${index + 1}: ${fileValidation.errors.join(', ')}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// URL validation
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Social media URL validation
export const isValidSocialUrl = (url: string, platform: string): boolean => {
  if (!url) return true; // Empty URLs are valid (optional fields)
  
  // If it's just a username (no dots or protocols), it's valid
  if (!url.includes('.') && !url.includes('http')) {
    return true;
  }
  
  // Check if it's a valid URL
  if (!isValidUrl(url)) {
    return false;
  }
  
  // Platform-specific validation
  const urlObj = new URL(url);
  switch (platform.toLowerCase()) {
    case 'twitter':
      return urlObj.hostname === 'twitter.com' || urlObj.hostname === 'x.com';
    case 'instagram':
      return urlObj.hostname === 'instagram.com' || urlObj.hostname === 'www.instagram.com';
    case 'linkedin':
      return urlObj.hostname === 'linkedin.com' || urlObj.hostname === 'www.linkedin.com';
    case 'telegram':
      return urlObj.hostname === 't.me';
    default:
      return true; // Allow any valid URL for other platforms
  }
};

// Price validation
export const isValidPrice = (price: string | number): boolean => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return !isNaN(numPrice) && numPrice >= 0;
};

// Crypto amount validation
export const isValidCryptoAmount = (amount: string | number): boolean => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(numAmount) && numAmount > 0;
};

// Search query validation
export const isValidSearchQuery = (query: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (query.trim().length === 0) {
    errors.push('Search query cannot be empty');
  }
  
  if (query.length < 2) {
    errors.push('Search query must be at least 2 characters long');
  }
  
  if (query.length > 100) {
    errors.push('Search query must be no more than 100 characters long');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Phone number validation (basic)
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

// Date validation
export const isValidDate = (date: string | Date): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj instanceof Date && !isNaN(dateObj.getTime());
};

// Age validation (must be 13 or older)
export const isValidAge = (birthDate: string | Date): boolean => {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    return age - 1 >= 13;
  }
  
  return age >= 13;
};

// Sanitize input to prevent XSS
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Validate form data
export const validateFormData = (data: Record<string, any>, rules: Record<string, (value: any) => { isValid: boolean; errors: string[] }>): { isValid: boolean; errors: Record<string, string[]> } => {
  const errors: Record<string, string[]> = {};
  let isValid = true;
  
  Object.keys(rules).forEach(field => {
    const rule = rules[field];
    if (rule) {
      const validation = rule(data[field]);
      if (!validation.isValid) {
        errors[field] = validation.errors;
        isValid = false;
      }
    }
  });
  
  return { isValid, errors };
};