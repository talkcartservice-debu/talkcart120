const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const multer = require('multer');
const {
  uploadSingle,
  uploadMultiple,
  uploadProfilePicture,
  deleteFile,
  deleteMultipleFiles,
  getOptimizedUrl,
  getVideoThumbnail,
  uploadFromUrl,
  getFileInfo,
  searchFiles,
} = require('../config/cloudinary');

// @route   POST /api/media/upload
// @desc    Upload single file to Cloudinary (backward compatibility)
// @access  Private
router.post('/upload', authenticateToken, (req, res) => {
  console.log('=== Upload File Request (Backward Compatibility) ===');
  console.log('Headers:', req.headers);
  console.log('Body keys:', Object.keys(req.body));

  uploadSingle('file')(req, res, async (err) => {
    try {
      if (err) {
        console.error('Multer error:', err);
        
        // Handle specific multer errors
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
              success: false,
              error: 'File too large',
              details: `File size exceeds the limit of ${process.env.UPLOAD_MAX_FILE_SIZE_MB || '200'}MB`
            });
          }
          
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
              success: false,
              error: 'Unexpected file field',
              details: 'Please check the file upload field name'
            });
          }
        }
        
        return res.status(500).json({
          success: false,
          error: 'File upload failed',
          details: err.message,
        });
      }

      console.log('req.file:', req.file);
      console.log('req.body after multer:', req.body);

      if (!req.file) {
        console.log('No file found in request');
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
      }

      console.log('File uploaded successfully to Cloudinary');

      // Extract Cloudinary information from the file object
      // CloudinaryStorage sometimes doesn't populate all fields, so we extract from path/filename
      // More robust extraction to handle cases where fields might be missing
      const public_id = req.file.public_id || req.file.filename || (req.file.path ? req.file.path.split('/').pop().split('.')[0] : null);
      const secure_url = req.file.secure_url || req.file.path || req.file.url;
      const url = req.file.url || req.file.secure_url || req.file.path;

      // Extract format from original filename or URL
      const format = req.file.format || req.file.originalname?.split('.').pop()?.toLowerCase();

      // Determine resource type from mimetype
      const resource_type = req.file.resource_type ||
        (req.file.mimetype?.startsWith('image/') ? 'image' :
          req.file.mimetype?.startsWith('video/') ? 'video' :
            req.file.mimetype?.startsWith('audio/') ? 'audio' : 'raw');

      console.log('Cloudinary response:', {
        public_id,
        secure_url,
        format,
        resource_type,
        bytes: req.file.bytes || req.file.size
      });

      // Enhanced file data with better validation
      let fileData = {
        public_id,
        secure_url,
        url,
        format,
        resource_type,
        bytes: req.file.bytes || req.file.size,
        width: req.file.width,
        height: req.file.height,
        duration: req.file.duration,
        created_at: req.file.created_at || new Date().toISOString(),
      };

      // Additional validation for video files
      if (resource_type === 'video') {
        // Ensure we have a proper URL for videos
        // Properly distinguish by checking if the URL contains cloudinary.com
        if (!secure_url || !secure_url.includes('cloudinary.com')) {
          // If using local storage, ensure proper URL format
          if (!config.cloudinary.enabled) {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            fileData.secure_url = `${baseUrl}/uploads/talkcart/${req.file.filename}`;
            fileData.url = `${baseUrl}/uploads/talkcart/${req.file.filename}`;
          }
        }
        
        // Log video-specific information
        console.log('Video metadata:', {
          duration: fileData.duration,
          format: fileData.format,
          dimensions: `${fileData.width}x${fileData.height}`
        });
      }
      
      // Additional validation for audio files
      if (resource_type === 'audio') {
        // Ensure we have a proper URL for audio
        // Properly distinguish by checking if the URL contains cloudinary.com
        if (!secure_url || !secure_url.includes('cloudinary.com')) {
          // If using local storage, ensure proper URL format
          if (!config.cloudinary.enabled) {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            fileData.secure_url = `${baseUrl}/uploads/talkcart/${req.file.filename}`;
            fileData.url = `${baseUrl}/uploads/talkcart/${req.file.filename}`;
          }
        }
        
        // Log audio-specific information
        console.log('Audio metadata:', {
          duration: fileData.duration,
          format: fileData.format,
          bytes: fileData.bytes
        });
      }

      console.log('Sending response:', fileData);
      // Return wrapped response for frontend compatibility
      res.status(200).json({
        success: true,
        data: fileData,
        message: 'File uploaded successfully',
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload file',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  });
});

