import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Switch,
  Slider,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  Divider,
  Alert,
  Chip,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Settings,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Wifi,
  Smartphone,
  Monitor,
  RotateCcw,
  Save,
  X,
  Info,
} from 'lucide-react';
import { VideoAutoscrollSettings } from '@/hooks/useVideoAutoscroll';
import { useVideoFeed } from './VideoFeedManager';
import toast from 'react-hot-toast';

interface VideoSettingsProps {
  open: boolean;
  onClose: () => void;
}

export const VideoSettings: React.FC<VideoSettingsProps> = ({ open, onClose }) => {
  const { settings, updateSettings, getVideoStats } = useVideoFeed();
  const [localSettings, setLocalSettings] = useState<VideoAutoscrollSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  const stats = getVideoStats();

  // Handle setting changes
  const handleSettingChange = (key: keyof VideoAutoscrollSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Save settings
  const handleSave = () => {
    updateSettings(localSettings);
    setHasChanges(false);
    toast.success('Video settings saved');
    onClose();
  };

  // Reset to defaults
  const handleReset = () => {
    const defaultSettings: VideoAutoscrollSettings = {
      enabled: true,
      threshold: 0.6,
      pauseOnScroll: true,
      muteByDefault: true,
      preloadStrategy: 'metadata',
      maxConcurrentVideos: 2,
      scrollPauseDelay: 150,
      viewTrackingThreshold: 3,
      autoplayOnlyOnWifi: false,
      respectReducedMotion: true,
    };
    
    setLocalSettings(defaultSettings);
    setHasChanges(true);
    toast.success('Settings reset to defaults');
  };

  // Cancel changes
  const handleCancel = () => {
    setLocalSettings(settings);
    setHasChanges(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Settings size={24} />
            <Typography variant="h6">Video Settings</Typography>
          </Box>
          <IconButton onClick={handleCancel} size="small">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ py: 1 }}>
          {/* Stats Overview */}
          <Card sx={{ mb: 3, bgcolor: 'background.default' }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Current Session Stats
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">
                      {stats.totalVideos}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total Videos
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main">
                      {stats.playingVideos}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Playing
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="info.main">
                      {stats.visibleVideos}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Visible
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="warning.main">
                      {Math.floor(stats.totalViewTime / 60)}m
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Watch Time
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Autoplay Settings */}
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              Autoplay Settings
            </Typography>
            
            <Box mb={2}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body1">Enable Autoplay</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Automatically play videos when they come into view
                  </Typography>
                </Box>
                <Switch
                  checked={localSettings.enabled}
                  onChange={(e) => handleSettingChange('enabled', e.target.checked)}
                />
              </Box>
            </Box>

            <Box mb={2}>
              <Typography variant="body2" gutterBottom>
                Visibility Threshold: {Math.round(localSettings.threshold * 100)}%
              </Typography>
              <Slider
                value={localSettings.threshold}
                onChange={(_, value) => handleSettingChange('threshold', value)}
                min={0.1}
                max={1}
                step={0.1}
                marks={[
                  { value: 0.25, label: '25%' },
                  { value: 0.5, label: '50%' },
                  { value: 0.75, label: '75%' },
                  { value: 1, label: '100%' },
                ]}
                disabled={!localSettings.enabled}
              />
              <Typography variant="caption" color="text.secondary">
                How much of the video must be visible before autoplay starts
              </Typography>
            </Box>

            <Box mb={2}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body1">Pause on Scroll</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Pause videos while scrolling
                  </Typography>
                </Box>
                <Switch
                  checked={localSettings.pauseOnScroll}
                  onChange={(e) => handleSettingChange('pauseOnScroll', e.target.checked)}
                  disabled={!localSettings.enabled}
                />
              </Box>
            </Box>

            {localSettings.pauseOnScroll && (
              <Box mb={2}>
                <Typography variant="body2" gutterBottom>
                  Scroll Pause Delay: {localSettings.scrollPauseDelay}ms
                </Typography>
                <Slider
                  value={localSettings.scrollPauseDelay}
                  onChange={(_, value) => handleSettingChange('scrollPauseDelay', value)}
                  min={50}
                  max={500}
                  step={50}
                  marks={[
                    { value: 100, label: '100ms' },
                    { value: 250, label: '250ms' },
                    { value: 400, label: '400ms' },
                  ]}
                  disabled={!localSettings.enabled}
                />
                <Typography variant="caption" color="text.secondary">
                  How long to wait after scrolling stops before resuming autoplay
                </Typography>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Audio Settings */}
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              Audio Settings
            </Typography>
            
            <Box mb={2}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body1">Mute by Default</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Start videos muted to prevent unexpected audio
                  </Typography>
                </Box>
                <Switch
                  checked={localSettings.muteByDefault}
                  onChange={(e) => handleSettingChange('muteByDefault', e.target.checked)}
                />
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Performance Settings */}
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              Performance Settings
            </Typography>

            <Box mb={2}>
              <FormControl component="fieldset">
                <FormLabel component="legend">Preload Strategy</FormLabel>
                <RadioGroup
                  value={localSettings.preloadStrategy}
                  onChange={(e) => handleSettingChange('preloadStrategy', e.target.value)}
                  row
                >
                  <FormControlLabel
                    value="none"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body2">None</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Save bandwidth
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="metadata"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body2">Metadata</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Balanced
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="auto"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body2">Auto</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Faster playback
                        </Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>
            </Box>

            <Box mb={2}>
              <Typography variant="body2" gutterBottom>
                Max Concurrent Videos: {localSettings.maxConcurrentVideos}
              </Typography>
              <Slider
                value={localSettings.maxConcurrentVideos}
                onChange={(_, value) => handleSettingChange('maxConcurrentVideos', value)}
                min={1}
                max={5}
                step={1}
                marks={[
                  { value: 1, label: '1' },
                  { value: 2, label: '2' },
                  { value: 3, label: '3' },
                  { value: 5, label: '5' },
                ]}
              />
              <Typography variant="caption" color="text.secondary">
                Maximum number of videos that can play simultaneously
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Network & Accessibility */}
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              Network & Accessibility
            </Typography>

            <Box mb={2}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body1">WiFi Only Autoplay</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Only autoplay on WiFi connections to save mobile data
                  </Typography>
                </Box>
                <Switch
                  checked={localSettings.autoplayOnlyOnWifi}
                  onChange={(e) => handleSettingChange('autoplayOnlyOnWifi', e.target.checked)}
                />
              </Box>
            </Box>

            <Box mb={2}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body1">Respect Reduced Motion</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Disable autoplay for users who prefer reduced motion
                  </Typography>
                </Box>
                <Switch
                  checked={localSettings.respectReducedMotion}
                  onChange={(e) => handleSettingChange('respectReducedMotion', e.target.checked)}
                />
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* View Tracking */}
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              View Tracking
            </Typography>

            <Box mb={2}>
              <Typography variant="body2" gutterBottom>
                View Threshold: {localSettings.viewTrackingThreshold} seconds
              </Typography>
              <Slider
                value={localSettings.viewTrackingThreshold}
                onChange={(_, value) => handleSettingChange('viewTrackingThreshold', value)}
                min={1}
                max={10}
                step={1}
                marks={[
                  { value: 1, label: '1s' },
                  { value: 3, label: '3s' },
                  { value: 5, label: '5s' },
                  { value: 10, label: '10s' },
                ]}
              />
              <Typography variant="caption" color="text.secondary">
                How long a video must be watched to count as a view
              </Typography>
            </Box>
          </Box>

          {/* Warnings */}
          {localSettings.preloadStrategy === 'auto' && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Auto preload may consume more bandwidth and battery on mobile devices.
              </Typography>
            </Alert>
          )}

          {localSettings.maxConcurrentVideos > 3 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Playing many videos simultaneously may impact performance on slower devices.
              </Typography>
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Box display="flex" justifyContent="space-between" width="100%">
          <Button
            onClick={handleReset}
            startIcon={<RotateCcw size={16} />}
            color="warning"
          >
            Reset to Defaults
          </Button>
          
          <Box display="flex" gap={1}>
            <Button onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              startIcon={<Save size={16} />}
              disabled={!hasChanges}
            >
              Save Settings
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default VideoSettings;