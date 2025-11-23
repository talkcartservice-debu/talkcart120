import React, { useState } from 'react';
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
} from '@mui/material';
import {
  MessageCircle,
  Shield,
  BarChart3,
  Gift,
  Crown,
  Settings,
  X,
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

interface StreamSidebarProps {
  streamId: string;
  stream: any;
  isStreamer: boolean;
  isAuthenticated: boolean;
  canViewMetrics?: boolean;
  canViewHealth?: boolean;
  onClose?: () => void;
  showCloseButton?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      sx={{
        height: '100%',
        overflow: 'hidden',
        display: value === index ? 'flex' : 'none',
        flexDirection: 'column',
      }}
    >
      {value === index && children}
    </Box>
  );
}

export default function StreamSidebar({
  streamId,
  stream,
  isStreamer,
  isAuthenticated,
  canViewMetrics = true,
  onClose,
  showCloseButton = false,
}: StreamSidebarProps) {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const { socket } = useWebSocket();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
    },
  });

  const allowChatCurrent = stream?.settings?.allowChat !== false;
  const handleAllowChatToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateChatSettings.mutate(e.target.checked);
  };

  // Host controls state (streamer only)
  const [goalType, setGoalType] = useState<'likes' | 'donations'>('likes');
  const [goalTarget, setGoalTarget] = useState<number>(100);
  const [goalTitle, setGoalTitle] = useState<string>('');

  const [pollQuestion, setPollQuestion] = useState<string>('');
  const [pollOptionInput, setPollOptionInput] = useState<string>('');
  const [pollOptions, setPollOptions] = useState<string[]>([]);

  // UI state for dialogs
  const [giftOpen, setGiftOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const streamerIdStr = stream?.streamer?.id || (stream?.streamer as any)?._id || '';
  const streamerName = stream?.streamer?.displayName || stream?.streamer?.username || (stream?.streamer as any)?.name || 'Streamer';

  const addPollOption = () => {
    const v = pollOptionInput.trim();
    if (!v) return;
    setPollOptions(prev => Array.from(new Set([...prev, v])));
    setPollOptionInput('');
  };
  const removePollOption = (opt: string) => setPollOptions(prev => prev.filter(o => o !== opt));

  const emitSetGoal = () => socket?.emit('live:goal:set', { streamId, type: goalType, target: goalTarget, title: goalTitle });
  const emitClearGoal = () => socket?.emit('live:goal:clear', { streamId });
  const emitStartPoll = () => socket?.emit('live:poll:start', { streamId, question: pollQuestion.trim(), options: pollOptions });
  const emitStopPoll = () => socket?.emit('live:poll:stop', { streamId });


  const tabs = [
    {
      label: 'Chat',
      icon: MessageCircle,
      badge: 0, // Could be unread messages count
      component: (
        <LiveChat
          streamId={streamId}
          isStreamer={isStreamer}
          allowChat={stream?.settings?.allowChat !== false}
        />
      ),
    },
    ...(isStreamer
      ? [
          {
            label: 'Moderation',
            icon: Shield,
            badge: 0, // Could be pending moderation actions
            component: (
              <ModerationPanel
                streamId={streamId}
                isStreamer={isStreamer}
              />
            ),
          },
          {
            label: 'Host',
            icon: Settings,
            badge: 0,
            component: (
              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Goals */}
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2">Goals</Typography>
                      <Stack direction="row" gap={1}>
                        <Button size="small" variant={goalType === 'likes' ? 'contained' : 'outlined'} onClick={() => setGoalType('likes')}>Likes</Button>
                        <Button size="small" variant={goalType === 'donations' ? 'contained' : 'outlined'} onClick={() => setGoalType('donations')}>Donations</Button>
                      </Stack>
                    </Stack>
                    <Stack direction="row" gap={1} sx={{ mb: 1 }}>
                      <TextField size="small" label="Target" type="number" value={goalTarget} onChange={(e) => setGoalTarget(Math.max(1, Number(e.target.value) || 0))} sx={{ width: 140 }} />
                      <TextField size="small" label="Title (optional)" value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} fullWidth />
                    </Stack>
                    <Stack direction="row" gap={1}>
                      <Button size="small" variant="contained" onClick={emitSetGoal} disabled={!goalTarget}>Set Goal</Button>
                      <Button size="small" color="warning" onClick={emitClearGoal}>Clear Goal</Button>
                    </Stack>
                  </CardContent>
                </Card>

                {/* Polls */}
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Live Poll</Typography>
                    <TextField size="small" label="Question" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} fullWidth sx={{ mb: 1 }} />
                    <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 1 }}>
                      <TextField size="small" label="Add option" value={pollOptionInput} onChange={(e) => setPollOptionInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPollOption(); } }} fullWidth />
                      <Button size="small" onClick={addPollOption} disabled={!pollOptionInput.trim()}>Add</Button>
                    </Stack>
                    <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
                      {pollOptions.map(opt => (
                        <Chip key={opt} label={opt} onDelete={() => removePollOption(opt)} />
                      ))}
                    </Stack>
                    <Stack direction="row" gap={1}>
                      <Button size="small" variant="contained" onClick={emitStartPoll} disabled={pollOptions.length < 2 || !pollQuestion.trim()}>Start Poll</Button>
                      <Button size="small" color="warning" onClick={emitStopPoll}>Stop Poll</Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Box>
            ),
          },
          ...(canViewMetrics ? [{
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
        ]
      : []),
    {
      label: 'Gifts',
      icon: Gift,
      badge: 0,
      component: (
        <Box sx={{ p: 2 }}>
          <Button variant="contained" onClick={() => setGiftOpen(true)}>Send a Gift</Button>
        </Box>
      ),
    },
    {
      label: 'Subscribe',
      icon: Crown,
      badge: 0,
      component: (
        <Box sx={{ p: 2 }}>
          <Button variant="contained" onClick={() => setSubOpen(true)}>Subscribe</Button>
        </Box>
      ),
    },
  ];

  return (
    <>
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(18,18,18,0.9)' : 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(6px)',
      }}
    >
      {/* Header with tabs */}
      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          position: 'relative',
        }}
      >
        {showCloseButton && (
          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1,
            }}
            size="small"
          >
            <X size={16} />
          </IconButton>
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
            },
            '& .MuiTab-root': {
              minHeight: 48,
              minWidth: 'auto',
              px: 1,
              textTransform: 'none',
              fontWeight: 600,
            },
          }}
        >
          {tabs.map((tab, index) => {
            const IconComponent = tab.icon;

            return (
              <Tab
                key={index}
                icon={
                  <Badge
                    badgeContent={tab.badge > 0 ? tab.badge : undefined}
                    color="error"
                    variant="dot"
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
        {isStreamer && (
          <Box sx={{ position: 'absolute', top: 8, right: showCloseButton ? 44 : 8, zIndex: 1 }}>
            <Tooltip title={allowChatCurrent ? 'Disable chat for this stream' : 'Enable chat for this stream'}>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    color="warning"
                    checked={allowChatCurrent}
                    onChange={handleAllowChatToggle}
                  />
                }
                label="Chat"
                sx={{ m: 0 }}
              />
            </Tooltip>
          </Box>
        )}

      </Box>

      {/* Tab content */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {tabs.map((tab, index) => (
          <TabPanel key={index} value={activeTab} index={index}>
            {tab.component}
          </TabPanel>
        ))}
      </Box>
    </Card>
      <GiftPanel
        streamId={streamId}
        streamerId={streamerIdStr}
        isOpen={giftOpen}
        onClose={() => setGiftOpen(false)}
      />
      <SubscriptionPanel
        streamerId={streamerIdStr}
        streamerName={streamerName}
        isOpen={subOpen}
        onClose={() => setSubOpen(false)}
      />

    </>
  );
}