// @route   POST /api/media/upload/single
// @desc    Upload single file to Cloudinary
// @access  Private
router.post('/upload/single', authenticateToken, (req, res) => {
  console.log('=== Upload Single File Request ===');
  console.log('Headers:', req.headers);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Content-Length:', req.headers['content-length']);
  console.log('Authorization header present:', !!req.headers.authorization);
  console.log('User from auth middleware:', req.user ? req.user.username : 'No user');

  // Add request timeout handling
  req.setTimeout(120000); // 2 minutes timeout

  // Add error handling for request stream
  req.on('error', (err) => {
    console.error('Request stream error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Request stream error',
        details: err.message
      });
    }
  });

  uploadSingle('file')(req, res, async (err) => {
    try {
      if (err) {
        console.error('Multer error:', err);
        
        // Handle specific multer errors
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
              success: false,
              error: 'File too large',
              details: `File size exceeds the limit of ${process.env.UPLOAD_MAX_FILE_SIZE_MB || '200'}MB`
            });
          }
          
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
              success: false,
              error: 'Unexpected file field',
              details: 'Please check the file upload field name'
            });
          }
          
          if (err.code === 'LIMIT_FIELD_COUNT') {
            return res.status(400).json({
              success: false,
              error: 'Too many fields',
              details: 'Form has too many fields'
            });
          }
        }
        
        // Handle file type errors
        if (err.message && err.message.includes('not allowed')) {
          return res.status(400).json({
            success: false,
            error: 'Invalid file type',
            details: err.message
          });
        }

        // Return a more user-friendly error message
        return res.status(500).json({
          success: false,
          error: 'File upload failed',
          details: err.message || 'An unexpected error occurred during file upload',
          code: err.code
        });
      }

      console.log('req.file:', req.file);
      console.log('req.body after multer:', req.body);

      if (!req.file) {
        console.log('No file found in request');
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
          details: 'Please select a file to upload'
        });
      }

      console.log('File uploaded successfully');
      
      // Add debugging information
      console.log('=== Media Upload Debug Info ===');
      const config = require('../config/config');
      console.log('Cloudinary enabled:', config.cloudinary.enabled);
      console.log('req.file:', req.file);
      
      // Handle both Cloudinary and local storage responses
      let fileData;
      
      if (req.file) {
        // Check if this is a Cloudinary response or local storage response
        // When Cloudinary is enabled, we should always get Cloudinary responses
        console.log('Config cloudinary enabled:', config.cloudinary.enabled);
        console.log('req.file.public_id:', req.file.public_id);
        
        // More lenient check for Cloudinary response - if Cloudinary is enabled and we have a public_id, treat as Cloudinary
        const isCloudinaryResponse = config.cloudinary.enabled && (req.file.public_id || req.file.path?.includes('cloudinary.com'));
        console.log('isCloudinaryResponse:', isCloudinaryResponse);
        
        if (isCloudinaryResponse) {
          // Cloudinary response - more robust field extraction
          // Enhanced extraction to handle cases where fields might be missing
          const public_id = req.file.public_id || req.file.filename || (req.file.path ? req.file.path.split('/').pop().split('.')[0] : null);
          const secure_url = req.file.secure_url || req.file.path || req.file.url;
          const url = req.file.url || req.file.secure_url || req.file.path;
          const format = req.file.format || req.file.originalname?.split('.').pop()?.toLowerCase();
          const resource_type = req.file.resource_type ||
            (req.file.mimetype?.startsWith('image/') ? 'image' :
              req.file.mimetype?.startsWith('video/') ? 'video' :
                req.file.mimetype?.startsWith('audio/') ? 'audio' : 'raw');

          fileData = {
            public_id,
            secure_url,
            url,
            format,
            resource_type,
            bytes: req.file.bytes || req.file.size,
            width: req.file.width,
            height: req.file.height,
            duration: req.file.duration,
            created_at: req.file.created_at || new Date().toISOString(),
          };
          
          // Log warning if secure_url doesn't contain cloudinary.com (unexpected)
          if (secure_url && !secure_url.includes('cloudinary.com')) {
            console.warn('⚠️  WARNING: Cloudinary file missing cloudinary.com in secure_url:', secure_url);
          }
          
          console.log('Cloudinary fileData:', fileData);
        } else {
          // Local storage response (fallback)
          const filename = req.file.filename || req.file.originalname;
          // Use the backend origin for CORS compliance
          const backendOrigin = process.env.NODE_ENV === 'production' 
            ? 'https://talkcart.app' 
            : 'http://localhost:8000';
          const filePath = `/uploads/${filename}`;
          fileData = {
            public_id: filename,
            secure_url: `${backendOrigin}${filePath}`,
            url: `${backendOrigin}${filePath}`,
            format: req.file.originalname?.split('.').pop()?.toLowerCase() || 'unknown',
            resource_type: req.file.mimetype?.startsWith('image/') ? 'image' :
                          req.file.mimetype?.startsWith('video/') ? 'video' :
                          req.file.mimetype?.startsWith('audio/') ? 'audio' : 'raw',
            bytes: req.file.size,
            created_at: new Date().toISOString(),
          };
          
          console.log('Local storage fileData:', fileData);
        }
      } else {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
          details: 'Please select a file to upload'
        });
      }

      console.log('Sending response:', fileData);
      // Send the file data in the expected API response structure
      res.status(200).json({
        success: true,
        data: fileData,
        message: 'File uploaded successfully'
      });
    } catch (error) {
      console.error('Single file upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload file',
        details: error.message || 'An unexpected error occurred during file upload',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  });
});

