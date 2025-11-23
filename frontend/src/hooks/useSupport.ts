import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SupportTicket {
  _id: string;
  ticketId: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface SupportMessage {
  _id: string;
  content: string;
  messageType: string;
  isPublic: boolean;
  createdAt: string;
  senderId: {
    name: string;
    email: string;
    role: string;
    avatar?: string;
  };
}

interface TicketStats {
  totalTickets: number;
  statusCounts: { _id: string; count: number }[];
  categoryCounts: { _id: string; count: number }[];
  priorityCounts: { _id: string; count: number }[];
  recentTickets: number;
}

export const useSupport = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserTickets = async (): Promise<void> => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/support/tickets');
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Received non-JSON response from server');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setTickets(data.tickets);
      } else {
        setError(data.message || 'Failed to fetch tickets');
      }
    } catch (err) {
      setError('An error occurred while fetching tickets');
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async (ticketData: {
    subject: string;
    description: string;
    category: string;
    priority?: string;
  }): Promise<{ success: boolean; message?: string; ticket?: SupportTicket }> => {
    if (!user) {
      return { success: false, message: 'User not authenticated' };
    }

    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketData),
      });
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Received non-JSON response from server');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh tickets list
        await fetchUserTickets();
        return { success: true, ticket: data.ticket };
      } else {
        return { success: false, message: data.message || 'Failed to create ticket' };
      }
    } catch (err) {
      console.error('Error creating ticket:', err);
      return { success: false, message: 'An error occurred while creating the ticket' };
    }
  };

  return {
    tickets,
    loading,
    error,
    fetchUserTickets,
    createTicket
  };
};

export const useSupportAdmin = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminTickets = async (filters: {
    status?: string;
    category?: string;
    priority?: string;
    assignedTo?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<void> => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams({
        page: (filters.page || 1).toString(),
        limit: (filters.limit || 10).toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.category && { category: filters.category }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.assignedTo && { assignedTo: filters.assignedTo })
      }).toString();
      
      const response = await fetch(`/api/support/tickets/admin?${queryParams}`);
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Received non-JSON response from server');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setTickets(data.tickets);
      } else {
        setError(data.message || 'Failed to fetch tickets');
      }
    } catch (err) {
      setError('An error occurred while fetching tickets');
      console.error('Error fetching admin tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketStats = async (): Promise<void> => {
    if (!user) return;

    try {
      setStatsLoading(true);
      setError(null);
      
      const response = await fetch('/api/support/tickets/stats');
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Received non-JSON response from server');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      } else {
        setError(data.message || 'Failed to fetch ticket statistics');
      }
    } catch (err) {
      setError('An error occurred while fetching ticket statistics');
      console.error('Error fetching ticket stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const assignTicket = async (ticketId: string, agentId: string): Promise<{ success: boolean; message?: string }> => {
    if (!user) {
      return { success: false, message: 'User not authenticated' };
    }

    try {
      const response = await fetch(`/api/support/tickets/${ticketId}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId }),
      });
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Received non-JSON response from server');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh tickets list
        await fetchAdminTickets();
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Failed to assign ticket' };
      }
    } catch (err) {
      console.error('Error assigning ticket:', err);
      return { success: false, message: 'An error occurred while assigning the ticket' };
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string, resolutionNotes?: string): Promise<{ success: boolean; message?: string }> => {
    if (!user) {
      return { success: false, message: 'User not authenticated' };
    }

    try {
      const response = await fetch(`/api/support/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, resolutionNotes }),
      });
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Received non-JSON response from server');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh tickets list
        await fetchAdminTickets();
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Failed to update ticket status' };
      }
    } catch (err) {
      console.error('Error updating ticket status:', err);
      return { success: false, message: 'An error occurred while updating the ticket status' };
    }
  };

  return {
    tickets,
    stats,
    loading,
    statsLoading,
    error,
    fetchAdminTickets,
    fetchTicketStats,
    assignTicket,
    updateTicketStatus
  };
};

export const useSupportTicket = (ticketId: string | null) => {
  const { user } = useAuth();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTicket = async (): Promise<void> => {
    if (!user || !ticketId) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/support/tickets/${ticketId}`);
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Received non-JSON response from server');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setTicket(data.ticket);
        setMessages(data.messages);
      } else {
        setError(data.message || 'Failed to fetch ticket');
      }
    } catch (err) {
      setError('An error occurred while fetching ticket');
      console.error('Error fetching ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (content: string, messageType: string = 'customer', isPublic: boolean = true): Promise<{ success: boolean; message?: string }> => {
    if (!user || !ticketId) {
      return { success: false, message: 'User not authenticated or ticket ID missing' };
    }

    try {
      const response = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, messageType, isPublic }),
      });
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Received non-JSON response from server');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh messages
        await fetchTicket();
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Failed to send message' };
      }
    } catch (err) {
      console.error('Error sending message:', err);
      return { success: false, message: 'An error occurred while sending the message' };
    }
  };

  return {
    ticket,
    messages,
    loading,
    error,
    fetchTicket,
    sendMessage
  };
};