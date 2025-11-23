// Validation utilities for forms and user input

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): { isValid: boolean; message?: string } => {
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long' };
  }
  
  if (password.length > 128) {
    return { isValid: false, message: 'Password must be less than 128 characters' };
  }
  
  // Check for at least one letter and one number (optional but recommended)
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  if (!hasLetter || !hasNumber) {
    return { 
      isValid: true, // Still valid but warn user
      message: 'For better security, use both letters and numbers' 
    };
  }
  
  return { isValid: true };
};

/**
 * Validate username format
 */
export const validateUsername = (username: string): { isValid: boolean; message?: string } => {
  if (username.length < 3) {
    return { isValid: false, message: 'Username must be at least 3 characters long' };
  }
  
  if (username.length > 30) {
    return { isValid: false, message: 'Username must be less than 30 characters' };
  }
  
  // Only allow alphanumeric characters and underscores
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return { isValid: false, message: 'Username can only contain letters, numbers, and underscores' };
  }
  
  return { isValid: true };
};

/**
 * Validate display name
 */
export const validateDisplayName = (displayName: string): { isValid: boolean; message?: string } => {
  if (displayName.trim().length < 2) {
    return { isValid: false, message: 'Display name must be at least 2 characters long' };
  }
  
  if (displayName.length > 50) {
    return { isValid: false, message: 'Display name must be less than 50 characters' };
  }
  
  return { isValid: true };
};

/**
 * Validate login form
 */
export const validateLoginForm = (email: string, password: string): ValidationResult => {
  const errors: Record<string, string> = {};
  
  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!validateEmail(email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  if (!password) {
    errors.password = 'Password is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate registration form
 */
export const validateRegistrationForm = (
  email: string,
  password: string,
  confirmPassword: string,
  username: string,
  displayName: string
): ValidationResult => {
  const errors: Record<string, string> = {};
  
  // Email validation
  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!validateEmail(email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  // Password validation
  if (!password) {
    errors.password = 'Password is required';
  } else {
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.message || 'Invalid password';
    }
  }
  
  // Confirm password validation
  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  
  // Username validation
  if (!username.trim()) {
    errors.username = 'Username is required';
  } else {
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      errors.username = usernameValidation.message || 'Invalid username';
    }
  }
  
  // Display name validation
  if (!displayName.trim()) {
    errors.displayName = 'Display name is required';
  } else {
    const displayNameValidation = validateDisplayName(displayName);
    if (!displayNameValidation.isValid) {
      errors.displayName = displayNameValidation.message || 'Invalid display name';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate profile update form
 */
export const validateProfileForm = (
  formData: any
): ValidationResult => {
  const errors: Record<string, string> = {};
  
  const displayName = formData.displayName || '';
  const username = formData.username || '';
  const bio = formData.bio;
  const website = formData.website;
  
  // Display name validation
  if (!displayName.trim()) {
    errors.displayName = 'Display name is required';
  } else {
    const displayNameValidation = validateDisplayName(displayName);
    if (!displayNameValidation.isValid) {
      errors.displayName = displayNameValidation.message || 'Invalid display name';
    }
  }
  
  // Username validation
  if (!username.trim()) {
    errors.username = 'Username is required';
  } else {
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      errors.username = usernameValidation.message || 'Invalid username';
    }
  }
  
  // Bio validation (optional)
  if (bio && bio.length > 500) {
    errors.bio = 'Bio must be less than 500 characters';
  }
  
  // Website validation (optional)
  if (website && website.trim()) {
    const urlRegex = /^https?:\/\/.+\..+/;
    if (!urlRegex.test(website)) {
      errors.website = 'Please enter a valid website URL (starting with http:// or https://)';
    }
  }
  
  // Avatar validation (if present)
  if (formData.avatar && typeof formData.avatar === 'string' && formData.avatar.startsWith('data:')) {
    const sizeInMB = formData.avatar.length / (1024 * 1024);
    if (sizeInMB > 5) {
      errors.avatar = 'Avatar image is too large (>5MB). Please use a smaller image.';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Sanitize user input
 */
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

/**
 * Check if string contains only safe characters
 */
export const isSafeString = (input: string): boolean => {
  // Disallow potentially dangerous characters
  const dangerousChars = /<script|javascript:|data:|vbscript:/i;
  return !dangerousChars.test(input);
};
