const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('./config');

// Cloudinary configuration check

// Configure Cloudinary only if credentials are provided
if (config.cloudinary.enabled) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
}

// Create uploads directory if it doesn't exist (for local fallback)
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Create talkcart subdirectory for local storage (only one level deep)
const talkcartDir = path.join(uploadDir, 'talkcart');
if (!fs.existsSync(talkcartDir)) {
  fs.mkdirSync(talkcartDir, { recursive: true });
}

// Storage configuration - use Cloudinary if credentials are provided, otherwise use local disk storage
let storage;
console.log('=== Cloudinary Storage Initialization ===');
console.log('Config cloudinary enabled:', config.cloudinary.enabled);
console.log('Cloudinary credentials:', {
  cloudName: config.cloudinary.cloudName ? 'present' : 'missing',
  apiKey: config.cloudinary.apiKey ? 'present' : 'missing',
  apiSecret: config.cloudinary.apiSecret ? 'present' : 'missing'
});

if (config.cloudinary.enabled) {
  console.log('Initializing Cloudinary storage...');
  // Cloudinary storage configuration for multer
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'talkcart',
      resource_type: 'auto', // Automatically detect resource type
      public_id: (req, file) => {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const ext = path.extname(file.originalname);
        return `${file.fieldname}_${timestamp}_${randomString}${ext}`;
      },
    },
    // Ensure all fields are properly populated
    transformation: {
      quality: 'auto',
      fetch_format: 'auto'
    }
  });
  
  // Add debugging for Cloudinary storage
  storage._handleFile = function (req, file, callback) {
    console.log('=== Cloudinary Storage _handleFile ===');
    console.log('File:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // Call the original _handleFile method
    const originalHandleFile = Object.getPrototypeOf(this)._handleFile;
    originalHandleFile.call(this, req, file, (err, info) => {
      if (err) {
        console.error('Cloudinary storage error:', err);
        return callback(err);
      }
      
      console.log('Cloudinary storage response:', info);
      
      // Ensure we have the proper fields for Cloudinary responses
      if (info && info.path && info.path.includes('cloudinary.com')) {
        // Preserve existing secure_url and url if they're already set correctly
        if (!info.secure_url || !info.secure_url.includes('cloudinary.com')) {
          info.secure_url = info.path;
        }
        if (!info.url || !info.url.includes('cloudinary.com')) {
          info.url = info.path;
        }
        if (!info.public_id && info.path) {
          // Extract public_id from Cloudinary URL
          const urlParts = info.path.split('/');
          const lastPart = urlParts[urlParts.length - 1];
          const publicIdFromUrl = lastPart.split('.')[0];
          if (publicIdFromUrl) {
            info.public_id = publicIdFromUrl;
            console.log('Extracted public_id from URL:', publicIdFromUrl);
          }
        }
      }
      
      callback(null, info);
    });
  };
  
  console.log('Cloudinary storage initialized successfully');
} else {
  console.log('Initializing local disk storage...');
  // Local disk storage configuration for multer
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, talkcartDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      // Always append the original extension if present
      const ext = path.extname(file.originalname);
      const filename = `file_${uniqueSuffix}_${Math.random().toString(36).substring(2, 15)}${ext}`;
      cb(null, filename);
    }
  });
  console.log('Local disk storage initialized successfully');
}

// Multer upload configuration for general uploads
const MAX_UPLOAD_MB = config.upload.maxFileSize;
const MAX_FIELD_MB = config.upload.maxFieldSize;

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_UPLOAD_MB * 1024 * 1024, // configurable (default 200MB)
    fieldSize: MAX_FIELD_MB * 1024 * 1024, // configurable
    files: 1, // Maximum number of files
  },
  fileFilter: (req, file, cb) => {
    // Allow common video, image, and audio file types
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska', 'video/x-msvideo', 'video/x-flv', 'video/3gpp', 'video/3gpp2', 'video/mpeg', 'video/avi', 'video/mov', 'video/x-ms-wmv',
      'audio/webm', 'audio/webm;codecs=opus', 'audio/ogg', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/aac', 'audio/mp4', 'audio/x-m4a'
    ];
    
    // For audio files with codecs, check the base type
    const baseMimeType = file.mimetype.split(';')[0];
    const isAllowed = allowedTypes.includes(file.mimetype) || 
                     (file.mimetype.startsWith('audio/') && allowedTypes.includes(baseMimeType)) ||
                     allowedTypes.some(type => type.endsWith('/*') && file.mimetype.startsWith(type.slice(0, -1)));
    
    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed. Only common image, video, and audio formats are supported.`), false);
    }
  },
});

// Multer upload configuration specifically for profile pictures
const profilePictureUpload = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit for profile pictures
  },
  fileFilter: (req, file, cb) => {
    // Check file type - only images allowed for profile pictures
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed for profile pictures. Only JPG, PNG, GIF, and WebP are supported.`), false);
    }
  },
});

