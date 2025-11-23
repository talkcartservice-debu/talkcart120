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
    ListItemAvatar,
    ListItemText,
    Avatar,
    IconButton,
    TextField,
    InputAdornment,
    useTheme,
    alpha,
    CircularProgress,
    Chip
} from '@mui/material';
import {
    X,
    Search,
    UserPlus,
    Phone,
    ArrowRight
} from 'lucide-react';

interface User {
    id: string;
    displayName: string;
    avatar?: string;
    status?: 'online' | 'offline' | 'busy';
}

interface CallTransferDialogProps {
    open: boolean;
    onClose: () => void;
    onTransfer: (targetUserId: string) => Promise<void>;
    availableUsers: User[];
    loading: boolean;
    currentCallId: string;
}

const CallTransferDialog: React.FC<CallTransferDialogProps> = ({
    open,
    onClose,
    onTransfer,
    availableUsers,
    loading,
    currentCallId
}) => {
    const theme = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [transferring, setTransferring] = useState(false);

    const filteredUsers = availableUsers.filter(user =>
        (user.displayName || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleTransfer = async () => {
        if (!selectedUser) return;

        setTransferring(true);
        try {
            await onTransfer(selectedUser.id);
            onClose();
        } catch (error) {
            console.error('Transfer failed:', error);
        } finally {
            setTransferring(false);
        }
    };

    const handleClose = () => {
        setSelectedUser(null);
        setSearchQuery('');
        onClose();
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'online':
                return theme.palette.success.main;
            case 'busy':
                return theme.palette.warning.main;
            case 'offline':
            default:
                return theme.palette.grey[400];
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
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
                        <UserPlus size={24} color={theme.palette.primary.main} />
                        <Box>
                            <Typography variant="h6">
                                Transfer Call
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Select a user to transfer the call to
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={handleClose} size="small">
                        <X size={20} />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
                {/* Search Field */}
                <TextField
                    fullWidth
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search size={20} />
                            </InputAdornment>
                        )
                    }}
                    sx={{ mb: 3 }}
                />

                {/* Selected User */}
                {selectedUser && (
                    <Box
                        sx={{
                            p: 2,
                            mb: 3,
                            borderRadius: 2,
                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                        }}
                    >
                        <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                            Selected for transfer:
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar src={selectedUser.avatar} sx={{ width: 40, height: 40 }}>
                                {(selectedUser.displayName || 'U').charAt(0).toUpperCase()}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle1" fontWeight={600}>
                                    {selectedUser.displayName || 'Unknown User'}
                                </Typography>
                                <Chip
                                    label={selectedUser.status || 'offline'}
                                    size="small"
                                    sx={{
                                        backgroundColor: alpha(getStatusColor(selectedUser.status), 0.1),
                                        color: getStatusColor(selectedUser.status),
                                        fontSize: '0.75rem'
                                    }}
                                />
                            </Box>
                            <ArrowRight size={20} color={theme.palette.primary.main} />
                        </Box>
                    </Box>
                )}

                {/* User List */}
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : filteredUsers.length === 0 ? (
                    <Box sx={{ textAlign: 'center', p: 4 }}>
                        <UserPlus size={48} color={theme.palette.text.secondary} />
                        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                            {searchQuery ? 'No users found' : 'No available users'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {searchQuery
                                ? 'Try adjusting your search terms'
                                : 'No users are available for call transfer'
                            }
                        </Typography>
                    </Box>
                ) : (
                    <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                        {filteredUsers.map((user) => (
                            <ListItem
                                key={user.id}
                                onClick={() => setSelectedUser(user)}
                                sx={{
                                    borderRadius: 2,
                                    mb: 1,
                                    backgroundColor: selectedUser?.id === user.id ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                                    '&:hover': {
                                        backgroundColor: alpha(theme.palette.action.hover, 0.5),
                                        cursor: 'pointer'
                                    }
                                }}
                            >
                                <ListItemAvatar>
                                    <Box sx={{ position: 'relative' }}>
                                        <Avatar
                                            src={user.avatar}
                                            sx={{ width: 48, height: 48 }}
                                        >
                                            {(user.displayName || 'U').charAt(0).toUpperCase()}
                                        </Avatar>
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                bottom: 0,
                                                right: 0,
                                                width: 12,
                                                height: 12,
                                                borderRadius: '50%',
                                                backgroundColor: getStatusColor(user.status),
                                                border: `2px solid ${theme.palette.background.paper}`
                                            }}
                                        />
                                    </Box>
                                </ListItemAvatar>

                                <ListItemText
                                    primary={
                                        <Typography variant="subtitle1" fontWeight={600}>
                                            {user.displayName || 'Unknown User'}
                                        </Typography>
                                    }
                                    secondary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                            <Chip
                                                label={user.status || 'offline'}
                                                size="small"
                                                sx={{
                                                    backgroundColor: alpha(getStatusColor(user.status), 0.1),
                                                    color: getStatusColor(user.status),
                                                    fontSize: '0.75rem'
                                                }}
                                            />
                                        </Box>
                                    }
                                />

                                {selectedUser?.id === user.id && (
                                    <Box
                                        sx={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: '50%',
                                            backgroundColor: theme.palette.primary.main,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white'
                                        }}
                                    >
                                        ✓
                                    </Box>
                                )}
                            </ListItem>
                        ))}
                    </List>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button
                    onClick={handleClose}
                    variant="outlined"
                    disabled={transferring}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleTransfer}
                    variant="contained"
                    disabled={!selectedUser || transferring}
                    startIcon={transferring ? <CircularProgress size={16} /> : <Phone />}
                    sx={{
                        minWidth: 120,
                        backgroundColor: theme.palette.primary.main,
                        '&:hover': {
                            backgroundColor: theme.palette.primary.dark
                        }
                    }}
                >
                    {transferring ? 'Transferring...' : 'Transfer Call'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CallTransferDialog;