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
import { Search, Send, X } from 'lucide-react';
import { Conversation } from '@/types/message';

interface ForwardMessageDialogProps {
    open: boolean;
    onClose: () => void;
    onForward: (conversationIds: string[], message?: string) => Promise<boolean>;
    conversations: Conversation[];
    loading?: boolean;
}

const ForwardMessageDialog: React.FC<ForwardMessageDialogProps> = ({
    open,
    onClose,
    onForward,
    conversations,
    loading = false
}) => {
    const [selectedConversations, setSelectedConversations] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [forwardMessage, setForwardMessage] = useState('');
    const [forwarding, setForwarding] = useState(false);

    // Reset state when dialog opens/closes
    useEffect(() => {
        if (open) {
            setSelectedConversations([]);
            setSearchQuery('');
            setForwardMessage('');
        }
    }, [open]);

    // Filter conversations based on search query
    const filteredConversations = (conversations || []).filter((conversation: any) => {
        const searchText = searchQuery.toLowerCase();

        // Search in group name
        if (conversation.isGroup && conversation.groupName) {
            return conversation.groupName.toLowerCase().includes(searchText);
        }

        // Search in participant names
        const participantNames = conversation.participants
            .map((p: any) => `${p.displayName} ${p.username}`)
            .join(' ')
            .toLowerCase();

        return participantNames.includes(searchText);
    });

    const handleToggleConversation = (conversationId: string) => {
        setSelectedConversations(prev =>
            prev.includes(conversationId)
                ? prev.filter(id => id !== conversationId)
                : [...prev, conversationId]
        );
    };

    const handleForward = async () => {
        if (selectedConversations.length === 0) return;

        setForwarding(true);
        try {
            const success = await onForward(
                selectedConversations,
                forwardMessage.trim() || undefined
            );

            if (success) {
                onClose();
            }
        } catch (error) {
            console.error('Forward error:', error);
        } finally {
            setForwarding(false);
        }
    };

    const getConversationTitle = (conversation: Conversation) => {
        if (conversation.isGroup && conversation.groupName) {
            return conversation.groupName;
        }

        if (conversation.participants.length === 1) {
            return conversation.participants[0]?.displayName ?? 'Unknown';
        }

        return conversation.participants
            .map((p: any) => p?.displayName ?? 'Unknown')
            .join(', ');
    };

    const getConversationSubtitle = (conversation: Conversation) => {
        if (conversation.isGroup) {
            return `${conversation.participants.length} members`;
        }

        return conversation.participants[0]?.username ?? '';
    };

    const getConversationAvatar = (conversation: Conversation) => {
        if (conversation.isGroup) {
            return conversation.groupAvatar || conversation.participants[0]?.avatar || null;
        }

        return conversation.participants[0]?.avatar || null;
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
            <DialogTitle key="dialog-title">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h6">Forward Message</Typography>
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
                        placeholder="Search conversations..."
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

                {/* Selected conversations chips */}
                {selectedConversations.length > 0 && (
                    <Box sx={{ px: 2, pb: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Selected ({selectedConversations.length}):
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selectedConversations.map(id => {
                                const conversation = (conversations || []).find(c => c.id === id);
                                if (!conversation) return null;

                                return (
                                    <Chip
                                        key={id}
                                        label={getConversationTitle(conversation)}
                                        size="small"
                                        onDelete={() => handleToggleConversation(id)}
                                        deleteIcon={<X size={14} />}
                                    />
                                );
                            })}
                        </Box>
                    </Box>
                )}

                <Divider />

                {/* Conversations list */}
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : filteredConversations.length === 0 ? (
                        <Box sx={{ textAlign: 'center', p: 4 }}>
                            <Typography color="text.secondary">
                                {searchQuery ? 'No conversations found' : 'No conversations available'}
                            </Typography>
                        </Box>
                    ) : (
                        <List sx={{ p: 0 }}>
                            {filteredConversations.map((conversation) => (
                                <ListItem key={conversation.id} disablePadding>
                                    <ListItemButton
                                        onClick={() => handleToggleConversation(conversation.id)}
                                        selected={selectedConversations.includes(conversation.id)}
                                    >
                                        <Checkbox
                                            checked={selectedConversations.includes(conversation.id)}
                                            tabIndex={-1}
                                            disableRipple
                                            sx={{ mr: 1 }}
                                        />
                                        <ListItemAvatar>
                                            <Avatar
                                                src={getConversationAvatar(conversation) || undefined}
                                                sx={{ width: 40, height: 40 }}
                                            >
                                                {getConversationTitle(conversation).charAt(0).toUpperCase()}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={getConversationTitle(conversation)}
                                            secondary={getConversationSubtitle(conversation)}
                                            primaryTypographyProps={{
                                                fontWeight: conversation.isGroup ? 600 : 400
                                            }}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Box>

                {/* Optional message */}
                {selectedConversations.length > 0 && (
                    <React.Fragment>
                        <Divider />
                        <Box sx={{ p: 2 }}>
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                placeholder="Add a message (optional)..."
                                value={forwardMessage}
                                onChange={(e) => setForwardMessage(e.target.value)}
                                size="small"
                            />
                        </Box>

                    </React.Fragment>
                )}

            </DialogContent>

            <DialogActions sx={{ p: 2, pt: 1 }}>
                <Button onClick={onClose} disabled={forwarding}>
                    Cancel
                </Button>
                <Button
                    onClick={handleForward}
                    variant="contained"
                    disabled={selectedConversations.length === 0 || forwarding}
                    startIcon={forwarding ? <CircularProgress size={16} /> : <Send size={16} />}
                >
                    {forwarding ? 'Forwarding...' : `Forward${selectedConversations.length > 0 ? ` (${selectedConversations.length})` : ''}`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ForwardMessageDialog;