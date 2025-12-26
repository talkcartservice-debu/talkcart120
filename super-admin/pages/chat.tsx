import React, { useState } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import { 
  Search as SearchIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAdminGuard } from '@/services/useAdminGuard';
import ChatManagementDashboard from '../components/ChatManagementDashboard';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`chat-tabpanel-${index}`}
      aria-labelledby={`chat-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function ChatAdmin() {
  const guard = useAdminGuard();
  const [tabValue, setTabValue] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Guard checks after all hooks are defined
  if (guard.loading) return <div style={{ padding: 20 }}>Checking access…</div>;
  if (!guard.allowed) return <div style={{ padding: 20, color: 'crimson' }}>{guard.error || 'Access denied'}</div>;

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    // Refresh logic would go here
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Chat Management</Typography>
        <IconButton onClick={handleRefresh} size="small">
          <RefreshIcon />
        </IconButton>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Dashboard" />
          <Tab label="Active Conversations" />
          <Tab label="Resolved Conversations" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <ChatManagementDashboard />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} useFlexGap flexWrap="wrap">
            <TextField
              label="Search Conversations"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: { xs: '100%', sm: 200 }, mb: { xs: 1, sm: 0 }, width: { xs: '100%', sm: 'auto' } }}
              InputProps={{
                endAdornment: <SearchIcon />
              }}
            />
            <TextField
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              select
              sx={{ minWidth: { xs: '100%', sm: 150 }, mb: { xs: 1, sm: 0 }, width: { xs: '100%', sm: 'auto' } }}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
            </TextField>
            <Button 
              variant="contained" 
              startIcon={<SearchIcon />}
              sx={{ alignSelf: 'flex-end', mb: { xs: 1, sm: 0 } }}
            >
              Search
            </Button>
          </Stack>
        </Paper>
        
        <ChatManagementDashboard />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} useFlexGap flexWrap="wrap">
            <TextField
              label="Search Resolved Chats"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: { xs: '100%', sm: 200 }, mb: { xs: 1, sm: 0 }, width: { xs: '100%', sm: 'auto' } }}
              InputProps={{
                endAdornment: <SearchIcon />
              }}
            />
            <TextField
              label="Time Range"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              select
              sx={{ minWidth: { xs: '100%', sm: 150 }, mb: { xs: 1, sm: 0 }, width: { xs: '100%', sm: 'auto' } }}
            >
              <MenuItem value="">All Time</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
            </TextField>
            <Button 
              variant="contained" 
              startIcon={<SearchIcon />}
              sx={{ alignSelf: 'flex-end', mb: { xs: 1, sm: 0 } }}
            >
              Search
            </Button>
          </Stack>
        </Paper>
        
        <ChatManagementDashboard />
      </TabPanel>
    </Container>
  );
}