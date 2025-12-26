import { useState, useCallback, useEffect } from 'react';
import { Message, Conversation, ReadReceipt } from '../types/message';
import { useLocalStorage } from './useLocalStorage';
import * as client from '../services/messagesApi';
import * as conversationClient from '../services/conversationApi';
import socketService from '../services/socketService';
import { useAuth } from '../contexts/AuthContext';

interface UseMessagesOptions {
  conversationId?: string;
}

interface UseMessagesReturn {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  hasMore: boolean;
  typingUsers: Record<string, string[]>;
  searchResults: Message[];
  searching: boolean;
  totalUnread: number;
  
  // Sound controls
  soundsEnabled: boolean;
  toggleSounds: () => void;
  soundVolume: number;
  setSoundVolume: (v: number) => void;
  
  // Message actions
  fetchMessages: (loadMore?: boolean) => Promise<void>;
  sendMessage: (content: string, type?: string, media?: any, replyTo?: string) => Promise<boolean>;
  editMessage: (messageId: string, content: string) => Promise<boolean>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  markAsRead: (messageId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<boolean>;
  forwardMessage: (messageId: string, conversationIds: string[], message?: string) => Promise<boolean>;
  searchMessages: (query: string) => Promise<{ messages: Message[]; total: number }>;
  searchAllMessages: (query: string) => Promise<{ messages: Message[]; total: number }>;
  sendTypingIndicator: (isTyping?: boolean) => void;
  setActiveConversation: (conversation: Conversation | null) => void;
  createConversation: (participantIds: string[], options?: { isGroup?: boolean; groupName?: string; groupDescription?: string }) => Promise<any>;
  updateConversation: (conversationId: string, settings: { groupName?: string; groupDescription?: string; groupAvatar?: string }) => Promise<any>;
  fetchConversations: () => Promise<void>; // Add this new function
}

const useMessages = (options?: UseMessagesOptions): UseMessagesReturn => {
  const { conversationId } = options || {};
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searching, setSearching] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [soundsEnabled, setSoundsEnabled] = useLocalStorage<boolean>("sounds-enabled", true);
  const [soundVolume, setSoundVolumeState] = useLocalStorage("sound-volume", 100);

  // Add effect to fetch conversations when hook is initialized
  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching conversations...');
      const response = await conversationClient.getConversations({ limit: 50, page: 1 });
      console.log('Conversations response:', response);
      
