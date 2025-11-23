import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  IconButton,
  Divider,
  CircularProgress,
  useTheme,
  alpha
} from '@mui/material';
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  MoreVertical
} from 'lucide-react';
import callService, { Call } from '@/services/callService';

interface CallHistoryProps {
  conversationId: string;
  onCallAgain?: (type: 'audio' | 'video') => void;
}

const CallHistory: React.FC<CallHistoryProps> = ({
  conversationId,
  onCallAgain
}) => {
  const theme = useTheme();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCallHistory();
  }, [conversationId]);

  const loadCallHistory = async () => {
    try {
      setLoading(true);
      const { calls: callHistory } = await callService.getCallHistory(conversationId);
      setCalls(callHistory);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCallDuration = (duration?: number): string => {
    if (!duration) return '0:00';
    
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatCallTime = (date: Date): string => {
    const now = new Date();
    const callDate = new Date(date);
    const diffInHours = (now.getTime() - callDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return callDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return callDate.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return callDate.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  const getCallIcon = (call: Call, isInitiator: boolean) => {
    const iconProps = { size: 16 };
    
    if (call.status === 'missed' || call.status === 'declined') {
      return <PhoneMissed {...iconProps} color={theme.palette.error.main} />;
    }
    
    if (isInitiator) {
      return <PhoneOutgoing {...iconProps} color={theme.palette.success.main} />;
    } else {
      return <PhoneIncoming {...iconProps} color={theme.palette.info.main} />;
    }
  };

  const getCallStatusColor = (status: string) => {
    switch (status) {
      case 'ended':
        return 'success';
      case 'missed':
      case 'declined':
        return 'error';
      case 'active':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getCallStatusText = (call: Call) => {
    switch (call.status) {
      case 'ended':
        return `${formatCallDuration(call.duration)}`;
      case 'missed':
        return 'Missed';
      case 'declined':
        return 'Declined';
      case 'active':
        return 'Active';
      default:
        return call.status;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="error" variant="body2">
          Failed to load call history
        </Typography>
      </Box>
    );
  }

  if (calls.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="text.secondary" variant="body2">
          No call history
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ p: 2, pb: 1, fontWeight: 600 }}>
        Call History
      </Typography>
      
      <List disablePadding>
        {calls.map((call, index) => {
          const isInitiator = call.initiator.id === 'current-user-id'; // You'll need to get current user ID
          const isVideoCall = call.type === 'video';
          
          return (
            <React.Fragment key={call.id}>
              <ListItem
                sx={{
                  px: 2,
                  py: 1,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.04)
                  }
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      backgroundColor: alpha(
                        isVideoCall ? theme.palette.primary.main : theme.palette.success.main,
                        0.1
                      )
                    }}
                  >
                    {isVideoCall ? (
                      <Video size={16} color={theme.palette.primary.main} />
                    ) : (
                      <Phone size={16} color={theme.palette.success.main} />
                    )}
                  </Avatar>
                </ListItemAvatar>
                
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getCallIcon(call, isInitiator)}
                      <Typography variant="body2" fontWeight={500}>
                        {isVideoCall ? 'Video call' : 'Voice call'}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Clock size={12} />
                      <Typography variant="caption" color="text.secondary">
                        {formatCallTime(call.startedAt)}
                      </Typography>
                      <Chip
                        label={getCallStatusText(call)}
                        size="small"
                        variant="outlined"
                        color={getCallStatusColor(call.status) as any}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    </Box>
                  }
                />
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {call.status === 'ended' && onCallAgain && (
                    <>
                      <IconButton
                        size="small"
                        onClick={() => onCallAgain('audio')}
                        sx={{ 
                          color: theme.palette.success.main,
                          '&:hover': { backgroundColor: alpha(theme.palette.success.main, 0.1) }
                        }}
                      >
                        <Phone size={16} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => onCallAgain('video')}
                        sx={{ 
                          color: theme.palette.primary.main,
                          '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.1) }
                        }}
                      >
                        <Video size={16} />
                      </IconButton>
                    </>
                  )}
                  
                  <IconButton size="small">
                    <MoreVertical size={16} />
                  </IconButton>
                </Box>
              </ListItem>
              
              {index < calls.length - 1 && (
                <Divider variant="inset" component="li" />
              )}
            </React.Fragment>
          );
        })}
      </List>
    </Box>
  );
};

export default CallHistory;