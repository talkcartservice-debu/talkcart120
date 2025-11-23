import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import LinearProgress from '@mui/material/LinearProgress';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import {
  ArrowBack as ArrowBackIcon,
  Chat as ChatIcon,
  Store as StoreIcon,
  ShoppingCart as ShoppingCartIcon,
  AttachMoney as AttachMoneyIcon,
  Person as PersonIcon,
  Verified as VerifiedIcon,
  CalendarToday as CalendarIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';
import { useAdminGuard } from '@/services/useAdminGuard';
import { AdminApi } from '@/services/api';
import VendorChatInterface from '../../components/VendorChatInterface';

interface Vendor {
  _id: string;
  username: string;
  email: string;
  fullName?: string;
  avatar?: string;
  kycStatus: string;
  isSuspended: boolean;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  phone?: string;
  location?: string;
}

interface VendorStats {
  totalProducts: number;
  activeProducts: number;
  totalSales: number;
  totalRevenue: number;
  avgOrderValue: number;
}

interface Product {
  _id: string;
  name: string;
  price: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
}

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vendor-tabpanel-${index}`}
      aria-labelledby={`vendor-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function VendorDetail() {
  const router = useRouter();
  const { id } = router.query;
  const guard = useAdminGuard();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);

  useEffect(() => {
    if (id && !Array.isArray(id)) {
      fetchVendorData(id);
    }
  }, [id]);

  // Guard checks after all hooks are defined
  if (guard.loading) return <div style={{ padding: 20 }}>Checking access…</div>;
  if (!guard.allowed) return <div style={{ padding: 20, color: 'crimson' }}>{guard.error || 'Access denied'}</div>;

  const fetchVendorData = async (vendorId: string) => {
    try {
      setLoading(true);
      
      // Fetch vendor details (using getUser instead of getVendorDetails)
      const vendorRes = await AdminApi.getUser(vendorId);
      if (vendorRes?.success) {
        // Updated data structure access with proper fallbacks
        setVendor(vendorRes.data?.user || vendorRes.data);
        setStats(vendorRes.data?.stats || {});
      }
      
      // Fetch vendor products
      const productsRes = await AdminApi.listProductsAdmin({ vendorId });
      if (productsRes?.success) {
        // Check if products are in data.products or directly in data
        const productsData = Array.isArray(productsRes.data?.products) 
          ? productsRes.data.products 
          : Array.isArray(productsRes.data) 
            ? productsRes.data 
            : [];
        setProducts(productsData);
      }
      
      // Fetch vendor orders (using listOrders with vendorId filter)
      const ordersRes = await AdminApi.listOrders({ vendorId });
      if (ordersRes?.success) {
        // Check if orders are in data.orders or directly in data
        const ordersData = Array.isArray(ordersRes.data?.orders) 
          ? ordersRes.data.orders 
          : Array.isArray(ordersRes.data) 
            ? ordersRes.data 
            : [];
        setOrders(ordersData);
      }
    } catch (error) {
      console.error('Failed to fetch vendor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleOpenChat = () => {
    setChatDialogOpen(true);
  };

  const handleCloseChat = () => {
    setChatDialogOpen(false);
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h5" gutterBottom>Vendor Details</Typography>
        <LinearProgress />
      </Container>
    );
  }

  if (!vendor) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h5" gutterBottom>Vendor not found</Typography>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/vendors')}
          variant="outlined"
        >
          Back to Vendors
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/vendors')}
          variant="outlined"
        >
          Back to Vendors
        </Button>
        <Button
          startIcon={<ChatIcon />}
          onClick={handleOpenChat}
          variant="contained"
          color="primary"
        >
          Chat with Vendor
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ width: 80, height: 80, mr: 3 }}>
              {vendor.username.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="h5" sx={{ mr: 2 }}>
                  {vendor.fullName || vendor.username}
                </Typography>
                {vendor.isVerified && (
                  <Tooltip title="Verified Vendor">
                    <VerifiedIcon color="primary" />
                  </Tooltip>
                )}
                <Chip
                  label={vendor.kycStatus}
                  color={vendor.kycStatus === 'approved' ? 'success' : vendor.kycStatus === 'pending' ? 'warning' : 'default'}
                  size="small"
                  sx={{ ml: 2 }}
                />
              </Box>
              <Typography variant="subtitle1" color="text.secondary">
                @{vendor.username}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {vendor.email}
              </Typography>
            </Box>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CalendarIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Joined"
                    secondary={formatDate(vendor.createdAt)}
                  />
                </ListItem>
                {vendor.lastLoginAt && (
                  <ListItem>
                    <ListItemIcon>
                      <CalendarIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Last Login"
                      secondary={formatDate(vendor.lastLoginAt)}
                    />
                  </ListItem>
                )}
                {vendor.phone && (
                  <ListItem>
                    <ListItemIcon>
                      <PhoneIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Phone"
                      secondary={vendor.phone}
                    />
                  </ListItem>
                )}
                {vendor.location && (
                  <ListItem>
                    <ListItemIcon>
                      <LocationIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Location"
                      secondary={vendor.location}
                    />
                  </ListItem>
                )}
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <StoreIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6">
                      {stats?.totalProducts || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Products
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <ShoppingCartIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6">
                      {stats?.totalSales || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Sales
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <AttachMoneyIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6">
                      {formatCurrency(stats?.totalRevenue || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Revenue
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <TrendingUpIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6">
                      {formatCurrency(stats?.avgOrderValue || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Order Value
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Products" />
          <Tab label="Orders" />
          <Tab label="Analytics" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Vendor Products
            </Typography>
            {products.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                No products found
              </Typography>
            ) : (
              <List>
                {products.map((product) => (
                  <React.Fragment key={product._id}>
                    <ListItem>
                      <ListItemIcon>
                        <InventoryIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={product.name}
                        secondary={`${formatCurrency(product.price, product.currency)} • Created: ${formatDate(product.createdAt)}`}
                      />
                      <Chip
                        label={product.isActive ? 'Active' : 'Inactive'}
                        color={product.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Vendor Orders
            </Typography>
            {orders.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                No orders found
              </Typography>
            ) : (
              <List>
                {orders.map((order) => (
                  <React.Fragment key={order._id}>
                    <ListItem>
                      <ListItemIcon>
                        <ShoppingCartIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Order #${order.orderNumber}`}
                        secondary={`${formatCurrency(order.total)} • Created: ${formatDate(order.createdAt)}`}
                      />
                      <Chip
                        label={order.status}
                        color={order.status === 'completed' ? 'success' : order.status === 'pending' ? 'warning' : 'default'}
                        size="small"
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Vendor Analytics
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AssessmentIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Sales Performance</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Detailed analytics about vendor sales performance would be displayed here.
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Growth Metrics</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Information about vendor growth and trends would be shown here.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Chat Dialog */}
      <VendorChatInterface
        vendor={vendor}
        open={chatDialogOpen}
        onClose={handleCloseChat}
      />
    </Container>
  );
}