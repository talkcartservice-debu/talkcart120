import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, Conversation } from '@/types/message';
import { useAuth } from '@/contexts/AuthContext';
import socketService from '@/services/socketService';
import {
    getMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    markMessageAsRead,
    markAllAsRead as markAllMessagesAsRead, // Rename to avoid conflict
    sendTypingIndicator
} from '@/services/messageApi';
import { getConversations, getConversation } from '@/services/conversationApi';

interface UseMessagingOptions {
    conversationId?: string;
    autoConnect?: boolean;
    pageSize?: number;
}

interface TypingUser {
    userId: string;
    displayName: string;
}

export const useMessaging = (options: UseMessagingOptions = {}) => {
    const { conversationId, autoConnect = true, pageSize = 50 } = options;
    const { user } = useAuth();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    // State
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Refs
    const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
    const currentPage = useRef(1);

    // Initialize socket connection
    useEffect(() => {
        // Get token directly from localStorage to ensure we have the latest value
        const currentToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        
        console.log('useMessaging useEffect triggered:', { autoConnect, user: !!user, token: !!currentToken, connected });
        
        if (autoConnect && user && currentToken && !connected) {
            console.log('Initializing socket connection');
            initializeSocket();
        }
    }, [user, autoConnect, connected]);

    // Reconnect socket when token changes
    useEffect(() => {
        // Get token directly from localStorage to ensure we have the latest value
        const currentToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        
        if (autoConnect && user && currentToken && !connected) {
            initializeSocket();
        }
    }, [autoConnect, connected]);

    // Load conversation when conversationId changes
    useEffect(() => {
        if (conversationId) {
            loadConversation(conversationId);
        }
    }, [conversationId]);

    // Load messages when currentConversation changes
    useEffect(() => {
        // Validate that currentConversation ID exists before loading messages
        if (currentConversation?.id && currentConversation.id !== 'undefined') {
            console.log('Loading messages for conversation:', currentConversation.id);
            loadMessages(currentConversation.id);
        } else if (currentConversation?.id === 'undefined') {
            console.error('Invalid conversation ID detected:', currentConversation);
        }
    }, [currentConversation?.id]);

    // Effects
    useEffect(() => {
        console.log('Initializing messaging hook');
        console.log('User ID:', user?.id);
        initializeSocket();

        return () => {
            console.log('Cleaning up socket connection');
            socketService.disconnect();
            setConnected(false);
        };
    }, [user?.id]);

    // Load conversations on mount
    useEffect(() => {
        console.log('Loading conversations');
        // Add a small delay to ensure authentication is complete
        const timer = setTimeout(() => {
            loadConversations();
        }, 100);
        
        return () => clearTimeout(timer);
    }, []);

    // Setup socket event listeners
    const setupSocketListeners = () => {
        console.log('Setting up socket event listeners');
        // New message received (regular conversations)
        socketService.on('message:new', (data: { message: Message; conversationId: string }) => {
            console.log('Received new message:', data);
            console.log('Current conversation ID:', currentConversation?.id);
            console.log('Message conversation ID:', data.conversationId);
            console.log('Conversation IDs match:', data.conversationId === currentConversation?.id);
            console.log('Conversation ID types:', typeof data.conversationId, typeof currentConversation?.id);
            
            // Ensure message has all required properties for display
            const messageWithDefaults = {
                ...data.message,
                reactions: data.message.reactions || [],
                readBy: data.message.readBy || [],
                media: data.message.media || [],
                isOwn: data.message.senderId === user?.id,
                ...(data.message.replyTo ? { replyTo: data.message.replyTo } : {}),
                sender: data.message.sender || {
                    id: data.message.senderId,
                    displayName: 'Unknown User',
                    username: 'unknown',
                    avatar: null,
                    isVerified: false
                }
            };
            
            // Try to get sender info from conversation participants if not provided
            if (!data.message.sender && currentConversation) {
                const senderParticipant = currentConversation.participants.find(p => p.id === data.message.senderId);
                if (senderParticipant) {
                    messageWithDefaults.sender = senderParticipant;
                } else if (user && data.message.senderId === user.id) {
                    // If sender is current user
                    messageWithDefaults.sender = {
                        id: user.id,
                        displayName: user.displayName || user.username || 'You',
                        username: user.username || 'unknown',
                        avatar: user.avatar || null,
                        isVerified: user.isVerified || false
                    };
                }
            }
            
            if (data.conversationId === currentConversation?.id) {
                console.log('Adding message to current conversation:', messageWithDefaults);
                // Check if this is replacing a temporary message
                setMessages(prev => {
                    // Find a temporary message with the same temporary ID or matching content/sender
                    const existingIndex = prev.findIndex(msg => 
                        (msg.id.startsWith('temp-') && 
                         ((msg.content === messageWithDefaults.content && msg.senderId === messageWithDefaults.senderId) ||
                          msg.id === `temp-${messageWithDefaults.createdAt}`)) // Try to match by timestamp if available
                    );
                    if (existingIndex !== -1) {
                        // Clear the timeout for the temporary message
                        const tempMessage = prev[existingIndex];
                        if ((tempMessage as any)._timeoutId) {
                            clearTimeout((tempMessage as any)._timeoutId);
                        }
                        
                        // Replace the temporary message with the real one
                        const newMessages = [...prev];
                        newMessages[existingIndex] = messageWithDefaults;
                        console.log('Replaced temporary message with real message:', messageWithDefaults.id);
                        return newMessages;
                    } else {
                        // Add the new message
                        return [...prev, messageWithDefaults];
                    }
                });
            }

            // Update conversation's last message
            setConversations(prev => prev.map(conv =>
                conv.id === data.conversationId
                    ? { ...conv, lastMessage: messageWithDefaults, lastActivity: new Date().toISOString() }
                    : conv
            ));
        });

        // Message edited
        socketService.on('message:edited', (data: { messageId: string; content: string; isEdited: boolean; editedAt: string }) => {
            setMessages(prev => prev.map(msg =>
                msg.id === data.messageId
                    ? { ...msg, content: data.content, isEdited: data.isEdited, editedAt: data.editedAt }
                    : msg
            ));
        });

        // Message deleted
        socketService.on('message:delete', (data: { messageId: string }) => {
            setMessages(prev => prev.map(msg =>
                msg.id === data.messageId
                    ? { ...msg, isDeleted: true, content: 'This message was deleted' }
                    : msg
            ));
        });

        // Message reaction
        socketService.on('message:reaction', (data: { messageId: string; reactions: any[] }) => {
            setMessages(prev => prev.map(msg =>
                msg.id === data.messageId
                    ? { ...msg, reactions: data.reactions }
                    : msg
            ));
        });

        // Message read
        socketService.on('message:read', (data: { messageId: string; readBy: any[] }) => {
            setMessages(prev => prev.map(msg =>
                msg.id === data.messageId
                    ? { ...msg, readBy: data.readBy }
                    : msg
            ));
        });

        // Typing indicator
        socketService.on('typing', (data: { conversationId: string; userId: string; displayName: string; isTyping: boolean }) => {
            if (data.conversationId !== currentConversation?.id) return;

            setTypingUsers(prev => {
                if (data.isTyping) {
                    // Add user to typing list if not already there
                    if (!prev.find(u => u.userId === data.userId)) {
                        return [...prev, { userId: data.userId, displayName: data.displayName }];
                    }
                    return prev;
                } else {
                    // Remove user from typing list
                    return prev.filter(u => u.userId !== data.userId);
                }
            });

            // Clear typing indicator after timeout
            if (data.isTyping) {
                if (typingTimeoutRef.current[data.userId]) {
                    clearTimeout(typingTimeoutRef.current[data.userId]);
                }

                typingTimeoutRef.current[data.userId] = setTimeout(() => {
                    setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
                    delete typingTimeoutRef.current[data.userId];
                }, 0); // No timeout for typing indicators
            }
        });

        // Conversation updates
        socketService.on('conversation:update', (data: { conversation: Conversation }) => {
            // Handle case where API returns _id instead of id (MongoDB convention)
            let updatedConversation = data.conversation;
            if (!updatedConversation.id && updatedConversation._id) {
                updatedConversation = {
                    ...updatedConversation,
                    id: updatedConversation._id
                };
            }
            
            setConversations(prev => prev.map(conv =>
                conv.id === updatedConversation.id ? updatedConversation : conv
            ));

            if (updatedConversation.id === currentConversation?.id) {
                setCurrentConversation(updatedConversation);
            }
        });
    };

    // Socket initialization
    const initializeSocket = async () => {
        // Get token directly from localStorage to ensure we have the latest value
        const currentToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        
        console.log('Socket initialization check:', { user: !!user, token: !!currentToken });
        
        if (!user || !currentToken) {
            console.log('Cannot initialize socket: missing user or token');
            if (!currentToken) {
                setError('Authentication required. Please log in again.');
            }
            return;
        }

        try {
            console.log('Initializing socket connection with user:', user.id);
            await socketService.connect(currentToken, user.id);
            console.log('Socket connected successfully');
            setConnected(true);
            console.log('Connected state set to true');
            setupSocketListeners();
        } catch (error: any) {
            console.error('Failed to connect to socket:', error);
            const errorMessage = error?.message || 'Failed to connect to real-time messaging';
            setError(errorMessage);
            
            // If it's an authentication error, redirect to login
            if (errorMessage.toLowerCase().includes('auth') || errorMessage.toLowerCase().includes('token')) {
                console.log('Authentication error detected, redirecting to login');
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('user');
                    window.location.href = '/auth/login?expired=1';
                }
            }
        }
    };

    // Load conversations
    const loadConversations = async (retryCount = 0) => {
        setLoading(true);
        setError(null);

        try {
            console.log('Attempting to load conversations...');
            const response = await getConversations({ limit: 50 });
            console.log('Conversations API response:', response);
            if (response.success) {
                // Validate that all conversations have valid IDs and map _id to id if needed
                const validConversations = response.data.conversations
                    // First map _id to id if needed
                    .map(conv => {
                        // Handle case where API returns _id instead of id (MongoDB convention)
                        if (!conv.id && conv._id) {
                            return {
                                ...conv,
                                id: conv._id
                            };
                        }
                        return conv;
                    })
                    // Then filter out conversations with invalid IDs
                    .filter(conv => {
                        if (!conv.id || conv.id === 'undefined') {
                            console.error('Invalid conversation ID found:', conv);
                            return false;
                        }
                        return true;
                    });
                
                setConversations(validConversations);
                console.log('Conversations loaded:', validConversations);
            } else {
                console.error('Failed to load conversations - API returned success: false');
                setError('Failed to load conversations');
            }
        } catch (error: any) {
            console.error('Error loading conversations:', error);
            // Handle timeout and network errors specifically
            if (error.timeout || error.networkError) {
                setError(error.error || 'Network error. Please check your connection and try again.');
            } else if (error.message && error.message.includes('Failed to connect')) {
                // Handle connection errors specifically
                setError('Failed to connect to messaging service. Please check your network connection and try again.');
            } else {
                // Retry on network errors up to 3 times
                const isNetworkError = error.message && (error.message.includes('timeout') || error.message.includes('network') || error.message.includes('Failed to fetch'));
                if (isNetworkError && retryCount < 3) {
                    console.log(`Retrying to load conversations (${retryCount + 1}/3)...`);
                    setTimeout(() => {
                        loadConversations(retryCount + 1);
                    }, 5000 * (retryCount + 1)); // Longer delays: 5s, 10s, 15s
                    return; // Don't set loading to false yet
                }
                setError(error.error || error.message || 'Failed to load conversations');
            }
        } finally {
            setLoading(false);
        }
    };

    // Load specific conversation
    const loadConversation = async (convId: string) => {
        // Validate that convId is provided and not empty
        if (!convId || convId === 'undefined') {
            console.error('Invalid conversation ID provided:', convId);
            setError('Invalid conversation ID');
            return;
        }
        
        console.log('Loading conversation:', convId);
        console.log('Socket connected:', connected);
        // First try to find in existing conversations
        let conversation = conversations.find(c => c.id === convId);
        
        if (!conversation) {
            // If not found, fetch specific conversation from API
            try {
                console.log('Fetching conversation from API:', convId);
                const response = await getConversation(convId);
                console.log('API response for conversation:', response);
                if (response.success) {
                    conversation = response.data;
                    console.log('Conversation data:', conversation);
                    
                    // Handle case where API returns _id instead of id (MongoDB convention)
                    if (!conversation.id && conversation._id) {
                        conversation = {
                            ...conversation,
                            id: conversation._id
                        };
                    }
                    
                    // Validate that the conversation has a valid ID
                    if (!conversation.id || conversation.id === 'undefined') {
                        console.error('Invalid conversation ID from API:', conversation);
                        setError('Invalid conversation data received from server');
                        return;
                    }
                    
                    // Add to conversations list
                    setConversations(prev => {
                        // Remove if already exists to avoid duplicates
                        const filtered = prev.filter(c => c.id !== convId);
                        return [...filtered, conversation as Conversation];
                    });
                } else {
                    console.error('Failed to fetch conversation: API returned success: false');
                    setError('Failed to load conversation');
                }
            } catch (error: any) {
                console.error('Error fetching conversation:', error);
                // Handle timeout and network errors specifically
                if (error.timeout || error.networkError) {
                    setError(error.error || 'Network error. Please check your connection and try again.');
                } else if (error.message && error.message.includes('Failed to connect')) {
                    // Handle connection errors specifically
                    setError('Failed to connect to messaging service. Please check your network connection and try again.');
                } else {
                    setError(error.error || error.message || 'Failed to load conversation');
                }
            }
        }
        
        if (conversation) {
            console.log('Setting current conversation:', conversation);
            setCurrentConversation(conversation);
            console.log('Current conversation set to:', conversation.id);

            // Join conversation room for real-time updates
            if (connected) {
                console.log('Joining conversation room:', convId);
                socketService.joinConversation(convId);
                console.log('Conversation room joined successfully');
            } else {
                console.log('Socket not connected, cannot join conversation room');
            }
            
            // Load messages for this conversation
            console.log('Loading messages for conversation:', convId);
            loadMessages(convId);
        } else {
            console.error('Conversation not found:', convId);
        }
    };

    // Load messages for conversation
    const loadMessages = async (convId: string, page = 1, append = false) => {
        // Validate that convId is provided and not empty
        if (!convId || convId === 'undefined') {
            console.error('Invalid conversation ID provided for loading messages:', convId);
            setError('Invalid conversation ID');
            return;
        }
        
        console.log(`Loading messages for conversation ${convId}, page: ${page}, append: ${append}`);
        if (!append) setLoading(true);
        setError(null);

        try {
            const response = await getMessages(convId, {
                limit: pageSize,
                page
            });
            
            console.log('Messages API response:', response);
            console.log('Messages data:', response.data);

            if (response.success) {
                // Ensure all messages have required properties
                const newMessages = response.data.messages.map((msg: Message) => {
                    const messageWithDefaults = {
                        ...msg,
                        reactions: msg.reactions || [],
                        readBy: msg.readBy || [],
                        media: msg.media || [],
                        isOwn: msg.senderId === user?.id,
                        ...(msg.replyTo ? { replyTo: msg.replyTo } : {}),
                        sender: msg.sender || {
                            id: msg.senderId,
                            displayName: 'Unknown User',
                            username: 'unknown',
                            avatar: null,
                            isVerified: false
                        }
                    };
                    
                    // Try to get sender info from conversation participants if not provided
                    if (!msg.sender && currentConversation) {
                        const senderParticipant = currentConversation.participants.find(p => p.id === msg.senderId);
                        if (senderParticipant) {
                            messageWithDefaults.sender = senderParticipant;
                        } else if (user && msg.senderId === user.id) {
                            // If sender is current user
                            messageWithDefaults.sender = {
                                id: user.id,
                                displayName: user.displayName || user.username || 'You',
                                username: user.username || 'unknown',
                                avatar: user.avatar || null,
                                isVerified: user.isVerified || false
                            };
                        }
                    }
                    
                    return messageWithDefaults;
                });

                console.log('New messages:', newMessages);
                console.log('New messages length:', newMessages.length);

                if (append) {
                    setMessages(prev => [...newMessages, ...prev]);
                } else {
                    setMessages(newMessages);
                }

                setHasMore(response.data.pagination.hasMore);
                currentPage.current = page;
                console.log('Messages updated, hasMore:', response.data.pagination.hasMore);
            } else {
                console.error('Failed to load messages: Unknown error');
                setError('Failed to load messages');
            }
        } catch (error: any) {
            console.error('Error loading messages:', error);
            // Handle timeout and network errors specifically
            if (error.timeout || error.networkError) {
                setError(error.error || 'Network error. Please check your connection and try again.');
            } else if (error.message && error.message.includes('Failed to connect')) {
                // Handle connection errors specifically
                setError('Failed to connect to real-time messaging. Please check your network connection and try again.');
            } else {
                setError(error.error || error.message || 'Failed to load messages');
            }
        } finally {
            setLoading(false);
        }
    };

    // Load more messages (pagination)
    const loadMoreMessages = useCallback(() => {
        // Validate that currentConversation ID exists before loading more messages
        if (currentConversation?.id && currentConversation.id !== 'undefined' && hasMore && !loading) {
            loadMessages(currentConversation.id, currentPage.current + 1, true);
        } else if (currentConversation?.id === 'undefined') {
            console.error('Invalid conversation ID detected:', currentConversation);
        }
    }, [currentConversation?.id, hasMore, loading]);

    // Send message
    const handleSendMessage = async (
        content: string,
        type?: string,
        media?: any[],
        replyToId?: string
    ): Promise<boolean> => {
        if (!currentConversation?.id || !user?.id) return false;

        console.log('Sending message with socket connected:', connected);
        setSending(true);
        setError(null);

        try {
            console.log('Sending message:', { content, type, media, replyToId, conversationId: currentConversation.id });
            
            // Check if we have a connection before sending
            if (!connected || !socketService.isConnected()) {
                console.log('Socket not connected, attempting to reconnect...');
                await initializeSocket();
                
                // Wait a bit for connection to establish
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                if (!socketService.isConnected()) {
                    setError('Message may not have been delivered. Please check your network connection and try again.');
                    return false;
                }
            }
            
            // Join conversation room if not already joined
            socketService.joinConversation(currentConversation.id);
            
            const response = await sendMessage(currentConversation.id, {
                content,
                type: type as any,
                media,
                replyTo: replyToId
            });
            console.log('Message send response:', response);

            if (response.success) {
                // Message will be added via socket event
                console.log('Message sent successfully, waiting for socket event');
                
                // Add the message to the local state immediately as a fallback
                // This ensures the message is displayed even if the socket event is not received
                const timestamp = new Date().toISOString();
                const tempMessageId = `temp-${timestamp}`;
                const newMessage = {
                    id: tempMessageId,
                    content,
                    type: (type as 'text' | 'image' | 'video' | 'audio' | 'file' | 'system' | 'post_share') || 'text',
                    media: media || [],
                    replyTo: replyToId ? { 
                        id: replyToId,
                        content: '',
                        senderId: '',
                        type: 'text' as 'text'
                    } : null,
                    senderId: user.id,
                    sender: {
                        id: user.id,
                        displayName: user.displayName || user.username || 'You',
                        username: user.username || 'unknown',
                        avatar: user.avatar || null,
                        isVerified: user.isVerified || false
                    },
                    createdAt: timestamp,
                    updatedAt: timestamp,
                    reactions: [],
                    readBy: [],
                    isOwn: true,
                    conversationId: currentConversation.id,
                    isEdited: false,
                    isDeleted: false,
                    isForwarded: false,
                    isRead: false
                };
                
                setMessages(prev => [...prev, newMessage]);
                console.log('Added message to local state as fallback:', newMessage);
                
                // Set a timeout to remove the temporary message if the socket event is not received
                const timeoutId = setTimeout(() => {
                    setMessages(prev => {
                        const index = prev.findIndex(msg => msg.id === tempMessageId);
                        if (index !== -1) {
                            // Remove the temporary message if it's still there
                            const newMessages = [...prev];
                            newMessages.splice(index, 1);
                            console.log('Removed temporary message due to timeout:', tempMessageId);
                            // Only show error if we haven't received the socket event
                            // Check if there's a real message with the same content and sender
                            const realMessageExists = prev.some(msg => 
                                !msg.id.startsWith('temp-') && 
                                msg.content === content && 
                                msg.senderId === user.id &&
                                // Check if timestamps are close (within 10 seconds)
                                Math.abs(new Date(msg.createdAt).getTime() - new Date(timestamp).getTime()) < 10000
                            );
                            
                            if (!realMessageExists) {
                                setError('Message may not have been delivered. Please check your network connection and try again.');
                            }
                            return newMessages;
                        }
                        return prev;
                    });
                }, 15000); // Increase timeout to 15 seconds for better reliability
                
                // Store timeout ID so we can clear it if needed
                (newMessage as any)._timeoutId = timeoutId;
                
                return true;
            } else {
                setError(response.error || 'Failed to send message');
                return false;
            }
        } catch (error: any) {
            console.error('Error sending message:', error);
            // Handle timeout and network errors specifically
            if (error.timeout || error.networkError) {
                setError(error.error || 'Network error. Please check your connection and try again.');
            } else {
                setError(error.error || error.message || 'Failed to send message');
            }
            return false;
        } finally {
            setSending(false);
        }
    };

    // Edit message
    const handleEditMessage = async (messageId: string, content: string): Promise<boolean> => {
        setError(null);

        try {
            const response = await editMessage(messageId, { content });

            if (response.success) {
                // Message will be updated via socket event
                return true;
            } else {
                setError(response.error || 'Failed to edit message');
                return false;
            }
        } catch (error: any) {
            console.error('Error editing message:', error);
            // Handle timeout and network errors specifically
            if (error.timeout || error.networkError) {
                setError(error.error || 'Network error. Please check your connection and try again.');
            } else {
                setError(error.error || error.message || 'Failed to edit message');
            }
            return false;
        }
    };

    // Delete message
    const handleDeleteMessage = async (messageId: string): Promise<boolean> => {
        setError(null);

        try {
            const response = await deleteMessage(messageId);

            if (response.success) {
                // Message will be updated via socket event
                return true;
            } else {
                setError(response.error || 'Failed to delete message');
                return false;
            }
        } catch (error: any) {
            console.error('Error deleting message:', error);
            // Handle timeout and network errors specifically
            if (error.timeout || error.networkError) {
                setError(error.error || 'Network error. Please check your connection and try again.');
            } else {
                setError(error.error || error.message || 'Failed to delete message');
            }
            return false;
        }
    };

    // Toggle reaction
    const handleReaction = async (messageId: string, emoji: string): Promise<boolean> => {
        setError(null);

        try {
            const response = await toggleReaction(messageId, { emoji });

            if (response.success) {
                // Reaction will be updated via socket event
                return true;
            } else {
                setError(response.error || 'Failed to add reaction');
                return false;
            }
        } catch (error: any) {
            console.error('Error adding reaction:', error);
            // Handle timeout and network errors specifically
            if (error.timeout || error.networkError) {
                setError(error.error || 'Network error. Please check your connection and try again.');
            } else {
                setError(error.error || error.message || 'Failed to add reaction');
            }
            return false;
        }
    };

    // Send typing indicator
    const handleTyping = async (isTyping: boolean) => {
        if (!currentConversation?.id || !connected) return;

        try {
            await sendTypingIndicator(currentConversation.id, isTyping);

            // Also emit via socket for immediate feedback
            socketService.sendTyping(currentConversation.id, isTyping);
        } catch (error: any) {
            console.error('Error sending typing indicator:', error);
            // Handle timeout and network errors specifically
            if (error.timeout || error.networkError) {
                console.warn('Typing indicator network error (not critical):', error.error || 'Network error');
            } else {
                console.warn('Typing indicator error (not critical):', error.error || error.message || 'Failed to send typing indicator');
            }
            // Don't set error state for typing indicators as they're not critical
        }
    };

    // Mark messages as read
    const markAllAsRead = async () => {
        // Validate that currentConversation ID exists before marking messages as read
        if (!currentConversation?.id || currentConversation.id === 'undefined') {
            if (currentConversation?.id === 'undefined') {
                console.error('Invalid conversation ID detected:', currentConversation);
            }
            return;
        }

        try {
            // Use the API to mark all messages as read for this conversation
            await markAllMessagesAsRead(currentConversation.id);

            // Update conversation's unread count to 0 in local state
            setConversations(prev => prev.map(conv => 
                conv.id === currentConversation.id 
                    ? { ...conv, unreadCount: 0 }
                    : conv
            ));

            // Also update currentConversation if it matches
            if (currentConversation) {
                setCurrentConversation(prev => prev ? { ...prev, unreadCount: 0 } : null);
            }

            // Update all messages in the current conversation as read in local state
            setMessages(prev => prev.map(msg => {
                // Check if already marked as read by current user
                const isAlreadyRead = msg.readBy?.some(read => read.userId === user?.id);
                if (isAlreadyRead) {
                    return msg;
                }
                
                // Add read receipt for current user
                return {
                    ...msg,
                    readBy: [...(msg.readBy || []), { userId: user!.id, readAt: new Date().toISOString() }]
                };
            }));

            // Dispatch event to refresh unread count in other components
            window.dispatchEvent(new CustomEvent('messages:read'));
        } catch (error: any) {
            console.error('Error marking messages as read:', error);
            // Handle timeout and network errors specifically
            if (error.timeout || error.networkError) {
                console.warn('Mark as read network error (not critical):', error.error || 'Network error');
            } else {
                console.warn('Mark as read error (not critical):', error.error || error.message || 'Failed to mark messages as read');
            }
            // Don't set error state for marking messages as read as it's not critical
        }
    };

    // Refresh data
    const refresh = () => {
        // Validate that currentConversation ID exists before refreshing messages
        if (currentConversation?.id && currentConversation.id !== 'undefined') {
            loadMessages(currentConversation.id);
        } else if (currentConversation?.id === 'undefined') {
            console.error('Invalid conversation ID detected:', currentConversation);
        }
        loadConversations();
    };

    return {
        // State
        conversations,
        currentConversation,
        messages,
        loading,
        sending,
        hasMore,
        typingUsers,
        connected,
        error,

        // Actions
        loadConversations,
        loadConversation,
        loadMessages,
        loadMoreMessages,
        sendMessage: handleSendMessage,
        editMessage: handleEditMessage,
        deleteMessage: handleDeleteMessage,
        toggleReaction: handleReaction,
        sendTyping: handleTyping,
        markAllAsRead,
        refresh,

        // Utils
        clearError: () => setError(null),
    };
};

export default useMessaging;
























































































