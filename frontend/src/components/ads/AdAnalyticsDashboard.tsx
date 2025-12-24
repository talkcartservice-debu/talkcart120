import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  LinearProgress,
  Chip,
} from '@mui/material';
import { 
  TrendingUp, 
  DollarSign, 
  BarChart3, 
  Users,
  Eye,
  ShoppingCart,
  Heart,
} from 'lucide-react';
import api from '@/lib/api';

interface AdAnalyticsOverall {
  totalCampaigns: number;
  totalAdSets: number;
  totalAds: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalSpend: number;
  ctr: number; // Click-through rate
  cpc: number; // Cost per click
  cpm: number; // Cost per thousand impressions
  conversionRate: number;
}

interface AdAnalyticsData {
  overall: AdAnalyticsOverall;
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
  }>;
  adSets: Array<{
    id: string;
    name: string;
    status: string;
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
  }>;
  ads: Array<{
    id: string;
    headline: string;
    status: string;
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    ctr: number;
  }>;
}

const AdAnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AdAnalyticsOverall | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        // Fetch overall analytics
        const response: any = await api.ads.getAdAnalytics('all');
        if (response.success && response.data) {
          // The backend returns the overall data under the 'overall' key
          setAnalytics(response.data.overall);
        } else {
          setError(response.message || 'Failed to fetch analytics');
        }
      } catch (err) {
        console.error('Error fetching ad analytics:', err);
        setError('Failed to fetch analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading analytics...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }

  if (!analytics) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>No analytics data available</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Ad Analytics Dashboard
      </Typography>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
              <Eye size={24} color="#1976d2" />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {analytics.totalImpressions.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Impressions
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
              <Heart size={24} color="#e53e3e" />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {analytics.totalClicks.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Clicks
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
              <ShoppingCart size={24} color="#38a169" />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {analytics.totalConversions.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Conversions
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
              <TrendingUp size={24} color="#3182ce" />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {(analytics.ctr * 100).toFixed(2)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              CTR (Click-Through Rate)
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Performance Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <BarChart3 size={20} />
                Performance Metrics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">CPM (Cost Per Mille)</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    ${analytics.cpm.toFixed(2)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">CPC (Cost Per Click)</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    ${analytics.cpc.toFixed(2)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Conversion Rate</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {(analytics.conversionRate * 100).toFixed(2)}%
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Total Revenue</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    ${(analytics.cpm * analytics.totalImpressions / 1000).toFixed(2)}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Users size={20} />
                Top Performing Ads
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Top performing ads section would be displayed here
              </Typography>
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2 }}>
                <Typography variant="h6" color="text.secondary">
                  Top performing ads visualization would appear here
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Daily Performance Chart Placeholder */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp size={20} />
            Daily Performance
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Daily performance chart would be displayed here with historical data
          </Typography>
          <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2 }}>
            <Typography variant="h6" color="text.secondary">
              Chart visualization would appear here
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdAnalyticsDashboard;