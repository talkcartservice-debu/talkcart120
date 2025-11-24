import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  IconButton,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Snackbar,
  Tabs,
  Tab,
} from '@mui/material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { streamingApi } from '@/services/streamingApi';
import { HttpError } from '@/lib/api';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  Clock,
  Heart,
  MessageCircle,
  Gift,
  DollarSign,
  BarChart3,
  Download,
  Share2,
  Calendar,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  FileText,
  FileSpreadsheet,
  Image,
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import recharts components to avoid SSR issues
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { 
  ssr: false, 
  loading: () => null 
});

const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { 
  ssr: false, 
  loading: () => null 
});

const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { 
  ssr: false, 
  loading: () => null 
});

const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { 
  ssr: false, 
  loading: () => null 
});

const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { 
  ssr: false, 
  loading: () => null 
});

const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { 
  ssr: false, 
  loading: () => null 
});

const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { 
  ssr: false, 
  loading: () => null 
});

const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { 
  ssr: false, 
  loading: () => null 
});

const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { 
  ssr: false, 
  loading: () => null 
});

const Area = dynamic(() => import('recharts').then(mod => mod.Area), { 
  ssr: false, 
  loading: () => null 
});

const Line = dynamic(() => import('recharts').then(mod => mod.Line), { 
  ssr: false, 
  loading: () => null 
});

const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { 
  ssr: false, 
  loading: () => null 
});

const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { 
  ssr: false, 
  loading: () => null 
});

const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { 
  ssr: false, 
  loading: () => null 
});

interface StreamAnalyticsProps {
  streamId: string;
  isLive?: boolean;
  timeRange?: '1h' | '24h' | '7d' | '30d';
  onTimeRangeChange?: (range: '1h' | '24h' | '7d' | '30d') => void;
}

