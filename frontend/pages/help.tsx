import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { 
  Box, 
  Typography, 
  Container, 
  Tabs, 
  Tab, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
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
}

interface NewTicketForm {
  subject: string;
  description: string;
  category: string;
  priority: string;
}

const HelpPage: NextPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNewTicketDialog, setOpenNewTicketDialog] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState<NewTicketForm>({
    subject: '',
    description: '',
    category: 'other',
    priority: 'medium'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const { user } = useAuth();

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
    if (user) {
      fetchUserTickets();
    }
  }, [user]);

  const fetchUserTickets = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      
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
        setErrorMessage(data.message || 'Failed to fetch tickets');
      }
    } catch (error) {
      setErrorMessage('An error occurred while fetching tickets');
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleOpenNewTicketDialog = () => {
    setOpenNewTicketDialog(true);
    setFormErrors({});
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleCloseNewTicketDialog = () => {
    setOpenNewTicketDialog(false);
    setNewTicketForm({
      subject: '',
      description: '',
      category: 'other',
      priority: 'medium'
    });
  };

  const handleFormChange = (field: keyof NewTicketForm, value: string) => {
    setNewTicketForm(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!newTicketForm.subject.trim()) {
      errors.subject = 'Subject is required';
    }
    
    if (!newTicketForm.description.trim()) {
      errors.description = 'Description is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitNewTicket = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage('');
      
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTicketForm),
      });
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Received non-JSON response from server');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage('Ticket created successfully!');
        handleCloseNewTicketDialog();
        fetchUserTickets(); // Refresh the ticket list
      } else {
        setErrorMessage(data.message || 'Failed to create ticket');
      }
    } catch (error) {
      setErrorMessage('An error occurred while creating the ticket');
      console.error('Error creating ticket:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusChip = (status: string) => {
    const statusInfo = statuses.find(s => s.value === status) || statuses[0];
    if (!statusInfo) {
      return <Chip label={status} size="small" variant="outlined" />;
    }
    
    return (
      <Chip 
        label={statusInfo.label} 
        size="small" 
        color={statusInfo.color as any}
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

  return (
    <Layout>
      <Head>
        <title>Help & Support | Vetora</title>
      </Head>
      
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Help & Support
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Get help with your account, orders, or technical issues
          </Typography>
        </Box>

        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>
        )}
        
        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>
        )}

        <Paper elevation={3} sx={{ mb: 4 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="My Tickets" />
            <Tab label="FAQ" />
            <Tab label="Contact Us" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {activeTab === 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">Your Support Tickets</Typography>
                  <Button 
                    variant="contained" 
                    onClick={handleOpenNewTicketDialog}
                  >
                    New Ticket
                  </Button>
                </Box>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : tickets.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      You don&apos;t have any support tickets yet.
                    </Typography>
                    <Button 
                      variant="outlined" 
                      onClick={handleOpenNewTicketDialog}
                      sx={{ mt: 2 }}
                    >
                      Create Your First Ticket
                    </Button>
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    {tickets.map(ticket => (
                      <Grid item xs={12} key={ticket._id}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Box>
                                <Typography variant="h6" component="div">
                                  {ticket.subject}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                  Ticket ID: {ticket.ticketId}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                {getStatusChip(ticket.status)}
                              </Box>
                            </Box>
                            
                            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
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
                            
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                              <Typography variant="body2" color="text.secondary">
                                Created: {new Date(ticket.createdAt).toLocaleDateString()}
                              </Typography>
                              <Button size="small">View Details</Button>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}

            {activeTab === 1 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Frequently Asked Questions
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Coming soon...
                </Typography>
              </Box>
            )}

            {activeTab === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Contact Us
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  For immediate assistance, you can create a support ticket using the &quot;New Ticket&quot; button.
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>

        {/* New Ticket Dialog */}
        <Dialog 
          open={openNewTicketDialog} 
          onClose={handleCloseNewTicketDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Create New Support Ticket</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              {errorMessage && (
                <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>
              )}
              
              <TextField
                autoFocus
                margin="dense"
                label="Subject"
                fullWidth
                value={newTicketForm.subject}
                onChange={(e) => handleFormChange('subject', e.target.value)}
                error={!!formErrors.subject}
                helperText={formErrors.subject}
                disabled={submitting}
              />
              
              <TextField
                margin="dense"
                label="Description"
                fullWidth
                multiline
                rows={4}
                value={newTicketForm.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                error={!!formErrors.description}
                helperText={formErrors.description}
                disabled={submitting}
              />
              
              <FormControl fullWidth margin="dense">
                <InputLabel>Category</InputLabel>
                <Select
                  value={newTicketForm.category}
                  onChange={(e) => handleFormChange('category', e.target.value as string)}
                  disabled={submitting}
                >
                  {categories.map(category => (
                    <MenuItem key={category.value} value={category.value}>
                      {category.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="dense">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={newTicketForm.priority}
                  onChange={(e) => handleFormChange('priority', e.target.value as string)}
                  disabled={submitting}
                >
                  {priorities.map(priority => (
                    <MenuItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseNewTicketDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitNewTicket} 
              variant="contained" 
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={24} /> : 'Submit Ticket'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default HelpPage;