// @route   POST /api/media/upload/multiple
// @desc    Upload multiple files to Cloudinary
// @access  Private
router.post('/upload/multiple', authenticateToken, uploadMultiple('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded',
      });
    }

    const filesData = req.files.map(file => ({
      public_id: file.public_id,
      secure_url: file.secure_url,
      url: file.url,
      format: file.format,
      resource_type: file.resource_type,
      bytes: file.bytes,
      width: file.width,
      height: file.height,
      duration: file.duration,
      created_at: file.created_at,
      folder: file.folder,
      original_filename: file.original_filename,
    }));

    res.status(200).json({
      success: true,
      data: filesData,
      count: filesData.length,
      message: `${filesData.length} files uploaded successfully to Cloudinary`,
    });
  } catch (error) {
    console.error('Multiple files upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload files',
    });
  }
});

// @route   POST /api/media/upload/profile-picture
// @desc    Upload profile picture with size validation
// @access  Private
router.post('/upload/profile-picture', authenticateToken, (req, res) => {
  console.log('=== Upload Profile Picture Request ===');
  console.log('Headers:', req.headers);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Content-Length:', req.headers['content-length']);
  console.log('Authorization header present:', !!req.headers.authorization);
  console.log('User from auth middleware:', req.user ? req.user.username : 'No user');

  // Use the specialized profile picture upload middleware
  uploadProfilePicture('file')(req, res, async (err) => {
    try {
      if (err) {
        console.error('Profile picture upload error:', err);

        // Handle specific multer errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            success: false,
            error: 'File too large',
            details: 'Profile picture must be less than 15MB in size',
          });
        }

        return res.status(400).json({
          success: false,
          error: err.message || 'Profile picture upload failed',
          details: err.code || 'validation_error'
        });
      }

      // Enhanced debugging
      console.log('=== Profile Picture Upload Debug ===');
      console.log('req.file after middleware:', req.file);
      if (req.file) {
        console.log('File keys:', Object.keys(req.file));
        console.log('File values:', req.file);
      }

      if (!req.file) {
        console.log('No profile picture file found in request');
        return res.status(400).json({
          success: false,
          error: 'No profile picture uploaded',
          details: 'Please select an image from your device'
        });
      }

      console.log('Profile picture uploaded successfully');

      // Handle both Cloudinary and local storage responses
      let fileData;
      
      if (req.file) {
        // Check if this is a Cloudinary response or local storage response
        // When Cloudinary is enabled, we should always get Cloudinary responses
        const config = require('../config/config');
        
        // More robust check for Cloudinary response
        const isCloudinaryResponse = config.cloudinary.enabled && 
          (req.file.public_id || req.file.secure_url || req.file.path?.includes('cloudinary.com'));
        
        console.log('Cloudinary enabled:', config.cloudinary.enabled);
        console.log('isCloudinaryResponse:', isCloudinaryResponse);
        console.log('req.file.public_id:', req.file.public_id);
        console.log('req.file.secure_url:', req.file.secure_url);
        console.log('req.file.path:', req.file.path);
        
        if (isCloudinaryResponse) {
          // Cloudinary response - more robust field extraction
          // Enhanced extraction to handle cases where fields might be missing
          const public_id = req.file.public_id || 
                           req.file.filename || 
                           (req.file.path ? req.file.path.split('/').pop().split('.')[0] : null);
          const secure_url = req.file.secure_url || req.file.path || req.file.url;
          const url = req.file.url || req.file.secure_url || req.file.path;
          const format = req.file.format || req.file.originalname?.split('.').pop()?.toLowerCase();

          fileData = {
            public_id,
            secure_url,
            url,
            format,
            resource_type: 'image',
            bytes: req.file.bytes || req.file.size,
            width: req.file.width,
            height: req.file.height,
            created_at: req.file.created_at || new Date().toISOString(),
          };
          
          // Log warning if secure_url doesn't contain cloudinary.com (unexpected)
          if (secure_url && !secure_url.includes('cloudinary.com')) {
            console.warn('⚠️  WARNING: Cloudinary file missing cloudinary.com in secure_url:', secure_url);
          }
          
          console.log('Cloudinary fileData:', fileData);
        } else {
          // Local storage response (fallback)
          const filename = req.file.filename || req.file.originalname;
          // Use the backend origin for CORS compliance
          const backendOrigin = process.env.NODE_ENV === 'production' 
            ? 'https://talkcart.app' 
            : 'http://localhost:8000';
          const filePath = `/uploads/talkcart/${filename}`;
          fileData = {
            public_id: filename,
            secure_url: `${backendOrigin}${filePath}`,
            url: `${backendOrigin}${filePath}`,
            format: req.file.originalname?.split('.').pop()?.toLowerCase() || 'unknown',
            resource_type: 'image',
            bytes: req.file.size,
            created_at: new Date().toISOString(),
          };
        }
      } else {
        return res.status(400).json({
          success: false,
          error: 'No profile picture uploaded',
          details: 'Please select an image from your device'
        });
      }

      console.log('File details:', fileData);

      res.status(200).json({
        success: true,
        data: fileData,
        message: 'Profile picture uploaded successfully'
      });
    } catch (error) {
      console.error('Profile picture upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload profile picture',
        details: error.message,
      });
    }
  });
});

