import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Badge,
  Alert,
  Snackbar,
  Divider,
  Stack,
  Paper,
  Tooltip,
  Menu,
  LinearProgress,
  InputAdornment,
  Pagination,
  Chip as MuiChip,
} from '@mui/material';
import {
  Shield,
  Ban,
  Clock,
  UserX,
  MessageCircle,
  AlertTriangle,
  Eye,
  Settings,
  Users,
  Flag,
  Trash2,
  Pin,
  Volume2,
  VolumeX,
  Crown,
  Star,
  MoreVertical,
  CheckCircle,
  XCircle,
  Timer,
  Activity,
  Search,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/router';

interface ModerationPanelProps {
  streamId: string;
  isStreamer?: boolean;
  isModerator?: boolean;
}

interface ModerationAction {
  id: string;
  type: 'ban' | 'timeout' | 'delete_message' | 'pin_message' | 'warning';
  targetUserId: string;
  targetUsername: string;
  moderatorId: string;
  moderatorName: string;
  reason: string;
  duration?: number;
  timestamp: string;
  isActive: boolean;
}

interface BannedUser {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  reason: string;
  bannedAt: string;
  bannedBy: string;
  expiresAt?: string;
  isActive: boolean;
}

interface ChatSettings {
  slowMode: boolean;
  slowModeDelay: number;
  subscribersOnly: boolean;
  followersOnly: boolean;
  emoteOnly: boolean;
  autoModeration: boolean;
  bannedWords: string[];
  maxMessageLength: number;
  allowLinks: boolean;
}

const ModerationPanel: React.FC<ModerationPanelProps> = ({
  streamId,
  isStreamer = false,
  isModerator = false,
}) => {
  const queryClient = useQueryClient();
  const { joinStream, leaveStream, sendModeratorAction, onModerationAction, offModerationAction } = useWebSocket();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState(0);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showTimeoutDialog, setShowTimeoutDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [banReason, setBanReason] = useState('');
  const [timeoutDuration, setTimeoutDuration] = useState(300); // 5 minutes
  const [timeoutReason, setTimeoutReason] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('info');
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  
  const [chatSettings, setChatSettings] = useState<ChatSettings>({
    slowMode: false,
    slowModeDelay: 5,
    subscribersOnly: false,
    followersOnly: false,
    emoteOnly: false,
    autoModeration: true,
    bannedWords: [],
    maxMessageLength: 500,
    allowLinks: true,
  });

  // Fetch moderation data
  // TODO: Implement getModerationData API endpoint
  // const { data: moderationData, isLoading: moderationLoading } = useQuery({
  //   queryKey: ['moderation', streamId],
  //   queryFn: () => api.streams.getModerationData(streamId),
  //   enabled: isStreamer || isModerator,
  //   refetchInterval: 30000, // Refetch every 30 seconds
  // });

  // For now, use mock data
  const { data: moderationData, isLoading: moderationLoading } = useQuery({
    queryKey: ['moderation', streamId],
    queryFn: () => Promise.resolve({
      success: true,
      data: {
        data: {
          timeouts: [
            {
              id: '1',
              userId: 'user1',
              username: 'timeoutuser1',
              displayName: 'Timeout User 1',
              reason: 'Spamming',
              timedOutBy: 'moderator1',
              timedOutAt: new Date().toISOString(),
              duration: 3600,
              expiresAt: new Date(Date.now() + 3600000).toISOString(),
              isActive: true
            },
            {
              id: '2',
              userId: 'user2',
              username: 'timeoutuser2',
              displayName: 'Timeout User 2',
              reason: 'Harassment',
              timedOutBy: 'moderator1',
              timedOutAt: new Date().toISOString(),
              duration: 7200,
              expiresAt: new Date(Date.now() + 7200000).toISOString(),
              isActive: true
            }
          ],
          actions: []
        }
      }
    }),
    enabled: isStreamer || isModerator,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // TODO: Implement getBannedUsers API endpoint
  // const { data: bannedUsersData, isLoading: bannedUsersLoading } = useQuery({
  //   queryKey: ['banned-users', streamId],
  //   queryFn: () => api.streams.getBannedUsers(streamId),
  //   enabled: isStreamer || isModerator,
  //   refetchInterval: 60000, // Refetch every minute
  // });

  // For now, use mock data
  const { data: bannedUsersData, isLoading: bannedUsersLoading } = useQuery({
    queryKey: ['banned-users', streamId],
    queryFn: () => Promise.resolve({
      success: true,
      data: {
        data: {
          banned: [
            {
              id: '1',
              userId: 'user1',
              username: 'banneduser1',
              displayName: 'Banned User 1',
              avatar: undefined,
              reason: 'Spamming',
              bannedAt: new Date().toISOString(),
              bannedBy: 'moderator1',
              expiresAt: undefined,
              isActive: true
            },
            {
              id: '2',
              userId: 'user2',
              username: 'banneduser2',
              displayName: 'Banned User 2',
              avatar: undefined,
              reason: 'Harassment',
              bannedAt: new Date().toISOString(),
              bannedBy: 'moderator1',
              expiresAt: undefined,
              isActive: true
            }
          ]
        }
      }
    }),
    enabled: isStreamer || isModerator,
    refetchInterval: 60000, // Refetch every minute
  });

  const bannedUsers = bannedUsersData?.data?.data?.banned || [];
  const timeouts = moderationData?.data?.data?.timeouts || [];
  const [banSearch, setBanSearch] = useState('');
  const [timeoutSearch, setTimeoutSearch] = useState('');
  const [banReasonFilter, setBanReasonFilter] = useState<string>('');
  const [timeoutReasonFilter, setTimeoutReasonFilter] = useState<string>('');
  const [bansPage, setBansPage] = useState(1);
  const [timeoutsPage, setTimeoutsPage] = useState(1);
  const pageSize = 10;

  // Initialize state from query
  useEffect(() => {
    const q = router.query || {};
    if (typeof q.banSearch === 'string') setBanSearch(q.banSearch);
    if (typeof q.timeoutSearch === 'string') setTimeoutSearch(q.timeoutSearch);
    if (typeof q.banReason === 'string') setBanReasonFilter(q.banReason);
    if (typeof q.timeoutReason === 'string') setTimeoutReasonFilter(q.timeoutReason);
    if (typeof q.bansPage === 'string') setBansPage(parseInt(q.bansPage) || 1);
    if (typeof q.timeoutsPage === 'string') setTimeoutsPage(parseInt(q.timeoutsPage) || 1);
    if (typeof q.tab === 'string') setActiveTab(parseInt(q.tab) || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  // Persist filters to query
  useEffect(() => {
    if (!router.isReady) return;
    const next = {
      ...router.query,
      tab: String(activeTab),
      banSearch: banSearch || undefined,
      timeoutSearch: timeoutSearch || undefined,
      banReason: banReasonFilter || undefined,
      timeoutReason: timeoutReasonFilter || undefined,
      bansPage: String(bansPage),
      timeoutsPage: String(timeoutsPage),
    };
    router.replace({ pathname: router.pathname, query: next }, undefined, { shallow: true });
  }, [activeTab, banSearch, timeoutSearch, banReasonFilter, timeoutReasonFilter, bansPage, timeoutsPage]);

  const activeBansAll = bannedUsers
    .filter((u: any) => u.isActive)
    .filter((u: any) => {
      if (!banSearch.trim()) return true;
      const q = banSearch.toLowerCase();
      return (
        (u.displayName || u.username || '').toLowerCase().includes(q) ||
        (u.reason || '').toLowerCase().includes(q)
      );
    })
    .filter((u: any) => (!banReasonFilter ? true : (u.reason || '').toLowerCase().includes(banReasonFilter.toLowerCase())));

  const banReasonChips = useMemo(() => {
    const reasons = new Set<string>();
    for (const u of bannedUsers) {
      if (u?.reason) {
        const parts = String(u.reason).split(/[,;|]/).map((p) => p.trim().toLowerCase()).filter(Boolean);
        if (parts.length) parts.forEach((p) => reasons.add(p));
        else reasons.add(String(u.reason).toLowerCase());
      }
    }
    return Array.from(reasons).sort().slice(0, 12); // limit to a dozen chips
  }, [bannedUsers]);

  const banReasonCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of bannedUsers) {
      if (!u?.reason) continue;
      const parts = String(u.reason).split(/[,;|]/).map((p) => p.trim().toLowerCase()).filter(Boolean);
      const list = parts.length ? parts : [String(u.reason).toLowerCase()];
      for (const r of list) counts[r] = (counts[r] || 0) + 1;
    }
    return counts;
  }, [bannedUsers]);

  const bansTotalPages = Math.max(1, Math.ceil(activeBansAll.length / pageSize));
  const activeBans = activeBansAll.slice((bansPage - 1) * pageSize, bansPage * pageSize);

  const activeTimeoutsAll = timeouts
    .filter((t: any) => t.isActive)
    .filter((t: any) => {
      if (!timeoutSearch.trim()) return true;
      const q = timeoutSearch.toLowerCase();
      return (
        (t.username || t.userId || '').toLowerCase().includes(q) ||
        (t.reason || '').toLowerCase().includes(q)
      );
    })
    .filter((t: any) => (!timeoutReasonFilter ? true : (t.reason || '').toLowerCase().includes(timeoutReasonFilter.toLowerCase())));

  const timeoutReasonChips = useMemo(() => {
    const reasons = new Set<string>();
    for (const t of timeouts) {
      if (t?.reason) {
        const parts = String(t.reason).split(/[,;|]/).map((p) => p.trim().toLowerCase()).filter(Boolean);
        if (parts.length) parts.forEach((p) => reasons.add(p));
        else reasons.add(String(t.reason).toLowerCase());
      }
    }
    return Array.from(reasons).sort().slice(0, 12);
  }, [timeouts]);

  const timeoutReasonCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of timeouts) {
      if (!t?.reason) continue;
      const parts = String(t.reason).split(/[,;|]/).map((p) => p.trim().toLowerCase()).filter(Boolean);
      const list = parts.length ? parts : [String(t.reason).toLowerCase()];
      for (const r of list) counts[r] = (counts[r] || 0) + 1;
    }
    return counts;
  }, [timeouts]);

  const timeoutsTotalPages = Math.max(1, Math.ceil(activeTimeoutsAll.length / pageSize));
  const recentTimeouts = activeTimeoutsAll.slice((timeoutsPage - 1) * pageSize, timeoutsPage * pageSize);

  // TODO: Implement getChatSettings API endpoint
  // const { data: chatSettingsData } = useQuery({
  //   queryKey: ['chat-settings', streamId],
  //   queryFn: () => api.streams.getChatSettings(streamId),
  //   enabled: isStreamer || isModerator,
  //   onSuccess: (data) => {
  //     if (data?.data) {
  //       setChatSettings(data.data);
  //     }
  //   },
  // });

  // For now, use mock data
  const { data: chatSettingsData } = useQuery({
    queryKey: ['chat-settings', streamId],
    queryFn: () => Promise.resolve({
      success: true,
      data: {
        data: {
          slowMode: false,
          slowModeDelay: 5,
          subscribersOnly: false,
          followersOnly: false,
          emoteOnly: false,
          autoModeration: true,
          bannedWords: [],
          maxMessageLength: 500,
          allowLinks: true
        }
      }
    }),
    enabled: isStreamer || isModerator,
  });

  useEffect(() => {
    if (chatSettingsData?.data?.data) {
      setChatSettings(chatSettingsData.data.data);
    }
  }, [chatSettingsData]);

  const moderationActions = moderationData?.data?.data?.actions || [];
  const recentActions = moderationActions.slice(0, 10);

  // Mutations
  // TODO: Implement banUser API endpoint
  // const banUserMutation = useMutation({
  //   mutationFn: ({ userId, reason, duration }: { userId: string; reason: string; duration?: number }) => 
  //     api.streams.banUser(streamId, userId, reason, duration),
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['banned-users', streamId] });
  //     queryClient.invalidateQueries({ queryKey: ['moderation', streamId] });
  //     setSnackbarMessage('User banned successfully');
  //     setSnackbarSeverity('success');
  //     setSnackbarOpen(true);
  //     setShowBanDialog(false);
  //     setBanReason('');
  //   },
  //   onError: () => {
  //     setSnackbarMessage('Failed to ban user');
  //     setSnackbarSeverity('error');
  //     setSnackbarOpen(true);
  //   },
  // });

  // For now, mock the response
  const banUserMutation = useMutation({
    mutationFn: ({ userId, reason, duration }: { userId: string; reason: string; duration?: number }) => 
      Promise.resolve({ success: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banned-users', streamId] });
      queryClient.invalidateQueries({ queryKey: ['moderation', streamId] });
      setSnackbarMessage('User banned successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setShowBanDialog(false);
      setBanReason('');
    },
    onError: () => {
      setSnackbarMessage('Failed to ban user');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    },
  });

  // TODO: Implement timeoutUser API endpoint
  // const timeoutUserMutation = useMutation({
  //   mutationFn: ({ userId, duration, reason }: { userId: string; duration: number; reason: string }) => 
  //     api.streams.timeoutUser(streamId, userId, duration, reason),
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['moderation', streamId] });
  //     setSnackbarMessage('User timed out successfully');
  //     setSnackbarSeverity('success');
  //     setSnackbarOpen(true);
  //     setShowTimeoutDialog(false);
  //     setTimeoutReason('');
  //   },
  //   onError: () => {
  //     setSnackbarMessage('Failed to timeout user');
  //     setSnackbarSeverity('error');
  //     setSnackbarOpen(true);
  //   },
  // });

  // For now, mock the response
  const timeoutUserMutation = useMutation({
    mutationFn: ({ userId, duration, reason }: { userId: string; duration: number; reason: string }) => 
      Promise.resolve({ success: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation', streamId] });
      setSnackbarMessage('User timed out successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setShowTimeoutDialog(false);
      setTimeoutReason('');
    },
    onError: () => {
      setSnackbarMessage('Failed to timeout user');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    },
  });

  // TODO: Implement unbanUser API endpoint
  // const unbanUserMutation = useMutation({
  //   mutationFn: (userId: string) => api.streams.unbanUser(streamId, userId),
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['banned-users', streamId] });
  //     queryClient.invalidateQueries({ queryKey: ['moderation', streamId] });
  //     setSnackbarMessage('User unbanned successfully');
  //     setSnackbarSeverity('success');
  //     setSnackbarOpen(true);
  //   },
  //   onError: () => {
  //     setSnackbarMessage('Failed to unban user');
  //     setSnackbarSeverity('error');
  //     setSnackbarOpen(true);
  //   },
  // });

  // For now, mock the response
  const unbanUserMutation = useMutation({
    mutationFn: (userId: string) => Promise.resolve({ success: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banned-users', streamId] });
      queryClient.invalidateQueries({ queryKey: ['moderation', streamId] });
      setSnackbarMessage('User unbanned successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    },
    onError: () => {
      setSnackbarMessage('Failed to unban user');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    },
  });

  // TODO: Implement updateChatSettings API endpoint
  // const updateChatSettingsMutation = useMutation({
  //   mutationFn: (settings: Partial<ChatSettings>) => 
  //     api.streams.updateChatSettings(streamId, settings),
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['chat-settings', streamId] });
  //     setSnackbarMessage('Chat settings updated');
  //     setSnackbarSeverity('success');
  //     setSnackbarOpen(true);
  //   },
  //   onError: () => {
  //     setSnackbarMessage('Failed to update chat settings');
  //     setSnackbarSeverity('error');
  //     setSnackbarOpen(true);
  //   },
  // });

  // For now, mock the response
  const updateChatSettingsMutation = useMutation({
    mutationFn: (settings: Partial<ChatSettings>) => 
      Promise.resolve({ success: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-settings', streamId] });
      setSnackbarMessage('Chat settings updated');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    },
    onError: () => {
      setSnackbarMessage('Failed to update chat settings');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    },
  });

  // Join stream room and listen for moderation events
  useEffect(() => {
    if (!streamId) return;

    // Join stream room so moderation events are scoped
    joinStream(streamId);

    const handleModerationAction = (data: any) => {
      if (data.streamId === streamId) {
        queryClient.invalidateQueries({ queryKey: ['moderation', streamId] });
        queryClient.invalidateQueries({ queryKey: ['banned-users', streamId] });

        setSnackbarMessage(`${data.action?.type?.toUpperCase?.() || 'UPDATE'} received`);
        setSnackbarSeverity('info');
        setSnackbarOpen(true);
      }
    };

    onModerationAction(handleModerationAction);

    return () => {
      offModerationAction(handleModerationAction);
      leaveStream(streamId);
    };
  }, [streamId, queryClient, onModerationAction, offModerationAction, joinStream, leaveStream]);

  const handleBanUser = () => {
    if (selectedUser && banReason.trim()) {
      banUserMutation.mutate({
        userId: selectedUser.id,
        reason: banReason.trim(),
      });
    }
  };

  const handleTimeoutUser = () => {
    if (selectedUser && timeoutReason.trim()) {
      timeoutUserMutation.mutate({
        userId: selectedUser.id,
        duration: timeoutDuration,
        reason: timeoutReason.trim(),
      });
    }
  };

  const handleUnbanUser = (userId: string) => {
    unbanUserMutation.mutate(userId);
  };

  const handleChatSettingChange = (setting: keyof ChatSettings, value: any) => {
    const newSettings = { ...chatSettings, [setting]: value };
    setChatSettings(newSettings);
    updateChatSettingsMutation.mutate({ [setting]: value });
    
    // Send WebSocket update for real-time changes
    sendModeratorAction(streamId, {
      type: setting as any,
      enabled: value,
    });
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'ban':
        return <Ban size={16} color="#f44336" />;
      case 'timeout':
        return <Clock size={16} color="#ff9800" />;
      case 'delete_message':
        return <Trash2 size={16} color="#9e9e9e" />;
      case 'pin_message':
        return <Pin size={16} color="#2196f3" />;
      case 'warning':
        return <AlertTriangle size={16} color="#ff9800" />;
      default:
        return <Shield size={16} />;
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  if (!isStreamer && !isModerator) {
    return (
      <Card>
        <CardContent>
          <Alert severity="warning">
            You don't have permission to access moderation tools.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <Shield size={20} />
            <Typography variant="h6">Moderation Panel</Typography>
            <Badge badgeContent={activeBans.length} color="error" />
          </Box>
        }
        action={
          <IconButton onClick={() => setShowSettingsDialog(true)}>
            <Settings size={20} />
          </IconButton>
        }
      />

      <CardContent sx={{ p: 0, height: '100%' }}>
        <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
          <Tab label="Actions" />
          <Tab
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <span>Banned Users</span>
                <Badge color="error" badgeContent={activeBansAll.length} />
              </Box>
            }
          />
          <Tab label="Settings" />
        </Tabs>

        {/* Actions Tab */}
        {activeTab === 0 && (
          <Box sx={{ p: 2 }}>
            {moderationLoading ? (
              <LinearProgress />
            ) : (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Recent Actions</Typography>
                <List>
                  {recentActions.length === 0 ? (
                    <ListItem>
                      <ListItemText 
                        primary="No recent actions"
                        secondary="Moderation actions will appear here"
                      />
                    </ListItem>
                  ) : (
                    recentActions.map((action: ModerationAction) => (
                      <ListItem key={action.id}>
                        <ListItemIcon>
                          {getActionIcon(action.type)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body2" fontWeight={600}>
                                {action.moderatorName}
                              </Typography>
                              <Typography variant="body2">
                                {action.type}d
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {action.targetUsername}
                              </Typography>
                              {action.duration && (
                                <Chip 
                                  label={formatDuration(action.duration)} 
                                  size="small" 
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                {action.reason}
                              </Typography>
                              <br />
                              <Typography variant="caption" color="text.secondary">
                                {formatDistanceToNow(new Date(action.timestamp), { addSuffix: true })}
                              </Typography>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Chip
                            label={action.isActive ? 'Active' : 'Expired'}
                            size="small"
                            color={action.isActive ? 'error' : 'default'}
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))
                  )}
                </List>

                <Divider sx={{ my: 2 }} />

                <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" flexGrow={1}>Active Timeouts</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      size="small"
                      placeholder="Search timeouts..."
                      value={timeoutSearch}
                      onChange={(e) => { setTimeoutSearch(e.target.value); setTimeoutsPage(1); }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search size={16} />
                          </InputAdornment>
                        ),
                      }}
                    />
                    <Stack direction="row" spacing={1}>
                      {!!timeoutReasonFilter && (
                        <MuiChip
                          size="small"
                          label="Clear filters"
                          color="default"
                          onClick={() => { setTimeoutReasonFilter(''); setTimeoutsPage(1); }}
                          variant="outlined"
                        />
                      )}
                      {timeoutReasonChips.map((label) => (
                        <MuiChip
                          key={label}
                          size="small"
                          label={`${label} (${timeoutReasonCounts[label] || 0})`}
                          color={timeoutReasonFilter.toLowerCase() === label ? 'primary' : 'default'}
                          onClick={() => { setTimeoutReasonFilter(timeoutReasonFilter.toLowerCase() === label ? '' : label); setTimeoutsPage(1); }}
                        />
                      ))}
                    </Stack>
                  </Stack>
                </Box>
                <List>
                  {recentTimeouts.length === 0 ? (
                    <ListItem>
                      <ListItemText 
                        primary="No active timeouts"
                        secondary="Recent active timeouts will appear here"
                      />
                    </ListItem>
                  ) : (
                    recentTimeouts.map((t: any) => (
                      <ListItem key={`${t.userId}-${t.until}`}>
                        <ListItemIcon>
                          <Clock size={16} color="#ff9800" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body2" fontWeight={600}>
                                {t.username || t.userId}
                              </Typography>
                              <Chip 
                                label={formatDuration(Math.max(0, Math.floor((new Date(t.until).getTime() - Date.now()) / 1000)))}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Reason: {t.reason || 'Timeout'}
                              </Typography>
                              <br />
                              <Typography variant="caption" color="text.secondary">
                                Expires {formatDistanceToNow(new Date(t.until), { addSuffix: true })}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))
                  )}
                </List>
                <Box display="flex" justifyContent="center" sx={{ mt: 1 }}>
                  <Pagination
                    count={timeoutsTotalPages}
                    page={timeoutsPage}
                    onChange={(_, p) => setTimeoutsPage(p)}
                    size="small"
                  />
                </Box>
              </>
            )}
          </Box>
        )}

        {/* Banned Users Tab */}
        {activeTab === 1 && (
          <Box sx={{ p: 2 }}>
            {bannedUsersLoading ? (
              <LinearProgress />
            ) : (
              <>
                <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search banned users..."
                    value={banSearch}
                    onChange={(e) => { setBanSearch(e.target.value); setBansPage(1); }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search size={16} />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Stack direction="row" spacing={1}>
                    {!!banReasonFilter && (
                      <MuiChip
                        size="small"
                        label="Clear filters"
                        color="default"
                        onClick={() => { setBanReasonFilter(''); setBansPage(1); }}
                        variant="outlined"
                      />
                    )}
                    {banReasonChips.map((label) => (
                      <MuiChip
                        key={label}
                        size="small"
                        label={`${label} (${banReasonCounts[label] || 0})`}
                        color={banReasonFilter.toLowerCase() === label ? 'primary' : 'default'}
                        onClick={() => { setBanReasonFilter(banReasonFilter.toLowerCase() === label ? '' : label); setBansPage(1); }}
                      />
                    ))}
                  </Stack>
                </Box>
                <List>
                  {activeBans.length === 0 ? (
                    <ListItem>
                      <ListItemText 
                        primary="No banned users"
                        secondary="Banned users will appear here"
                      />
                    </ListItem>
                  ) : (
                    activeBans.map((user: BannedUser) => (
                    <ListItem key={user.id}>
                      <ListItemIcon>
                        <Avatar src={user.avatar} sx={{ width: 32, height: 32 }}>
                          {user.displayName[0]}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={user.displayName}
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Reason: {user.reason}
                            </Typography>
                            <br />
                            <Typography variant="caption" color="text.secondary">
                              Banned {formatDistanceToNow(new Date(user.bannedAt), { addSuffix: true })} by {user.bannedBy}
                            </Typography>
                            {user.expiresAt && (
                              <>
                                <br />
                                <Typography variant="caption" color="text.secondary">
                                  Expires {formatDistanceToNow(new Date(user.expiresAt), { addSuffix: true })}
                                </Typography>
                              </>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleUnbanUser(user.userId)}
                          disabled={unbanUserMutation.isPending}
                        >
                          Unban
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))
                )}
              </List>
              {recentTimeouts.map((timeout: any) => (
                <ListItem key={timeout.id}>
                  <ListItemIcon>
                    <Clock size={16} color="#ff9800" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight={600}>
                          {timeout.username}
                        </Typography>
                        <Chip
                          label={formatDuration(timeout.duration)}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {timeout.reason}
                        </Typography>
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          {formatDistanceToNow(new Date(timeout.timestamp), { addSuffix: true })}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label={timeout.isActive ? 'Active' : 'Expired'}
                      size="small"
                      color={timeout.isActive ? 'error' : 'default'}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </>
          )}
        </Box>
      )}

      {/* Settings Tab */}
      {activeTab === 2 && (
          <Box sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Chat Restrictions
                </Typography>
                <Stack spacing={1}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!chatSettings?.slowMode}
                        onChange={(e) => handleChatSettingChange('slowMode', e.target.checked)}
                      />
                    }
                    label="Slow Mode"
                  />
                  
                  {chatSettings?.slowMode && (
                    <Box sx={{ ml: 4 }}>
                      <Typography gutterBottom>
                        Delay: {chatSettings?.slowModeDelay || 0} seconds
                      </Typography>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select
                          value={chatSettings.slowModeDelay}
                          onChange={(e) => {
                            if (typeof handleChatSettingChange === 'function') {
                              handleChatSettingChange('slowModeDelay', Number(e.target.value));
                            }
                          }}
                        >
                          <MenuItem value={5}>5 seconds</MenuItem>
                          <MenuItem value={10}>10 seconds</MenuItem>
                          <MenuItem value={30}>30 seconds</MenuItem>
                          <MenuItem value={60}>1 minute</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  )}
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={chatSettings.subscribersOnly}
                        onChange={(e) => handleChatSettingChange('subscribersOnly', e.target.checked)}
                      />
                    }
                    label="Subscribers Only"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={chatSettings.followersOnly}
                        onChange={(e) => handleChatSettingChange('followersOnly', e.target.checked)}
                      />
                    }
                    label="Followers Only"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={chatSettings.emoteOnly}
                        onChange={(e) => handleChatSettingChange('emoteOnly', e.target.checked)}
                      />
                    }
                    label="Emote Only Mode"
                  />
                </Stack>
              </Paper>

              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Auto Moderation
                </Typography>
                <Stack spacing={1}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={chatSettings.autoModeration}
                        onChange={(e) => handleChatSettingChange('autoModeration', e.target.checked)}
                      />
                    }
                    label="Enable Auto Moderation"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={chatSettings.allowLinks}
                        onChange={(e) => handleChatSettingChange('allowLinks', e.target.checked)}
                      />
                    }
                    label="Allow Links"
                  />
                </Stack>
              </Paper>

              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Quick Actions
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Ban />}
                    onClick={() => setShowBanDialog(true)}
                  >
                    Ban User
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Clock />}
                    onClick={() => setShowTimeoutDialog(true)}
                  >
                    Timeout User
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Trash2 />}
                    onClick={() => {
                      // Clear chat functionality
                      setSnackbarMessage('Chat cleared');
                      setSnackbarSeverity('info');
                      setSnackbarOpen(true);
                    }}
                  >
                    Clear Chat
                  </Button>
                </Stack>
              </Paper>
            </Stack>
          </Box>
        )}
      </CardContent>

      {/* Ban User Dialog */}
      <Dialog open={showBanDialog} onClose={() => setShowBanDialog(false)}>
        <DialogTitle>Ban User</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Username"
            value={selectedUser?.username || ''}
            onChange={(e) => setSelectedUser({ ...selectedUser, username: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            placeholder="Enter reason for ban"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBanDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleBanUser} 
            variant="contained" 
            color="error"
            disabled={!selectedUser?.username || !banReason.trim() || banUserMutation.isPending}
          >
            Ban User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Timeout User Dialog */}
      <Dialog open={showTimeoutDialog} onClose={() => setShowTimeoutDialog(false)}>
        <DialogTitle>Timeout User</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Username"
            value={selectedUser?.username || ''}
            onChange={(e) => setSelectedUser({ ...selectedUser, username: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Duration</InputLabel>
            <Select
              value={timeoutDuration}
              onChange={(e) => setTimeoutDuration(e.target.value as number)}
            >
              <MenuItem value={60}>1 minute</MenuItem>
              <MenuItem value={300}>5 minutes</MenuItem>
              <MenuItem value={600}>10 minutes</MenuItem>
              <MenuItem value={1800}>30 minutes</MenuItem>
              <MenuItem value={3600}>1 hour</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason"
            value={timeoutReason}
            onChange={(e) => setTimeoutReason(e.target.value)}
            placeholder="Enter reason for timeout"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTimeoutDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleTimeoutUser} 
            variant="contained" 
            color="warning"
            disabled={!selectedUser?.username || !timeoutReason.trim() || timeoutUserMutation.isPending}
          >
            Timeout User
          </Button>
        </DialogActions>
      </Dialog>

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
    </Card>
  );
};

export default ModerationPanel;