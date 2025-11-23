import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import { Upload, Video, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { validateVideoFile } from '@/utils/videoUtils';
import toast from 'react-hot-toast';

interface SimpleVideoUploadProps {
  onVideoUploaded: (videoData: any) => void;
  onCancel: () => void;
}

// Enhanced URL validation utility
const isValidUrl = (urlString: string): boolean => {
  try {
    if (!urlString) return false;
    
    // Handle Cloudinary URLs with special characters
    if (urlString.includes('cloudinary.com')) {
      return urlString.startsWith('http://') || urlString.startsWith('https://');
    }
    
    // Handle local development URLs
    if (urlString.includes('localhost:') || urlString.includes('127.0.0.1')) {
      return urlString.startsWith('http://') || urlString.startsWith('https://');
    }
    
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

// Enhanced URL normalization utility
const normalizeMediaUrl = (urlString: string): string | null => {
  try {
    if (!urlString) return null;
    
    // Handle already valid absolute URLs
    if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
      let normalizedUrl = urlString;
      
      // Fix duplicate talkcart path issue
      if (normalizedUrl.includes('/uploads/talkcart/talkcart/')) {
        console.log('🔧 Fixing duplicate talkcart path in URL:', normalizedUrl);
        normalizedUrl = normalizedUrl.replace(/\/uploads\/talkcart\/talkcart\//g, '/uploads/talkcart/');
        console.log('✅ Fixed URL:', normalizedUrl);
      }
      
      return normalizedUrl;
    }
    
    // Handle relative URLs by converting to absolute
    if (urlString.startsWith('/')) {
      let normalizedUrl = urlString;
      
      // Check for malformed URLs with duplicate path segments
      if (normalizedUrl.includes('/uploads/talkcart/talkcart/')) {
        console.log('🔧 Fixing duplicate talkcart path in relative URL:', normalizedUrl);
        normalizedUrl = normalizedUrl.replace(/\/uploads\/talkcart\/talkcart\//g, '/uploads/talkcart/');
        console.log('✅ Fixed relative URL:', normalizedUrl);
      }
      
      // For development, use localhost:8000 as the base
      const isDev = process.env.NODE_ENV === 'development';
      const baseUrl = isDev ? 'http://localhost:8000' : window.location.origin;
      
      if (baseUrl) {
        return `${baseUrl}${normalizedUrl}`;
      }
      return normalizedUrl;
    }
    
    return null;
  } catch (e) {
    console.error('❌ Error in normalizeMediaUrl:', e);
    return null;
  }
};

export const SimpleVideoUpload: React.FC<SimpleVideoUploadProps> = ({
  onVideoUploaded,
  onCancel,
}) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'followers' | 'private'>('public');

  const createVideoPostMutation = useMutation({
    mutationFn: async (videoData: any) => {
      // Validate video data before creating post
      if (!videoData.public_id) {
        throw new Error('Video upload missing public_id');
      }
      
      if (!videoData.secure_url && !videoData.url) {
        throw new Error('Video upload missing URL');
      }
      
      // Check for known missing file patterns
      const url = videoData.secure_url || videoData.url;
      const knownMissingPatterns = [
        'file_1760168733155_lfhjq4ik7ht',
        'file_1760163879851_tt3fdqqim9',
        'file_1760263843073_w13593s5t8l',
        'file_1760276276250_3pqeekj048s'
      ];
      
      for (const pattern of knownMissingPatterns) {
        if (url && typeof url === 'string' && url.includes(pattern)) {
          throw new Error('Video upload returned a known missing file reference');
        }
      }

      // Enhanced validation of the URL before creating post
      const normalizedUrl = normalizeMediaUrl(url);
      if (!normalizedUrl || !isValidUrl(normalizedUrl)) {
        throw new Error('Video URL is invalid or cannot be normalized');
      }

      const response: any = await api.posts.create({
        content: videoDescription || videoTitle || 'Video post',
        type: 'video',
        media: [{
          ...videoData,
          secure_url: normalizedUrl,
          url: normalizedUrl
        }],
        privacy: privacy,
      });
      
      // Handle different response structures
      if (response && typeof response === 'object' && response.data) {
        if (response.data.post) {
          return response.data.post;
        } else {
          return response.data;
        }
      } else {
        return response;
      }
    },
    onSuccess: (data) => {
      toast.success('Video uploaded successfully!');
      onVideoUploaded(data);
      
      // Invalidate queries to refresh feeds
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error: any) => {
      console.error('Video post creation error:', error);
      toast.error(error.message || 'Failed to create video post');
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateVideoFile(file);
    if (!validation.valid) {
      const errorMessage = validation.error || 'Invalid video file';
      toast.error(errorMessage);
      return;
    }

    setSelectedFile(file);
    
    // Auto-generate title from filename
    if (!videoTitle) {
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
      setVideoTitle(nameWithoutExtension);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a video file');
      return;
    }

    if (!videoTitle.trim()) {
      toast.error('Please enter a title for your video');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Upload video to media service
      const uploadResponse = await api.media.upload(selectedFile, 'post');
      
      if (!uploadResponse.data?.data) {
        throw new Error('Upload failed - no data received');
      }

      const videoData = uploadResponse.data.data;
      
      // Additional validation of video data
      if (!videoData.public_id) {
        throw new Error('Upload successful but missing public_id');
      }
      
      const videoUrl = videoData.secure_url || videoData.url;
      if (!videoUrl) {
        throw new Error('Upload successful but missing video URL');
      }
      
      // Validate resource type for videos
      if (videoData.resource_type !== 'video') {
        console.warn('Uploaded file is not marked as video type:', videoData.resource_type);
      }
      
      // Create video post
      await createVideoPostMutation.mutateAsync(videoData);
      
    } catch (error: any) {
      console.error('Video upload error:', error);
      toast.error(error.message || 'Failed to upload video');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Video size={24} />
          <Typography variant="h6">Upload Video</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* File Selection */}
          {!selectedFile ? (
            <Box
              sx={{
                border: '2px dashed #ccc',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'action.hover',
                },
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={48} color="#ccc" style={{ marginBottom: 16 }} />
              <Typography variant="h6" gutterBottom>
                Select Video File
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Click to browse or drag and drop your video file here
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Supported formats: MP4, WebM, OGG, AVI, MOV (Max: 200MB)
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 2,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Selected Video
                </Typography>
                <Button
                  size="small"
                  onClick={handleRemoveFile}
                  startIcon={<X size={16} />}
                >
                  Remove
                </Button>
              </Box>
              <Typography variant="body2" gutterBottom>
                {selectedFile.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatFileSize(selectedFile.size)}
              </Typography>
            </Box>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {/* Video Details */}
          {selectedFile && (
            <>
              <TextField
                fullWidth
                label="Video Title"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                required
                inputProps={{ maxLength: 100 }}
                helperText={`${videoTitle.length}/100 characters`}
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description (Optional)"
                value={videoDescription}
                onChange={(e) => setVideoDescription(e.target.value)}
                inputProps={{ maxLength: 500 }}
                helperText={`${videoDescription.length}/500 characters`}
              />

              <FormControl fullWidth>
                <InputLabel>Privacy</InputLabel>
                <Select
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value as any)}
                  label="Privacy"
                >
                  <MenuItem value="public">Public - Everyone can see</MenuItem>
                  <MenuItem value="followers">Followers Only</MenuItem>
                  <MenuItem value="private">Private - Only you</MenuItem>
                </Select>
              </FormControl>
            </>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <Box>
              <Typography variant="body2" gutterBottom>
                Uploading video...
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={uploadProgress} 
                sx={{ mb: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                {uploadProgress.toFixed(0)}% complete
              </Typography>
            </Box>
          )}

          {/* Upload Tips */}
          <Alert severity="info">
            <Typography variant="body2">
              <strong>Tips for better video uploads:</strong>
              <br />
              • Use MP4 format for best compatibility
              • Keep file size under 200MB for faster upload
              • Add a descriptive title and tags for better discovery
            </Typography>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button onClick={onCancel} disabled={isUploading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!selectedFile || !videoTitle.trim() || isUploading}
          startIcon={isUploading ? <CircularProgress size={16} /> : <Upload size={16} />}
        >
          {isUploading ? 'Uploading...' : 'Upload Video'}
        </Button>
      </DialogActions>
    </>
  );
};