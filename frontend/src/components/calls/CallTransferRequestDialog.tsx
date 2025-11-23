import React from 'react';
import {
    Dialog,
    DialogContent,
    Button,
    Typography,
    Box,
    Avatar,
    useTheme,
    alpha,
    Stack
} from '@mui/material';
import {
    Phone,
    PhoneOff,
    ArrowRight,
    UserPlus
} from 'lucide-react';

interface User {
    id: string;
    displayName: string;
    avatar?: string;
}

interface CallTransferRequestDialogProps {
    open: boolean;
    onAccept: () => void;
    onDecline: () => void;
    transferringUser: User;
    callType: 'audio' | 'video';
    callId: string;
}

const CallTransferRequestDialog: React.FC<CallTransferRequestDialogProps> = ({
    open,
    onAccept,
    onDecline,
    transferringUser,
    callType,
    callId
}) => {
    const theme = useTheme();

    return (
        <Dialog
            open={open}
            onClose={onDecline}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                }
            }}
            BackdropProps={{
                sx: {
                    backgroundColor: alpha(theme.palette.common.black, 0.7),
                    backdropFilter: 'blur(5px)'
                }
            }}
        >
            <DialogContent sx={{ p: 4, textAlign: 'center' }}>
                {/* Transfer Icon */}
                <Box
                    sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 24px',
                        border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`
                    }}
                >
                    <UserPlus size={40} color={theme.palette.primary.main} />
                </Box>

                {/* Title */}
                <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
                    Call Transfer Request
                </Typography>

                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                    You're receiving a transferred {callType} call
                </Typography>

                {/* Transfer Flow Visualization */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 3,
                        mb: 4,
                        p: 3,
                        borderRadius: 2,
                        backgroundColor: alpha(theme.palette.background.paper, 0.5),
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                    }}
                >
                    {/* Transferring User */}
                    <Box sx={{ textAlign: 'center' }}>
                        <Avatar
                            src={transferringUser.avatar}
                            sx={{
                                width: 60,
                                height: 60,
                                mb: 1,
                                border: `3px solid ${theme.palette.primary.main}`
                            }}
                        >
                            {transferringUser.displayName.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="subtitle2" fontWeight={600}>
                            {transferringUser.displayName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Transferring
                        </Typography>
                    </Box>

                    {/* Arrow */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            color: theme.palette.primary.main
                        }}
                    >
                        <ArrowRight size={24} />
                        <Phone size={20} />
                        <ArrowRight size={24} />
                    </Box>

                    {/* You */}
                    <Box sx={{ textAlign: 'center' }}>
                        <Box
                            sx={{
                                width: 60,
                                height: 60,
                                borderRadius: '50%',
                                backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                                border: `3px solid ${theme.palette.secondary.main}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mb: 1
                            }}
                        >
                            <Typography variant="h6" fontWeight={700} color="secondary.main">
                                You
                            </Typography>
                        </Box>
                        <Typography variant="subtitle2" fontWeight={600}>
                            Receiving
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Transfer target
                        </Typography>
                    </Box>
                </Box>

                {/* Call Info */}
                <Box
                    sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: alpha(theme.palette.info.main, 0.1),
                        border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
                        mb: 4
                    }}
                >
                    <Typography variant="body2" color="info.main">
                        <strong>Call ID:</strong> {callId.slice(-8)}
                    </Typography>
                    <Typography variant="body2" color="info.main">
                        <strong>Type:</strong> {callType.charAt(0).toUpperCase() + callType.slice(1)} Call
                    </Typography>
                </Box>

                {/* Action Buttons */}
                <Stack direction="row" spacing={2} justifyContent="center">
                    <Button
                        onClick={onDecline}
                        variant="outlined"
                        size="large"
                        startIcon={<PhoneOff />}
                        sx={{
                            minWidth: 140,
                            borderColor: theme.palette.error.main,
                            color: theme.palette.error.main,
                            '&:hover': {
                                borderColor: theme.palette.error.dark,
                                backgroundColor: alpha(theme.palette.error.main, 0.1)
                            }
                        }}
                    >
                        Decline
                    </Button>

                    <Button
                        onClick={onAccept}
                        variant="contained"
                        size="large"
                        startIcon={<Phone />}
                        sx={{
                            minWidth: 140,
                            backgroundColor: theme.palette.success.main,
                            '&:hover': {
                                backgroundColor: theme.palette.success.dark,
                                transform: 'scale(1.05)'
                            },
                            transition: 'all 0.2s ease-in-out'
                        }}
                    >
                        Accept Transfer
                    </Button>
                </Stack>

                {/* Helper Text */}
                <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
                    Accepting will connect you to the ongoing call
                </Typography>
            </DialogContent>
        </Dialog>
    );
};

export default CallTransferRequestDialog;