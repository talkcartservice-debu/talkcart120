import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  IconButton,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  Slider,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import { Camera, Upload, X, Trash2, ZoomIn, ZoomOut, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { api, handleUploadError } from '@/lib/api';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
const UserAvatar = dynamic(() => import('../common/UserAvatar'), { ssr: false });
import ReactCrop, { type Crop } from 'react-image-crop';
import { User } from '@/types/social';
import { UploadErrorBoundary } from '../common/UploadErrorBoundary';

interface ProfilePictureUploadProps {
  user: User | null;
  onUploadSuccess: (avatarUrl: string) => void;
  size?: number;
  showUploadButton?: boolean;
  allowRemove?: boolean;
  disabled?: boolean;
  aspectRatio?: number; // For cover photos (e.g., 3 for 3:1 ratio)
  uploadType?: 'avatar' | 'cover';
}

const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({
  user,
  onUploadSuccess,
  size = 120,
  showUploadButton = true,
  allowRemove = false,
  disabled = false,
  aspectRatio = 1, // Default to 1:1 for avatars
  uploadType = 'avatar',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [crop, setCrop] = useState<Crop>(() => {
    if (aspectRatio === 1) {
      // Square crop for avatars
      return {
        unit: '%',
        width: 80,
        height: 80,
        x: 10,
        y: 10,
      };
    } else {
      // Rectangular crop for covers (e.g., 3:1 ratio)
      return {
        unit: '%',
        width: 90,
        height: 90 / aspectRatio,
        x: 5,
        y: 5,
      };
    }
  });
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Image size must be less than 15MB');
      return;
    }

    setSelectedFile(file);

    // Reset crop, zoom and rotation when selecting a new file
    if (aspectRatio === 1) {
      // Square crop for avatars
      setCrop({
        unit: '%',
        width: 80,
        height: 80,
        x: 10,
        y: 10,
      });
    } else {
      // Rectangular crop for covers (e.g., 3:1 ratio)
      setCrop({
        unit: '%',
        width: 90,
        height: 90 / aspectRatio,
        x: 5,
        y: 5,
      });
    }
    setZoom(1);
    setRotation(0);
    setActiveTab(0);

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
      setDialogOpen(true);
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle drag and drop functionality
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      // Check if file is defined
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (max 15MB)
      if (file.size > 15 * 1024 * 1024) {
        toast.error('Image size must be less than 15MB');
        return;
      }

      setSelectedFile(file);

      // Reset crop, zoom and rotation when selecting a new file
      if (aspectRatio === 1) {
        // Square crop for avatars
        setCrop({
          unit: '%',
          width: 80,
          height: 80,
          x: 10,
          y: 10,
        });
      } else {
        // Rectangular crop for covers
        setCrop({
          unit: '%',
          width: 90,
          height: 90 / aspectRatio,
          x: 5,
          y: 5,
        });
      }
      setZoom(1);
      setRotation(0);
      setActiveTab(0);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
        setDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Function to generate a cropped image
  const generateCroppedImage = useCallback(async () => {
    if (!imgRef.current || !completedCrop) {
      return null;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return null;
    }

    // Calculate the size of the crop
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    const pixelRatio = window.devicePixelRatio;

    // Set canvas size to the cropped area
    canvas.width = completedCrop.width * scaleX * pixelRatio;
    canvas.height = completedCrop.height * scaleY * pixelRatio;

    // Scale the context to account for device pixel ratio
    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = 'high';

    // Apply rotation if needed
    if (rotation !== 0) {
      ctx.save();
      ctx.translate(canvas.width / (2 * pixelRatio), canvas.height / (2 * pixelRatio));
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-canvas.width / (2 * pixelRatio), -canvas.height / (2 * pixelRatio));
    }

    // Draw the image with the crop
    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    );

    if (rotation !== 0) {
      ctx.restore();
    }

    // Convert canvas to blob
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        'image/jpeg',
        0.95 // Quality
      );
    });
  }, [completedCrop, rotation]);

  // Helper to convert Blob/File to base64 data URL for fallback
  const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);

      let fileToUpload = selectedFile;

      // If we have a crop, use the cropped image
      if (completedCrop && imgRef.current) {
        const croppedBlob = await generateCroppedImage();
        if (croppedBlob) {
          fileToUpload = new File([croppedBlob], selectedFile.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
        }
      }

      // Upload the file
      const response = await api.media.upload(fileToUpload, uploadType);

      // Handle multiple backend response shapes
      // A) Wrapped: { success, data: {...} }
      // B) Unwrapped: { public_id, secure_url, ... }
      const fileData = response?.data ?? response;
      const inner = fileData?.data ?? fileData;
      let imageUrl = inner?.secure_url || inner?.url;

      // Check if we got a data URL and validate its size
      if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('data:')) {
        const sizeInMB = imageUrl.length / (1024 * 1024);
        console.log(`Data URL size: ${sizeInMB.toFixed(2)}MB`);

        // Warn about large data URLs
        if (sizeInMB > 1) {
          console.warn(`Large data URL detected (${sizeInMB.toFixed(2)}MB).`);
        }

        // Reject very large data URLs
        if (sizeInMB > 5) {
          throw new Error('Image is too large (>5MB). Please use a smaller image.');
        }
      }

      if (imageUrl) {
        console.log(`ProfilePictureUpload: Upload successful, ${uploadType} URL:`, imageUrl);

        // Call the onUploadSuccess callback with the new image URL
        onUploadSuccess(imageUrl);

        // Update the local UI immediately to show the new image
        // This ensures the user sees the change right away
        console.log(`ProfilePictureUpload: ${uploadType} updated successfully`);

        // Close dialog first to avoid UI glitches
        handleCloseDialog();

        // Show success toast after dialog is closed
        setTimeout(() => {
          toast.success(uploadType === 'cover' ? 'Cover picture uploaded successfully!' : 'Profile picture uploaded successfully!');
        }, 300);
      } else {
        console.error('ProfilePictureUpload: No avatar URL returned from upload');
        throw new Error(response?.data?.message || 'Upload failed - no URL returned');
      }
    } catch (error: any) {
      console.error('Upload error:', error);

      // If backend returns 500, try base64 fallback to keep UX functional
      const isServerError = error?.response?.status === 500 || String(error?.message || '').includes('status 500');
      if (isServerError) {
        try {
          // Prefer cropped image for fallback; otherwise use selected file
          let fallbackBlob: Blob | null = null;
          if (completedCrop && imgRef.current) {
            fallbackBlob = await generateCroppedImage();
          }
          if (!fallbackBlob) {
            fallbackBlob = selectedFile;
          }

          if (!fallbackBlob) throw new Error('No image available for fallback');

          // Guardrail: avoid very large inline images
          const maxInlineBytes = 5 * 1024 * 1024; // 5MB
          if (fallbackBlob.size > maxInlineBytes) {
            throw new Error('Image is too large for fallback (>5MB). Please use a smaller image.');
          }

          const dataUrl = await blobToDataUrl(fallbackBlob);
          onUploadSuccess(dataUrl);
          handleCloseDialog();
          setTimeout(() => {
            toast.success(uploadType === 'cover' ? 'Cover picture set via fallback.' : 'Profile picture set via fallback.');
          }, 300);
          return; // Exit after successful fallback
        } catch (fallbackErr: any) {
          console.error('Fallback upload failed:', fallbackErr);
          toast.error(handleUploadError(fallbackErr));
        }
      }

      // Show error message using utility function
      toast.error(handleUploadError(error));

      // Close the dialog if it's a critical error
      if (error.message?.includes('too large') || error.response?.status === 413) {
        handleCloseDialog();
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setPreviewUrl(null);
    setSelectedFile(null);
    setCompletedCrop(null);
    setZoom(1);
    setRotation(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemoveAvatar = useCallback(async () => {
    const confirmMessage = uploadType === 'cover'
      ? 'Are you sure you want to remove your cover picture?'
      : 'Are you sure you want to remove your profile picture?';

    if (window.confirm(confirmMessage)) {
      try {
        setIsUploading(true);
        // Call API to remove avatar or set to default
        onUploadSuccess(''); // Pass empty string to indicate removal
        toast.success(uploadType === 'cover' ? 'Cover picture removed successfully' : 'Profile picture removed successfully');
      } catch (error: any) {
        console.error('Remove avatar error:', error);
        toast.error(error.message || (uploadType === 'cover' ? 'Failed to remove cover picture' : 'Failed to remove profile picture'));
      } finally {
        setIsUploading(false);
      }
    }
  }, [onUploadSuccess]);

  const handleZoomChange = useCallback((_event: Event, newValue: number | number[]) => {
    setZoom(newValue as number);
  }, []);

  const handleRotationChange = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);



  return (
    <UploadErrorBoundary
      onError={(error, errorInfo) => {
        console.error('ProfilePictureUpload error boundary caught error:', error, errorInfo);
        // Reset states on error
        setIsUploading(false);
        setDialogOpen(false);
        setSelectedFile(null);
        setPreviewUrl(null);
      }}
    >
      <>
        <Box
          sx={{
            position: 'relative',
            display: 'inline-block',
            cursor: showUploadButton ? 'pointer' : 'default',
          }}
          onClick={showUploadButton && !disabled ? triggerFileSelect : undefined}
        >
          <UserAvatar
            src={user?.avatar || undefined}
            alt={user?.displayName || user?.username || 'User'}
            size={size >= 120 ? 'large' : size >= 80 ? 'medium' : 'small'}
            sx={{
              width: size,
              height: size,
              position: 'relative',
              zIndex: 1,
            }}
          />

          {showUploadButton && (
            <Tooltip title="Change profile picture">
              <IconButton
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  bgcolor: 'primary.main',
                  color: 'white',
                  width: size * 0.25,
                  height: size * 0.25,
                  minWidth: 24,
                  minHeight: 24,
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  zIndex: 10,
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerFileSelect();
                }}
                disabled={isUploading || disabled}
              >
                {isUploading ? (
                  <CircularProgress size={size * 0.12} color="inherit" />
                ) : (
                  <Camera size={size * 0.12} />
                )}
              </IconButton>
            </Tooltip>
          )}

          {allowRemove && user?.avatar && (
            <Tooltip title="Remove profile picture">
              <IconButton
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  bgcolor: 'error.main',
                  color: 'white',
                  width: size * 0.25,
                  height: size * 0.25,
                  minWidth: 24,
                  minHeight: 24,
                  '&:hover': {
                    bgcolor: 'error.dark',
                  },
                  zIndex: 10,
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveAvatar();
                }}
                disabled={isUploading}
              >
                <Trash2 size={size * 0.12} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* Enhanced Preview Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              height: isMobile ? 'auto' : '80vh',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }
          }}
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">
                {uploadType === 'cover' ? 'Update Cover Picture' : 'Update Profile Picture'}
              </Typography>
              <IconButton onClick={handleCloseDialog} size="small">
                <X size={20} />
              </IconButton>
            </Box>
          </DialogTitle>

          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab icon={<ImageIcon size={16} />} label="Edit" iconPosition="start" />
            <Tab icon={<Camera size={16} />} label="Preview" iconPosition="start" />
          </Tabs>

          <DialogContent sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            {activeTab === 0 && previewUrl && (
              <Box display="flex" flexDirection="column" alignItems="center" gap={3} sx={{ flex: 1 }}>
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={aspectRatio}
                    circularCrop={aspectRatio === 1}
                  >
                    <img
                      ref={imgRef}
                      src={previewUrl}
                      alt="Preview"
                      style={{
                        maxHeight: '60vh',
                        maxWidth: '100%',
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        transition: 'transform 0.2s ease-in-out',
                      }}
                    />
                  </ReactCrop>
                </Box>

                <Paper elevation={0} variant="outlined" sx={{ p: 2, width: '100%' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Zoom
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2}>
                    <ZoomOut size={16} />
                    <Slider
                      value={zoom}
                      onChange={handleZoomChange}
                      min={0.5}
                      max={3}
                      step={0.1}
                      aria-labelledby="zoom-slider"
                    />
                    <ZoomIn size={16} />
                  </Box>

                  <Box display="flex" alignItems="center" justifyContent="space-between" mt={2}>
                    <Button
                      variant="outlined"
                      startIcon={<RefreshCw size={16} />}
                      onClick={handleRotationChange}
                    >
                      Rotate
                    </Button>

                    <Typography variant="caption" color="text.secondary">
                      Drag to reposition • Scroll to zoom
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            )}

            {activeTab === 1 && previewUrl && completedCrop && (
              <Box display="flex" flexDirection="column" alignItems="center" gap={3}>
                <Box
                  sx={{
                    width: 200,
                    height: 200,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: 2,
                    borderColor: 'divider',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'none',
                    }}
                  />
                  <img
                    src={previewUrl}
                    alt="Preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    }}
                  />
                </Box>

                <Alert severity="info" sx={{ width: '100%' }}>
                  <Typography variant="body2">
                    • Image will be automatically resized and cropped to fit
                    • Supported formats: JPG, PNG, GIF, WebP
                    • Maximum file size: 15MB
                  </Typography>
                </Alert>

                {selectedFile && (
                  <Box sx={{ width: '100%' }}>
                    <Typography variant="body2" color="text.secondary">
                      File: {selectedFile.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {!previewUrl && (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  border: '2px dashed',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
                onClick={triggerFileSelect}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <Upload size={48} color={theme.palette.text.secondary} />
                <Typography variant="h6" sx={{ mt: 2 }}>
                  Drag & drop an image here
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  or click to browse files
                </Typography>
                <Button
                  variant="outlined"
                  sx={{ mt: 3 }}
                  startIcon={<Upload size={16} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerFileSelect();
                  }}
                >
                  Select Image
                </Button>
              </Box>
            )}
          </DialogContent>

          <DialogActions>
            <Button onClick={handleCloseDialog} disabled={isUploading}>
              Cancel
            </Button>
            {previewUrl && (
              <>
                <Button
                  onClick={triggerFileSelect}
                  variant="outlined"
                  startIcon={<Upload size={16} />}
                  disabled={isUploading}
                >
                  Choose Different Image
                </Button>
                <Button
                  onClick={handleUpload}
                  variant="contained"
                  disabled={isUploading || !selectedFile}
                  startIcon={isUploading ? <CircularProgress size={16} /> : <Camera size={16} />}
                >
                  {isUploading ? 'Uploading...' : 'Update Picture'}
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>
      </>
    </UploadErrorBoundary>
  );
};

export default ProfilePictureUpload;