// @route   POST /api/media/upload/url
// @desc    Upload file from URL to Cloudinary
// @access  Private
router.post('/upload/url', async (req, res) => {
  try {
    const { url, folder = 'talkcart', tags = [] } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      });
    }

    const result = await uploadFromUrl(url, {
      folder,
      tags,
    });

    const fileData = {
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
      format: result.format,
      resource_type: result.resource_type,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      duration: result.duration,
      created_at: result.created_at,
    };

    res.status(200).json({
      success: true,
      data: fileData,
      message: 'File uploaded from URL successfully',
    });
  } catch (error) {
    console.error('URL upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload file from URL',
    });
  }
});

// @route   POST /api/media/test-upload
// @desc    Test upload single file to Cloudinary (no authentication required)
// @access  Public
router.post('/test-upload', (req, res) => {
  console.log('=== Test Upload Single File Request ===');
  console.log('Headers:', req.headers);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Content-Length:', req.headers['content-length']);
  
  // Add request timeout handling
  req.setTimeout(120000); // 2 minutes timeout

  // Add error handling for request stream
  req.on('error', (err) => {
    console.error('Request stream error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Request stream error',
        details: err.message
      });
    }
  });

  uploadSingle('file')(req, res, async (err) => {
    try {
      if (err) {
        console.error('Multer error:', err);
        
        // Handle specific multer errors
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
              success: false,
              error: 'File too large',
              details: `File size exceeds the limit of ${process.env.UPLOAD_MAX_FILE_SIZE_MB || '200'}MB`
            });
          }
          
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
              success: false,
              error: 'Unexpected file field',
              details: 'Please check the file upload field name'
            });
          }
          
          if (err.code === 'LIMIT_FIELD_COUNT') {
            return res.status(400).json({
              success: false,
              error: 'Too many fields',
              details: 'Form has too many fields'
            });
          }
        }
        
        // Handle file type errors
        if (err.message && err.message.includes('not allowed')) {
          return res.status(400).json({
            success: false,
            error: 'Invalid file type',
            details: err.message
          });
        }

        return res.status(500).json({
          success: false,
          error: 'File upload failed',
          details: err.message,
          code: err.code
        });
      }

      console.log('req.file:', req.file);
      console.log('req.body after multer:', req.body);

      if (!req.file) {
        console.log('No file found in request');
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
      }

      console.log('File uploaded successfully');
      
      // Add debugging information
      console.log('=== Media Upload Debug Info ===');
      console.log('Cloudinary enabled:', config.cloudinary.enabled);
      console.log('req.file:', req.file);
      
      // Handle both Cloudinary and local storage responses
      let fileData;
      
      if (req.file) {
        // Check if this is a Cloudinary response or local storage response
        // When Cloudinary is enabled, we should always get Cloudinary responses
        const config = require('../config/config');
        console.log('Config cloudinary enabled:', config.cloudinary.enabled);
        console.log('req.file.public_id:', req.file.public_id);
        
        // More lenient check for Cloudinary response - if Cloudinary is enabled and we have a public_id, treat as Cloudinary
        const isCloudinaryResponse = config.cloudinary.enabled && req.file.public_id;
        console.log('isCloudinaryResponse:', isCloudinaryResponse);
        
        if (isCloudinaryResponse) {
          // Cloudinary response
          const public_id = req.file.public_id || req.file.filename;
          const secure_url = req.file.secure_url || req.file.path;
          const url = req.file.url || req.file.path;
          const format = req.file.format || req.file.originalname?.split('.').pop()?.toLowerCase();
          const resource_type = req.file.resource_type ||
            (req.file.mimetype?.startsWith('image/') ? 'image' :
              req.file.mimetype?.startsWith('video/') ? 'video' :
                req.file.mimetype?.startsWith('audio/') ? 'audio' : 'raw');

          fileData = {
            public_id,
            secure_url,
            url,
            format,
            resource_type,
            bytes: req.file.bytes || req.file.size,
            width: req.file.width,
            height: req.file.height,
            duration: req.file.duration,
            created_at: req.file.created_at || new Date().toISOString(),
          };
          
          // Log warning if secure_url doesn't contain cloudinary.com (unexpected)
          if (secure_url && !secure_url.includes('cloudinary.com')) {
            console.warn('⚠️  WARNING: Cloudinary file missing cloudinary.com in secure_url:', secure_url);
          }
          
          console.log('Cloudinary fileData:', fileData);
        } else {
          // Local storage response (fallback)
          const filename = req.file.filename || req.file.originalname;
          // Use the backend origin for CORS compliance
          const backendOrigin = process.env.NODE_ENV === 'production' 
            ? 'https://talkcart.app' 
            : 'http://localhost:8000';
          const filePath = `/uploads/${filename}`;
          fileData = {
            public_id: filename,
            secure_url: `${backendOrigin}${filePath}`,
            url: `${backendOrigin}${filePath}`,
            format: req.file.originalname?.split('.').pop()?.toLowerCase() || 'unknown',
            resource_type: req.file.mimetype?.startsWith('image/') ? 'image' :
                          req.file.mimetype?.startsWith('video/') ? 'video' :
                          req.file.mimetype?.startsWith('audio/') ? 'audio' : 'raw',
            bytes: req.file.size,
            created_at: new Date().toISOString(),
          };
          
          console.log('Local storage fileData:', fileData);
        }
      } else {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
      }

      console.log('Sending response:', fileData);
      // Send the file data in the expected API response structure
      res.status(200).json({
        success: true,
        data: fileData
      });
    } catch (error) {
      console.error('Single file upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload file',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  });
});

