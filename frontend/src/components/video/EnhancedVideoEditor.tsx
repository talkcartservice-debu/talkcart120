import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Slider,
  IconButton,
  Tooltip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  LinearProgress,
  Chip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Scissors,
  Palette,
  Volume2,
  VolumeX,
  RotateCcw,
  Crop,
  Filter,
  Sun,
  Contrast,
  Save,
  Undo,
  Redo,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface VideoEditorProps {
  videoFile: File;
  videoUrl: string;
  onSaveEdits: (editedVideoData: any) => void;
  onCancel: () => void;
}

interface VideoEffect {
  id: string;
  name: string;
  filter: string;
  icon: React.ReactNode;
}

const videoEffects: VideoEffect[] = [
  { id: 'none', name: 'Original', filter: 'none', icon: <Filter /> },
  { id: 'sepia', name: 'Sepia', filter: 'sepia(100%)', icon: <Palette /> },
  { id: 'grayscale', name: 'B&W', filter: 'grayscale(100%)', icon: <Filter /> },
  { id: 'blur', name: 'Blur', filter: 'blur(2px)', icon: <Filter /> },
  { id: 'brightness', name: 'Bright', filter: 'brightness(1.3)', icon: <Sun /> },
  { id: 'contrast', name: 'Contrast', filter: 'contrast(1.5)', icon: <Contrast /> },
  { id: 'vintage', name: 'Vintage', filter: 'sepia(50%) contrast(1.2) brightness(1.1)', icon: <Palette /> },
  { id: 'cool', name: 'Cool', filter: 'hue-rotate(90deg) saturate(1.2)', icon: <Filter /> },
];

