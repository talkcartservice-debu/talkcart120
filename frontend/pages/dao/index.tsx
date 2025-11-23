import React from 'react';
import { Box, Typography, Container, Grid2, Card, CardContent, Button, Chip, Stack } from '@mui/material';
import { Vote, Users, TrendingUp, Clock } from 'lucide-react';
import Head from 'next/head';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/ui/EmptyState';

export default function DAOPage() {
  return (
    <>
      <Head>
        <title>DAO Governance - TalkCart</title>
        <meta name="description" content="Participate in TalkCart's decentralized governance and shape the future of the platform." />
      </Head>

      <AppLayout requireAuth showNavigation>
        <Container maxWidth="lg" className="py-8">
          <Stack spacing={4}>
            {/* Header */}
            <Box>
              <Typography variant="h3" component="h1" gutterBottom className="font-bold">
                DAO Governance
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Shape the future of TalkCart through decentralized governance
              </Typography>
            </Box>

            {/* Quick Stats */}
            <Grid2 container spacing={3}>
              <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Vote className="text-blue-500" size={24} />
                      <Box>
                        <Typography variant="h6">23</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Active Proposals
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
                      <Users className="text-green-500" size={24} />
                      <Box>
                        <Typography variant="h6">1,567</Typography>
                        <Typography variant="body2" color="text.secondary">
                          DAO Members
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
                      <TrendingUp className="text-purple-500" size={24} />
                      <Box>
                        <Typography variant="h6">89%</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Participation Rate
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
                      <Clock className="text-orange-500" size={24} />
                      <Box>
                        <Typography variant="h6">7</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Days Avg. Voting
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid2>
            </Grid2>

            {/* Proposal Categories */}
            <Box>
              <Typography variant="h5" gutterBottom>
                Proposal Categories
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                {['Platform Updates', 'Treasury', 'Partnerships', 'Community', 'Technical', 'Governance'].map((category) => (
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
              icon={<Vote size={64} className="text-gray-400" />}
              title="DAO Governance Coming Soon"
              description="We're building a comprehensive DAO governance system where community members can propose, discuss, and vote on platform decisions."
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