interface AnalyticsData {
  viewerCount: {
    current: number;
    peak: number;
    average: number;
    trend: number;
  };
  engagement: {
    chatMessages: number;
    likes: number;
    shares: number;
    gifts: number;
    newFollowers: number;
  };
  revenue: {
    total: number;
    gifts: number;
    subscriptions: number;
    donations: number;
  };
  demographics: {
    countries: Array<{ name: string; viewers: number; percentage: number }>;
    devices: Array<{ type: string; count: number; percentage: number }>;
    ageGroups: Array<{ range: string; count: number; percentage: number }>;
  };
  performance: {
    streamQuality: number;
    bufferRate: number;
    avgWatchTime: number;
    retentionRate: number;
  };
  chartData: {
    viewerHistory: Array<{ time: string; viewers: number; chatActivity: number }>;
    engagementHistory: Array<{ time: string; likes: number; messages: number; gifts: number }>;
  };
  topChatters: Array<{ username: string; messages: number; avatar?: string }>;
}

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
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const StreamAnalytics: React.FC<StreamAnalyticsProps> = ({
  streamId,
  isLive = false,
  timeRange = '1h',
  onTimeRangeChange,
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf' | 'json'>('csv');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  // Export analytics mutation - Moved to top to avoid conditional hook calls
  const exportAnalyticsMutation = useMutation({
    mutationFn: ({ format, timeRange }: { format: string; timeRange: string }) =>
      streamingApi.exportAnalytics(streamId, format as 'json' | 'csv', timeRange),
    onSuccess: (data: any) => {
      // Create download link
      const blob = new Blob([JSON.stringify(data)], {
        type: exportFormat === 'csv' ? 'text/csv' :
              exportFormat === 'pdf' ? 'application/pdf' :
              'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stream-analytics-${streamId}-${selectedTimeRange}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSnackbarMessage('Analytics exported successfully!');
      setSnackbarOpen(true);
      setShowExportDialog(false);
    },
    onError: () => {
      setSnackbarMessage('Failed to export analytics');
      setSnackbarOpen(true);
    },
  });

  // No mock data - only use real data from backend

  // Fetch analytics data
  const { data: analyticsResponse, isLoading, error } = useQuery({
    queryKey: ['stream-analytics', streamId, selectedTimeRange],
    queryFn: () => streamingApi.getStreamMetrics(streamId),
    refetchInterval: isLive ? 30000 : undefined, // Refetch every 30 seconds if live
    initialData: undefined,
    retry: (failureCount, err: any) => !(err instanceof HttpError && err.status === 403) && failureCount < 2,
  });
  // Hide analytics entirely for non-streamers (403 from backend)
  if (error && (error as any).status === 403) {
    return null;
  }


  // Normalize backend metrics shape to the local AnalyticsData interface
  const rawMetrics = analyticsResponse?.data as any;
  const analyticsData: AnalyticsData | undefined = rawMetrics
    ? {
        viewerCount: {
          current: rawMetrics.viewerStats?.current ?? 0,
          peak: rawMetrics.viewerStats?.peak ?? 0,
          average: rawMetrics.viewerStats?.average ?? 0,
          trend: 0,
        },
        engagement: {
          chatMessages: rawMetrics.engagement?.chatMessages ?? 0,
          likes: rawMetrics.engagement?.likes ?? 0,
          shares: rawMetrics.engagement?.shares ?? 0,
          gifts: (rawMetrics.revenue?.donations ?? 0),
          newFollowers: rawMetrics.engagement?.newFollowers ?? 0,
        },
        revenue: {
          total: rawMetrics.revenue?.totalEarnings ?? 0,
          gifts: rawMetrics.revenue?.donations ?? 0,
          subscriptions: rawMetrics.revenue?.subscriptions ?? 0,
          donations: rawMetrics.revenue?.donations ?? 0,
        },
        demographics: {
          countries: rawMetrics.demographics?.countries ?? [],
          devices: (rawMetrics.demographics?.devices || []).map((d: any) => ({
            type: d.type,
            count: d.count,
            percentage: d.percentage ?? 0,
          })),
          ageGroups: rawMetrics.demographics?.ageGroups ?? [],
        },
        performance: {
          streamQuality: rawMetrics.performance?.streamQuality ?? 0,
          bufferRate: rawMetrics.performance?.bufferRate ?? 0,
          avgWatchTime: rawMetrics.performance?.avgWatchTime ?? 0,
          retentionRate: rawMetrics.performance?.retentionRate ?? 0,
        },
        chartData: {
          viewerHistory: rawMetrics.chartData?.viewerHistory ?? [],
          engagementHistory: rawMetrics.chartData?.engagementHistory ?? [],
        },
        topChatters: rawMetrics.topChatters ?? [],
      }
    : undefined;

  const handleTimeRangeChange = (newRange: '1h' | '24h' | '7d' | '30d') => {
    setSelectedTimeRange(newRange);
    onTimeRangeChange?.(newRange);
  };

  const handleExport = () => {
    exportAnalyticsMutation.mutate({
      format: exportFormat,
      timeRange: selectedTimeRange
    });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    // Ensure newValue is always a number and within valid range
    const tabValue = typeof newValue === 'string' ? parseInt(newValue, 10) : newValue;
    const validTabValue = isNaN(tabValue) ? 0 : Math.max(0, Math.min(3, tabValue)); // 0-3 for 4 tabs
    setActiveTab(validTabValue);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load analytics data. Please try again.
      </Alert>
    );
  }

  if (!analyticsData) {
    return (
      <Alert severity="info">No analytics data available.</Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>
          Stream Analytics
        </Typography>

        <Box display="flex" gap={1} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={selectedTimeRange}
              label="Time Range"
              onChange={(e) => handleTimeRangeChange(e.target.value as any)}
            >
              <MenuItem value="1h">Last Hour</MenuItem>
              <MenuItem value="24h">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<Download size={16} />}
            onClick={() => setShowExportDialog(true)}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Current Viewers
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    {formatNumber(analyticsData.viewerCount.current)}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    {analyticsData.viewerCount.trend > 0 ? (
                      <TrendingUp size={16} color="#4caf50" />
                    ) : (
                      <TrendingDown size={16} color="#f44336" />
                    )}
                    <Typography
                      variant="body2"
                      color={analyticsData.viewerCount.trend > 0 ? 'success.main' : 'error.main'}
                    >
                      {Math.abs(analyticsData.viewerCount.trend)}%
                    </Typography>
                  </Box>
                </Box>
                <Eye size={40} color="#1976d2" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Peak Viewers
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    {formatNumber(analyticsData.viewerCount.peak)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg: {formatNumber(analyticsData.viewerCount.average)}
                  </Typography>
                </Box>
                <TrendingUp size={40} color="#4caf50" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Chat Messages
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    {formatNumber(analyticsData.engagement.chatMessages)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Likes: {formatNumber(analyticsData.engagement.likes)}
                  </Typography>
                </Box>
                <MessageCircle size={40} color="#ff9800" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Revenue
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    {formatCurrency(analyticsData.revenue.total)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Gifts: {formatCurrency(analyticsData.revenue.gifts)}
                  </Typography>
                </Box>
                <DollarSign size={40} color="#4caf50" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Overview" />
          <Tab label="Engagement" />
          <Tab label="Demographics" />
          <Tab label="Performance" />
        </Tabs>

        {/* Overview Tab */}
        <TabPanel value={activeTab} index={0}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} lg={8}>
                <Typography variant="h6" gutterBottom>
                  Viewer Count Over Time
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData.chartData.viewerHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="viewers"
                      stroke="#1976d2"
                      fill="#1976d2"
                      fillOpacity={0.3}
                      name="Viewers"
                    />
                    <Area
                      type="monotone"
                      dataKey="chatActivity"
                      stroke="#ff9800"
                      fill="#ff9800"
                      fillOpacity={0.3}
                      name="Chat Activity"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Grid>

              <Grid item xs={12} lg={4}>
                <Typography variant="h6" gutterBottom>
                  Top Chatters
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell align="right">Messages</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analyticsData.topChatters.map((chatter: any, index: number) => (
                        <TableRow key={chatter.username}>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Avatar src={chatter.avatar} sx={{ width: 24, height: 24 }}>
                                {chatter.username[0]}
                              </Avatar>
                              <Typography variant="body2">
                                {chatter.username}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={chatter.messages}
                              size="small"
                              color={index === 0 ? 'primary' : 'default'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </CardContent>
        </TabPanel>

        {/* Engagement Tab */}
        <TabPanel value={activeTab} index={1}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Engagement Over Time
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.chartData.engagementHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="likes" stroke="#e91e63" name="Likes" />
                    <Line type="monotone" dataKey="messages" stroke="#2196f3" name="Messages" />
                    <Line type="monotone" dataKey="gifts" stroke="#ff9800" name="Gifts" />
                  </LineChart>
                </ResponsiveContainer>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Engagement Breakdown
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Heart size={32} color="#e91e63" />
                        <Typography variant="h5" fontWeight={600}>
                          {formatNumber(analyticsData.engagement.likes)}
                        </Typography>
                        <Typography color="text.secondary">Likes</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Share2 size={32} color="#2196f3" />
                        <Typography variant="h5" fontWeight={600}>
                          {formatNumber(analyticsData.engagement.shares)}
                        </Typography>
                        <Typography color="text.secondary">Shares</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Gift size={32} color="#ff9800" />
                        <Typography variant="h5" fontWeight={600}>
                          {formatNumber(analyticsData.engagement.gifts)}
                        </Typography>
                        <Typography color="text.secondary">Gifts</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Users size={32} color="#4caf50" />
                        <Typography variant="h5" fontWeight={600}>
                          {formatNumber(analyticsData.engagement.newFollowers)}
                        </Typography>
                        <Typography color="text.secondary">New Followers</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </CardContent>
        </TabPanel>

        {/* Demographics Tab */}
        <TabPanel value={activeTab} index={2}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Viewers by Country
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.demographics.countries}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${percent !== undefined ? Math.round(percent * 100) : 0}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="viewers"
                    >
                      {analyticsData.demographics.countries.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Device Types
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.demographics.devices}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1976d2" />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Age Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analyticsData.demographics.ageGroups} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="range" type="category" />
                    <Tooltip />
                    <Bar dataKey="count" fill="#4caf50" />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
            </Grid>
          </CardContent>
        </TabPanel>

        {/* Performance Tab */}
        <TabPanel value={activeTab} index={3}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Stream Quality Metrics
                </Typography>
                <Box mb={3}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>Stream Quality</Typography>
                    <Typography fontWeight={600}>
                      {analyticsData.performance.streamQuality}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={analyticsData.performance.streamQuality}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Box mb={3}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>Retention Rate</Typography>
                    <Typography fontWeight={600}>
                      {analyticsData.performance.retentionRate}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={analyticsData.performance.retentionRate}
                    color="success"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Box mb={3}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>Buffer Rate</Typography>
                    <Typography fontWeight={600}>
                      {analyticsData.performance.bufferRate}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={analyticsData.performance.bufferRate}
                    color="warning"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Performance Summary
                </Typography>
                <Card variant="outlined">
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Box textAlign="center">
                          <Clock size={32} color="#2196f3" />
                          <Typography variant="h5" fontWeight={600}>
                            {analyticsData.performance.avgWatchTime}m
                          </Typography>
                          <Typography color="text.secondary">
                            Avg Watch Time
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box textAlign="center">
                          <BarChart3 size={32} color="#4caf50" />
                          <Typography variant="h5" fontWeight={600}>
                            {analyticsData.performance.streamQuality}%
                          </Typography>
                          <Typography color="text.secondary">
                            Stream Quality
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </TabPanel>
      </Card>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onClose={() => setShowExportDialog(false)}>
        <DialogTitle>Export Analytics</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Export Format</InputLabel>
            <Select
              value={exportFormat}
              label="Export Format"
              onChange={(e) => setExportFormat(e.target.value as any)}
            >
              <MenuItem value="csv">
                <Box display="flex" alignItems="center" gap={1}>
                  <FileSpreadsheet size={16} />
                  CSV
                </Box>
              </MenuItem>
              <MenuItem value="pdf">
                <Box display="flex" alignItems="center" gap={1}>
                  <FileText size={16} />
                  PDF
                </Box>
              </MenuItem>
              <MenuItem value="json">
                <Box display="flex" alignItems="center" gap={1}>
                  <FileText size={16} />
                  JSON
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExportDialog(false)}>Cancel</Button>
          <Button
            onClick={handleExport}
            variant="contained"
            disabled={exportAnalyticsMutation.isPending}
            startIcon={exportAnalyticsMutation.isPending ? <CircularProgress size={16} /> : <Download size={16} />}
          >
            Export
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StreamAnalytics;