// @route   DELETE /api/media/:publicId
// @desc    Delete file from Cloudinary
// @access  Private
router.delete('/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    const { resourceType = 'image' } = req.query;

    const result = await deleteFile(publicId, resourceType);

    if (result.result === 'ok') {
      res.status(200).json({
        success: true,
        message: 'File deleted successfully',
        data: result,
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'File not found or already deleted',
      });
    }
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file',
    });
  }
});

// @route   DELETE /api/media/bulk
// @desc    Delete multiple files from Cloudinary
// @access  Private
router.delete('/bulk', async (req, res) => {
  try {
    const { publicIds, resourceType = 'image' } = req.body;

    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Public IDs array is required',
      });
    }

    const result = await deleteMultipleFiles(publicIds, resourceType);

    res.status(200).json({
      success: true,
      message: `Bulk delete completed`,
      data: result,
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete files',
    });
  }
});

// @route   GET /api/media/:publicId/info
// @desc    Get file information from Cloudinary
// @access  Private
router.get('/:publicId/info', async (req, res) => {
  try {
    const { publicId } = req.params;
    const { resourceType = 'image' } = req.query;

    const fileInfo = await getFileInfo(publicId, resourceType);

    res.status(200).json({
      success: true,
      data: fileInfo,
    });
  } catch (error) {
    console.error('Get file info error:', error);
    res.status(404).json({
      success: false,
      error: 'File not found',
    });
  }
});

