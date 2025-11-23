import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Avatar,
    Chip,
    IconButton,
    Stack,
    Divider,
    useTheme,
    alpha,
    CircularProgress,
    Pagination
} from '@mui/material';
import {
    Phone,
    Video,
    PhoneCall,
    X,
    Clock,
    History,
    PhoneIncoming,
    PhoneOutgoing,
    PhoneMissed
} from 'lucide-react';
import { Call } from '@/services/callService';

interface CallHistoryDialogProps {
    open: boolean;
    onClose: () => void;
    conversationId: string;
    callHistory: Call[];
    loading: boolean;
    onLoadMore?: (page: number) => void;
    onCallBack: (conversationId: string, type: 'audio' | 'video') => void;
    currentUserId: string;
}

const CallHistoryDialog: React.FC<CallHistoryDialogProps> = ({
    open,
    onClose,
    conversationId,
    callHistory,
    loading,
    onLoadMore,
    onCallBack,
    currentUserId
}) => {
    const theme = useTheme();
    const [page, setPage] = useState(1);

    const formatCallTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 1) {
            const minutes = Math.floor(diffInHours * 60);
            return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        } else if (diffInHours < 24) {
            const hours = Math.floor(diffInHours);
            return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    };

    const formatDuration = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const getCallIcon = (call: Call) => {
        const isInitiator = call.initiator.id === currentUserId;
        const userParticipant = call.participants.find(p => p.userId.id === currentUserId);

        if (call.status === 'missed' || (userParticipant && userParticipant.status === 'missed')) {
            return <PhoneMissed size={16} color={theme.palette.error.main} />;
        }

        if (isInitiator) {
            return <PhoneOutgoing size={16} color={theme.palette.success.main} />;
        } else {
            return <PhoneIncoming size={16} color={theme.palette.primary.main} />;
        }
    };

    const getCallStatusText = (call: Call) => {
        const isInitiator = call.initiator.id === currentUserId;
        const userParticipant = call.participants.find(p => p.userId.id === currentUserId);

        if (call.status === 'missed' || (userParticipant && userParticipant.status === 'missed')) {
            return 'Missed';
        }

        if (call.status === 'declined' || (userParticipant && userParticipant.status === 'declined')) {
            return 'Declined';
        }

        if (call.status === 'ended' && call.duration) {
            return formatDuration(call.duration);
        }

        return isInitiator ? 'Outgoing' : 'Incoming';
    };

    const getCallStatusColor = (call: Call) => {
        const userParticipant = call.participants.find(p => p.userId.id === currentUserId);

        if (call.status === 'missed' || (userParticipant && userParticipant.status === 'missed')) {
            return 'error';
        }

        if (call.status === 'declined' || (userParticipant && userParticipant.status === 'declined')) {
            return 'warning';
        }

        if (call.status === 'ended' && call.duration) {
            return 'success';
        }

        return 'default';
    };

    const getOtherParticipant = (call: Call) => {
        if (call.initiator.id !== currentUserId) {
            return call.initiator;
        }

        const otherParticipant = call.participants.find(p => p.userId.id !== currentUserId);
        return otherParticipant?.userId || call.initiator;
    };

    const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
        setPage(value);
        if (onLoadMore) {
            onLoadMore(value);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    maxHeight: '80vh'
                }
            }}
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <History size={24} color={theme.palette.primary.main} />
                        <Box>
                            <Typography variant="h6">
                                Call History
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {callHistory.length} call{callHistory.length !== 1 ? 's' : ''}
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={onClose} size="small">
                        <X size={20} />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 0 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : callHistory.length === 0 ? (
                    <Box sx={{ textAlign: 'center', p: 4 }}>
                        <History size={48} color={theme.palette.text.secondary} />
                        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                            No Call History
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Start a call to see your history here
                        </Typography>
                    </Box>
                ) : (
                    <List sx={{ p: 0 }}>
                        {callHistory.map((call, index) => {
                            const otherParticipant = getOtherParticipant(call);

                            return (
                                <React.Fragment key={call.callId}>
                                    <ListItem
                                        sx={{
                                            py: 2,
                                            px: 3,
                                            '&:hover': {
                                                backgroundColor: alpha(theme.palette.action.hover, 0.5)
                                            }
                                        }}
                                    >
                                        <ListItemAvatar>
                                            <Avatar
                                                src={otherParticipant.avatar}
                                                sx={{ width: 48, height: 48 }}
                                            >
                                                {otherParticipant.displayName.charAt(0).toUpperCase()}
                                            </Avatar>
                                        </ListItemAvatar>

                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                    <Typography variant="subtitle1" fontWeight={600}>
                                                        {otherParticipant.displayName}
                                                    </Typography>
                                                    {call.type === 'video' ? (
                                                        <Video size={16} color={theme.palette.primary.main} />
                                                    ) : (
                                                        <Phone size={16} color={theme.palette.primary.main} />
                                                    )}
                                                    {getCallIcon(call)}
                                                </Box>
                                            }
                                            secondary={
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Chip
                                                        label={getCallStatusText(call)}
                                                        size="small"
                                                        color={getCallStatusColor(call) as any}
                                                        variant="outlined"
                                                    />
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Clock size={12} />
                                                        <Typography variant="caption" color="text.secondary">
                                                            {formatCallTime(call.startedAt.toString())}
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                            }
                                        />

                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <IconButton
                                                size="small"
                                                onClick={() => onCallBack(conversationId, 'audio')}
                                                sx={{
                                                    backgroundColor: alpha(theme.palette.success.main, 0.1),
                                                    color: theme.palette.success.main,
                                                    '&:hover': {
                                                        backgroundColor: alpha(theme.palette.success.main, 0.2)
                                                    }
                                                }}
                                            >
                                                <Phone size={16} />
                                            </IconButton>

                                            <IconButton
                                                size="small"
                                                onClick={() => onCallBack(conversationId, 'video')}
                                                sx={{
                                                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                                    color: theme.palette.primary.main,
                                                    '&:hover': {
                                                        backgroundColor: alpha(theme.palette.primary.main, 0.2)
                                                    }
                                                }}
                                            >
                                                <Video size={16} />
                                            </IconButton>
                                        </Box>
                                    </ListItem>

                                    {index < callHistory.length - 1 && <Divider />}
                                </React.Fragment>
                            );
                        })}
                    </List>
                )}
            </DialogContent>

            {callHistory.length > 0 && onLoadMore && (
                <DialogActions sx={{ p: 3, pt: 1, justifyContent: 'center' }}>
                    <Pagination
                        count={10} // This should come from API response
                        page={page}
                        onChange={handlePageChange}
                        color="primary"
                        size="small"
                    />
                </DialogActions>
            )}
        </Dialog>
    );
};

export default CallHistoryDialog;