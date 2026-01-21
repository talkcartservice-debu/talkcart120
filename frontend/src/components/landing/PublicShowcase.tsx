import React from 'react';
import { 
  Box, 
  Paper, 
  Container, 
  Typography, 
  Button, 
  Grid, 
  Card, 
  CardContent, 
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  Sparkles, 
  ArrowRight, 
  Users, 
  MessageCircle, 
  TrendingUp, 
  Globe,
  Earth
} from 'lucide-react';
import Link from 'next/link';
import PublicFeed from '@/components/feed/PublicFeed';

interface PublicShowcaseProps {
  onSignUpClick?: () => void;
  onLoginClick?: () => void;
}

/**
 * PublicShowcase component displays public content to visitors
 * Shows what the platform has to offer without requiring authentication
 */
export const PublicShowcase: React.FC<PublicShowcaseProps> = ({
  onSignUpClick,
  onLoginClick
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [publicQuery, setPublicQuery] = React.useState('');

  const features = [
    {
      icon: <Globe size={24} />,
      title: 'Public Posts',
      description: 'Share your thoughts with the world',
      color: theme.palette.success.main
    },
    {
      icon: <Users size={24} />,
      title: 'Follow Friends',
      description: 'Connect with people you care about',
      color: theme.palette.info.main
    },
    {
      icon: <MessageCircle size={24} />,
      title: 'Engage & Comment',
      description: 'Join conversations and discussions',
      color: theme.palette.warning.main
    },
    {
      icon: <TrendingUp size={24} />,
      title: 'Trending Content',
      description: 'Discover what\'s popular right now',
      color: theme.palette.error.main
    }
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Paper
        elevation={0}
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}15)`,
          borderRadius: 0,
          py: 6,
          mb: 4,
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        <Container maxWidth="lg">
          <Box textAlign="center" mb={4}>
            <Box display="flex" alignItems="center" justifyContent="center" gap={2} mb={2}>
              <Sparkles size={32} color={theme.palette.primary.main} />
              <Typography variant="h3" fontWeight={700} color="primary">
                Vetora
              </Typography>
            </Box>
            
            <Typography variant="h5" color="text.secondary" gutterBottom>
              Connect, Share, and Discover Amazing Content
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', mb: 4 }}>
              Join our vibrant community where everyone can share their thoughts, 
              connect with friends, and discover trending content from around the world.
            </Typography>

            <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
              <Button
                variant="contained"
                size="large"
                onClick={onSignUpClick}
                endIcon={<ArrowRight size={20} />}
                sx={{ px: 4, py: 1.5 }}
              >
                Join Vetora
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={onLoginClick}
                sx={{ px: 4, py: 1.5 }}
              >
                Sign In
              </Button>
            </Box>
          </Box>

          {/* Features Grid */}
          <Grid container spacing={3} sx={{ mt: 2 }}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card 
                  elevation={0} 
                  sx={{ 
                    height: '100%',
                    border: `1px solid ${theme.palette.divider}`,
                    transition: 'transform 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme.shadows[4]
                    }
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        backgroundColor: `${feature.color}20`,
                        color: feature.color,
                        mx: 'auto',
                        mb: 2
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Paper>

      {/* Public Content Section */}
      <Container maxWidth="lg">
        <Box mb={4}>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Globe size={24} color={theme.palette.primary.main} />
            <Typography variant="h4" fontWeight={600}>
              What&apos;s Happening
            </Typography>
            <Chip 
              label="Live Feed" 
              color="primary" 
              variant="outlined" 
              size="small"
            />
          </Box>
          
          <Typography variant="body1" color="text.secondary" gutterBottom>
            See what our community is sharing right now. All posts shown below are public and visible to everyone.
          </Typography>
        </Box>

        {/* Public Feed */}
        <PublicFeed
          showHeader={false}
          maxPosts={10}
          contentFilter="all"
          sortBy="recent"
        />

        {/* Call to Action */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mt: 4,
            textAlign: 'center',
            background: `linear-gradient(135deg, ${theme.palette.primary.main}10, ${theme.palette.secondary.main}10)`,
            border: `1px solid ${theme.palette.divider}`
          }}
        >
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Ready to Join the Conversation?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Create your account and start sharing your thoughts with the world.
          </Typography>
          <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
            <Button
              variant="contained"
              size="large"
              onClick={onSignUpClick}
              endIcon={<ArrowRight size={20} />}
              sx={{ px: 4, py: 1.5 }}
            >
              Get Started
            </Button>
            <Button
              variant="outlined"
              size="large"
              component={Link}
              href="/explore"
              sx={{ px: 4, py: 1.5 }}
            >
              Explore More
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};