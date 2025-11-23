import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/config';
import { TIMEOUTS } from '@/config/index';

// Add the helper function directly to avoid TypeScript import issues
const getWebSocketUrlLocal = (): string => {
  let url = SOCKET_URL;
  
  // If it's a relative URL, convert to absolute
  if (url.startsWith('/')) {
    if (typeof window !== 'undefined') {
      url = `${window.location.protocol}//${window.location.host}${url}`;
    } else {
      url = 'http://localhost:8000';
    }
  }
  
  // Ensure it has proper protocol for WebSocket
  if (url.startsWith('http://')) {
    return url.replace('http://', 'ws://');
  } else if (url.startsWith('https://')) {
    return url.replace('https://', 'wss://');
  }
  
  return url;
};

class SocketService {
  private socket: Socket | null = null;
  private listeners: Record<string, Function[]> = {};
  private userId: string | null = null;
  private activeConversationId: string | null = null;
  private activeChatbotConversationId: string | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = Infinity;

  // Connect to socket server
  connect(token: string, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.userId = userId;

        // Ensure we're using the correct URL format
        let socketUrl = getWebSocketUrlLocal();
        if (!socketUrl || socketUrl.trim() === '') {
          socketUrl = typeof window !== 'undefined' ? 
            `${window.location.protocol}//${window.location.hostname}:8000` : 
            'http://localhost:8000';
        }

        // Ensure the URL has a proper protocol
        if (!socketUrl.startsWith('ws://') && !socketUrl.startsWith('wss://')) {
          const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss://' : 'ws://';
          socketUrl = `${protocol}${socketUrl.replace(/^https?:\/\//, '').replace(/^http?:\/\//, '')}`;
        }

        this.socket = io(socketUrl, {
          path: '/socket.io/',
          auth: {
            token
          },
          transports: ['websocket', 'polling'], // Allow polling as fallback
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 30000, // Increased from 15000 to 30000
          timeout: 999999999, // Effectively disable timeout (Socket.IO ignores 0)
        });

        this.socket.on('connect', () => {
          console.log('Socket connected successfully');
          this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection

          // Authenticate socket connection
          this.socket?.emit('authenticate', { userId });

          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          this.reconnectAttempts++;
          
          // Log detailed error information with type safety
          console.error('Connection error details:', {
            message: error.message,
            type: error.constructor.name,
            code: (error as any).code,
            description: (error as any).description,
            context: (error as any).context
          });
          
          // Implement exponential backoff with a maximum delay
          const maxDelay = 30000; // 30 seconds
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), maxDelay);
          
          console.log(`Reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
          
          // Continue reconnection attempts indefinitely but with backoff
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
          
          // If it's a forced disconnection from the server, don't try to reconnect
          if (reason === 'io server disconnect') {
            console.log('Server forced disconnection, not attempting to reconnect');
          }
        });

        // Set up event listeners
        this.setupEventListeners();

      } catch (error) {
        console.error('Socket initialization error:', error);
        reject(error);
      }
    });
  }

  // Disconnect from socket server
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners = {};
      this.reconnectAttempts = 0;
    }
  }

  // Check if socket is connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Set up event listeners
  private setupEventListeners(): void {
    if (!this.socket) return;

    // New message received (regular conversations)
    this.socket.on('message:new', (data) => {
      console.log('Socket message:new event received:', data);
      this.emit('message:new', data);
    });

    // New message received (chatbot conversations)
    this.socket.on('chatbot:message:new', (data) => {
      this.emit('chatbot:message:new', data);
    });

    // Message updated
    this.socket.on('message:update', (data) => {
      this.emit('message:update', data);
    });

    // Message edited
    this.socket.on('message:edited', (data) => {
      this.emit('message:edited', data);
    });

    // Message deleted
    this.socket.on('message:delete', (data) => {
      this.emit('message:delete', data);
    });

    // Message reaction
    this.socket.on('message:reaction', (data) => {
      this.emit('message:reaction', data);
    });

    // Message read
    this.socket.on('message:read', (data) => {
      this.emit('message:read', data);
    });

    // Typing indicator (regular conversations)
    this.socket.on('typing', (data) => {
      this.emit('typing', data);
    });

    // Typing indicator (chatbot conversations)
    this.socket.on('chatbot:typing', (data) => {
      this.emit('chatbot:typing', data);
    });

    // New conversation
    this.socket.on('conversation:new', (data) => {
      this.emit('conversation:new', data);
    });

    // Conversation updated
    this.socket.on('conversation:update', (data) => {
      this.emit('conversation:update', data);
    });

    // User online status
    this.socket.on('user:status', (data) => {
      this.emit('user:status', data);
    });

    // Chatbot user joined
    this.socket.on('chatbot:user-joined', (data) => {
      this.emit('chatbot:user-joined', data);
    });

    // Chatbot user left
    this.socket.on('chatbot:user-left', (data) => {
      this.emit('chatbot:user-left', data);
    });
  }

  // Send a message (regular conversations)
  sendMessage(conversationId: string, message: any): void {
    if (!this.socket) return;

    console.log('Sending message via socket:', { conversationId, message });
    this.socket.emit('message:send', {
      conversationId,
      message
    });
  }

  // Send a message (chatbot conversations)
  sendChatbotMessage(conversationId: string, message: any): void {
    if (!this.socket) return;

    this.socket.emit('chatbot:message:send', {
      conversationId,
      message
    });
  }

  // Send typing indicator (regular conversations)
  sendTyping(conversationId: string, isTyping: boolean): void {
    if (!this.socket) return;

    this.socket.emit('typing', {
      conversationId,
      isTyping
    });

    console.log('Sent typing indicator:', { conversationId, isTyping });
  }

  // Send typing indicator (chatbot conversations)
  sendChatbotTyping(conversationId: string, isTyping: boolean): void {
    if (!this.socket) return;

    this.socket.emit('chatbot:typing', {
      conversationId,
      isTyping
    });

    console.log('Sent chatbot typing indicator:', { conversationId, isTyping });
  }

  // Send message status update (chatbot conversations)
  sendChatbotMessageStatus(conversationId: string, messageId: string, status: 'delivered' | 'read'): void {
    if (!this.socket) return;

    this.socket.emit('chatbot:message:status', {
      conversationId,
      messageId,
      status
    });

    console.log('Sent chatbot message status update:', { conversationId, messageId, status });
  }

  // Mark message as read
  markMessageAsRead(messageId: string): void {
    if (!this.socket) return;

    this.socket.emit('message:read', {
      messageId
    });
  }

  // Join a conversation room (regular conversations)
  joinConversation(conversationId: string): void {
    if (!this.socket) return;

    console.log('Joining conversation room:', conversationId);
    this.activeConversationId = conversationId;

    this.socket.emit('join-conversation', {
      conversationId
    });

    console.log('Joined conversation:', conversationId);
  }

  // Join a chatbot conversation room
  joinChatbotConversation(conversationId: string): void {
    if (!this.socket) return;

    this.activeChatbotConversationId = conversationId;

    this.socket.emit('join-chatbot-conversation', {
      conversationId
    });

    console.log('Joined chatbot conversation:', conversationId);
  }

  // Leave a conversation room (regular conversations)
  leaveConversation(conversationId: string): void {
    if (!this.socket) return;

    console.log('Leaving conversation room:', conversationId);

    this.socket.emit('leave-conversation', {
      conversationId
    });

    if (this.activeConversationId === conversationId) {
      this.activeConversationId = null;
    }

    console.log('Left conversation:', conversationId);
  }

  // Leave a chatbot conversation room
  leaveChatbotConversation(conversationId: string): void {
    if (!this.socket) return;

    this.socket.emit('leave-chatbot-conversation', {
      conversationId
    });

    if (this.activeChatbotConversationId === conversationId) {
      this.activeChatbotConversationId = null;
    }

    console.log('Left chatbot conversation:', conversationId);
  }

  // Add event listener
  on(event: string, callback: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    this.listeners[event].push(callback);
  }

  // Remove event listener
  off(event: string, callback: Function): void {
    if (!this.listeners[event]) return;

    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  // Emit event to listeners
  private emit(event: string, data: any): void {
    if (!this.listeners[event]) return;

    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    });
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;