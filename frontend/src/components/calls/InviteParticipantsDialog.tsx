import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    ListItemButton,
    Avatar,
    Checkbox,
    TextField,
    Typography,
    Box,
    Chip,
    CircularProgress,
    InputAdornment,
    Divider
} from '@mui/material';
import { Search, UserPlus, X } from 'lucide-react';
import { User, userService } from '@/services/userApi';

interface InviteParticipantsDialogProps {
    open: boolean;
    onClose: () => void;
    onInvite: (userIds: string[]) => Promise<void>;
    excludeUserIds: string[]; // IDs of users already in the call or invited
    loading?: boolean;
}

const InviteParticipantsDialog: React.FC<InviteParticipantsDialogProps> = ({
    open,
    onClose,
    onInvite,
    excludeUserIds,
    loading = false
}) => {
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [inviting, setInviting] = useState(false);

    // Fetch users when dialog opens
    useEffect(() => {
        if (open) {
            fetchUsers();
        }
    }, [open]);

    // Reset state when dialog opens/closes
    useEffect(() => {
        if (open) {
            setSelectedUsers([]);
            setSearchQuery('');
        }
    }, [open]);

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            // Get contacts first, then suggested users if needed
            const contacts = await userService.getContacts(50);
            let allUsers = [...contacts];

            // If we have less than 20 contacts, add suggested users
            if (contacts.length < 20) {
                const suggested = await userService.getSuggestedUsers(20 - contacts.length);
                // Avoid duplicates
                const existingIds = new Set(contacts.map(c => c.id));
                const uniqueSuggested = suggested.filter(u => !existingIds.has(u.id));
                allUsers = [...allUsers, ...uniqueSuggested];
            }

            setUsers(allUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoadingUsers(false);
        }
    };

    // Filter users based on search query and exclude already invited/in-call users
    const filteredUsers = users.filter(user => {
        // Exclude users already in the call
        if (excludeUserIds.includes(user.id)) return false;

        if (!searchQuery) return true;

        const searchText = searchQuery.toLowerCase();
        return (user.displayName || '').toLowerCase().includes(searchText) ||
               (user.username || '').toLowerCase().includes(searchText);
    });

    const handleToggleUser = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleInvite = async () => {
        if (selectedUsers.length === 0) return;

        setInviting(true);
        try {
            await onInvite(selectedUsers);
            onClose();
        } catch (error) {
            console.error('Error inviting participants:', error);
        } finally {
            setInviting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: { height: '80vh', maxHeight: 600 }
            }}
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h6">Invite Participants</Typography>
                    <Button
                        onClick={onClose}
                        size="small"
                        sx={{ minWidth: 'auto', p: 1 }}
                    >
                        <X size={20} />
                    </Button>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 0 }}>
                {/* Search */}
                <Box sx={{ p: 2, pb: 1 }}>
                    <TextField
                        fullWidth
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        size="small"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search size={20} />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>

                {/* Selected users chips */}
                {selectedUsers.length > 0 && (
                    <Box sx={{ px: 2, pb: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Selected ({selectedUsers.length}):
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selectedUsers.map(id => {
                                const user = users.find(u => u.id === id);
                                if (!user) return null;

                                return (
                                    <Chip
                                        key={id}
                                        label={user.displayName}
                                        size="small"
                                        onDelete={() => handleToggleUser(id)}
                                        deleteIcon={<X size={14} />}
                                    />
                                );
                            })}
                        </Box>
                    </Box>
                )}

                <Divider />

                {/* Users list */}
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                    {loadingUsers ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : filteredUsers.length === 0 ? (
                        <Box sx={{ textAlign: 'center', p: 4 }}>
                            <Typography color="text.secondary">
                                {searchQuery ? 'No users found' : 'No users available to invite'}
                            </Typography>
                        </Box>
                    ) : (
                        <List sx={{ p: 0 }}>
                            {filteredUsers.map((user) => (
                                <ListItem key={user.id} disablePadding>
                                    <ListItemButton
                                        onClick={() => handleToggleUser(user.id)}
                                        selected={selectedUsers.includes(user.id)}
                                    >
                                        <Checkbox
                                            checked={selectedUsers.includes(user.id)}
                                            tabIndex={-1}
                                            disableRipple
                                            sx={{ mr: 1 }}
                                        />
                                        <ListItemAvatar>
                                            <Avatar
                                                src={user.avatar || undefined}
                                                sx={{ width: 40, height: 40 }}
                                            >
                                                {user.displayName.charAt(0).toUpperCase()}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={user.displayName}
                                            secondary={`@${user.username}`}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2, pt: 1 }}>
                <Button onClick={onClose} disabled={inviting}>
                    Cancel
                </Button>
                <Button
                    onClick={handleInvite}
                    variant="contained"
                    disabled={selectedUsers.length === 0 || inviting || loading}
                    startIcon={inviting ? <CircularProgress size={16} /> : <UserPlus size={16} />}
                >
                    {inviting ? 'Inviting...' : `Invite${selectedUsers.length > 0 ? ` (${selectedUsers.length})` : ''}`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default InviteParticipantsDialog;