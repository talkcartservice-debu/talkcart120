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
    CircularProgress
} from '@mui/material';
import {
    Phone,
    Video,
    PhoneCall,
    X,
    Clock,
    PhoneMissed
} from 'lucide-react';
import { Call } from '@/services/callService';

interface MissedCallsDialogProps {
    open: boolean;
    onClose: () => void;
    missedCalls: Call[];
    loading: boolean;
    onMarkAsSeen: (callIds: string[]) => Promise<void>;
    onCallBack: (conversationId: string, type: 'audio' | 'video') => void;
}

const MissedCallsDialog: React.FC<MissedCallsDialogProps> = ({
    open,
    onClose,
    missedCalls,
    loading,
    onMarkAsSeen,
    onCallBack
}) => {
    const theme = useTheme();
    const [selectedCalls, setSelectedCalls] = useState<string[]>([]);

    useEffect(() => {
        if (open) {
            setSelectedCalls([]);
        }
    }, [open]);

    const handleMarkAllAsSeen = async () => {
        const callIds = missedCalls.map(call => call.callId);
        await onMarkAsSeen(callIds);
        onClose();
    };

    const handleMarkSelectedAsSeen = async () => {
        if (selectedCalls.length > 0) {
            await onMarkAsSeen(selectedCalls);
            setSelectedCalls([]);
        }
    };

    const toggleCallSelection = (callId: string) => {
        setSelectedCalls(prev =>
            prev.includes(callId)
                ? prev.filter(id => id !== callId)
                : [...prev, callId]
        );
    };

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

    const getCallStatusText = (call: Call) => {
        const participant = call.participants.find(p => p.status === 'declined' || p.status === 'missed');
        if (participant?.status === 'declined') {
            return 'Declined';
        }
        return 'Missed';
    };

    const getCallStatusColor = (call: Call) => {
        const participant = call.participants.find(p => p.status === 'declined' || p.status === 'missed');
        if (participant?.status === 'declined') {
            return 'warning';
        }
        return 'error';
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
                        <PhoneMissed size={24} color={theme.palette.error.main} />
                        <Box>
                            <Typography variant="h6">
                                Missed Calls
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {missedCalls.length} missed call{missedCalls.length !== 1 ? 's' : ''}
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
                ) : missedCalls.length === 0 ? (
                    <Box sx={{ textAlign: 'center', p: 4 }}>
                        <PhoneMissed size={48} color={theme.palette.text.secondary} />
                        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                            No Missed Calls
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            You're all caught up!
                        </Typography>
                    </Box>
                ) : (
                    <List sx={{ p: 0 }}>
                        {missedCalls.map((call, index) => (
                            <React.Fragment key={call.callId}>
                                <ListItem
                                    sx={{
                                        py: 2,
                                        px: 3,
                                        cursor: 'pointer',
                                        backgroundColor: selectedCalls.includes(call.callId)
                                            ? alpha(theme.palette.primary.main, 0.1)
                                            : 'transparent',
                                        '&:hover': {
                                            backgroundColor: alpha(theme.palette.action.hover, 0.5)
                                        }
                                    }}
                                    onClick={() => toggleCallSelection(call.callId)}
                                >
                                    <ListItemAvatar>
                                        <Avatar
                                            src={call.initiator.avatar}
                                            sx={{ width: 48, height: 48 }}
                                        >
                                            {call.initiator.displayName.charAt(0).toUpperCase()}
                                        </Avatar>
                                    </ListItemAvatar>

                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                <Typography variant="subtitle1" fontWeight={600}>
                                                    {call.initiator.displayName}
                                                </Typography>
                                                {call.type === 'video' ? (
                                                    <Video size={16} color={theme.palette.primary.main} />
                                                ) : (
                                                    <Phone size={16} color={theme.palette.primary.main} />
                                                )}
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
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onCallBack(call.conversationId, 'audio');
                                            }}
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

                                        {call.type === 'video' && (
                                            <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onCallBack(call.conversationId, 'video');
                                                }}
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
                                        )}
                                    </Box>
                                </ListItem>

                                {index < missedCalls.length - 1 && <Divider />}
                            </React.Fragment>
                        ))}
                    </List>
                )}
            </DialogContent>

            {missedCalls.length > 0 && (
                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button onClick={onClose}>
                        Close
                    </Button>

                    {selectedCalls.length > 0 && (
                        <Button
                            onClick={handleMarkSelectedAsSeen}
                            variant="outlined"
                            sx={{ borderRadius: 2 }}
                        >
                            Mark Selected as Seen ({selectedCalls.length})
                        </Button>
                    )}

                    <Button
                        onClick={handleMarkAllAsSeen}
                        variant="contained"
                        sx={{
                            borderRadius: 2,
                            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                        }}
                    >
                        Mark All as Seen
                    </Button>
                </DialogActions>
            )}
        </Dialog>
    );
};

export default MissedCallsDialog;