/**
 * Upload single file to Cloudinary or local storage
 */
const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    const uploadHandler = upload.single(fieldName);
    
    uploadHandler(req, res, async (err) => {
      if (err) {
        return next(err);
      }
      
      // Debug Cloudinary upload
      console.log('=== Cloudinary Upload Debug ===');
      console.log('Cloudinary enabled:', config.cloudinary.enabled);
      console.log('Cloudinary config:', {
        cloudName: config.cloudinary.cloudName,
        apiKey: config.cloudinary.apiKey ? '***' : 'missing',
        apiSecret: config.cloudinary.apiSecret ? '***' : 'missing'
      });
      console.log('req.file after upload:', req.file);
      if (req.file) {
        console.log('File public_id:', req.file.public_id);
        console.log('File secure_url:', req.file.secure_url);
        if (req.file.secure_url) {
          console.log('secure_url contains cloudinary.com:', req.file.secure_url.includes('cloudinary.com'));
        }
      }
      
      // Enhanced Cloudinary response processing
      if (config.cloudinary.enabled && req.file) {
        // Ensure we have proper Cloudinary fields
        // Preserve existing secure_url if it's already valid
        if (req.file.path && req.file.path.includes('cloudinary.com') && (!req.file.secure_url || !req.file.secure_url.includes('cloudinary.com'))) {
          req.file.secure_url = req.file.path;
        }
        
        if (req.file.path && req.file.path.includes('cloudinary.com') && !req.file.public_id) {
          // Extract public_id from Cloudinary URL
          const urlParts = req.file.path.split('/');
          const lastPart = urlParts[urlParts.length - 1];
          const publicIdFromUrl = lastPart.split('.')[0];
          if (publicIdFromUrl) {
            req.file.public_id = publicIdFromUrl;
            console.log('Extracted public_id from URL:', publicIdFromUrl);
          }
        }
      }
      
      // If using local storage, fix the file URL
      if (!config.cloudinary.enabled && req.file) {
        // Generate proper local URL
        const protocol = req.protocol || 'http';
        const host = req.get('host') || 'localhost:8000';
        // Use HTTPS in production, HTTP in development
        const baseUrl = config.server.isProduction ? `https://${host}` : `${protocol}://${host}`;
        
        // Ensure we don't have duplicate talkcart paths
        const filename = req.file.filename;
        let filePath = `/uploads/talkcart/${filename}`;
        
        // Fix duplicate talkcart path issue
        if (filePath.includes('/uploads/talkcart/talkcart/')) {
          filePath = filePath.replace('/uploads/talkcart/talkcart/', '/uploads/talkcart/');
        }
        
        req.file.secure_url = `${baseUrl}${filePath}`;
        req.file.url = `${baseUrl}${filePath}`;
        req.file.public_id = `talkcart/${filename}`;
      }
      
      next();
    });
  };
};

/**
 * Upload multiple files to Cloudinary or local storage
 */
const uploadMultiple = (fieldName, maxCount = 10) => {
  return (req, res, next) => {
    const uploadHandler = upload.array(fieldName, maxCount);
    
    uploadHandler(req, res, async (err) => {
      if (err) {
        return next(err);
      }
      
      // If using local storage, fix the file URLs
      if (!config.cloudinary.enabled && req.files) {
        // Use HTTPS in production, HTTP in development
        const protocol = config.server.isProduction ? 'https' : (req.protocol || 'http');
        const host = req.get('host') || 'localhost:8000';
        const baseUrl = `${protocol}://${host}`;
        
        req.files.forEach(file => {
          // Ensure we don't have duplicate talkcart paths
          const filename = file.filename;
          let filePath = `/uploads/talkcart/${filename}`;
          
          // Fix duplicate talkcart path issue
          if (filePath.includes('/uploads/talkcart/talkcart/')) {
            filePath = filePath.replace('/uploads/talkcart/talkcart/', '/uploads/talkcart/');
          }
          
          file.secure_url = `${baseUrl}${filePath}`;
          file.url = `${baseUrl}${filePath}`;
          file.public_id = `talkcart/${filename}`;
        });
      }
      
      next();
    });
  };
};