export const EnhancedVideoEditor: React.FC<VideoEditorProps> = ({
  videoFile,
  videoUrl,
  onSaveEdits,
  onCancel,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Trim controls
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [isTrimMode, setIsTrimMode] = useState(false);
  
  // Effects
  const [selectedEffect, setSelectedEffect] = useState('none');
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [saturation, setSaturation] = useState(1);
  const [customFilter, setCustomFilter] = useState('');
  
  // History for undo/redo
  const [editHistory, setEditHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setTrimEnd(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  // Update video filter in real-time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let filter = '';
    
    if (selectedEffect !== 'none') {
      const effect = videoEffects.find(e => e.id === selectedEffect);
      filter = effect?.filter || '';
    }

    // Add custom adjustments
    const adjustments = [
      `brightness(${brightness})`,
      `contrast(${contrast})`,
      `saturate(${saturation})`,
    ].join(' ');

    video.style.filter = filter ? `${filter} ${adjustments}` : adjustments;
  }, [selectedEffect, brightness, contrast, saturation]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = value;
    setCurrentTime(value);
  };

  const handleVolumeChange = (value: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = value;
    setVolume(value);
    setIsMuted(value === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume > 0 ? volume : 0.5;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const skipTime = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const setTrimPoint = (type: 'start' | 'end') => {
    if (type === 'start') {
      setTrimStart(currentTime);
    } else {
      setTrimEnd(currentTime);
    }
  };

  const previewTrim = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = trimStart;
    video.play();
    setIsPlaying(true);

    // Stop at trim end
    const interval = setInterval(() => {
      if (video.currentTime >= trimEnd) {
        video.pause();
        setIsPlaying(false);
        clearInterval(interval);
      }
    }, 100);
  };

  const saveEditState = () => {
    const state = {
      trimStart,
      trimEnd,
      selectedEffect,
      brightness,
      contrast,
      saturation,
      volume,
      timestamp: Date.now(),
    };

    const newHistory = editHistory.slice(0, historyIndex + 1);
    newHistory.push(state);
    setEditHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevState = editHistory[historyIndex - 1];
      applyEditState(prevState);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < editHistory.length - 1) {
      const nextState = editHistory[historyIndex + 1];
      applyEditState(nextState);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const applyEditState = (state: any) => {
    setTrimStart(state.trimStart);
    setTrimEnd(state.trimEnd);
    setSelectedEffect(state.selectedEffect);
    setBrightness(state.brightness);
    setContrast(state.contrast);
    setSaturation(state.saturation);
    setVolume(state.volume);
  };

  const resetEdits = () => {
    setTrimStart(0);
    setTrimEnd(duration);
    setSelectedEffect('none');
    setBrightness(1);
    setContrast(1);
    setSaturation(1);
    setVolume(1);
    setIsMuted(false);
    setEditHistory([]);
    setHistoryIndex(-1);
  };

  const handleSaveEdits = async () => {
    setIsProcessing(true);
    
    try {
      let processedFile = videoFile;
      let processedURL = videoUrl;
      
      // Check if we need to actually trim the video
      const needsTrimming = trimStart > 0 || trimEnd < duration;
      const hasVisualEffects = selectedEffect !== 'none' || brightness !== 1 || contrast !== 1 || saturation !== 1;
      
      if (needsTrimming || hasVisualEffects) {
        toast.loading('Processing video with your edits...', { id: 'video-processing' });
        
        // Create trimmed/edited video using client-side processing
        const processedVideoData = await processVideoWithEdits();
        
        if (processedVideoData) {
          processedFile = processedVideoData.file;
          processedURL = processedVideoData.url;
          toast.success('Video successfully processed with edits! 🎬', { id: 'video-processing' });
        }
      }

      const editData = {
        originalFile: videoFile,
        processedFile: processedFile,
        processedURL: processedURL,
        edits: {
          trim: { start: trimStart, end: trimEnd },
          effects: {
            filter: selectedEffect,
            brightness,
            contrast,
            saturation,
          },
          audio: {
            volume,
            muted: isMuted,
          },
        },
        duration: trimEnd - trimStart,
        originalDuration: duration,
        hasChanges: needsTrimming || hasVisualEffects || volume !== 1,
        wasProcessed: needsTrimming || hasVisualEffects,
      };

      onSaveEdits(editData);
      
    } catch (error) {
      console.error('Error saving video edits:', error);
      toast.error('Failed to save video edits', { id: 'video-processing' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Process video with actual trimming and effects
  const processVideoWithEdits = async (): Promise<{file: File, url: string} | null> => {
    return new Promise((resolve, reject) => {
      const video = videoRef.current;
      if (!video) {
        reject(new Error('No video element'));
        return;
      }

      // Create canvas for video processing
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Cannot create canvas context'));
        return;
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      // MediaRecorder setup for creating new video file
      const stream = canvas.captureStream(30); // 30 FPS
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const trimmedFile = new File([blob], `trimmed_${videoFile.name}`, { type: 'video/webm' });
        const trimmedURL = URL.createObjectURL(blob);
        
        resolve({ file: trimmedFile, url: trimmedURL });
      };

      mediaRecorder.onerror = (error) => {
        reject(error);
      };

      // Start recording
      mediaRecorder.start();

      // Set video to trim start point
      video.currentTime = trimStart;
      video.muted = true; // Prevent audio feedback during processing
      
      video.addEventListener('seeked', function onSeeked() {
        video.removeEventListener('seeked', onSeeked);
        video.play();

        const startTime = Date.now();
        const targetDuration = (trimEnd - trimStart) * 1000; // Convert to milliseconds

        // Render video frames with effects
        const renderFrame = () => {
          if (video.currentTime >= trimEnd || Date.now() - startTime >= targetDuration) {
            video.pause();
            mediaRecorder.stop();
            video.muted = isMuted; // Restore original mute state
            return;
          }

          // Apply visual effects to canvas
          ctx.filter = getCanvasFilter();
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          requestAnimationFrame(renderFrame);
        };

        renderFrame();
      });
    });
  };

  // Get CSS filter string for canvas rendering
  const getCanvasFilter = (): string => {
    const effects = videoEffects.find(effect => effect.id === selectedEffect);
    let filter = effects?.filter || 'none';

    // Add brightness, contrast, saturation
    if (brightness !== 1) {
      filter += ` brightness(${brightness})`;
    }
    if (contrast !== 1) {
      filter += ` contrast(${contrast})`;
    }
    if (saturation !== 1) {
      filter += ` saturate(${saturation})`;
    }

    return filter;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Video Editor
          </Typography>

          {/* Video Preview */}
          <Box sx={{ position: 'relative', mb: 3 }}>
            <video
              ref={videoRef}
              src={videoUrl}
              style={{
                width: '100%',
                maxHeight: 400,
                borderRadius: 8,
                backgroundColor: '#000',
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            
            {/* Trim indicators */}
            {isTrimMode && (
              <Box sx={{ 
                position: 'absolute', 
                bottom: 8, 
                left: 8, 
                right: 8, 
                display: 'flex',
                gap: 1,
              }}>
                <Chip 
                  label={`Start: ${formatTime(trimStart)}`} 
                  size="small" 
                  color="primary"
                />
                <Chip 
                  label={`End: ${formatTime(trimEnd)}`} 
                  size="small" 
                  color="secondary"
                />
                <Chip 
                  label={`Duration: ${formatTime(trimEnd - trimStart)}`} 
                  size="small" 
                  variant="outlined"
                />
              </Box>
            )}
          </Box>

          {/* Video Controls */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <IconButton onClick={() => skipTime(-10)}>
                  <SkipBack />
                </IconButton>
              </Grid>
              
              <Grid item>
                <IconButton onClick={togglePlayPause} size="large">
                  {isPlaying ? <Pause /> : <Play />}
                </IconButton>
              </Grid>
              
              <Grid item>
                <IconButton onClick={() => skipTime(10)}>
                  <SkipForward />
                </IconButton>
              </Grid>

              <Grid item xs>
                <Slider
                  value={currentTime}
                  onChange={(_, value) => handleSeek(value as number)}
                  max={duration}
                  step={0.1}
                  valueLabelDisplay="auto"
                  valueLabelFormat={formatTime}
                />
              </Grid>

              <Grid item>
                <IconButton onClick={toggleMute}>
                  {isMuted ? <VolumeX /> : <Volume2 />}
                </IconButton>
              </Grid>

              <Grid item sx={{ width: 100 }}>
                <Slider
                  value={isMuted ? 0 : volume}
                  onChange={(_, value) => handleVolumeChange(value as number)}
                  max={1}
                  step={0.1}
                  size="small"
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {formatTime(currentTime)} / {formatTime(duration)}
              </Typography>
            </Box>
          </Paper>

          {/* Editing Tools */}
          <Grid container spacing={2}>
            {/* Trim Controls */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Trim Video
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={isTrimMode}
                      onChange={(e) => setIsTrimMode(e.target.checked)}
                    />
                  }
                  label="Enable Trimming"
                />

                {isTrimMode && (
                  <Box sx={{ mt: 2 }}>
                    {/* Trim Summary */}
                    <Box sx={{ 
                      mb: 2, 
                      p: 1.5, 
                      background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(69, 160, 73, 0.1))',
                      borderRadius: 1,
                      border: '1px solid rgba(76, 175, 80, 0.2)',
                    }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#4CAF50' }}>
                        ✂️ Trim Summary:
                      </Typography>
                      <Typography variant="body2">
                        Original: {formatTime(duration)} → Trimmed: {formatTime(trimEnd - trimStart)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Removing {formatTime(trimStart + (duration - trimEnd))} total
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setTrimPoint('start')}
                        startIcon={<Scissors />}
                        color={trimStart > 0 ? 'primary' : 'inherit'}
                      >
                        Set Start ({formatTime(currentTime)})
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setTrimPoint('end')}
                        startIcon={<Scissors />}
                        color={trimEnd < duration ? 'primary' : 'inherit'}
                      >
                        Set End ({formatTime(currentTime)})
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={previewTrim}
                        startIcon={<Play />}
                        disabled={trimStart >= trimEnd}
                      >
                        Preview Trim
                      </Button>
                    </Box>

                    <Typography variant="body2" gutterBottom>
                      Start Time: {formatTime(trimStart)} 
                      {trimStart > 0 && <Chip size="small" label="✂️ Cut" color="primary" sx={{ ml: 1, height: 16 }} />}
                    </Typography>
                    <Slider
                      value={trimStart}
                      onChange={(_, value) => {
                        const newStart = value as number;
                        if (newStart < trimEnd) setTrimStart(newStart);
                      }}
                      max={trimEnd - 0.1}
                      step={0.1}
                      size="small"
                      sx={{
                        '& .MuiSlider-track': {
                          background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
                        }
                      }}
                    />

                    <Typography variant="body2" gutterBottom sx={{ mt: 1 }}>
                      End Time: {formatTime(trimEnd)}
                      {trimEnd < duration && <Chip size="small" label="✂️ Cut" color="primary" sx={{ ml: 1, height: 16 }} />}
                    </Typography>
                    <Slider
                      value={trimEnd}
                      onChange={(_, value) => {
                        const newEnd = value as number;
                        if (newEnd > trimStart) setTrimEnd(newEnd);
                      }}
                      min={trimStart + 0.1}
                      max={duration}
                      step={0.1}
                      size="small"
                      sx={{
                        '& .MuiSlider-track': {
                          background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
                        }
                      }}
                    />

                    {/* Trim Validation */}
                    {trimStart >= trimEnd && (
                      <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                        ⚠️ Start time must be before end time
                      </Typography>
                    )}
                    
                    {(trimEnd - trimStart) < 1 && trimStart !== trimEnd && (
                      <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
                        ⚠️ Video will be very short ({formatTime(trimEnd - trimStart)})
                      </Typography>
                    )}
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Effects & Filters */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Effects & Filters
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {videoEffects.map((effect) => (
                    <Button
                      key={effect.id}
                      size="small"
                      variant={selectedEffect === effect.id ? 'contained' : 'outlined'}
                      onClick={() => setSelectedEffect(effect.id)}
                      startIcon={effect.icon}
                    >
                      {effect.name}
                    </Button>
                  ))}
                </Box>

                <Typography variant="body2" gutterBottom>
                  Brightness: {brightness.toFixed(1)}
                </Typography>
                <Slider
                  value={brightness}
                  onChange={(_, value) => setBrightness(value as number)}
                  min={0.5}
                  max={2}
                  step={0.1}
                  size="small"
                />

                <Typography variant="body2" gutterBottom sx={{ mt: 1 }}>
                  Contrast: {contrast.toFixed(1)}
                </Typography>
                <Slider
                  value={contrast}
                  onChange={(_, value) => setContrast(value as number)}
                  min={0.5}
                  max={2}
                  step={0.1}
                  size="small"
                />

                <Typography variant="body2" gutterBottom sx={{ mt: 1 }}>
                  Saturation: {saturation.toFixed(1)}
                </Typography>
                <Slider
                  value={saturation}
                  onChange={(_, value) => setSaturation(value as number)}
                  min={0}
                  max={2}
                  step={0.1}
                  size="small"
                />
              </Paper>
            </Grid>
          </Grid>

          {/* Processing Indicator */}
          {isProcessing && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                Processing video edits...
              </Typography>
            </Box>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Undo">
                <IconButton 
                  onClick={undo} 
                  disabled={historyIndex <= 0}
                >
                  <Undo />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Redo">
                <IconButton 
                  onClick={redo} 
                  disabled={historyIndex >= editHistory.length - 1}
                >
                  <Redo />
                </IconButton>
              </Tooltip>

              <Tooltip title="Reset All">
                <IconButton onClick={resetEdits}>
                  <RotateCcw />
                </IconButton>
              </Tooltip>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button onClick={onCancel} disabled={isProcessing}>
                Cancel
              </Button>
              
              <Button
                variant="contained"
                onClick={handleSaveEdits}
                disabled={isProcessing}
                startIcon={<Save />}
              >
                {isProcessing ? 'Processing...' : 'Save Edits'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};