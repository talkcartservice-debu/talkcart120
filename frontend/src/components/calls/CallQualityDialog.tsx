import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Rating,
    TextField,
    Stack,
    Divider,
    useTheme,
    alpha
} from '@mui/material';
import {
    Phone,
    Video,
    Wifi,
    MessageSquare
} from 'lucide-react';

interface CallQualityDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (quality: {
        audioQuality: number;
        videoQuality?: number;
        connectionQuality: number;
        feedback?: string;
    }) => Promise<void>;
    callType: 'audio' | 'video';
    callDuration?: number;
}

const CallQualityDialog: React.FC<CallQualityDialogProps> = ({
    open,
    onClose,
    onSubmit,
    callType,
    callDuration
}) => {
    const theme = useTheme();
    const [audioQuality, setAudioQuality] = useState<number>(5);
    const [videoQuality, setVideoQuality] = useState<number>(5);
    const [connectionQuality, setConnectionQuality] = useState<number>(5);
    const [feedback, setFeedback] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await onSubmit({
                audioQuality,
                videoQuality: callType === 'video' ? videoQuality : undefined,
                connectionQuality,
                feedback: feedback.trim() || undefined
            });
            onClose();
        } catch (error) {
            console.error('Failed to submit call quality:', error);
        } finally {
            setSubmitting(false);
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

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
                }
            }}
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {callType === 'video' ? (
                        <Video size={24} color={theme.palette.primary.main} />
                    ) : (
                        <Phone size={24} color={theme.palette.primary.main} />
                    )}
                    <Box>
                        <Typography variant="h6">
                            Rate Your Call Experience
                        </Typography>
                        {callDuration && (
                            <Typography variant="body2" color="text.secondary">
                                Call duration: {formatDuration(callDuration)}
                            </Typography>
                        )}
                    </Box>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ pb: 2 }}>
                <Stack spacing={3}>
                    {/* Audio Quality */}
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Phone size={18} />
                            <Typography variant="subtitle2" fontWeight={600}>
                                Audio Quality
                            </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            How clear was the audio during the call?
                        </Typography>
                        <Rating
                            value={audioQuality}
                            onChange={(_, newValue) => setAudioQuality(newValue || 1)}
                            size="large"
                            sx={{
                                '& .MuiRating-iconFilled': {
                                    color: theme.palette.primary.main,
                                },
                            }}
                        />
                    </Box>

                    {/* Video Quality (only for video calls) */}
                    {callType === 'video' && (
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Video size={18} />
                                <Typography variant="subtitle2" fontWeight={600}>
                                    Video Quality
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                How clear was the video during the call?
                            </Typography>
                            <Rating
                                value={videoQuality}
                                onChange={(_, newValue) => setVideoQuality(newValue || 1)}
                                size="large"
                                sx={{
                                    '& .MuiRating-iconFilled': {
                                        color: theme.palette.primary.main,
                                    },
                                }}
                            />
                        </Box>
                    )}

                    {/* Connection Quality */}
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Wifi size={18} />
                            <Typography variant="subtitle2" fontWeight={600}>
                                Connection Stability
                            </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            How stable was your connection during the call?
                        </Typography>
                        <Rating
                            value={connectionQuality}
                            onChange={(_, newValue) => setConnectionQuality(newValue || 1)}
                            size="large"
                            sx={{
                                '& .MuiRating-iconFilled': {
                                    color: theme.palette.primary.main,
                                },
                            }}
                        />
                    </Box>

                    <Divider />

                    {/* Feedback */}
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <MessageSquare size={18} />
                            <Typography variant="subtitle2" fontWeight={600}>
                                Additional Feedback (Optional)
                            </Typography>
                        </Box>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            placeholder="Tell us about your call experience..."
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                }
                            }}
                        />
                    </Box>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button
                    onClick={onClose}
                    disabled={submitting}
                    sx={{ borderRadius: 2 }}
                >
                    Skip
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={submitting}
                    sx={{
                        borderRadius: 2,
                        px: 3,
                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                        '&:hover': {
                            background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                        }
                    }}
                >
                    {submitting ? 'Submitting...' : 'Submit Rating'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CallQualityDialog;