/**
 * Upload files with different field names
 */
const uploadFields = (fields) => {
  return (req, res, next) => {
    const uploadHandler = upload.fields(fields);
    
    uploadHandler(req, res, async (err) => {
      if (err) {
        return next(err);
      }
      
      // If using local storage, fix the file URLs
      if (!config.cloudinary.enabled) {
        // Use HTTPS in production, HTTP in development
        const protocol = config.server.isProduction ? 'https' : (req.protocol || 'http');
        const host = req.get('host') || 'localhost:8000';
        const baseUrl = `${protocol}://${host}`;
        
        // Handle single files
        if (req.file) {
          // Ensure we don't have duplicate talkcart paths
          const filename = req.file.filename;
          let filePath = `/uploads/talkcart/${filename}`;
          
          // Fix duplicate talkcart path issue
          if (filePath.includes('/uploads/talkcart/talkcart/')) {
            filePath = filePath.replace('/uploads/talkcart/talkcart/', '/uploads/talkcart/');
          }
          
          req.file.secure_url = `${baseUrl}${filePath}`;
          req.file.url = `${baseUrl}${filePath}`;
          req.file.public_id = `talkcart/${filename}`;
        }
        
        // Handle multiple files
        if (req.files) {
          Object.keys(req.files).forEach(fieldname => {
            const files = req.files[fieldname];
            if (Array.isArray(files)) {
              files.forEach(file => {
                // Ensure we don't have duplicate talkcart paths
                const filename = file.filename;
                let filePath = `/uploads/talkcart/${filename}`;
                
                // Fix duplicate talkcart path issue
                if (filePath.includes('/uploads/talkcart/talkcart/')) {
                  filePath = filePath.replace('/uploads/talkcart/talkcart/', '/uploads/talkcart/');
                }
                
                file.secure_url = `${baseUrl}${filePath}`;
                file.url = `${baseUrl}${filePath}`;
                file.public_id = `talkcart/${filename}`;
              });
            }
          });
        }
      }
      
      next();
    });
  };
};

/**
 * Upload single profile picture to Cloudinary or local storage with size validation
 */
const uploadProfilePicture = (fieldName) => {
  return (req, res, next) => {
    const uploadHandler = profilePictureUpload.single(fieldName);

    uploadHandler(req, res, (err) => {
      if (err) {
        return next(err);
      }

      // Debug Cloudinary upload
      console.log('=== Profile Picture Upload Debug ===');
      console.log('Cloudinary enabled:', config.cloudinary.enabled);
      console.log('req.file after upload:', req.file);
      if (req.file) {
        console.log('File public_id:', req.file.public_id);
        console.log('File secure_url:', req.file.secure_url);
        if (req.file.secure_url) {
          console.log('secure_url contains cloudinary.com:', req.file.secure_url.includes('cloudinary.com'));
        }
      }

      // If using local storage, fix the file URL
      if (!config.cloudinary.enabled && req.file) {
        // Use HTTPS in production, HTTP in development
        const protocol = config.server.isProduction ? 'https' : (req.protocol || 'http');
        const host = req.get('host') || 'localhost:8000';
        const baseUrl = `${protocol}://${host}`;
        
        // Ensure we don't have duplicate talkcart paths
        const filename = req.file.filename;
        let filePath = `/uploads/talkcart/${filename}`;
        
        // Fix duplicate talkcart path issue
        if (filePath.includes('/uploads/talkcart/talkcart/')) {
          filePath = filePath.replace('/uploads/talkcart/talkcart/', '/uploads/talkcart/');
        }
        
        req.file.secure_url = `${baseUrl}${filePath}`;
        req.file.url = `${baseUrl}${filePath}`;
        req.file.public_id = `talkcart/${filename}`;
      }

      next();
    });
  };
};

/**
 * Delete file from Cloudinary
 */
