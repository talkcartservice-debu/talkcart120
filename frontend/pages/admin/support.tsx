import React, { useState, useEffect, useCallback } from 'react';
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
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination
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
  };
  vendorId?: {
    name: string;
  };
  assignedTo?: {
    name: string;
  };
}

interface TicketStats {
  totalTickets: number;
  statusCounts: { _id: string; count: number }[];
  categoryCounts: { _id: string; count: number }[];
  priorityCounts: { _id: string; count: number }[];
  recentTickets: number;
}

const SupportAdminPage: NextPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    priority: 'all',
    assignedTo: 'all'
  });
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();

  const categories = [
    { value: 'all', label: 'All Categories' },
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
    { value: 'all', label: 'All Priorities' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const statuses = [
    { value: 'all', label: 'All Statuses' },
    { value: 'open', label: 'Open', color: 'primary' },
    { value: 'pending', label: 'Pending', color: 'warning' },
    { value: 'in-progress', label: 'In Progress', color: 'info' },
    { value: 'resolved', label: 'Resolved', color: 'success' },
    { value: 'closed', label: 'Closed', color: 'secondary' },
    { value: 'spam', label: 'Spam', color: 'error' }
  ];

  const assignedOptions = [
    { value: 'all', label: 'All Tickets' },
    { value: 'unassigned', label: 'Unassigned' },
    { value: 'assigned', label: 'Assigned to Me' }
  ];

  const fetchTicketStats = useCallback(async () => {
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
    } catch (error) {
      setError('An error occurred while fetching ticket statistics');
      console.error('Error fetching ticket stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchAdminTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        status: filters.status,
        category: filters.category,
        priority: filters.priority,
        assignedTo: filters.assignedTo === 'assigned' ? user?.id || '' : filters.assignedTo
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
        setTotalPages(data.pagination.totalPages);
      } else {
        setError(data.message || 'Failed to fetch tickets');
      }
    } catch (error) {
      setError('An error occurred while fetching tickets');
      console.error('Error fetching admin tickets:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filters, user?.id]);

  useEffect(() => {
    if (user) {
      fetchTicketStats();
      fetchAdminTickets();
    }
  }, [user, page, filters, fetchTicketStats, fetchAdminTickets]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(1); // Reset to first page when filters change
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
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
        <title>Support Admin | Vetora</title>
      </Head>
      
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Support Admin Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage and respond to customer support tickets
          </Typography>
        </Box>

        <Paper elevation={3} sx={{ mb: 4, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Ticket Statistics
          </Typography>
          
          {statsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress />
            </Box>
          ) : stats ? (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" align="center">
                      {stats.totalTickets}
                    </Typography>
                    <Typography variant="body2" align="center" color="text.secondary">
                      Total Tickets
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" align="center">
                      {stats.recentTickets}
                    </Typography>
                    <Typography variant="body2" align="center" color="text.secondary">
                      Tickets (30 days)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" align="center">
                      {stats.statusCounts.find(s => s._id === 'open')?.count || 0}
                    </Typography>
                    <Typography variant="body2" align="center" color="text.secondary">
                      Open Tickets
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" align="center">
                      {stats.statusCounts.find(s => s._id === 'resolved')?.count || 0}
                    </Typography>
                    <Typography variant="body2" align="center" color="text.secondary">
                      Resolved Tickets
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : null}
        </Paper>

        <Paper elevation={3}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="All Tickets" />
            <Tab label="Unassigned" />
            <Tab label="My Tickets" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value as string)}
                >
                  {statuses.map(status => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value as string)}
                >
                  {categories.map(category => (
                    <MenuItem key={category.value} value={category.value}>
                      {category.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value as string)}
                >
                  {priorities.map(priority => (
                    <MenuItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Assignment</InputLabel>
                <Select
                  value={filters.assignedTo}
                  onChange={(e) => handleFilterChange('assignedTo', e.target.value as string)}
                >
                  {assignedOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : tickets.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  No tickets found matching your filters.
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Ticket ID</TableCell>
                        <TableCell>Subject</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tickets.map(ticket => (
                        <TableRow key={ticket._id}>
                          <TableCell>{ticket.ticketId}</TableCell>
                          <TableCell>{ticket.subject}</TableCell>
                          <TableCell>{ticket.userId.name}</TableCell>
                          <TableCell>{getCategoryLabel(ticket.category)}</TableCell>
                          <TableCell>{getPriorityLabel(ticket.priority)}</TableCell>
                          <TableCell>{getStatusChip(ticket.status)}</TableCell>
                          <TableCell>{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button 
                              size="small" 
                              variant="outlined"
                              href={`/support/${ticket.ticketId}`}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Pagination 
                    count={totalPages} 
                    page={page} 
                    onChange={handlePageChange}
                    color="primary"
                  />
                </Box>
              </>
            )}
          </Box>
        </Paper>
      </Container>
    </Layout>
  );
};

export default SupportAdminPage;