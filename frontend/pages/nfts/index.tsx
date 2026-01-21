import React from 'react';
import { Box, Typography, Container, Grid2, Card, CardContent, Button, Chip, Stack } from '@mui/material';
import { Image, Palette, TrendingUp, Star } from 'lucide-react';
import Head from 'next/head';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/ui/EmptyState';

export default function NFTsPage() {
  return (
    <>
      <Head>
        <title>NFTs - Vetora</title>
        <meta name="description" content="Discover, create, and trade NFTs on Vetora's NFT platform." />
      </Head>

      <AppLayout requireAuth showNavigation>
        <Container maxWidth="lg" className="py-8">
          <Stack spacing={4}>
            {/* Header */}
            <Box>
              <Typography variant="h3" component="h1" gutterBottom className="font-bold">
                NFT Collections
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Discover and collect unique digital assets
              </Typography>
            </Box>

            {/* Quick Stats */}
            <Grid2 container spacing={3}>
              <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Image className="text-blue-500" size={24} />
                      <Box>
                        <Typography variant="h6">2,345</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total NFTs
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid2>
              
              <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Palette className="text-purple-500" size={24} />
                      <Box>
                        <Typography variant="h6">156</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Collections
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid2>
              
              <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <TrendingUp className="text-green-500" size={24} />
                      <Box>
                        <Typography variant="h6">89</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Trending
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid2>
              
              <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Star className="text-yellow-500" size={24} />
                      <Box>
                        <Typography variant="h6">23</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Featured
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid2>
            </Grid2>

            {/* Categories */}
            <Box>
              <Typography variant="h5" gutterBottom>
                Categories
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                {['Art', 'Photography', 'Music', 'Gaming', 'Sports', 'Collectibles', 'Utility'].map((category) => (
                  <Chip
                    key={category}
                    label={category}
                    variant="outlined"
                    clickable
                    sx={{ mb: 1 }}
                  />
                ))}
              </Stack>
            </Box>

            {/* Coming Soon State */}
            <EmptyState
              icon={<Image size={64} className="text-gray-400" />}
              title="NFT Platform Coming Soon"
              description="We're building a comprehensive NFT platform where you can mint, trade, and showcase your digital collectibles."
              action={{
                label: 'Explore Social Feed',
                onClick: () => window.location.href = '/social'
              }}
            />
          </Stack>
        </Container>
      </AppLayout>
    </>
  );
}

