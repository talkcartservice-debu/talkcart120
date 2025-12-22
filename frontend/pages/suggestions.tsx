import React from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  useTheme,
  alpha,
  Grid,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { 
  Users, 
  UserPlus, 
  RefreshCw, 
  Filter,
  Sliders,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import UserAvatar from '@/components/common/UserAvatar';
import { useUserSuggestions } from '@/hooks/useUserSuggestions';

const SuggestionsPage: React.FC = () => {
  const theme = useTheme();
  const { suggestions, loading, refreshSuggestions: handleRefresh, followUser } = useUserSuggestions({ limit: 12 });

  // Format large numbers (e.g., 1.2K, 3.4M)
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Users size={24} color={theme.palette.primary.main} />
            <Typography variant="h4" fontWeight={700}>
              Who to Follow
            </Typography>
          </Box>
          
          <IconButton 
            onClick={handleRefresh}
            disabled={loading}
            sx={{ 
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.2)
              }
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : <RefreshCw size={20} />}
          </IconButton>
        </Box>
        
        {/* Filters */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', mb: 3 }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip 
                label="All" 
                size="small" 
                sx={{ 
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main',
                  fontWeight: 600
                }} 
              />
              <Chip 
                label="Popular" 
                size="small" 
                variant="outlined" 
                sx={{ fontWeight: 600 }}
              />
              <Chip 
                label="Trending" 
                size="small" 
                variant="outlined" 
                sx={{ fontWeight: 600 }}
              />
              <Chip 
                label="Mutuals" 
                size="small" 
                variant="outlined" 
                sx={{ fontWeight: 600 }}
              />
              <Chip 
                label="NFT" 
                size="small" 
                variant="outlined" 
                sx={{ fontWeight: 600 }}
              />
              <Chip 
                label="Web3" 
                size="small" 
                variant="outlined" 
                sx={{ fontWeight: 600 }}
              />
            </Box>
          </CardContent>
        </Card>
        
        {/* Suggested Users */}
        <Grid container spacing={3}>
          {suggestions.map((user) => (
            <Grid item xs={12} sm={6} key={user.id}>
              <Card 
                sx={{ 
                  borderRadius: 2, 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                <CardContent sx={{ p: 3, flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <UserAvatar
                      src={user.avatar}
                      alt={user.displayName}
                      size={64}
                      isVerified={user.isVerified}
                    />
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <Typography variant="h6" fontWeight={600}>
                          {user.displayName}
                        </Typography>
                        {user.isVerified && (
                          <Box 
                            component="span" 
                            sx={{ 
                              width: 18, 
                              height: 18, 
                              bgcolor: 'primary.main', 
                              borderRadius: '50%', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center' 
                            }}
                          >
                            <Box component="span" sx={{ color: 'white', fontSize: '0.65rem', fontWeight: 'bold' }}>✓</Box>
                          </Box>
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        @{user.username}
                      </Typography>
                      {user.mutualFollowers && user.mutualFollowers > 0 && (
                        <Chip 
                          label={`${user.mutualFollowers} mutual friends`} 
                          size="small" 
                          variant="outlined" 
                          sx={{ 
                            borderColor: alpha(theme.palette.primary.main, 0.3),
                            color: 'primary.main',
                            fontWeight: 500
                          }} 
                        />
                      )}
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {user.bio}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {formatNumber(user.followerCount)} followers
                    </Typography>
                  </Box>
                  
                  <Button 
                    variant="contained" 
                    fullWidth
                    startIcon={<UserPlus size={18} />}
                    onClick={() => followUser(user.id)}
                    sx={{ 
                      borderRadius: 2, 
                      py: 1.5,
                      textTransform: 'none',
                      fontWeight: 600,
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
                      '&:hover': {
                        boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.3)}`
                      }
                    }}
                  >
                    Follow
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        
        {/* Load More */}
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button 
            variant="outlined" 
            size="large"
            startIcon={<RefreshCw size={18} />}
            sx={{ 
              borderRadius: 3, 
              px: 4, 
              py: 1.5,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Load More Suggestions
          </Button>
        </Box>
      </Container>
    </Layout>
  );
};

export default SuggestionsPage;

