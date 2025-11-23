import React, { useState, useEffect } from 'react';
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
    ListItemIcon,
    ListItemText,
    Alert,
    Chip,
    useTheme,
    alpha
} from '@mui/material';
import {
    Bell,
    Volume2,
    Vibrate,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Settings
} from 'lucide-react';
import { notificationService } from '@/services/notificationService';

interface CallPermissionsDialogProps {
    open: boolean;
    onClose: () => void;
    onPermissionsGranted: () => void;
}

const CallPermissionsDialog: React.FC<CallPermissionsDialogProps> = ({
    open,
    onClose,
    onPermissionsGranted
}) => {
    const theme = useTheme();
    const [permissions, setPermissions] = useState({
        notification: 'default' as NotificationPermission,
        audio: false
    });
    const [isRequesting, setIsRequesting] = useState(false);
    const [support, setSupport] = useState({
        notifications: false,
        vibration: false,
        audio: false
    });

    useEffect(() => {
        if (open) {
            // Check support
            const supportStatus = notificationService.isSupported();
            setSupport(supportStatus);

            // Check current permissions
            const permissionStatus = notificationService.getPermissionStatus();
            setPermissions(permissionStatus);
        }
    }, [open]);

    const handleRequestPermissions = async () => {
        setIsRequesting(true);

        try {
            const results = await notificationService.requestPermissions();
            setPermissions(results);

            // If all permissions are granted, call the callback
            if (results.notification === 'granted' && results.audio) {
                onPermissionsGranted();
            }
        } catch (error) {
            console.error('Failed to request permissions:', error);
        } finally {
            setIsRequesting(false);
        }
    };

    const getPermissionIcon = (granted: boolean, supported: boolean) => {
        if (!supported) return <XCircle size={20} color={theme.palette.error.main} />;
        if (granted) return <CheckCircle size={20} color={theme.palette.success.main} />;
        return <AlertTriangle size={20} color={theme.palette.warning.main} />;
    };

    const getPermissionStatus = (granted: boolean, supported: boolean) => {
        if (!supported) return { text: 'Not Supported', color: 'error' as const };
        if (granted) return { text: 'Granted', color: 'success' as const };
        return { text: 'Not Granted', color: 'warning' as const };
    };

    const allPermissionsGranted = permissions.notification === 'granted' && permissions.audio;
    const hasRequiredSupport = support.notifications && support.audio;

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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Settings size={24} color={theme.palette.primary.main} />
                    <Box>
                        <Typography variant="h6">
                            Call Permissions
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Grant permissions for the best call experience
                        </Typography>
                    </Box>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
                {!hasRequiredSupport && (
                    <Alert severity="warning" sx={{ mb: 3 }}>
                        Some features may not be available on this device or browser.
                    </Alert>
                )}

                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    Required Permissions:
                </Typography>

                <List sx={{ mb: 3 }}>
                    {/* Notifications */}
                    <ListItem
                        sx={{
                            borderRadius: 2,
                            mb: 1,
                            backgroundColor: alpha(theme.palette.background.paper, 0.5),
                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                        }}
                    >
                        <ListItemIcon>
                            <Bell size={24} />
                        </ListItemIcon>
                        <ListItemText
                            primary="Notifications"
                            secondary="Show incoming call notifications even when the app is in the background"
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getPermissionIcon(permissions.notification === 'granted', support.notifications)}
                            <Chip
                                label={getPermissionStatus(permissions.notification === 'granted', support.notifications).text}
                                size="small"
                                color={getPermissionStatus(permissions.notification === 'granted', support.notifications).color}
                                variant="outlined"
                            />
                        </Box>
                    </ListItem>

                    {/* Audio */}
                    <ListItem
                        sx={{
                            borderRadius: 2,
                            mb: 1,
                            backgroundColor: alpha(theme.palette.background.paper, 0.5),
                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                        }}
                    >
                        <ListItemIcon>
                            <Volume2 size={24} />
                        </ListItemIcon>
                        <ListItemText
                            primary="Audio Playback"
                            secondary="Play ringtones and call sounds"
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getPermissionIcon(permissions.audio, support.audio)}
                            <Chip
                                label={getPermissionStatus(permissions.audio, support.audio).text}
                                size="small"
                                color={getPermissionStatus(permissions.audio, support.audio).color}
                                variant="outlined"
                            />
                        </Box>
                    </ListItem>

                    {/* Vibration */}
                    <ListItem
                        sx={{
                            borderRadius: 2,
                            backgroundColor: alpha(theme.palette.background.paper, 0.5),
                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                        }}
                    >
                        <ListItemIcon>
                            <Vibrate size={24} />
                        </ListItemIcon>
                        <ListItemText
                            primary="Vibration"
                            secondary="Vibrate device for incoming calls (mobile devices)"
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getPermissionIcon(true, support.vibration)}
                            <Chip
                                label={support.vibration ? 'Available' : 'Not Available'}
                                size="small"
                                color={support.vibration ? 'success' : 'default'}
                                variant="outlined"
                            />
                        </Box>
                    </ListItem>
                </List>

                {allPermissionsGranted && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        All permissions granted! You'll receive notifications, ringtones, and vibrations for incoming calls.
                    </Alert>
                )}

                {!allPermissionsGranted && hasRequiredSupport && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Click "Grant Permissions" to enable call notifications and sounds.
                    </Alert>
                )}

                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    <strong>Note:</strong> You can change these permissions later in your browser settings.
                </Typography>
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button onClick={onClose} variant="outlined">
                    Skip
                </Button>

                {allPermissionsGranted ? (
                    <Button
                        onClick={onPermissionsGranted}
                        variant="contained"
                        sx={{
                            backgroundColor: theme.palette.success.main,
                            '&:hover': {
                                backgroundColor: theme.palette.success.dark
                            }
                        }}
                    >
                        Continue
                    </Button>
                ) : (
                    <Button
                        onClick={handleRequestPermissions}
                        variant="contained"
                        disabled={isRequesting || !hasRequiredSupport}
                        sx={{
                            minWidth: 140,
                            backgroundColor: theme.palette.primary.main,
                            '&:hover': {
                                backgroundColor: theme.palette.primary.dark
                            }
                        }}
                    >
                        {isRequesting ? 'Requesting...' : 'Grant Permissions'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default CallPermissionsDialog;