      if (response.success) {
        // Use the expected response structure
        const conversationsArray = response.data?.conversations || [];
        
        console.log('Processed conversations count:', conversationsArray.length);
        console.log('First conversation (if any):', conversationsArray[0]);
        setConversations(conversationsArray);
        
        // If no conversations found, check if there might be messages in a different structure
        if (conversationsArray.length === 0) {
          console.log('No conversations found. Checking if there are messages that might need to be converted to conversations...');
        }
      } else {
        const errorMessage = 'Failed to fetch conversations';
        console.error('Failed to fetch conversations:', errorMessage);
        setError(errorMessage);
      }
    } catch (e: any) {
      console.error('Failed to fetch conversations:', e);
      const errorMessage = e.message || 'Failed to fetch conversations. Please check your network connection.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(
    async (loadMore = false) => {
      // Use activeConversation.id if conversationId is not provided
      const currentConversationId = conversationId || activeConversation?.id;
      if (!currentConversationId) return;

      try {
        setLoading(true);
        const res = await client.getMessages(currentConversationId, {
          limit: 50,
          page: loadMore ? Math.floor(messages.length / 50) + 1 : 1,
        });
        if (res.success) {
          if (loadMore) {
            setMessages((prev) => [...(prev || []), ...res.data.messages]);
          } else {
            setMessages(res.data.messages);
          }
          setHasMore(res.data.pagination.hasMore);
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [conversationId, activeConversation?.id, messages.length]
  );

  // Add effect to fetch messages when activeConversation changes
  useEffect(() => {
    if (activeConversation?.id) {
      // Join the conversation room via socket
      try {
        socketService.joinConversation(activeConversation.id);
        console.log('Joined conversation room:', activeConversation.id);
      } catch (error) {
        console.error('Failed to join conversation room:', error);
      }
      
      fetchMessages();
    } else {
      // Clear messages when no active conversation
      setMessages([]);
    }
    
    // Return cleanup function to leave the conversation room
    return () => {
      if (activeConversation?.id) {
        try {
          socketService.leaveConversation(activeConversation.id);
          console.log('Left conversation room:', activeConversation.id);
        } catch (error) {
          console.error('Failed to leave conversation room:', error);
        }
      }
    };
  }, [activeConversation?.id, fetchMessages]);

  const handleSendMessage = useCallback(
    async (content: string, type?: string, media?: any, replyTo?: string) => {
      // Use activeConversation.id if conversationId is not provided
      const currentConversationId = conversationId || activeConversation?.id;
      if (!currentConversationId) return false;

      // Create a temporary message with a temporary ID
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const tempMessage: Message = {
        id: tempId,
        conversationId: currentConversationId,
        createdAt: new Date().toISOString(),
        content,
        type: (type as 'text' | 'image' | 'video' | 'audio' | 'file' | 'system' | 'post_share') || 'text',
        senderId: user?.id || '',
        isEdited: false,
        isDeleted: false,
        isForwarded: false,
        media: media || [],
        reactions: [],
        readBy: [],
        replyTo: replyTo ? { id: replyTo, content: '', senderId: '', type: 'text' } : undefined,
        sender: user ? {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar || null, // Convert undefined to null
          isVerified: user.isVerified || false
        } : {
          id: '',
          username: 'unknown',
          displayName: 'Unknown',
          avatar: null,
          isVerified: false
        },
        isOwn: true,
        isRead: false,
        isOptimistic: true // Flag to identify optimistic updates
      };
      
      // Add the temporary message to the UI immediately (optimistic update)
      setMessages((prev) => [
        ...(prev || []),
        tempMessage,
      ]);
      
      // Update the conversation's last message with the temp message
      setConversations(prev => 
        (prev || []).map(conv => 
          conv.id === currentConversationId 
            ? { ...conv, lastMessage: tempMessage } 
            : conv
        )
      );
      
      // Update active conversation's last message
      if (activeConversation?.id === currentConversationId) {
        setActiveConversation(prev => prev ? { ...prev, lastMessage: tempMessage } : null);
      }
      
      try {
        setSending(true);
        
        // Send via REST API for persistence (this will also broadcast via sockets on the backend)
        const res = await client.sendMessage(currentConversationId, {
          content,
          type,
          media,
          replyTo,
        });
        
        if (res.success) {
          // Create the final Message object with server data
          const newMessage: Message = {
            id: res.data?.id || res.id,
            conversationId: currentConversationId,
            createdAt: res.data?.createdAt || res.createdAt || new Date().toISOString(),
            content,
            type: (type as 'text' | 'image' | 'video' | 'audio' | 'file' | 'system' | 'post_share') || 'text',
            senderId: res.data?.senderId || res.sender?.id || '',
            isEdited: false,
            isDeleted: false,
            isForwarded: false,
            media: media || [],
            reactions: [],
            readBy: [],
            replyTo: replyTo ? { id: replyTo, content: '', senderId: '', type: 'text' } : undefined,
            sender: res.data?.sender || res.sender ? {
              id: (res.data?.sender || res.sender)?.id || '',
              username: (res.data?.sender || res.sender)?.username || 'unknown',
              displayName: (res.data?.sender || res.sender)?.displayName || 'Unknown',
              avatar: (res.data?.sender || res.sender)?.avatar || null, // Convert undefined to null
              isVerified: (res.data?.sender || res.sender)?.isVerified || false
            } : {
              id: '',
              username: 'unknown',
              displayName: 'Unknown',
              avatar: null,
              isVerified: false
            },
            isOwn: true,
            isRead: false,
            isOptimistic: false // Remove the optimistic flag
          };
          
          // Update the temporary message with the server message
          setMessages((prev) => 
            (prev || []).map(msg => 
              msg.id === tempId ? newMessage : msg
            )
          );
          
          // Update the conversation's last message with the server message
          setConversations(prev => 
            (prev || []).map(conv => 
              conv.id === currentConversationId 
                ? { ...conv, lastMessage: newMessage } 
                : conv
            )
          );
          
          // Update active conversation's last message
          if (activeConversation?.id === currentConversationId) {
            setActiveConversation(prev => prev ? { ...prev, lastMessage: newMessage } : null);
          }
          
          return true;
        } else {
          // Handle API error response - remove the temp message
          setMessages((prev) => (prev || []).filter(msg => msg.id !== tempId));
          
          const errorMessage = res.error || 'Failed to send message';
          setError(errorMessage);
          console.error('Send message API error:', errorMessage);
          return false;
        }
      } catch (e: any) {
        // Remove the temporary message since the send failed
        setMessages((prev) => (prev || []).filter(msg => msg.id !== tempId));
        
        const errorMessage = e.message || 'Failed to send message. Please check your network connection.';
        setError(errorMessage);
        console.error('Send message error:', e);
        return false;
      } finally {
        setSending(false);
      }
    },
    [conversationId, activeConversation?.id, user]
  );

  const handleEditMessage = useCallback(
    async (messageId: string, content: string) => {
      if (!conversationId) return false;

      try {
        const res = await client.editMessage(messageId, {
          content,
        });
        if (res.success) {
          setMessages((prev) =>
            (prev || []).map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    content,
                  }
                : m
            )
          );
          return true;
        }
        return false;
      } catch (e) {
        setError((e as Error).message);
        return false;
      }
    },
    [conversationId]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!conversationId) return false;

      try {
        const res = await client.deleteMessage(messageId);
        if (res.success) {
          setMessages((prev) => (prev || []).filter((m) => m.id !== messageId));
          return true;
        }
        return false;
      } catch (e) {
        setError((e as Error).message);
        return false;
      }
    },
    [conversationId]
  );

  const markAsRead = useCallback(
    async (messageId: string) => {
      if (!conversationId) return;

      try {
        // Use socket service to mark message as read
        socketService.markMessageAsRead(messageId);
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [conversationId]
  );

  const markAllAsRead = useCallback(async () => {
    if (!activeConversation?.id) return;

    try {
      const res = await client.markAllAsRead(activeConversation.id);
      if (res.success) {
        // Update local state to mark all messages as read
        setMessages(prev => 
          (prev || []).map(m => ({
            ...m,
            isRead: true,
            readBy: [...(m.readBy || []), { userId: 'current-user', readAt: new Date().toISOString() }]
          }))
        );
        
        // Update conversation unread count
        setConversations(prev => 
          (prev || []).map(c => 
            c.id === activeConversation.id 
              ? { ...c, unreadCount: 0 } 
              : c
          )
        );
        
        // Update active conversation
        if (activeConversation) {
          setActiveConversation({ ...activeConversation, unreadCount: 0 });
        }
      } else {
        // Handle API error response
        const errorMessage = res.error || 'Failed to mark all messages as read';
        setError(errorMessage);
        console.error('Mark all as read API error:', errorMessage);
      }
    } catch (e: any) {
      // Handle network/timeout errors
      const errorMessage = e.message || 'Failed to mark all messages as read. Please check your network connection.';
      setError(errorMessage);
      console.error('Mark all as read error:', e);
    }
  }, [activeConversation]);

  const handleAddReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!conversationId) return false;

      try {
        const res = await client.addReaction(messageId, { emoji });
        if (res.success) {
          setMessages((prev) =>
            (prev || []).map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    reactions: [...(m.reactions || []), res.data.reaction],
                  }
                : m
            )
          );
          return true;
        }
        return false;
      } catch (e) {
        setError((e as Error).message);
        return false;
      }
    },
    [conversationId]
  );

  const handleForwardMessage = useCallback(
    async (messageId: string, conversationIds: string[], message?: string) => {
      try {
        const res = await client.forwardMessage(messageId, {
          conversationIds,
          message,
        });
        return res.success;
      } catch (e) {
        setError((e as Error).message);
        return false;
      }
    },
    []
  );

  const handleSearchMessages = useCallback(
    async (query: string) => {
      if (!conversationId) {
        return { messages: [], total: 0 };
      }

      try {
        setSearching(true);
        const res = await client.searchMessages(conversationId, query);
        if (res.success) {
          setSearchResults(res.data.messages);
          return {
            messages: res.data.messages,
            total: res.data.total,
          };
        }
        return { messages: [], total: 0 };
      } catch (e) {
        setError((e as Error).message);
        return { messages: [], total: 0 };
      } finally {
        setSearching(false);
      }
    },
    [conversationId]
  );

  const handleSearchAllMessages = useCallback(async (query: string) => {
    try {
      setSearching(true);
      const res = await client.searchAllMessages(query);
      if (res.success) {
        setSearchResults(res.data.messages);
        return {
          messages: res.data.messages,
          total: res.data.total,
        };
      }
      return { messages: [], total: 0 };
    } catch (e) {
      setError((e as Error).message);
      return { messages: [], total: 0 };
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSendTypingIndicator = useCallback(
    (isTyping = true) => {
      if (!conversationId) return;

      client.sendTypingIndicator(conversationId, isTyping).catch((e) => {
        console.error('Failed to send typing indicator:', e);
      });
    },
    [conversationId]
  );

  const handleCreateConversation = useCallback(
    async (participantIds: string[], options?: { isGroup?: boolean; groupName?: string; groupDescription?: string }) => {
      try {
        // Validate input
        if (!participantIds || participantIds.length === 0) {
          throw new Error('At least one participant is required');
        }
        
        console.log('Creating conversation with:', { participantIds, options });
        const res = await client.createConversation(participantIds, options || {});
        console.log('Create conversation response:', res);
        
        // Handle different response structures
        if (res.success) {
          // Extract conversation data from response
          const conversationData = res.data || res;
          const conversationId = conversationData.id || conversationData._id;
          
          // Validate conversation ID
          if (!conversationId) {
            throw new Error('Invalid conversation ID in response');
          }
          
          console.log('Fetching complete conversation data for ID:', conversationId);
          
          // Fetch the complete conversation data to ensure we have all participant information
          const conversationRes = await conversationClient.getConversation(conversationId);
          
          if (conversationRes.success) {
            // Add the complete conversation to the list
            const completeConversation = conversationRes.data;
            setConversations(prev => [completeConversation, ...(prev || [])]);
            setActiveConversation(completeConversation);
            return completeConversation;
          } else {
            // Fallback to the original response if fetching details fails
            const newConversation = conversationData;
            setConversations(prev => [newConversation, ...(prev || [])]);
            setActiveConversation(newConversation);
            return newConversation;
          }
        }
        
        // Handle error responses
        const errorMessage = res.error || 'Failed to create conversation';
        throw new Error(errorMessage);
      } catch (e: any) {
        console.error('Error creating conversation:', e);
        const errorMessage = e.message || 'Failed to create conversation';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    []
  );

  const handleUpdateConversation = useCallback(
    async (conversationId: string, settings: { groupName?: string; groupDescription?: string; groupAvatar?: string }) => {
      try {
        const res = await client.updateConversation(conversationId, settings);
        if (res.success) {
          // Update the conversation in the list
          const updatedConversation = res.data;
          setConversations(prev => 
            (prev || []).map(conv => 
              conv.id === conversationId ? { ...conv, ...updatedConversation } : conv
            )
          );
          
          // If this is the active conversation, update it too
          if (activeConversation?.id === conversationId) {
            setActiveConversation(prev => prev ? { ...prev, ...updatedConversation } : null);
          }
          
          return res.data;
        }
        throw new Error(res.error || 'Failed to update conversation');
      } catch (e) {
        setError((e as Error).message);
        throw e;
      }
    },
    [activeConversation]
  );

  const toggleSounds = useCallback(() => {
    setSoundsEnabled(!soundsEnabled);
  }, [soundsEnabled, setSoundsEnabled]);

  const setSoundVolume = useCallback((v: number) => {
    setSoundVolumeState(v);
  }, [setSoundVolumeState]);

  // Listen for new messages and user status updates via socket
  useEffect(() => {
    const handleNewMessage = (data: any) => {
      try {
        console.log('Received new message via socket:', data);
        
        if (data.message) {
          const messageId = data.message._id || data.message.id;
          
          // Check if this is our own message (we can identify by sender ID)
          const isOwnMessage = data.message.senderId === user?.id || 
                             data.message.sender?._id === user?.id || 
                             data.message.sender?.id === user?.id;
          
          if (isOwnMessage) {
            // This is our own message, update the temporary message with server data
            // Find the temporary message that matches the content and was sent by this user
            setMessages(prev => 
              (prev || []).map(msg => {
                // If this is our optimistic message that matches the content and was sent by us
                if (msg.isOptimistic && msg.content === data.message.content && msg.senderId === user?.id) {
                  // Update with the server message data
                  return {
                    ...msg,
                    id: messageId,
                    createdAt: data.message.createdAt,
                    isOptimistic: false, // Remove optimistic flag
                  };
                }
                return msg;
              })
            );
            
            // For own messages, we don't need to update the conversation's last message
            // because the API response handler already updated it
            // Only update for messages from other users
            if (!isOwnMessage) {
              // Update conversation's last message with server data
              setConversations(prev => 
                (prev || []).map(conv => 
                  conv.id === data.conversationId 
                    ? { 
                        ...conv, 
                        lastMessage: {
                          id: messageId,
                          content: data.message.content,
                          type: data.message.type || 'text',
                          senderId: data.message.senderId || '',
                          createdAt: data.message.createdAt,
                        }
                      } 
                    : conv
                )
              );
              
              // Update active conversation's last message
              if (activeConversation?.id === data.conversationId) {
                setActiveConversation(prev => 
                  prev ? { 
                    ...prev, 
                    lastMessage: {
                      id: messageId,
                      content: data.message.content,
                      type: data.message.type || 'text',
                      senderId: data.message.senderId || '',
                      createdAt: data.message.createdAt,
                    }
                  } : null
                );
              }
            }
            
            console.log('Updated own message with server data:', messageId);
          } else {
            // This is a message from another user, add it normally
            // Check if this message already exists in our local state to avoid duplicates
            const messageExists = messages?.some(msg => 
              msg.id === messageId
            );
            
            if (!messageExists) {
              const newMessage: Message = {
                id: messageId,
                conversationId: data.conversationId,
                createdAt: data.message.createdAt,
                content: data.message.content,
                type: data.message.type || 'text',
                senderId: data.message.senderId || data.message.sender?._id || data.message.sender?.id,
                isEdited: data.message.isEdited || false,
                isDeleted: data.message.isDeleted || false,
                isForwarded: data.message.isForwarded || false,
                media: data.message.media || [],
                reactions: data.message.reactions || [],
                readBy: data.message.readBy || [],
                replyTo: data.message.replyTo ? {
                  id: data.message.replyTo._id || data.message.replyTo.id,
                  content: data.message.replyTo.content,
                  senderId: data.message.replyTo.senderId || data.message.replyTo.sender?._id || data.message.replyTo.sender?.id,
                  type: data.message.replyTo.type || 'text'
                } : undefined,
                sender: data.message.sender ? {
                  id: data.message.sender.id,
                  username: data.message.sender.username,
                  displayName: data.message.sender.displayName,
                  avatar: data.message.sender.avatar || null, // Convert undefined to null
                  isVerified: data.message.sender.isVerified || false
                } : {
                  id: '',
                  username: 'unknown',
                  displayName: 'Unknown',
                  avatar: null,
                  isVerified: false
                },
                isOwn: false, // This is not our own message
                isRead: false
              };

              console.log('Processing new message from other user:', newMessage);

              // Only add the message if it's for the current conversation
              if (activeConversation?.id === data.conversationId) {
                console.log('Adding message to current conversation');
                setMessages(prev => [...(prev || []), newMessage]);
              } else {
                console.log('Message is for different conversation, not adding to current view');
              }

              // Update conversations list to show unread count
              setConversations(prev => 
                (prev || []).map(conv => 
                  conv.id === data.conversationId 
                    ? { 
                        ...conv, 
                        unreadCount: (conv.unreadCount || 0) + 1,
                        lastMessage: newMessage
                      } 
                    : conv
                )
              );
            } else {
              console.log('Message already exists, skipping duplicate');
            }
          }
        }
      } catch (error) {
        console.error('Error processing new message from socket:', error);
      }
    };
    
    const handleUserStatus = (data: any) => {
      try {
        console.log('Received user status update via socket:', data);
        
        if (data && data.userId) {
          // Update conversations to reflect user's online status
          setConversations(prev => 
            (prev || []).map(conv => {
              const hasParticipant = conv.participants?.some((p: any) => p.id === data.userId);
              if (hasParticipant) {
                // Update the participant's online status in the conversation
                const updatedParticipants = conv.participants?.map((p: any) => 
                  p.id === data.userId 
                    ? { ...p, isOnline: data.isOnline } 
                    : p
                );
                return { ...conv, participants: updatedParticipants };
              }
              return conv;
            })
          );
          
          // Update active conversation if it contains the user
          if (activeConversation && activeConversation.participants?.some((p: any) => p.id === data.userId)) {
            const updatedParticipants = activeConversation.participants?.map((p: any) => 
              p.id === data.userId 
                ? { ...p, isOnline: data.isOnline } 
                : p
            );
            setActiveConversation(prev => 
              prev ? { ...prev, participants: updatedParticipants } : null
            );
          }
        }
      } catch (error) {
        console.error('Error processing user status from socket:', error);
      }
    };

    const handleTyping = (data: any) => {
      try {
        console.log('Received typing indicator via socket:', data);
        
        if (data && data.conversationId && data.userId !== user?.id) { // Don't show our own typing
          setTypingUsers(prev => {
            const currentTyping = prev[data.conversationId] || [];
            const isTyping = data.isTyping;
            const userId = data.userId;
            
            let newTypingUsers;
            if (isTyping) {
              // Add user to typing list if not already there
              if (!currentTyping.includes(userId)) {
                newTypingUsers = [...currentTyping, userId];
              } else {
                newTypingUsers = currentTyping;
              }
            } else {
              // Remove user from typing list
              newTypingUsers = currentTyping.filter(id => id !== userId);
            }
            
            return {
              ...prev,
              [data.conversationId]: newTypingUsers
            };
          });
        }
      } catch (error) {
        console.error('Error processing typing indicator from socket:', error);
      }
    };

    const handleMessageRead = (data: any) => {
      try {
        console.log('Received message read via socket:', data);
        
        if (data && data.messageId && user?.id) {
          // Update the message to mark it as read
          setMessages(prev => 
            (prev || []).map(m => {
              if (m.id === data.messageId) {
                // Add current user to readBy array if not already present
                const isAlreadyRead = m.readBy?.some((read: any) => read.userId === user.id);
                if (!isAlreadyRead) {
                  return {
                    ...m,
                    isRead: true,
                    readBy: [...(m.readBy || []), { 
                      userId: user.id, 
                      readAt: data.readAt || new Date().toISOString() 
                    } as ReadReceipt]
                  };
                }
                return m;
              }
              return m;
            })
          );
        }
      } catch (error) {
        console.error('Error processing message read from socket:', error);
      }
    };

    // Register socket event listeners
    try {
      socketService.on('message:new', handleNewMessage);
      socketService.on('user:status', handleUserStatus);
      socketService.on('typing', handleTyping);
      socketService.on('message:read', handleMessageRead);
    } catch (error) {
      console.error('Error registering socket listeners:', error);
    }

    // Cleanup function to remove listeners
    return () => {
      try {
        socketService.off('message:new', handleNewMessage);
        socketService.off('user:status', handleUserStatus);
        socketService.off('typing', handleTyping);
        socketService.off('message:read', handleMessageRead);
      } catch (error) {
        console.error('Error unregistering socket listeners:', error);
      }
    };
  }, [activeConversation?.id, messages, activeConversation, user]);

  return {
    conversations,
    activeConversation,
    messages,
    loading,
    sending,
    error,
    hasMore,
    typingUsers,
    searchResults,
    searching,
    totalUnread,
    
    // Sound controls
    soundsEnabled,
    toggleSounds,
    soundVolume,
    setSoundVolume,
    
    // Message actions
    fetchMessages,
    sendMessage: handleSendMessage,
    editMessage: handleEditMessage,
    deleteMessage: handleDeleteMessage,
    markAsRead,
    markAllAsRead,
    addReaction: handleAddReaction,
    forwardMessage: handleForwardMessage,
    searchMessages: handleSearchMessages,
    searchAllMessages: handleSearchAllMessages,
    sendTypingIndicator: handleSendTypingIndicator,
    setActiveConversation,
    createConversation: handleCreateConversation,
    updateConversation: handleUpdateConversation,
    fetchConversations
  };
};

export default useMessages;















