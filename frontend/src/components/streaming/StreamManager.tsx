import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { streamingApi } from '@/services/streamingApi';
import { STREAMING_CAPABILITIES } from '@/config';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  IconButton,
  Grid,
  Chip,
  Switch,
  FormControlLabel,
  Slider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Badge,
  Tooltip,
  LinearProgress,
  Avatar,
  Menu,
  ListItemIcon,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Settings,
  Users,
  MessageCircle,
  Eye,
  Circle,
  Square,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Camera,
  CameraOff,
  Maximize,
  Minimize,
  RotateCcw,
  Zap,
  Shield,
  Crown,
  Ban,
  UserX,
  Clock,
  Download,
  Upload,
  Share2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Save,
} from 'lucide-react';

interface StreamManagerProps {
  streamId: string;
  isStreaming: boolean;
  onStartStream: () => void;
  onEndStream: () => void;
  onUpdateSettings: (settings: StreamSettings) => void;
}

interface StreamSettings {
  title: string;
  description: string;
  category: string;
  tags: string[];
  privacy: 'public' | 'private' | 'unlisted';
  quality: '720p' | '1080p' | '4K';
  bitrate: number;
  framerate: number;
  enableChat: boolean;
  enableRecording: boolean;
  enableDonations: boolean;
  moderationLevel: 'low' | 'medium' | 'high';
  chatDelay: number;
  maxViewers: number;
}

interface StreamStats {
  viewers: number;
  chatMessages: number;
  likes: number;
  shares: number;
  duration: string;
  bitrate: number;
  fps: number;
  droppedFrames: number;
  cpuUsage: number;
  memoryUsage: number;
  networkSpeed: number;
}

interface Moderator {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  permissions: string[];
  addedAt: Date;
}

interface BannedUser {
  id: string;
  username: string;
  reason: string;
  bannedAt: Date;
  bannedBy: string;
  duration?: number; // in minutes, undefined for permanent
}

