import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Tabs,
  Tab,
  Badge,
  IconButton,
  Tooltip,
  useTheme,
  Switch,
  FormControlLabel,
  Button,
  TextField,
  Chip,
  Collapse,
  Divider,
  Avatar,
  alpha,
  Fade,
  Slide,
  Zoom,
} from '@mui/material';
import {
  MessageCircle,
  Shield,
  BarChart3,
  Gift,
  Crown,
  Settings,
  X,
  Users,
  TrendingUp,
  Zap,
  Target,
  BarChart,
  Activity,
  Eye,
  Heart,
  Star,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

import LiveChat from '../LiveChat';
import ModerationPanel from '../ModerationPanel';
import dynamic from 'next/dynamic';
const StreamAnalytics = dynamic(() => import('../StreamAnalytics'), { ssr: false, loading: () => null });
import GiftPanel from '../GiftPanel';
import SubscriptionPanel from '../SubscriptionPanel';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { streamingApi } from '@/services/streamingApi';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { createStreamingStyles, streamingAnimations } from '../styles/streamingTheme';

interface EnhancedStreamSidebarProps {
  streamId: string;
  stream: any;
  isStreamer: boolean;
  isAuthenticated: boolean;
  canViewMetrics?: boolean;
  canViewHealth?: boolean;
  onClose?: () => void;
  showCloseButton?: boolean;
  variant?: 'desktop' | 'mobile';
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  keepMounted?: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  action: () => void;
  badge?: number;
  disabled?: boolean;
}

function TabPanel({ children, value, index, keepMounted = false }: TabPanelProps) {
  const isActive = value === index;
  
  return (
    <Box
      role="tabpanel"
      hidden={!isActive && !keepMounted}
      sx={{
        height: '100%',
        overflow: 'hidden',
        display: isActive || keepMounted ? 'flex' : 'none',
        flexDirection: 'column',
        opacity: isActive ? 1 : keepMounted ? 0 : 1,
        pointerEvents: isActive ? 'auto' : keepMounted ? 'none' : 'auto',
      }}
    >
      <Fade in={isActive} timeout={300}>
        <Box sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </Box>
      </Fade>
    </Box>
  );
}

const EnhancedStreamSidebar: React.FC<EnhancedStreamSidebarProps> = ({
  streamId,
  stream,
  isStreamer,
  isAuthenticated,
  canViewMetrics = true,
  onClose,
  showCloseButton = false,
  variant = 'desktop',
  collapsed = false,
  onToggleCollapse,
}) => {
  const theme = useTheme();
  const streamingStyles = createStreamingStyles(theme);
  const [activeTab, setActiveTab] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['goals']));
  const { socket } = useWebSocket();

  // Enhanced state management
  const [hostControls, setHostControls] = useState({
    goalType: 'likes' as 'likes' | 'donations',
    goalTarget: 100,
    goalTitle: '',
    pollQuestion: '',
    pollOptions: [] as string[],
    pollOptionInput: '',
    showAdvancedSettings: false,
  });

  // Real-time metrics state
  const [metrics, setMetrics] = useState({
    viewerCount: stream?.viewerCount || 0,
    totalLikes: 0,
    totalGifts: 0,
    chatMessages: 0,
    newFollowers: 0,
  });

  // UI state
  const [giftOpen, setGiftOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(true);

  const queryClient = useQueryClient();
  
  const updateChatSettings = useMutation({
    mutationFn: (allow: boolean) => streamingApi.updateStreamSettings(streamId, { allowChat: allow }),
    onMutate: async (allow: boolean) => {
      queryClient.setQueryData(['stream', streamId], (old: any) => {
        if (!old?.data) return old;
        const currentSettings = old.data.settings || {};
        return { ...old, data: { ...old.data, settings: { ...currentSettings, allowChat: allow } } };
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
    },
  });

  const allowChatCurrent = stream?.settings?.allowChat !== false;

  // Handlers
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);

  const handleAllowChatToggle = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateChatSettings.mutate(e.target.checked);
  }, [updateChatSettings]);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  }, []);

  const updateHostControls = useCallback((updates: Partial<typeof hostControls>) => {
    setHostControls(prev => ({ ...prev, ...updates }));
  }, []);

  // Socket event handlers
  const emitSetGoal = useCallback(() => {
    socket?.emit('live:goal:set', {
      streamId,
      type: hostControls.goalType,
      target: hostControls.goalTarget,
      title: hostControls.goalTitle
    });
  }, [socket, streamId, hostControls]);

  const emitClearGoal = useCallback(() => {
    socket?.emit('live:goal:clear', { streamId });
  }, [socket, streamId]);

  const addPollOption = useCallback(() => {
    const option = hostControls.pollOptionInput.trim();
    if (!option || hostControls.pollOptions.includes(option)) return;
    
    updateHostControls({
      pollOptions: [...hostControls.pollOptions, option],
      pollOptionInput: '',
    });
  }, [hostControls, updateHostControls]);

  const removePollOption = useCallback((optionToRemove: string) => {
    updateHostControls({
      pollOptions: hostControls.pollOptions.filter(option => option !== optionToRemove),
    });
  }, [hostControls, updateHostControls]);

  const emitStartPoll = useCallback(() => {
    socket?.emit('live:poll:start', {
      streamId,
      question: hostControls.pollQuestion.trim(),
      options: hostControls.pollOptions
    });
  }, [socket, streamId, hostControls]);

  const emitStopPoll = useCallback(() => {
    socket?.emit('live:poll:stop', { streamId });
  }, [socket, streamId]);

  // Quick actions for streamers
  const quickActions = useMemo<QuickAction[]>(() => {
    if (!isStreamer) return [];
    
    return [
      {
        id: 'toggle-chat',
        label: allowChatCurrent ? 'Disable Chat' : 'Enable Chat',
        icon: MessageCircle,
        color: allowChatCurrent ? 'warning' : 'success',
        action: () => updateChatSettings.mutate(!allowChatCurrent),
      },
      {
        id: 'quick-goal',
        label: 'Set Goal',
        icon: Target,
        color: 'primary',
        action: () => emitSetGoal(),
        disabled: !hostControls.goalTarget,
      },
      {
        id: 'start-poll',
        label: 'Start Poll',
        icon: BarChart,
        color: 'secondary',
        action: () => emitStartPoll(),
        disabled: hostControls.pollOptions.length < 2 || !hostControls.pollQuestion.trim(),
      },
    ];
  }, [isStreamer, allowChatCurrent, hostControls, updateChatSettings, emitSetGoal, emitStartPoll]);

  // Enhanced tab configuration
  const tabs = useMemo(() => {
    const baseTabs = [
      {
        id: 'chat',
        label: 'Chat',
        icon: MessageCircle,
        badge: metrics.chatMessages > 99 ? '99+' : metrics.chatMessages || 0,
        component: (
          <LiveChat
            streamId={streamId}
            isStreamer={isStreamer}
            allowChat={allowChatCurrent}
          />
        ),
      },
    ];

    const streamerTabs = isStreamer ? [
      {
        id: 'moderation',
        label: 'Moderation',
        icon: Shield,
        badge: 0, // TODO: Add pending moderation count
        component: (
          <ModerationPanel
            streamId={streamId}
            isStreamer={isStreamer}
          />
        ),
      },
      {
        id: 'host',
        label: 'Host Controls',
        icon: Settings,
        badge: 0,
        component: (
          <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            {/* Quick Actions */}
            <Card 
              variant="outlined" 
              sx={{ 
                mb: 2, 
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Sparkles size={16} />
                  Quick Actions
                </Typography>
                <Stack spacing={1}>
                  {quickActions.map((action) => (
                    <Button
                      key={action.id}
                      size="small"
                      variant="outlined"
                      color={action.color}
                      startIcon={<action.icon size={16} />}
                      onClick={action.action}
                      disabled={action.disabled}
                      fullWidth
                      sx={{
                        justifyContent: 'flex-start',
                        textTransform: 'none',
                        '&:hover': {
                          transform: 'translateX(4px)',
                        },
                        transition: 'all 0.2s ease-in-out',
                      }}
                    >
                      {action.label}
                    </Button>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            {/* Goals Section */}
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2 }}>
                <Button
                  variant="text"
                  onClick={() => toggleSection('goals')}
                  sx={{
                    p: 0,
                    mb: expandedSections.has('goals') ? 1 : 0,
                    width: '100%',
                    justifyContent: 'space-between',
                    textTransform: 'none',
                  }}
                  endIcon={expandedSections.has('goals') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Target size={16} />
                    <Typography variant="subtitle2">Stream Goals</Typography>
                  </Stack>
                </Button>
                
                <Collapse in={expandedSections.has('goals')} timeout={300}>
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant={hostControls.goalType === 'likes' ? 'contained' : 'outlined'}
                        onClick={() => updateHostControls({ goalType: 'likes' })}
                        startIcon={<Heart size={14} />}
                      >
                        Likes
                      </Button>
                      <Button
                        size="small"
                        variant={hostControls.goalType === 'donations' ? 'contained' : 'outlined'}
                        onClick={() => updateHostControls({ goalType: 'donations' })}
                        startIcon={<Gift size={14} />}
                      >
                        Donations
                      </Button>
                    </Stack>
                    
                    <Stack direction="row" spacing={1}>
                      <TextField
                        size="small"
                        label="Target"
                        type="number"
                        value={hostControls.goalTarget}
                        onChange={(e) => updateHostControls({ goalTarget: Math.max(1, Number(e.target.value) || 0) })}
                        sx={{ width: 100 }}
                      />
                      <TextField
                        size="small"
                        label="Title (optional)"
                        value={hostControls.goalTitle}
                        onChange={(e) => updateHostControls({ goalTitle: e.target.value })}
                        fullWidth
                      />
                    </Stack>
                    
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={emitSetGoal}
                        disabled={!hostControls.goalTarget}
                        startIcon={<Target size={14} />}
                      >
                        Set Goal
                      </Button>
                      <Button
                        size="small"
                        color="warning"
                        onClick={emitClearGoal}
                        startIcon={<X size={14} />}
                      >
                        Clear
                      </Button>
                    </Stack>
                  </Stack>
                </Collapse>
              </CardContent>
            </Card>

            {/* Polls Section */}
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2 }}>
                <Button
                  variant="text"
                  onClick={() => toggleSection('polls')}
                  sx={{
                    p: 0,
                    mb: expandedSections.has('polls') ? 1 : 0,
                    width: '100%',
                    justifyContent: 'space-between',
                    textTransform: 'none',
                  }}
                  endIcon={expandedSections.has('polls') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <BarChart size={16} />
                    <Typography variant="subtitle2">Live Polls</Typography>
                  </Stack>
                </Button>
                
                <Collapse in={expandedSections.has('polls')} timeout={300}>
                  <Stack spacing={2}>
                    <TextField
                      size="small"
                      label="Poll Question"
                      value={hostControls.pollQuestion}
                      onChange={(e) => updateHostControls({ pollQuestion: e.target.value })}
                      fullWidth
                      multiline
                      rows={2}
                    />
                    
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TextField
                        size="small"
                        label="Add option"
                        value={hostControls.pollOptionInput}
                        onChange={(e) => updateHostControls({ pollOptionInput: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addPollOption();
                          }
                        }}
                        fullWidth
                      />
                      <Button
                        size="small"
                        onClick={addPollOption}
                        disabled={!hostControls.pollOptionInput.trim() || hostControls.pollOptions.length >= 4}
                      >
                        Add
                      </Button>
                    </Stack>
                    
                    {hostControls.pollOptions.length > 0 && (
                      <Stack spacing={1}>
                        <Typography variant="caption" color="text.secondary">
                          Options ({hostControls.pollOptions.length}/4):
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" gap={0.5}>
                          {hostControls.pollOptions.map((option, index) => (
                            <Chip
                              key={index}
                              label={option}
                              size="small"
                              onDelete={() => removePollOption(option)}
                              deleteIcon={<X size={12} />}
                            />
                          ))}
                        </Stack>
                      </Stack>
                    )}
                    
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={emitStartPoll}
                        disabled={hostControls.pollOptions.length < 2 || !hostControls.pollQuestion.trim()}
                        startIcon={<BarChart size={14} />}
                      >
                        Start Poll
                      </Button>
                      <Button
                        size="small"
                        color="warning"
                        onClick={emitStopPoll}
                        startIcon={<X size={14} />}
                      >
                        Stop Poll
                      </Button>
                    </Stack>
                  </Stack>
                </Collapse>
              </CardContent>
            </Card>
          </Box>
        ),
      },
      ...(canViewMetrics ? [{
        id: 'analytics',
        label: 'Analytics',
        icon: BarChart3,
        badge: 0,
        component: (
          <StreamAnalytics
            streamId={streamId}
            isLive={!!(stream?.isLive)}
          />
        ),
      }] : []),
    ] : [];

    const viewerTabs = [
      {
        id: 'gifts',
        label: 'Gifts',
        icon: Gift,
        badge: 0,
        component: (
          <Box sx={{ p: 2 }}>
            <Button 
              variant="contained" 
              onClick={() => setGiftOpen(true)}
              fullWidth
              sx={{
                background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #ee5a24 0%, #d63031 100%)',
                },
              }}
            >
              <Gift size={20} style={{ marginRight: 8 }} />
              Send a Gift
            </Button>
          </Box>
        ),
      },
      {
        id: 'subscribe',
        label: 'Subscribe',
        icon: Crown,
        badge: 0,
        component: (
          <Box sx={{ p: 2 }}>
            <Button 
              variant="contained" 
              onClick={() => setSubOpen(true)}
              fullWidth
              sx={{
                background: 'linear-gradient(135deg, #fdcb6e 0%, #e17055 100%)',
                color: '#ffffff',
                '&:hover': {
                  background: 'linear-gradient(135deg, #e17055 0%, #d63031 100%)',
                },
              }}
            >
              <Crown size={20} style={{ marginRight: 8 }} />
              Subscribe
            </Button>
          </Box>
        ),
      },
    ];

    return [...baseTabs, ...streamerTabs, ...viewerTabs];
  }, [
    metrics,
    streamId,
    isStreamer,
    allowChatCurrent,
    canViewMetrics,
    stream,
    expandedSections,
    hostControls,
    quickActions,
    toggleSection,
    updateHostControls,
    addPollOption,
    removePollOption,
    emitSetGoal,
    emitClearGoal,
    emitStartPoll,
    emitStopPoll,
  ]);

  const streamerInfo = useMemo(() => ({
    id: stream?.streamer?.id || (stream?.streamer as any)?._id || '',
    name: stream?.streamer?.displayName || stream?.streamer?.username || (stream?.streamer as any)?.name || 'Streamer',
  }), [stream]);

  if (variant === 'mobile') {
    // Mobile variant can be customized differently
    // For now, use the same design but with mobile-specific adjustments
  }

  return (
    <>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          ...streamingStyles.glassContainer(),
          borderColor: 'divider',
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 8px 32px rgba(0, 0, 0, 0.3)' 
            : '0 8px 32px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Enhanced Header */}
        <Box
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {showCloseButton && (
            <Zoom in timeout={300}>
              <IconButton
                onClick={onClose}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 2,
                  bgcolor: alpha(theme.palette.background.paper, 0.8),
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.background.paper, 0.9),
                    transform: 'scale(1.1)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
                size="small"
              >
                <X size={16} />
              </IconButton>
            </Zoom>
          )}

          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 48,
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: 2,
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              },
              '& .MuiTab-root': {
                minHeight: 48,
                minWidth: 'auto',
                px: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  bgcolor: alpha(theme.palette.action.hover, 0.5),
                  transform: 'translateY(-1px)',
                },
                '&.Mui-selected': {
                  color: theme.palette.primary.main,
                },
              },
            }}
          >
            {tabs.map((tab, index) => {
              const IconComponent = tab.icon;
              const hasBadge = tab.badge && (typeof tab.badge === 'string' || tab.badge > 0);

              return (
                <Tab
                  key={tab.id}
                  icon={
                    <Badge
                      badgeContent={hasBadge ? tab.badge : undefined}
                      color="error"
                      variant={typeof tab.badge === 'string' ? 'standard' : 'dot'}
                      sx={{
                        '& .MuiBadge-badge': {
                          fontSize: '0.625rem',
                          minWidth: '16px',
                          height: '16px',
                          animation: hasBadge ? `${streamingAnimations.wiggle} 2s ease-in-out infinite` : 'none',
                        },
                      }}
                    >
                      <IconComponent size={18} />
                    </Badge>
                  }
                  label={tab.label}
                  sx={{
                    '& .MuiTab-iconWrapper': {
                      mb: 0.5,
                    },
                  }}
                />
              );
            })}
          </Tabs>

          {/* Enhanced streamer controls */}
          {isStreamer && (
            <Slide direction="left" in timeout={400}>
              <Box sx={{ position: 'absolute', top: 8, right: showCloseButton ? 44 : 8, zIndex: 1 }}>
                <Tooltip title={allowChatCurrent ? 'Disable chat for this stream' : 'Enable chat for this stream'}>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        color="warning"
                        checked={allowChatCurrent}
                        onChange={handleAllowChatToggle}
                        sx={{
                          '& .MuiSwitch-thumb': {
                            boxShadow: theme.palette.mode === 'dark' 
                              ? '0 2px 4px rgba(255, 255, 255, 0.2)'
                              : '0 2px 4px rgba(0, 0, 0, 0.2)',
                          },
                        }}
                      />
                    }
                    label="Chat"
                    sx={{ 
                      m: 0,
                      '& .MuiFormControlLabel-label': {
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      },
                    }}
                  />
                </Tooltip>
              </Box>
            </Slide>
          )}
        </Box>

        {/* Enhanced Tab Content */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {tabs.map((tab, index) => (
            <TabPanel key={tab.id} value={activeTab} index={index} keepMounted={index === 0}>
              {tab.component}
            </TabPanel>
          ))}
        </Box>
      </Card>

      {/* Enhanced Gift Panel */}
      <GiftPanel
        streamId={streamId}
        streamerId={streamerInfo.id}
        isOpen={giftOpen}
        onClose={() => setGiftOpen(false)}
      />

      {/* Enhanced Subscription Panel */}
      <SubscriptionPanel
        streamerId={streamerInfo.id}
        streamerName={streamerInfo.name}
        isOpen={subOpen}
        onClose={() => setSubOpen(false)}
      />
    </>
  );
};

export default EnhancedStreamSidebar;