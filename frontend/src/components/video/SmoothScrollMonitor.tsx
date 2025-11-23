import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Zap,
  Eye,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Pause,
  Play,
  Gauge,
  Timer,
} from 'lucide-react';
import { getSmoothScrollVideoManager } from '@/utils/smoothScrollVideoManager';

interface SmoothScrollMonitorProps {
  compact?: boolean;
  showDetails?: boolean;
  refreshInterval?: number;
}

interface ScrollMetrics {
  currentVideo: string | null;
  isScrolling: boolean;
  scrollVelocity: number;
  registeredVideos: number;
  playbackStates: Map<string, any>;
  performanceScore: number;
  switchCount: number;
  averageSwitchTime: number;
}

export const SmoothScrollMonitor: React.FC<SmoothScrollMonitorProps> = ({
  compact = false,
  showDetails = false,
  refreshInterval = 1000,
}) => {
  const [metrics, setMetrics] = useState<ScrollMetrics>({
    currentVideo: null,
    isScrolling: false,
    scrollVelocity: 0,
    registeredVideos: 0,
    playbackStates: new Map(),
    performanceScore: 100,
    switchCount: 0,
    averageSwitchTime: 0,
  });
  
  const [expanded, setExpanded] = useState(!compact);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [switchHistory, setSwitchHistory] = useState<Array<{ timestamp: number; fromId: string | null; toId: string }>>([]);

  const scrollVideoManager = getSmoothScrollVideoManager();

  // Collect metrics
  const collectMetrics = () => {
    const performanceMetrics = scrollVideoManager.getPerformanceMetrics();
    
    setMetrics({
      currentVideo: performanceMetrics.currentPlayingVideo,
      isScrolling: performanceMetrics.isScrolling,
      scrollVelocity: performanceMetrics.scrollVelocity,
      registeredVideos: performanceMetrics.registeredVideos,
      playbackStates: scrollVideoManager.getPlaybackStates(),
      performanceScore: calculatePerformanceScore(performanceMetrics),
      switchCount: switchHistory.length,
      averageSwitchTime: calculateAverageSwitchTime(),
    });
  };

  // Calculate performance score
  const calculatePerformanceScore = (performanceMetrics: any): number => {
    let score = 100;
    
    // Deduct for high scroll velocity without smooth transitions
    if (performanceMetrics.scrollVelocity > 5) {
      score -= 10;
    }
    
    // Deduct for too many registered videos
    if (performanceMetrics.registeredVideos > 10) {
      score -= 5;
    }
    
    // Deduct for frequent switches
    const recentSwitches = switchHistory.filter(s => Date.now() - s.timestamp < 60000);
    if (recentSwitches.length > 5) {
      score -= 15;
    }
    
    return Math.max(0, score);
  };

  // Calculate average switch time
  const calculateAverageSwitchTime = (): number => {
    if (switchHistory.length < 2) return 0;
    
    const intervals = [];
    for (let i = 1; i < switchHistory.length; i++) {
      // Add explicit checks to satisfy TypeScript
      const currentEntry = switchHistory[i];
      const previousEntry = switchHistory[i - 1];
      if (currentEntry && previousEntry) {
        intervals.push(currentEntry.timestamp - previousEntry.timestamp);
      }
    }
    
    if (intervals.length === 0) return 0;
    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  };

  // Monitor scroll direction
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const direction = currentScrollY > lastScrollY ? 'down' : 'up';
      setScrollDirection(direction);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Setup video switch tracking
  useEffect(() => {
    scrollVideoManager.onVideoSwitchCallback((fromId, toId) => {
      setSwitchHistory(prev => {
        const newHistory = [...prev, { timestamp: Date.now(), fromId, toId }];
        // Keep only last 20 switches
        return newHistory.slice(-20);
      });
    });
  }, [scrollVideoManager]);

  // Refresh metrics
  useEffect(() => {
    collectMetrics();
    const interval = setInterval(collectMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, switchHistory]);

  const getVelocityColor = (velocity: number) => {
    if (velocity < 1) return 'success';
    if (velocity < 3) return 'warning';
    return 'error';
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title="Smooth Scroll Performance">
          <Chip
            icon={<Activity size={14} />}
            label={`${Math.round(metrics.performanceScore)}%`}
            size="small"
            color={getPerformanceColor(metrics.performanceScore) as any}
            onClick={() => setExpanded(!expanded)}
          />
        </Tooltip>
        
        {metrics.isScrolling && (
          <Tooltip title={`Scrolling ${scrollDirection} at ${metrics.scrollVelocity.toFixed(1)} px/ms`}>
            <Chip
              icon={scrollDirection === 'down' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
              label={metrics.scrollVelocity.toFixed(1)}
              size="small"
              color={getVelocityColor(metrics.scrollVelocity) as any}
            />
          </Tooltip>
        )}
        
        {metrics.currentVideo && (
          <Tooltip title={`Playing: ${metrics.currentVideo}`}>
            <Chip
              icon={<Play size={14} />}
              label="Playing"
              size="small"
              color="primary"
            />
          </Tooltip>
        )}
      </Box>
    );
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Activity size={20} />
            <Typography variant="h6">Smooth Scroll Monitor</Typography>
            <Chip
              label={metrics.isScrolling ? 'Scrolling' : 'Idle'}
              size="small"
              color={metrics.isScrolling ? 'warning' : 'success'}
            />
          </Box>
          
          <IconButton onClick={() => setExpanded(!expanded)} size="small">
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </IconButton>
        </Box>

        {/* Performance Score */}
        <Box mb={2}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="body2">Performance Score</Typography>
            <Typography variant="body2" fontWeight="bold">
              {Math.round(metrics.performanceScore)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={metrics.performanceScore}
            color={getPerformanceColor(metrics.performanceScore) as any}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>

        <Collapse in={expanded}>
          {/* Current Status */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} md={3}>
              <Box textAlign="center">
                <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                  {metrics.currentVideo ? <Play size={20} color="#4caf50" /> : <Pause size={20} color="#9e9e9e" />}
                </Box>
                <Typography variant="h6" color={metrics.currentVideo ? 'success.main' : 'text.secondary'}>
                  {metrics.currentVideo ? 'Playing' : 'Paused'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Current State
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={6} md={3}>
              <Box textAlign="center">
                <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                  <Gauge size={20} color={getVelocityColor(metrics.scrollVelocity) === 'success' ? '#4caf50' : getVelocityColor(metrics.scrollVelocity) === 'warning' ? '#ff9800' : '#f44336'} />
                </Box>
                <Typography variant="h6" color={`${getVelocityColor(metrics.scrollVelocity)}.main`}>
                  {metrics.scrollVelocity.toFixed(1)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Scroll Velocity
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={6} md={3}>
              <Box textAlign="center">
                <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                  <Eye size={20} color="#2196f3" />
                </Box>
                <Typography variant="h6" color="primary">
                  {metrics.registeredVideos}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Registered Videos
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={6} md={3}>
              <Box textAlign="center">
                <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                  <Zap size={20} color="#ff9800" />
                </Box>
                <Typography variant="h6" color="warning.main">
                  {metrics.switchCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Video Switches
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Scroll Direction Indicator */}
          {metrics.isScrolling && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Box display="flex" alignItems="center" gap={1}>
                {scrollDirection === 'down' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
                <Typography variant="body2">
                  Scrolling {scrollDirection} at {metrics.scrollVelocity.toFixed(2)} px/ms
                </Typography>
              </Box>
            </Alert>
          )}

          {/* Detailed Metrics */}
          {showDetails && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Detailed Metrics
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Timer size={16} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Average Switch Time"
                    secondary={`${Math.round(metrics.averageSwitchTime)}ms`}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Activity size={16} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Active Videos"
                    secondary={`${Array.from(metrics.playbackStates.values()).filter(s => s.isPlaying).length} playing`}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <TrendingUp size={16} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Preloaded Videos"
                    secondary={`${Array.from(metrics.playbackStates.values()).filter(s => s.isPreloaded).length} ready`}
                  />
                </ListItem>
              </List>

              {/* Recent Switches */}
              {switchHistory.length > 0 && (
                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Recent Video Switches
                  </Typography>
                  <List dense>
                    {switchHistory.slice(-5).reverse().map((switch_, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Zap size={16} />
                        </ListItemIcon>
                        <ListItemText
                          primary={`${switch_.fromId || 'None'} → ${switch_.toId}`}
                          secondary={new Date(switch_.timestamp).toLocaleTimeString()}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          )}
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default SmoothScrollMonitor;