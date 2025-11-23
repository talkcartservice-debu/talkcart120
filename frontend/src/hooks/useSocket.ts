import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/config';

interface UseSocketOptions {
  enabled?: boolean;
}

export const useSocket = (options: UseSocketOptions = {}) => {
  const { enabled = true } = options;
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Debug logging to help identify hook call issues
  if (process.env.NODE_ENV === 'development') {
    console.debug('useSocket called with enabled:', enabled);
  }

  useEffect(() => {
    if (!enabled) {
      // Clean up any existing socket connection
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Get auth token for socket handshake (optional for anonymous users)
    const token = localStorage.getItem('token');

    // Connect to socket using the correct base URL (no namespace like '/api')
    console.log('🔌 Attempting to connect to Socket.IO server at:', SOCKET_URL);
    const socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['polling', 'websocket'], // Try polling first, then websocket
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      timeout: 999999999, // Effectively disable timeout (Socket.IO ignores 0)
      forceNew: true, // Force a new connection
      auth: token ? {
        token: token // Send token in handshake auth if available
      } : undefined
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error);
      console.error('🔌 Error details:', {
        message: error.message,
        // @ts-ignore
        description: error.description,
        // @ts-ignore
        context: error.context,
        // @ts-ignore
        type: error.type
      });
      setIsConnected(false);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔌 Socket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
    });

    socket.on('reconnect_error', (error) => {
      console.error('🔌 Socket reconnection error:', error);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [enabled]);

  return {
    socket: socketRef.current,
    isConnected,
  };
};