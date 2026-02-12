import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  Container, 
  Typography, 
  Tabs, 
  Tab, 
  Box, 
  TextField, 
  Button, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  Chip, 
  CircularProgress, 
  Alert, 
  Pagination,
  Paper,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Search as SearchIcon, Store as StoreIcon, Person as PersonIcon } from '@mui/icons-material';
import { searchVendors, searchCustomers, Vendor, Customer } from '../../src/services/chatbotApi';

const VendorMessagingDashboard: React.FC = () => {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setPage(1);
    setSearchQuery('');
  };

  const handleSearch = React.useCallback(async (query: string = searchQuery) => {
    setLoading(true);
    setError(null);
    
    try {
      if (activeTab === 0) {
        // Search vendors
        const response = await searchVendors({
          search: query,
          page,
          limit: 10
        });
        
        setVendors(response.data.vendors);
        setTotalPages(response.data.pagination.pages);
      } else {
        // Search customers
        const response = await searchCustomers({
          search: query,
          page,
          limit: 10
        });
        
        setCustomers(response.data.customers);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to search');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, searchQuery]);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  useEffect(() => {
    handleSearch();
  }, [activeTab, page, handleSearch]);

  const handleVendorClick = (vendorId: string) => {
    // Navigate to vendor profile or start conversation
    router.push(`/marketplace/vendor/${vendorId}`);
  };

  const handleCustomerClick = (customerId: string) => {
    // Navigate to customer profile or start conversation
    console.log('Navigate to customer:', customerId);
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 1, sm: 3 } }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
        Vendor Messaging
      </Typography>
      
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          variant={isMobile ? "scrollable" : "fullWidth"}
          scrollButtons="auto"
          sx={{ mb: 3 }}
        >
          <Tab label="Search Vendors" icon={<StoreIcon />} iconPosition="start" />
          <Tab label="Search Customers" icon={<PersonIcon />} iconPosition="start" />
        </Tabs>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder={`Search ${activeTab === 0 ? 'vendors' : 'customers'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            sx={{ flex: { xs: '1 1 100%', sm: 1 } }}
          />
          <Button 
            variant="contained" 
            onClick={() => handleSearch()}
            disabled={loading}
            startIcon={<SearchIcon />}
            fullWidth={isMobile}
            sx={{ height: { sm: 56 } }}
          >
            Search
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {activeTab === 0 ? (
              // Vendors list
              <>
                <List>
                  {vendors.length > 0 ? (
                    vendors.map((vendor) => (
                      <React.Fragment key={vendor.id}>
                        <ListItem 
                          onClick={() => handleVendorClick(vendor.id)}
                          sx={{ 
                            cursor: 'pointer',
                            '&:hover': { 
                              backgroundColor: 'action.hover' 
                            } 
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar 
                              src={vendor.avatar} 
                              alt={vendor.displayName}
                              sx={{ width: { xs: 40, sm: 56 }, height: { xs: 40, sm: 56 } }}
                            >
                              <StoreIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText 
                            primary={
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle1" fontWeight={600} sx={{ fontSize: { xs: '0.9rem', sm: '1.1rem' } }}>
                                  {vendor.displayName || vendor.username}
                                </Typography>
                                {vendor.isVerified && (
                                  <Chip 
                                    label="Verified" 
                                    size="small" 
                                    color="primary" 
                                    variant="outlined" 
                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                  />
                                )}
                              </Box>
                            }
                            secondary={
                              <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                  {vendor.productCount} products
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {vendor.followerCount} followers
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    ))
                  ) : (
                    <ListItem>
                      <ListItemText 
                        primary="No vendors found" 
                        secondary="Try adjusting your search query"
                      />
                    </ListItem>
                  )}
                </List>
              </>
            ) : (
              // Customers list
              <>
                <List>
                  {customers.length > 0 ? (
                    customers.map((customer) => (
                      <React.Fragment key={customer.id}>
                        <ListItem 
                          onClick={() => handleCustomerClick(customer.id)}
                          sx={{ 
                            cursor: 'pointer',
                            '&:hover': { 
                              backgroundColor: 'action.hover' 
                            } 
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar 
                              src={customer.avatar} 
                              alt={customer.displayName}
                              sx={{ width: { xs: 40, sm: 56 }, height: { xs: 40, sm: 56 } }}
                            >
                              <PersonIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText 
                            primary={
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle1" fontWeight={600} sx={{ fontSize: { xs: '0.9rem', sm: '1.1rem' } }}>
                                  {customer.displayName || customer.username}
                                </Typography>
                                {customer.isVerified && (
                                  <Chip 
                                    label="Verified" 
                                    size="small" 
                                    color="primary" 
                                    variant="outlined" 
                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                  />
                                )}
                              </Box>
                            }
                            secondary={
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1, sm: 2 }, mt: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                  {customer.orderCount} orders
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Member since {new Date(customer.createdAt).toLocaleDateString()}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    ))
                  ) : (
                    <ListItem>
                      <ListItemText 
                        primary="No customers found" 
                        secondary="Try adjusting your search query"
                      />
                    </ListItem>
                  )}
                </List>
              </>
            )}
            
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination 
                  count={totalPages} 
                  page={page} 
                  onChange={handlePageChange}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </Paper>
    </Container>
  );
};

export default VendorMessagingDashboard;