const deleteFile = async (publicId) => {
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

/**
 * Delete multiple files from Cloudinary
 */
const deleteMultipleFiles = async (publicIds) => {
  try {
    return await cloudinary.api.delete_resources(publicIds);
  } catch (error) {
    console.error('Cloudinary delete multiple error:', error);
    throw error;
  }
};

/**
 * Get optimized URL for image
 */
const getOptimizedUrl = (publicId, options = {}) => {
  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'fill'
  } = options;

  let transformations = [`q_${quality}`, `f_${format}`];
  
  if (width || height) {
    const dimensions = [];
    if (width) dimensions.push(`w_${width}`);
    if (height) dimensions.push(`h_${height}`);
    transformations.push(...dimensions, `c_${crop}`);
  }

  return cloudinary.url(publicId, {
    transformation: transformations,
    secure: true,
  });
};

/**
 * Get video thumbnail
 */
const getVideoThumbnail = (publicId, options = {}) => {
  const {
    width = 400,
    height = 300,
    quality = 'auto',
  } = options;

  return cloudinary.url(publicId, {
    resource_type: 'video',
    transformation: [
      { width, height, crop: 'fill' }, // Fixed: Added missing comma
      { quality },
      { format: 'jpg' }
    ],
    secure: true,
  });
};

/**
 * Get optimized video URL
 */
const getOptimizedVideoUrl = (publicId, options = {}) => {
  const {
    width,
    height,
    quality = 'auto',
    format = 'mp4',
  } = options;

  return cloudinary.url(publicId, {
    resource_type: 'video',
    transformation: [
      width || height ? { width, height, crop: 'fill' } : {},
      { quality },
      { format }
    ],
    secure: true,
  });
};

/**
 * Upload file from URL
 */
const uploadFromUrl = async (url, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(url, {
      folder: 'talkcart',
      resource_type: 'auto',
      ...options,
    });
    return result;
  } catch (error) {
    console.error('Cloudinary URL upload error:', error);
    throw error;
  }
};

/**
 * Get file information
 */
const getFileInfo = async (publicId) => {
  try {
    return await cloudinary.api.resource(publicId);
  } catch (error) {
    console.error('Cloudinary file info error:', error);
    throw error;
  }
};

/**
 * Search files
 */
const searchFiles = async (expression, options = {}) => {
  try {
    return await cloudinary.api.resources_by_tag(expression, options);
  } catch (error) {
    console.error('Cloudinary search error:', error);
    throw error;
  }
};

/**
 * Create upload preset
 */
const createUploadPreset = async (name, options = {}) => {
  try {
    return await cloudinary.api.create_upload_preset({
      name,
      folder: 'talkcart',
      ...options,
    });
  } catch (error) {
    console.error('Cloudinary create preset error:', error);
    throw error;
  }
};

/**
 * Generate video preview for reels/short videos
 */
const getVideoPreview = (publicId, options = {}) => {
  const {
    duration = 10, // Preview duration in seconds
    startOffset = 0,
    width = 300,
    height = 400,
    quality = 'auto',
  } = options;

  return cloudinary.url(publicId, {
    resource_type: 'video',
    width,
    height,
    crop: 'fill',
    quality,
    start_offset: startOffset,
    duration,
    format: 'mp4',
    secure: true,
  });
};

/**
 * Upload file from base64
 */
const uploadFromBase64 = async (base64String, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(base64String, {
      folder: 'talkcart',
      resource_type: 'auto',
      ...options,
    });
    return result;
  } catch (error) {
    console.error('Cloudinary base64 upload error:', error);
    throw error;
  }
};

/**
 * Upload file buffer to Cloudinary
 */
const uploadToCloudinary = async (fileBuffer, options = {}) => {
  try {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'talkcart',
          resource_type: 'auto',
          ...options,
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      ).end(fileBuffer);
    });
  } catch (error) {
    console.error('Cloudinary upload buffer error:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  uploadProfilePicture,
  deleteFile,
  deleteMultipleFiles,
  getOptimizedUrl,
  getVideoThumbnail,
  getOptimizedVideoUrl,
  uploadFromUrl,
  getFileInfo,
  searchFiles,
  createUploadPreset,
  getVideoPreview,
  uploadFromBase64,
  uploadToCloudinary,
};