// @route   GET /api/media/search
// @desc    Search files in Cloudinary
// @access  Private
router.get('/search', async (req, res) => {
  try {
    const {
      query = 'folder:talkcart',
      maxResults = 30,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const searchResults = await searchFiles(query, {
      maxResults: parseInt(maxResults),
      sortBy,
      sortOrder,
    });

    res.status(200).json({
      success: true,
      data: searchResults.resources,
      total_count: searchResults.total_count,
      next_cursor: searchResults.next_cursor,
    });
  } catch (error) {
    console.error('Search files error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search files',
    });
  }
});

// @route   POST /api/media/optimize
// @desc    Get optimized URL for image
// @access  Public
router.post('/optimize', (req, res) => {
  try {
    const { publicId, width, height, quality, format, crop } = req.body;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        error: 'Public ID is required',
      });
    }

    const optimizedUrl = getOptimizedUrl(publicId, {
      width,
      height,
      quality,
      format,
      crop,
    });

    res.status(200).json({
      success: true,
      data: {
        original_public_id: publicId,
        optimized_url: optimizedUrl,
      },
    });
  } catch (error) {
    console.error('Optimize URL error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate optimized URL',
    });
  }
});

// @route   POST /api/media/video/thumbnail
// @desc    Get video thumbnail URL
// @access  Public
router.post('/video/thumbnail', (req, res) => {
  try {
    const { publicId, width, height, quality } = req.body;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        error: 'Public ID is required',
      });
    }

    const thumbnailUrl = getVideoThumbnail(publicId, {
      width,
      height,
      quality,
    });

    res.status(200).json({
      success: true,
      data: {
        video_public_id: publicId,
        thumbnail_url: thumbnailUrl,
      },
    });
  } catch (error) {
    console.error('Video thumbnail error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate video thumbnail',
    });
  }
});

