﻿import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

export interface Notification {
  id: string;
  type: string;
  title?: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender?: {
    id: string;
    displayName: string;
    avatar?: string;
  };
  data?: any;
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch notifications from API
      const response: any = await api.notifications.getNotifications({
        page: 1,
        limit: 50, // Fetch more notifications
      });

      if (response.success && response.data) {
        setNotifications(response.data);
      } else {
        setNotifications([]);
        console.error('Failed to fetch notifications:', response.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notifications';
      setError(errorMessage);
      console.error('Fetch notifications error:', errorMessage);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setUnreadCount(0);
      return;
    }

    try {
      const response: any = await api.notifications.getUnreadCount();
      
      if (response.success && response.data) {
        setUnreadCount(response.data.unreadCount || 0);
      } else {
        setUnreadCount(0);
        console.error('Failed to fetch unread count:', response.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch unread count';
      setError(errorMessage);
      console.error('Fetch unread count error:', errorMessage);
      setUnreadCount(0);
    }
  }, [isAuthenticated, user]);

  // Mark a notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!isAuthenticated) return false;

    try {
      const response: any = await api.notifications.markAsRead([notificationId]);
      
      if (response.success) {
        // Update local state
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === notificationId
              ? { ...notification, isRead: true }
              : notification
          )
        );
        
        // Update unread count
        setUnreadCount(prev => Math.max(0, prev - 1));
        return true;
      } else {
        console.error('Failed to mark notification as read:', response.error);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark notification as read';
      setError(errorMessage);
      console.error('Mark as read error:', errorMessage);
      return false;
    }
  }, [isAuthenticated]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!isAuthenticated) return false;

    try {
      const response: any = await api.notifications.markAllAsRead();
      
      if (response.success) {
        // Update local state
        setNotifications(prev =>
          prev.map(notification => ({
            ...notification,
            isRead: true
          }))
        );
        
        // Reset unread count to 0
        setUnreadCount(0);
        return true;
      } else {
        console.error('Failed to mark all notifications as read:', response.error);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark all notifications as read';
      setError(errorMessage);
      console.error('Mark all as read error:', errorMessage);
      return false;
    }
  }, [isAuthenticated]);

  // Fetch notifications and unread count on mount if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      fetchUnreadCount();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
    fetchUnreadCount
  };
};

export default useNotifications;