import { io } from 'socket.io-client';
import config from '@/config';

const initializeSocket = () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.error('No authentication token available for socket connection');
    return null;
  }
  
  // Try different authentication methods to ensure compatibility with server
  const socket = io(config.api.socketUrl, {
    // Method 1: Auth object
    auth: {
      token: token
    },
    // Method 2: Query parameters
    query: {
      token: token
    },
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    timeout: 0, // No timeout
    connectTimeout: 0, // No connection timeout
    ackTimeout: 0, // No acknowledgment timeout
    pingTimeout: 0, // No ping timeout
    pingInterval: 25000, // Keep-alive ping every 25 seconds
    // Add extra headers for authentication
    extraHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
  
  socket.on('connect', () => {
    console.log('Socket connected successfully');
    
    // Authenticate immediately after connection if needed
    socket.emit('authenticate', { token: token }, (response) => {
      if (response.success) {
        console.log('Socket authenticated successfully');
      } else {
        console.error('Socket authentication failed:', response.message);
      }
    });
  });
  
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
    console.error('Connection error details:', {
      message: error.message,
      type: error.constructor.name,
      code: error.code,
      description: error.description,
      context: error.context
    });
    
    // Handle different types of connection errors
    if (error.message.includes('Authentication failed')) {
      // Try to refresh the token
      refreshAuthToken().then(newToken => {
        if (newToken) {
          console.log('Token refreshed, reconnecting socket...');
          socket.disconnect();
          // Reconnect will use the new token from localStorage
          socket.connect();
        }
      });
    } else if (error.message.includes('timeout')) {
      // Don't show timeout error messages during reconnection since timeouts are disabled
      // The reconnection process already informs the user
      console.log('Connection timeout detected during reconnection attempt');
    } else if (error.message.includes('failed to connect')) {
      // Updated message to reflect unlimited reconnection attempts
      console.error('Failed to connect to real-time messaging - server may be offline. Retrying indefinitely...');
    } else if (error.message.includes('network')) {
      console.error('Network error - check your internet connection');
    }
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected: ${reason}`);
    
    if (reason === 'io server disconnect') {
      socket.connect();
    }
  });
  
  return socket;
};

// Helper function to refresh the authentication token
const refreshAuthToken = async () => {
  try {
    // Import dynamically to avoid circular dependencies
    const api = (await import('@/lib/api')).default;
    
    const response = await api.auth.refreshToken();
    if (response && response.success && response.data && response.data.token) {
      localStorage.setItem('token', response.data.token);
      return response.data.token;
    }
    return null;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    return null;
  }
};

export default initializeSocket;