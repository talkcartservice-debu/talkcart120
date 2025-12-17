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
  Divider
} from '@mui/material';
import { Search as SearchIcon, Store as StoreIcon, Person as PersonIcon } from '@mui/icons-material';
import { searchVendors, searchCustomers, Vendor, Customer } from '../../src/services/chatbotApi';

const VendorMessagingDashboard: React.FC = () => {
  const router = useRouter();
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Vendor Messaging
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          variant="fullWidth"
          sx={{ mb: 3 }}
        >
          <Tab label="Search Vendors" icon={<StoreIcon />} />
          <Tab label="Search Customers" icon={<PersonIcon />} />
        </Tabs>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder={`Search ${activeTab === 0 ? 'vendors' : 'customers'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              endAdornment: (
                <Button 
                  variant="contained" 
                  onClick={() => handleSearch()}
                  disabled={loading}
                  startIcon={<SearchIcon />}
                >
                  Search
                </Button>
              )
            }}
          />
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
                              sx={{ width: 56, height: 56 }}
                            >
                              <StoreIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText 
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="h6">
                                  {vendor.displayName || vendor.username}
                                </Typography>
                                {vendor.isVerified && (
                                  <Chip 
                                    label="Verified" 
                                    size="small" 
                                    color="primary" 
                                    variant="outlined" 
                                  />
                                )}
                              </Box>
                            }
                            secondary={
                              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                  {vendor.productCount} products
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
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
                              sx={{ width: 56, height: 56 }}
                            >
                              <PersonIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText 
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="h6">
                                  {customer.displayName || customer.username}
                                </Typography>
                                {customer.isVerified && (
                                  <Chip 
                                    label="Verified" 
                                    size="small" 
                                    color="primary" 
                                    variant="outlined" 
                                  />
                                )}
                              </Box>
                            }
                            secondary={
                              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                  {customer.orderCount} orders
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
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