// @route   POST /api/media/audio/optimized
// @desc    Get optimized audio URL (transcoded by Cloudinary on-the-fly)
// @access  Private
router.post('/audio/optimized', authenticateToken, (req, res) => {
  try {
    console.log('=== Audio Optimization Request ===');
    console.log('User:', req.user?.id);
    console.log('Body:', req.body);

    const { publicId, format = 'mp3', quality = 'auto' } = req.body;

    // Validate required fields
    if (!publicId) {
      console.log('Missing publicId in request');
      return res.status(400).json({
        success: false,
        error: 'Public ID is required',
        details: 'publicId parameter is missing from request body'
      });
    }

    // Validate format
    const allowedFormats = ['mp3', 'wav', 'ogg', 'aac', 'm4a'];
    if (!allowedFormats.includes(format.toLowerCase())) {
      console.log('Invalid format:', format);
      return res.status(400).json({
        success: false,
        error: 'Invalid audio format',
        details: `Supported formats: ${allowedFormats.join(', ')}`
      });
    }

    // Validate quality
    const allowedQualities = ['auto', 'low', 'medium', 'high'];
    if (!allowedQualities.includes(quality.toLowerCase())) {
      console.log('Invalid quality:', quality);
      return res.status(400).json({
        success: false,
        error: 'Invalid quality setting',
        details: `Supported qualities: ${allowedQualities.join(', ')}`
      });
    }

    // Leverage Cloudinary transformation to deliver optimized audio
    const { cloudinary } = require('../config/cloudinary');

    console.log('Generating optimized URL for:', { publicId, format, quality });

    // For audio files, we need to use resource_type: 'video' in Cloudinary
    // but we can specify the format as audio
    const transformOptions = {
      resource_type: 'video', // Cloudinary treats audio under video APIs
      format: format.toLowerCase(),
      quality: quality.toLowerCase(),
      secure: true,
      flags: 'streaming_attachment'
    };

    // Add audio-specific codec settings
    if (format.toLowerCase() === 'mp3') {
      transformOptions.audio_codec = 'mp3';
    } else if (format.toLowerCase() === 'aac') {
      transformOptions.audio_codec = 'aac';
    } else if (format.toLowerCase() === 'wav') {
      transformOptions.audio_codec = 'pcm_s16le'; // WAV codec
    } else if (format.toLowerCase() === 'ogg') {
      transformOptions.audio_codec = 'libvorbis'; // OGG codec
    } else if (format.toLowerCase() === 'm4a') {
      transformOptions.audio_codec = 'aac';
    }

    const optimizedUrl = cloudinary.url(publicId, transformOptions);

    console.log('Generated optimized URL:', optimizedUrl);

    return res.status(200).json({
      success: true,
      data: {
        audio_public_id: publicId,
        optimized_url: optimizedUrl,
        format: format.toLowerCase(),
        quality: quality.toLowerCase()
      }
    });
  } catch (error) {
    console.error('Optimized audio URL error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate optimized audio URL',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   POST /api/media/video/optimized
// @desc    Get optimized video URL (transcoded by Cloudinary on-the-fly)
// @access  Private
router.post('/video/optimized', authenticateToken, (req, res) => {
  try {
    console.log('=== Video Optimization Request ===');
    console.log('User:', req.user?.id);
    console.log('Body:', req.body);

    const { publicId, format = 'mp4', quality = 'auto', width, height } = req.body;

    // Validate required fields
    if (!publicId) {
      console.log('Missing publicId in request');
      return res.status(400).json({
        success: false,
        error: 'Public ID is required',
        details: 'publicId parameter is missing from request body'
      });
    }

    // Validate format
    const allowedFormats = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv'];
    if (!allowedFormats.includes(format.toLowerCase())) {
      console.log('Invalid format:', format);
      return res.status(400).json({
        success: false,
        error: 'Invalid video format',
        details: `Supported formats: ${allowedFormats.join(', ')}`
      });
    }

    // Validate quality
    const allowedQualities = ['auto', 'low', 'medium', 'high', 'best'];
    if (!allowedQualities.includes(quality.toLowerCase())) {
      console.log('Invalid quality:', quality);
      return res.status(400).json({
        success: false,
        error: 'Invalid quality setting',
        details: `Supported qualities: ${allowedQualities.join(', ')}`
      });
    }

    // Leverage Cloudinary transformation to deliver optimized video
    const { cloudinary } = require('../config/cloudinary');

    console.log('Generating optimized video URL for:', { publicId, format, quality, width, height });

    // Build transformation options
    const transformOptions = {
      resource_type: 'video',
      format: format.toLowerCase(),
      quality: quality.toLowerCase(),
      secure: true,
      flags: 'streaming_attachment', // Optimize for streaming
    };

    // Add dimensions if provided
    if (width) transformOptions.width = parseInt(width);
    if (height) transformOptions.height = parseInt(height);

    // For WebM to MP4 conversion, add specific codec settings
    if (format.toLowerCase() === 'mp4') {
      transformOptions.video_codec = 'h264';
      transformOptions.audio_codec = 'aac';
    }

    // Generate optimized URL
    let optimizedUrl;
    try {
      optimizedUrl = cloudinary.url(publicId, transformOptions);
    } catch (urlError) {
      console.error('Error generating Cloudinary URL:', urlError);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate optimized video URL',
        details: 'Error generating Cloudinary URL'
      });
    }

    console.log('Generated optimized video URL:', optimizedUrl);

    return res.status(200).json({
      success: true,
      data: {
        video_public_id: publicId,
        optimized_url: optimizedUrl,
        format: format.toLowerCase(),
        quality: quality.toLowerCase(),
        width: width ? parseInt(width) : null,
        height: height ? parseInt(height) : null
      }
    });
  } catch (error) {
    console.error('Optimized video URL error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate optimized video URL',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
