import { useState, useEffect } from 'react';
import * as chatbotApi from '@/services/chatbotApi';
import { ChatbotConversation, ChatbotMessage } from '@/services/chatbotApi';

interface UseChatbotReturn {
  conversations: ChatbotConversation[];
  activeConversation: ChatbotConversation | null;
  messages: ChatbotMessage[];
  loading: {
    conversations: boolean;
    messages: boolean;
    send: boolean;
  };
  error: string | null;
  fetchConversations: () => Promise<void>;
  setActiveConversation: (conversation: ChatbotConversation | null) => void;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<boolean>;
  createConversation: (vendorId: string, productId: string) => Promise<ChatbotConversation | null>;
  resolveConversation: (conversationId: string) => Promise<boolean>;
  closeConversation: (conversationId: string) => Promise<boolean>;
}

const useChatbot = (): UseChatbotReturn => {
  const [conversations, setConversations] = useState<ChatbotConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<ChatbotConversation | null>(null);
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [loading, setLoading] = useState({
    conversations: false,
    messages: false,
    send: false,
  });
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = async () => {
    try {
      setLoading(prev => ({ ...prev, conversations: true }));
      setError(null);
      
      const response = await chatbotApi.getConversations({ limit: 50 });
      if (response.success) {
        setConversations(response.data.conversations);
      } else {
        throw new Error('Failed to fetch conversations');
      }
    } catch (err: any) {
      console.error('Error fetching chatbot conversations:', err);
      setError(err.message || 'Failed to fetch conversations');
    } finally {
      setLoading(prev => ({ ...prev, conversations: false }));
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      setLoading(prev => ({ ...prev, messages: true }));
      setError(null);
      
      const response = await chatbotApi.getMessages(conversationId);
      if (response.success) {
        setMessages(response.data.messages);
      } else {
        throw new Error('Failed to fetch messages');
      }
    } catch (err: any) {
      console.error('Error fetching chatbot messages:', err);
      setError(err.message || 'Failed to fetch messages');
    } finally {
      setLoading(prev => ({ ...prev, messages: false }));
    }
  };

  const sendMessage = async (content: string): Promise<boolean> => {
    if (!activeConversation) return false;
    
    try {
      setLoading(prev => ({ ...prev, send: true }));
      setError(null);
      
      const response = await chatbotApi.sendMessage(activeConversation._id, { content });
      if (response.success) {
        // Add the new message to the messages list
        setMessages(prev => [...prev, response.data.message]);
        // Refresh conversations to update last message
        await fetchConversations();
        return true;
      } else {
        throw new Error('Failed to send message');
      }
    } catch (err: any) {
      console.error('Error sending chatbot message:', err);
      setError(err.message || 'Failed to send message');
      return false;
    } finally {
      setLoading(prev => ({ ...prev, send: false }));
    }
  };

  const createConversation = async (vendorId: string, productId: string): Promise<ChatbotConversation | null> => {
    try {
      setError(null);
      
      const response = await chatbotApi.createConversation({ vendorId, productId });
      if (response.success) {
        // Refresh conversations list
        await fetchConversations();
        return response.data.conversation;
      } else {
        throw new Error('Failed to create conversation');
      }
    } catch (err: any) {
      console.error('Error creating chatbot conversation:', err);
      setError(err.message || 'Failed to create conversation');
      return null;
    }
  };

  const resolveConversation = async (conversationId: string): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await chatbotApi.resolveConversation(conversationId);
      if (response.success) {
        // Update the conversation in the list
        setConversations(prev => 
          prev.map(conv => 
            conv._id === conversationId 
              ? { ...conv, isResolved: true } 
              : conv
          )
        );
        // If this is the active conversation, update it too
        if (activeConversation?._id === conversationId) {
          setActiveConversation(prev => prev ? { ...prev, isResolved: true } : null);
        }
        return true;
      } else {
        throw new Error('Failed to resolve conversation');
      }
    } catch (err: any) {
      console.error('Error resolving chatbot conversation:', err);
      setError(err.message || 'Failed to resolve conversation');
      return false;
    }
  };

  const closeConversation = async (conversationId: string): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await chatbotApi.closeConversation(conversationId);
      if (response.success) {
        // Remove the conversation from the list
        setConversations(prev => prev.filter(conv => conv._id !== conversationId));
        // If this was the active conversation, clear it
        if (activeConversation?._id === conversationId) {
          setActiveConversation(null);
        }
        // Clear messages if this was the active conversation
        if (activeConversation?._id === conversationId) {
          setMessages([]);
        }
        return true;
      } else {
        throw new Error('Failed to close conversation');
      }
    } catch (err: any) {
      console.error('Error closing chatbot conversation:', err);
      setError(err.message || 'Failed to close conversation');
      return false;
    }
  };

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation._id);
    } else {
      setMessages([]);
    }
  }, [activeConversation]);

  return {
    conversations,
    activeConversation,
    messages,
    loading,
    error,
    fetchConversations,
    setActiveConversation,
    fetchMessages,
    sendMessage,
    createConversation,
    resolveConversation,
    closeConversation,
  };
};

export default useChatbot;