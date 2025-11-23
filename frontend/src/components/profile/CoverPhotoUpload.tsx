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
  Slider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Image as ImageIcon, Upload, X, ZoomIn, ZoomOut, RefreshCw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactCrop, { Crop } from 'react-image-crop';
import { api } from '@/lib/api';
import { User } from '@/types/social';

interface CoverPhotoUploadProps {
  user: User | null;
  onUploadSuccess: (coverUrl: string) => void;
  height?: number;
  disabled?: boolean;
  allowRemove?: boolean;
}

const CoverPhotoUpload: React.FC<CoverPhotoUploadProps> = ({
  user,
  onUploadSuccess,
  height = 200,
  disabled = false,
  allowRemove = true,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [crop, setCrop] = useState<Crop>({ unit: '%', width: 100, height: 40, x: 0, y: 30 });
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerFileSelect = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image size must be less than 20MB');
      return;
    }
    setSelectedFile(file);
    setCrop({ unit: '%', width: 100, height: 40, x: 0, y: 30 });
    setCompletedCrop(null);
    setZoom(1);
    setRotation(0);

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
      setDialogOpen(true);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleZoomChange = useCallback((_e: Event, newValue: number | number[]) => {
    setZoom(newValue as number);
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setPreviewUrl(null);
    setSelectedFile(null);
    setCompletedCrop(null);
    setZoom(1);
    setRotation(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // Generate a cropped image Blob considering crop, zoom, and rotation
  const generateCroppedImage = useCallback(async (): Promise<Blob | null> => {
    if (!imgRef.current || !completedCrop) return null;

    const image = imgRef.current;

    // Compute scale between displayed image and natural size
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Crop rect in pixels on the original image
    const cropX = completedCrop.x * scaleX;
    const cropY = completedCrop.y * scaleY;
    const cropW = completedCrop.width * scaleX;
    const cropH = completedCrop.height * scaleY;

    // Create an offscreen canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(cropW * pixelRatio);
    canvas.height = Math.floor(cropH * pixelRatio);

    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = 'high';

    // For rotation, draw the original image onto a temp canvas then copy the crop area
    if (rotation !== 0) {
      // Create a temp canvas large enough for rotation
      const tempCanvas = document.createElement('canvas');
      const tctx = tempCanvas.getContext('2d');
      if (!tctx) return null;

      // Use the full original image as base for rotation
      tempCanvas.width = image.naturalWidth;
      tempCanvas.height = image.naturalHeight;

      // Apply rotation around the image center
      tctx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
      tctx.rotate((rotation * Math.PI) / 180);
      tctx.translate(-tempCanvas.width / 2, -tempCanvas.height / 2);

      // Draw the original image at scale (zoom is visual only, we keep original quality)
      tctx.drawImage(image, 0, 0);

      // Now copy the crop rectangle from the rotated image into final canvas at 0,0
      ctx.drawImage(
        tempCanvas,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        cropW,
        cropH
      );
    } else {
      // No rotation: draw directly from the original image
      ctx.drawImage(
        image,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        cropW,
        cropH
      );
    }

    // Convert to JPEG blob
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95);
    });
  }, [completedCrop, rotation]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    try {
      setIsUploading(true);

      let fileToUpload: File | Blob = selectedFile;

      // If crop was completed, use cropped image
      if (completedCrop && imgRef.current) {
        const croppedBlob = await generateCroppedImage();
        if (croppedBlob) {
          fileToUpload = new File([croppedBlob], selectedFile.name.replace(/\.[^.]+$/, '') + '.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
        }
      }

      const response = await api.media.upload(fileToUpload as File, 'cover');
      const fileData = (response as any)?.data ?? response;
      const inner = fileData?.data ?? fileData;
      const coverUrl = inner?.secure_url || inner?.url;
      if (!coverUrl) throw new Error('Upload failed - no URL returned');

      onUploadSuccess(coverUrl);
      handleCloseDialog();
      toast.success('Cover photo updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to upload cover');
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, completedCrop, generateCroppedImage, onUploadSuccess, handleCloseDialog]);

  const handleRemove = useCallback(async () => {
    if (!allowRemove) return;
    const confirmed = window.confirm('Remove your cover photo?');
    if (!confirmed) return;
    try {
      setIsUploading(true);
      // Call dedicated remove endpoint for server-side validation and persistence
      await api.auth.removeCover();
      onUploadSuccess('');
      toast.success('Cover photo removed');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to remove cover');
    } finally {
      setIsUploading(false);
    }
  }, [allowRemove, onUploadSuccess]);

  const handleResetAdjustments = useCallback(() => {
    setCrop({ unit: '%', width: 100, height: 40, x: 0, y: 30 });
    setCompletedCrop(null);
    setZoom(1);
    setRotation(0);
  }, []);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Top-right overlay controls on the cover area */}
      <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10, display: 'flex', gap: 1 }}>
        {allowRemove && (
          <Tooltip title="Remove cover photo">
            <span>
              <IconButton
                onClick={(e) => { e.stopPropagation(); handleRemove(); }}
                disabled={isUploading || disabled}
                color="error"
                size={isMobile ? 'small' : 'medium'}
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 1)',
                  },
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                }}
              >
                {isUploading ? <CircularProgress size={18} /> : <Trash2 size={18} />}
              </IconButton>
            </span>
          </Tooltip>
        )}
        <Tooltip title="Change cover photo">
          <span>
            <IconButton
              onClick={(e) => { e.stopPropagation(); triggerFileSelect(); }}
              disabled={isUploading || disabled}
              color="primary"
              size={isMobile ? 'small' : 'medium'}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.9)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 1)',
                },
                pointerEvents: 'auto',
                cursor: 'pointer',
              }}
            >
              {isUploading ? <CircularProgress size={18} /> : <ImageIcon size={18} />}
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Update Cover Photo</Typography>
            <IconButton onClick={handleCloseDialog} size="small"><X size={18} /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {previewUrl && (
            <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
              <Box sx={{ width: '100%', overflow: 'hidden' }}>
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={5}
                >
                  {/* We apply visual zoom via CSS transform for UX; actual crop uses natural image */}
                  <img
                    ref={imgRef}
                    src={previewUrl}
                    alt="Cover preview"
                    style={{
                      width: '100%',
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transformOrigin: 'center center',
                      transition: 'transform 0.2s ease-in-out',
                    }}
                  />
                </ReactCrop>
              </Box>

              {/* Controls */}
              <Box display="flex" alignItems="center" justifyContent="space-between" gap={2} width="100%">
                <Box display="flex" alignItems="center" gap={2} flex={1}>
                  <ZoomOut size={16} />
                  <Slider value={zoom} onChange={handleZoomChange} min={0.5} max={3} step={0.1} />
                  <ZoomIn size={16} />
                </Box>
                <Tooltip title="Rotate 90°">
                  <span>
                    <IconButton onClick={handleRotate} disabled={isUploading}>
                      <RefreshCw size={18} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Reset">
                  <span>
                    <IconButton onClick={handleResetAdjustments} disabled={isUploading}>
                      <X size={18} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isUploading}>Cancel</Button>
          <Button onClick={triggerFileSelect} variant="outlined" disabled={isUploading} startIcon={<Upload size={16} />}>Choose Different Image</Button>
          <Button onClick={handleUpload} variant="contained" disabled={isUploading || !selectedFile} startIcon={isUploading ? <CircularProgress size={16} /> : <ImageIcon size={16} />}>Update Cover</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CoverPhotoUpload;