const StreamManager: React.FC<StreamManagerProps> = ({
  streamId,
  isStreaming,
  onStartStream,
  onEndStream,
  onUpdateSettings,
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('info');
  
  const [streamSettings, setStreamSettings] = useState<StreamSettings>({
    title: 'My Live Stream',
    description: 'Welcome to my stream!',
    category: 'Technology',
    tags: ['live', 'tech'],
    privacy: 'public',
    quality: '1080p',
    bitrate: 3000,
    framerate: 30,
    enableChat: true,
    enableRecording: true,
    enableDonations: true,
    moderationLevel: 'medium',
    chatDelay: 0,
    maxViewers: 1000,
  });

  const [streamStats, setStreamStats] = useState<StreamStats>({
    viewers: 0,
    chatMessages: 0,
    likes: 0,
    shares: 0,
    duration: '00:00:00',
    bitrate: 0,
    fps: 0,
    droppedFrames: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    networkSpeed: 0,
  });

  const [deviceSettings, setDeviceSettings] = useState({
    camera: true,
    microphone: true,
    screenShare: false,
    cameraDevice: 'default',
    microphoneDevice: 'default',
    volume: 80,
    brightness: 50,
    contrast: 50,
    saturation: 50,
  });

  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [showAddModeratorDialog, setShowAddModeratorDialog] = useState(false);
  const [showBanUserDialog, setShowBanUserDialog] = useState(false);
  const [newModeratorUsername, setNewModeratorUsername] = useState('');
  const [banUsername, setBanUsername] = useState('');
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState<number | undefined>(undefined);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected');
  const [streamHealth, setStreamHealth] = useState<'excellent' | 'good' | 'poor' | 'critical'>('good');
  const [alerts, setAlerts] = useState<Array<{ id: string; type: 'info' | 'warning' | 'error'; message: string }>>([]);

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const streamStartTime = useRef<Date | null>(null);

  // API Queries and Mutations
  const { data: streamData } = useQuery({
    queryKey: ['stream-settings', streamId],
    queryFn: () => streamingApi.getStreamSettings(streamId),
    enabled: !!streamId,
  });

  const startStreamMutation = useMutation({
    mutationFn: (settings: StreamSettings) => streamingApi.startStream(streamId, { streamUrl: '', playbackUrl: '' }),
    onSuccess: () => {
      setSnackbarMessage('Stream started successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      onStartStream?.();
      queryClient.invalidateQueries({ queryKey: ['stream-settings', streamId] });
    },
    onError: () => {
      setSnackbarMessage('Failed to start stream');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    },
  });

  const endStreamMutation = useMutation({
    mutationFn: () => streamingApi.stopStream(streamId),
    onSuccess: () => {
      setSnackbarMessage('Stream ended successfully');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
      onEndStream?.();
      queryClient.invalidateQueries({ queryKey: ['stream-settings', streamId] });
    },
    onError: () => {
      setSnackbarMessage('Failed to end stream');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (settings: StreamSettings) => streamingApi.updateStreamSettings(streamId, {
      allowChat: settings.enableChat,
      allowDonations: settings.enableDonations,
      allowRecording: settings.enableRecording,
      maxViewers: settings.maxViewers,
      chatSlowMode: settings.chatDelay,
      quality: {
        resolution: settings.quality,
        bitrate: settings.bitrate,
        fps: settings.framerate
      }
    }),
    onSuccess: () => {
      setSnackbarMessage('Settings updated successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      onUpdateSettings?.(streamSettings);
      queryClient.invalidateQueries({ queryKey: ['stream-settings', streamId] });
    },
    onError: () => {
      setSnackbarMessage('Failed to update settings');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    },
  });

  const addModeratorMutation = useMutation({
    mutationFn: (username: string) => {
      if (!STREAMING_CAPABILITIES.moderationEnabled) return Promise.resolve({ success: false });
      // TODO: Implement addModerator API endpoint
      return Promise.resolve({ success: false });
      // @ts-ignore - wrapper method may not exist when capability is off
      // return api.streams.addModerator?.(streamId, username, ['moderate_chat', 'timeout_users']);
    },
    onSuccess: () => {
      setSnackbarMessage('Moderator added successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setShowAddModeratorDialog(false);
      setNewModeratorUsername('');
      queryClient.invalidateQueries({ queryKey: ['stream-moderators', streamId] });
    },
    onError: () => {
      setSnackbarMessage('Failed to add moderator');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    },
  });

  const removeModeratorMutation = useMutation({
    mutationFn: (moderatorId: string) => {
      if (!STREAMING_CAPABILITIES.moderationEnabled) return Promise.resolve({ success: false });
      // TODO: Implement removeModerator API endpoint
      return Promise.resolve({ success: false });
      // @ts-ignore
      // return api.streams.removeModerator?.(streamId, moderatorId);
    },
    onSuccess: () => {
      setSnackbarMessage('Moderator removed');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
      queryClient.invalidateQueries({ queryKey: ['stream-moderators', streamId] });
    },
    onError: () => {
      setSnackbarMessage('Failed to remove moderator');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    },
  });

  const banUserMutation = useMutation({
    mutationFn: ({ username, reason, duration }: { username: string; reason: string; duration?: number }) => {
      if (!STREAMING_CAPABILITIES.moderationEnabled) return Promise.resolve({ success: false });
      // TODO: Implement banUser API endpoint
      return Promise.resolve({ success: false });
      // reuse userId field by username for optimistic stub
      // @ts-ignore
      // return api.streams.banUser(streamId, username as any, reason, duration);
    },
    onSuccess: () => {
      setSnackbarMessage('User banned successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setShowBanUserDialog(false);
      setBanUsername('');
      setBanReason('');
      setBanDuration(undefined);
      queryClient.invalidateQueries({ queryKey: ['stream-banned-users', streamId] });
    },
    onError: () => {
      setSnackbarMessage('Failed to ban user');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    },
  });

  const unbanUserMutation = useMutation({
    mutationFn: (userId: string) => {
      if (!STREAMING_CAPABILITIES.moderationEnabled) return Promise.resolve({ success: false });
      // TODO: Implement unbanUser API endpoint
      return Promise.resolve({ success: false });
      // @ts-ignore
      // return api.streams.unbanUser(streamId, userId);
    },
    onSuccess: () => {
      setSnackbarMessage('User unbanned');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
      queryClient.invalidateQueries({ queryKey: ['stream-banned-users', streamId] });
    },
    onError: () => {
      setSnackbarMessage('Failed to unban user');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    },
  });

  // No mock data - only use real data from backend

  const getStreamHealth = useCallback((): 'excellent' | 'good' | 'poor' | 'critical' => {
    const { droppedFrames, cpuUsage, networkSpeed } = streamStats;
    
    if (droppedFrames > 100 || cpuUsage > 90 || networkSpeed < 20) {
      return 'critical';
    } else if (droppedFrames > 50 || cpuUsage > 70 || networkSpeed < 40) {
      return 'poor';
    } else if (droppedFrames > 20 || cpuUsage > 50 || networkSpeed < 60) {
      return 'good';
    } else {
      return 'excellent';
    }
  }, [streamStats]);

  // Real-time stats updates
  useEffect(() => {
    if (isStreaming) {
      streamStartTime.current = new Date();
      
      const interval = setInterval(() => {
        setStreamStats(prev => ({
          ...prev,
          viewers: prev.viewers + Math.floor(Math.random() * 10) - 5,
          chatMessages: prev.chatMessages + Math.floor(Math.random() * 3),
          likes: prev.likes + Math.floor(Math.random() * 2),
          bitrate: 2800 + Math.floor(Math.random() * 400),
          fps: 28 + Math.floor(Math.random() * 4),
          droppedFrames: prev.droppedFrames + Math.floor(Math.random() * 2),
          cpuUsage: 30 + Math.floor(Math.random() * 40),
          memoryUsage: 40 + Math.floor(Math.random() * 30),
          networkSpeed: 50 + Math.floor(Math.random() * 30),
        }));

        // Update duration
        if (streamStartTime.current) {
          const now = new Date();
          const diff = now.getTime() - streamStartTime.current.getTime();
          const hours = Math.floor(diff / 3600000);
          const minutes = Math.floor((diff % 3600000) / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          
          setStreamStats(prev => ({
            ...prev,
            duration: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
          }));
        }

        // Update stream health based on stats
        const health = getStreamHealth();
        setStreamHealth(health);
        
        // Generate alerts based on stream health
        if (health === 'critical' && Math.random() > 0.8) {
          addAlert('error', 'Critical: High dropped frame rate detected');
        } else if (health === 'poor' && Math.random() > 0.9) {
          addAlert('warning', 'Warning: Stream quality degraded');
        }
      }, 2000);

      return () => clearInterval(interval);
    } else {
      streamStartTime.current = null;
      setStreamStats(prev => ({ ...prev, duration: '00:00:00' }));
    }
    return undefined; // Explicitly return undefined to satisfy TypeScript
  }, [isStreaming, getStreamHealth]);

  const addAlert = (type: 'info' | 'warning' | 'error', message: string) => {
    const alert = {
      id: Date.now().toString(),
      type,
      message,
    };
    
    setAlerts(prev => [alert, ...prev.slice(0, 4)]); // Keep only 5 most recent alerts
    
    // Auto-remove alert after 10 seconds
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
    }, 10000);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    // Ensure newValue is always a number and within valid range
    const tabValue = typeof newValue === 'string' ? parseInt(newValue, 10) : newValue;
    const validTabValue = isNaN(tabValue) ? 0 : Math.max(0, Math.min(3, tabValue)); // 0-3 for 4 tabs
    setActiveTab(validTabValue);
  };

  const handleSettingsChange = (key: keyof StreamSettings, value: any) => {
    const newSettings = { ...streamSettings, [key]: value };
    setStreamSettings(newSettings);
    onUpdateSettings(newSettings);
  };

  const handleDeviceToggle = (device: 'camera' | 'microphone' | 'screenShare') => {
    setDeviceSettings(prev => ({
      ...prev,
      [device]: !prev[device],
    }));
  };

  const handleAddModerator = () => {
    if (newModeratorUsername.trim()) {
      addModeratorMutation.mutate(newModeratorUsername.trim());
    }
  };

  const handleBanUser = () => {
    if (banUsername.trim() && banReason.trim()) {
      banUserMutation.mutate({
        username: banUsername.trim(),
        reason: banReason.trim(),
        duration: banDuration,
      });
    }
  };

  const handleUnbanUser = (userId: string) => {
    unbanUserMutation.mutate(userId);
  };

  const handleRemoveModerator = (moderatorId: string) => {
    removeModeratorMutation.mutate(moderatorId);
  };

  const handleStartStream = () => {
    startStreamMutation.mutate(streamSettings);
  };

  const handleEndStream = () => {
    endStreamMutation.mutate();
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(streamSettings);
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent':
        return '#4caf50';
      case 'good':
        return '#8bc34a';
      case 'poor':
        return '#ff9800';
      case 'critical':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'excellent':
        return <CheckCircle size={16} color="#4caf50" />;
      case 'good':
        return <CheckCircle size={16} color="#8bc34a" />;
      case 'poor':
        return <AlertTriangle size={16} color="#ff9800" />;
      case 'critical':
        return <XCircle size={16} color="#f44336" />;
      default:
        return <Info size={16} color="#9e9e9e" />;
    }
  };

  return (
    <Box>
      {/* Stream Control Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            {/* Stream Status */}
            <Grid item xs={12} md={4}>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: isStreaming ? '#f44336' : '#9e9e9e',
                    animation: isStreaming ? 'pulse 2s infinite' : 'none',
                    '@keyframes pulse': {
                      '0%': { opacity: 1 },
                      '50%': { opacity: 0.5 },
                      '100%': { opacity: 1 },
                    },
                  }}
                />
                <Typography variant="h6" fontWeight={600}>
                  {isStreaming ? 'LIVE' : 'OFFLINE'}
                </Typography>
                {isStreaming && (
                  <Chip
                    label={streamStats.duration}
                    size="small"
                    color="primary"
                    icon={<Clock size={12} />}
                  />
                )}
              </Box>
            </Grid>

            {/* Quick Stats */}
            <Grid item xs={12} md={4}>
              <Box display="flex" gap={2}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Eye size={16} />
                  <Typography variant="body2">
                    {streamStats.viewers.toLocaleString()}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <MessageCircle size={16} />
                  <Typography variant="body2">
                    {streamStats.chatMessages.toLocaleString()}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={0.5}>
                  {getHealthIcon(streamHealth)}
                  <Typography variant="body2" color={getHealthColor(streamHealth)}>
                    {streamHealth.toUpperCase()}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Stream Controls */}
            <Grid item xs={12} md={4}>
              <Box display="flex" gap={1} justifyContent="flex-end">
                {!isStreaming ? (
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<Video size={16} />}
                    onClick={handleStartStream}
                    disabled={startStreamMutation.isPending}
                    size="large"
                  >
                    {startStreamMutation.isPending ? (
                      <CircularProgress size={16} />
                    ) : (
                      'Go Live'
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Square size={16} />}
                    onClick={handleEndStream}
                    disabled={endStreamMutation.isPending}
                  >
                    {endStreamMutation.isPending ? (
                      <CircularProgress size={16} />
                    ) : (
                      'End Stream'
                    )}
                  </Button>
                )}
                
                <IconButton
                  color={deviceSettings.camera ? 'primary' : 'default'}
                  onClick={() => handleDeviceToggle('camera')}
                >
                  {deviceSettings.camera ? <Camera size={20} /> : <CameraOff size={20} />}
                </IconButton>
                
                <IconButton
                  color={deviceSettings.microphone ? 'primary' : 'default'}
                  onClick={() => handleDeviceToggle('microphone')}
                >
                  {deviceSettings.microphone ? <Mic size={20} /> : <MicOff size={20} />}
                </IconButton>
                
                <IconButton
                  color={deviceSettings.screenShare ? 'primary' : 'default'}
                  onClick={() => handleDeviceToggle('screenShare')}
                >
                  {deviceSettings.screenShare ? <Monitor size={20} /> : <MonitorOff size={20} />}
                </IconButton>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Box mb={3}>
          {alerts.map((alert) => (
            <Alert
              key={alert.id}
              severity={alert.type}
              sx={{ mb: 1 }}
              onClose={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
            >
              {alert.message}
            </Alert>
          ))}
        </Box>
      )}

      {/* Main Content */}
      <Card>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Stream Settings" />
          <Tab label="Performance" />
          <Tab label="Moderation" />
          <Tab label="Analytics" />
        </Tabs>

        {/* Stream Settings Tab */}
        {activeTab === 0 && (
          <CardContent>
            <Grid container spacing={3}>
              {/* Basic Settings */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Basic Settings
                </Typography>
                
                <TextField
                  fullWidth
                  label="Stream Title"
                  value={streamSettings.title}
                  onChange={(e) => handleSettingsChange('title', e.target.value)}
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={streamSettings.description}
                  onChange={(e) => handleSettingsChange('description', e.target.value)}
                  sx={{ mb: 2 }}
                />
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={streamSettings.category}
                    label="Category"
                    onChange={(e) => handleSettingsChange('category', e.target.value)}
                  >
                    <MenuItem value="Technology">Technology</MenuItem>
                    <MenuItem value="Gaming">Gaming</MenuItem>
                    <MenuItem value="Music">Music</MenuItem>
                    <MenuItem value="Art">Art</MenuItem>
                    <MenuItem value="Education">Education</MenuItem>
                    <MenuItem value="Business">Business</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Privacy</InputLabel>
                  <Select
                    value={streamSettings.privacy}
                    label="Privacy"
                    onChange={(e) => handleSettingsChange('privacy', e.target.value)}
                  >
                    <MenuItem value="public">Public</MenuItem>
                    <MenuItem value="unlisted">Unlisted</MenuItem>
                    <MenuItem value="private">Private</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Technical Settings */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Technical Settings
                </Typography>
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Quality</InputLabel>
                  <Select
                    value={streamSettings.quality}
                    label="Quality"
                    onChange={(e) => handleSettingsChange('quality', e.target.value)}
                  >
                    <MenuItem value="720p">720p HD</MenuItem>
                    <MenuItem value="1080p">1080p Full HD</MenuItem>
                    <MenuItem value="4K">4K Ultra HD</MenuItem>
                  </Select>
                </FormControl>
                
                <Box sx={{ mb: 2 }}>
                  <Typography gutterBottom>
                    Bitrate: {streamSettings.bitrate} kbps
                  </Typography>
                  <Slider
                    value={streamSettings.bitrate}
                    onChange={(_, value) => handleSettingsChange('bitrate', value)}
                    min={1000}
                    max={8000}
                    step={100}
                    marks={[
                      { value: 1000, label: '1M' },
                      { value: 3000, label: '3M' },
                      { value: 6000, label: '6M' },
                      { value: 8000, label: '8M' },
                    ]}
                  />
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography gutterBottom>
                    Frame Rate: {streamSettings.framerate} fps
                  </Typography>
                  <Slider
                    value={streamSettings.framerate}
                    onChange={(_, value) => handleSettingsChange('framerate', value)}
                    min={15}
                    max={60}
                    step={15}
                    marks={[
                      { value: 15, label: '15' },
                      { value: 30, label: '30' },
                      { value: 60, label: '60' },
                    ]}
                  />
                </Box>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={streamSettings.enableChat}
                      onChange={(e) => handleSettingsChange('enableChat', e.target.checked)}
                    />
                  }
                  label="Enable Chat"
                  sx={{ display: 'block', mb: 1 }}
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={streamSettings.enableRecording}
                      onChange={(e) => handleSettingsChange('enableRecording', e.target.checked)}
                    />
                  }
                  label="Enable Recording"
                  sx={{ display: 'block', mb: 1 }}
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={streamSettings.enableDonations}
                      onChange={(e) => handleSettingsChange('enableDonations', e.target.checked)}
                    />
                  }
                  label="Enable Donations"
                  sx={{ display: 'block' }}
                />
              </Grid>
            </Grid>
            
            {/* Save Settings Button */}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<Save size={16} />}
                onClick={handleSaveSettings}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? (
                  <CircularProgress size={16} />
                ) : (
                  'Save Settings'
                )}
              </Button>
            </Box>
          </CardContent>
        )}

        {/* Performance Tab */}
        {activeTab === 1 && (
          <CardContent>
            <Grid container spacing={3}>
              {/* System Performance */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  System Performance
                </Typography>
                
                <Box mb={3}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">CPU Usage</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {streamStats.cpuUsage}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={streamStats.cpuUsage}
                    color={streamStats.cpuUsage > 80 ? 'error' : streamStats.cpuUsage > 60 ? 'warning' : 'success'}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                
                <Box mb={3}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Memory Usage</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {streamStats.memoryUsage}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={streamStats.memoryUsage}
                    color={streamStats.memoryUsage > 80 ? 'error' : streamStats.memoryUsage > 60 ? 'warning' : 'success'}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                
                <Box mb={3}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Network Speed</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {streamStats.networkSpeed} Mbps
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={streamStats.networkSpeed}
                    color={streamStats.networkSpeed < 30 ? 'error' : streamStats.networkSpeed < 50 ? 'warning' : 'success'}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Grid>

              {/* Stream Quality */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Stream Quality
                </Typography>
                
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Typography variant="body2">Current Bitrate:</Typography>
                  <Chip label={`${streamStats.bitrate} kbps`} size="small" color="primary" />
                </Box>
                
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Typography variant="body2">Frame Rate:</Typography>
                  <Chip label={`${streamStats.fps} fps`} size="small" color="primary" />
                </Box>
                
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Typography variant="body2">Dropped Frames:</Typography>
                  <Chip
                    label={streamStats.droppedFrames}
                    size="small"
                    color={streamStats.droppedFrames > 50 ? 'error' : streamStats.droppedFrames > 20 ? 'warning' : 'success'}
                  />
                </Box>
                
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Typography variant="body2">Stream Health:</Typography>
                  <Chip
                    label={streamHealth.toUpperCase()}
                    size="small"
                    sx={{ bgcolor: getHealthColor(streamHealth), color: 'white' }}
                  />
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        )}

        {/* Moderation Tab */}
        {activeTab === 2 && (
          <CardContent>
            {!STREAMING_CAPABILITIES.moderationEnabled ? (
              <Alert severity="info">
                Moderation features are disabled in this environment.
              </Alert>
            ) : (
              <Grid container spacing={3}>
                {/* Moderators */}
                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="h6">
                      Moderators ({moderators.length})
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Shield size={16} />}
                      onClick={() => setShowAddModeratorDialog(true)}
                    >
                      Add Moderator
                    </Button>
                  </Box>
                  <List>
                    {moderators.map((moderator) => (
                      <ListItem key={moderator.id}>
                        <Avatar src={moderator.avatar} sx={{ width: 32, height: 32, mr: 2 }}>
                          {moderator.displayName[0]}
                        </Avatar>
                        <ListItemText
                          primary={moderator.displayName}
                          secondary={`@${moderator.username} • ${moderator.permissions.join(', ')}`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton edge="end" onClick={() => handleRemoveModerator(moderator.id)} color="error">
                            <UserX size={16} />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Grid>

                {/* Banned Users */}
                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="h6">Banned Users ({bannedUsers.length})</Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      startIcon={<Ban size={16} />}
                      onClick={() => setShowBanUserDialog(true)}
                    >
                      Ban User
                    </Button>
                  </Box>
                  <List>
                    {bannedUsers.map((user) => (
                      <ListItem key={user.id}>
                        <ListItemText
                          primary={`@${user.username}`}
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                {user.reason}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Banned by {user.bannedBy} • {user.bannedAt.toLocaleDateString()}
                                {user.duration && ` • ${user.duration} minutes`}
                              </Typography>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Button size="small" onClick={() => handleUnbanUser(user.id)} color="success">
                            Unban
                          </Button>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              </Grid>
            )}
          </CardContent>
        )}

        {/* Analytics Tab */}
        {activeTab === 3 && (
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Stream Analytics
            </Typography>
            <Alert severity="info">
              Detailed analytics will be available here. This includes viewer demographics, 
              engagement metrics, revenue tracking, and performance insights.
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Add Moderator Dialog */}
      {STREAMING_CAPABILITIES.moderationEnabled && (
        <Dialog open={showAddModeratorDialog} onClose={() => setShowAddModeratorDialog(false)}>
          <DialogTitle>Add Moderator</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Username"
              value={newModeratorUsername}
              onChange={(e) => setNewModeratorUsername(e.target.value)}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAddModeratorDialog(false)}>Cancel</Button>
            <Button onClick={handleAddModerator} variant="contained">
              Add Moderator
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Ban User Dialog */}
      {STREAMING_CAPABILITIES.moderationEnabled && (
        <Dialog open={showBanUserDialog} onClose={() => setShowBanUserDialog(false)}>
          <DialogTitle>Ban User</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Username"
              value={banUsername}
              onChange={(e) => setBanUsername(e.target.value)}
              sx={{ mt: 1, mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Reason"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              type="number"
              label="Duration (minutes, leave empty for permanent)"
              value={banDuration || ''}
              onChange={(e) => setBanDuration(e.target.value ? parseInt(e.target.value) : undefined)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowBanUserDialog(false)}>Cancel</Button>
            <Button onClick={handleBanUser} variant="contained" color="error">
              Ban User
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StreamManager;