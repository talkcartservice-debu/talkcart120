import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useMessageUnreadCount = () => {
  const { isAuthenticated, user } = useAuth();
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTotalUnread = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setTotalUnread(0);
      return 0;
    }

    setLoading(true);
    setError(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        setTotalUnread(0);
        return 0;
      }

      const response = await fetch('/api/messages/unread-count', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const unreadCount = data.data?.totalUnread || 0;
          setTotalUnread(unreadCount);
          return unreadCount;
        }
      }
      
      setTotalUnread(0);
      return 0;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch unread count';
      console.error('Error fetching total unread count:', errorMessage);
      setError(errorMessage);
      setTotalUnread(0);
      return 0;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchTotalUnread();
  }, [fetchTotalUnread]);

  // Refresh when messages are marked as read
  useEffect(() => {
    const handleMessagesRead = () => {
      fetchTotalUnread();
    };

    window.addEventListener('messages:read', handleMessagesRead);
    
    return () => {
      window.removeEventListener('messages:read', handleMessagesRead);
    };
  }, [fetchTotalUnread]);

  // Refresh every 30 seconds
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const interval = setInterval(fetchTotalUnread, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user, fetchTotalUnread]);

  return {
    totalUnread,
    loading,
    error,
    refresh: fetchTotalUnread,
  };
};

export default useMessageUnreadCount;