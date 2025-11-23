/**
 * Media validation utilities
 */

export interface MediaValidationError {
  valid: false;
  error: string;
  details?: string;
}

export interface MediaValidationSuccess {
  valid: true;
}

export type MediaValidationResult = MediaValidationError | MediaValidationSuccess;

/**
 * Validate a media file before upload
 */
export const validateMediaFile = (
  file: File,
  options: {
    maxSize?: number; // in MB
    allowedTypes?: string[];
    maxWidth?: number;
    maxHeight?: number;
  } = {}
): MediaValidationResult => {
  const {
    maxSize = file.type.startsWith('video/') ? 200 : file.type.startsWith('audio/') ? 50 : 10, // 200MB for videos, 50MB for audio, 10MB for images
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska', 'video/x-msvideo', 'video/x-flv', 'video/3gpp', 'video/3gpp2', 'video/mpeg', 'video/avi', 'video/mov', 'video/x-ms-wmv', 'audio/webm', 'audio/ogg', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/aac', 'audio/mp4', 'audio/x-m4a'],
    maxWidth = 4000,
    maxHeight = 4000,
  } = options;

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    // For audio files, also check if the file type starts with any of the allowed types
    // This handles cases like 'audio/webm;codecs=opus' matching 'audio/webm'
    const baseFileType = file.type.split(';')[0];
    const isValidAudioType = file.type.startsWith('audio/') && 
      allowedTypes.some(type => file.type.startsWith(type) || (baseFileType && type.startsWith(baseFileType)));
    
    if (!isValidAudioType) {
      const typeMap: Record<string, string> = {
        'image/': 'image',
        'video/': 'video',
        'audio/': 'audio'
      };
      
      const fileType = Object.entries(typeMap).find(([prefix]) => 
        file.type.startsWith(prefix)
      )?.[1] || 'file';
      
      return {
        valid: false,
        error: `Unsupported ${fileType} type`,
        details: `Please upload a ${fileType} in one of these formats: ${allowedTypes.join(', ')}`
      };
    }
  }

  // Check file size
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > maxSize) {
    return {
      valid: false,
      error: `${file.type.startsWith('video/') ? 'Video' : 'Image'} too large`,
      details: `File size ${fileSizeMB.toFixed(1)}MB exceeds the limit of ${maxSize}MB`
    };
  }

  return { valid: true };
};

/**
 * Validate multiple media files
 */
export const validateMediaFiles = (
  files: File[],
  options: {
    maxSize?: number; // in MB
    allowedTypes?: string[];
    maxFiles?: number;
  } = {}
): MediaValidationResult => {
  const { maxFiles = 10 } = options;

  // Check number of files
  if (files.length > maxFiles) {
    return {
      valid: false,
      error: 'Too many files',
      details: `You can upload up to ${maxFiles} files at once`
    };
  }

  // Validate each file
  for (const file of files) {
    const result = validateMediaFile(file, options);
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true };
};

/**
 * Get human-readable file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Check if a file is an image
 */
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

/**
 * Check if a file is a video
 */
export const isVideoFile = (file: File): boolean => {
  return file.type.startsWith('video/');
};