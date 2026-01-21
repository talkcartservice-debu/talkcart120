import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  Box, 
  Typography, 
  Container, 
  Paper, 
  Chip, 
  Button,
  TextField,
  CircularProgress,
  Alert,
  Divider,
  Avatar,
} from '@mui/material';
import Layout from '@/components/layout/Layout';
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
  userId: {
    name: string;
    email: string;
    avatar?: string;
  };
  vendorId?: {
    name: string;
  };
  assignedTo?: {
    name: string;
  };
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

const TicketDetailsPage: NextPage = () => {
  const router = useRouter();
  const { ticketId } = router.query;
  const { user } = useAuth();
  
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const categories = [
    { value: 'account', label: 'Account Issues' },
    { value: 'billing', label: 'Billing & Payments' },
    { value: 'orders', label: 'Orders & Shipping' },
    { value: 'products', label: 'Product Questions' },
    { value: 'technical', label: 'Technical Support' },
    { value: 'vendor', label: 'Vendor Support' },
    { value: 'refund', label: 'Refunds & Returns' },
    { value: 'other', label: 'Other' }
  ];

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const statuses = [
    { value: 'open', label: 'Open', color: 'primary' },
    { value: 'pending', label: 'Pending', color: 'warning' },
    { value: 'in-progress', label: 'In Progress', color: 'info' },
    { value: 'resolved', label: 'Resolved', color: 'success' },
    { value: 'closed', label: 'Closed', color: 'secondary' },
    { value: 'spam', label: 'Spam', color: 'error' }
  ];

  useEffect(() => {
    if (ticketId && user) {
      fetchTicketDetails();
    }
  }, [ticketId, user]);

  const fetchTicketDetails = React.useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      
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
        setErrorMessage(data.message || 'Failed to fetch ticket details');
      }
    } catch (error) {
      setErrorMessage('An error occurred while fetching ticket details');
      console.error('Error fetching ticket details:', error);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage('');
      
      const response = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage,
          messageType: 'customer',
          isPublic: true
        }),
      });
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Received non-JSON response from server');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setNewMessage('');
        setSuccessMessage('Message sent successfully!');
        fetchTicketDetails(); // Refresh messages
      } else {
        setErrorMessage(data.message || 'Failed to send message');
      }
    } catch (error) {
      setErrorMessage('An error occurred while sending the message');
      console.error('Error sending message:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusChip = (status: string) => {
    const statusInfo = statuses.find(s => s.value === status) || statuses[0];
    if (!statusInfo) {
      return <Chip label={status} size="small" variant="outlined" />;
    }
    
    // Ensure color is one of the valid MUI color types
    const validColors = ['default', 'primary', 'secondary', 'error', 'info', 'success', 'warning'];
    const chipColor = validColors.includes(statusInfo.color) ? statusInfo.color : 'default';
    
    return (
      <Chip 
        label={statusInfo.label} 
        size="small" 
        color={chipColor as any}
        variant="outlined"
      />
    );
  };

  const getCategoryLabel = (category: string) => {
    const categoryInfo = categories.find(c => c.value === category);
    return categoryInfo ? categoryInfo.label : category;
  };

  const getPriorityLabel = (priority: string) => {
    const priorityInfo = priorities.find(p => p.value === priority);
    return priorityInfo ? priorityInfo.label : priority;
  };

  const getMessageTypeLabel = (messageType: string) => {
    switch (messageType) {
      case 'customer': return 'Customer';
      case 'vendor': return 'Vendor';
      case 'admin': return 'Admin';
      case 'system': return 'System';
      default: return messageType;
    }
  };

  if (loading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </Layout>
    );
  }

  if (!ticket) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error">Ticket not found</Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Ticket #{ticket.ticketId} | Vetora Support</title>
      </Head>
      
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>
        )}
        
        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>
        )}

        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h5" component="h1" gutterBottom>
                {ticket.subject}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ticket ID: {ticket.ticketId}
              </Typography>
            </Box>
            <Box>
              {getStatusChip(ticket.status)}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Chip 
              label={getCategoryLabel(ticket.category)} 
              size="small" 
              variant="outlined"
            />
            <Chip 
              label={getPriorityLabel(ticket.priority)} 
              size="small" 
              variant="outlined"
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" paragraph>
              {ticket.description}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Created: {new Date(ticket.createdAt).toLocaleString()}
            </Typography>
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => router.push('/help')}
            >
              Back to Tickets
            </Button>
          </Box>
        </Paper>

        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Conversation
          </Typography>

          {messages.length === 0 ? (
            <Typography variant="body1" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No messages yet. Be the first to send a message.
            </Typography>
          ) : (
            <Box sx={{ mb: 3 }}>
              {messages.map(message => (
                <Box 
                  key={message._id} 
                  sx={{ 
                    mb: 3, 
                    p: 2, 
                    bgcolor: message.messageType === 'customer' ? 'grey.50' : 'background.paper',
                    borderRadius: 1,
                    border: 1,
                    borderColor: message.messageType === 'customer' ? 'primary.light' : 'grey.300'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Avatar 
                      src={message.senderId.avatar} 
                      sx={{ width: 32, height: 32, mr: 1 }} 
                      alt={message.senderId.name}
                    >
                      {message.senderId.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2">
                        {message.senderId.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getMessageTypeLabel(message.messageType)} • {new Date(message.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2">
                    {message.content}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <Box>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Type your message here..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={submitting}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                variant="contained" 
                onClick={handleSendMessage}
                disabled={submitting || !newMessage.trim()}
              >
                {submitting ? <CircularProgress size={24} /> : 'Send Message'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Layout>
  );
};

export default TicketDetailsPage;