import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Crown,
  Star,
  Zap,
  Heart,
  Shield,
  MessageCircle,
  Gift,
  Check,
  X,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { streamingApi } from '@/services/streamingApi';
import toast from 'react-hot-toast';

interface SubscriptionPanelProps {
  streamerId: string;
  streamerName: string;
  isOpen: boolean;
  onClose: () => void;
  onSubscriptionChange?: (isSubscribed: boolean) => void;
}

const subscriptionTiers = [
  {
    id: 'basic',
    name: 'Basic Supporter',
    price: 4.99,
    color: '#4caf50',
    icon: Heart,
    benefits: [
      'Ad-free viewing',
      'Supporter badge in chat',
      'Access to subscriber-only chat',
      'Priority customer support'
    ]
  },
  {
    id: 'premium',
    name: 'Premium Fan',
    price: 9.99,
    color: '#9c27b0',
    icon: Star,
    benefits: [
      'All Basic benefits',
      'Custom emotes',
      'Exclusive Discord access',
      'Monthly subscriber-only streams',
      'Early access to content'
    ]
  },
  {
    id: 'vip',
    name: 'VIP Member',
    price: 24.99,
    color: '#ff9800',
    icon: Crown,
    benefits: [
      'All Premium benefits',
      'VIP badge and special recognition',
      'Direct message access',
      'Monthly 1-on-1 video call',
      'Exclusive merchandise',
      'Input on stream content'
    ]
  }
];

const SubscriptionPanel: React.FC<SubscriptionPanelProps> = ({
  streamerId,
  streamerName,
  isOpen,
  onClose,
  onSubscriptionChange,
}) => {
  const queryClient = useQueryClient();
  const [selectedTier, setSelectedTier] = useState('basic');
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Check current subscription status
  const { data: subscriptionData, isLoading } = useQuery({
    queryKey: ['subscription-status', streamerId],
    queryFn: () => Promise.resolve({
      success: true,
      data: {
        isSubscribed: false,
        subscription: null as {
          tier: string;
          price: number;
          nextBillingDate: string;
        } | null
      }
    }),
    enabled: isOpen,
  });

  const isSubscribed = subscriptionData?.data?.isSubscribed || false;
  const currentSubscription = subscriptionData?.data?.subscription;

  // Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: ({ tier, paymentMethod }: { tier: string; paymentMethod: string }) =>
      Promise.resolve({
        success: true,
        data: {
          tier,
          paymentMethod,
          subscribedAt: new Date().toISOString(),
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      }),
    onSuccess: () => {
      toast.success(`Successfully subscribed to ${streamerName}! 🎉`);
      queryClient.invalidateQueries({ queryKey: ['subscription-status', streamerId] });
      setShowConfirmation(false);
      onClose();
      if (onSubscriptionChange) {
        onSubscriptionChange(true);
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to subscribe');
    },
  });

  // Unsubscribe mutation
  const unsubscribeMutation = useMutation({
    mutationFn: () => Promise.resolve({
      success: true,
      data: {
        unsubscribed: true
      }
    }),
    onSuccess: () => {
      toast.success(`Unsubscribed from ${streamerName}`);
      queryClient.invalidateQueries({ queryKey: ['subscription-status', streamerId] });
      onClose();
      if (onSubscriptionChange) {
        onSubscriptionChange(false);
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to unsubscribe');
    },
  });

  const handleSubscribe = () => {
    subscribeMutation.mutate({
      tier: selectedTier,
      paymentMethod: 'card', // Default payment method
    });
  };

  const handleUnsubscribe = () => {
    unsubscribeMutation.mutate();
  };

  const selectedTierData = subscriptionTiers.find(tier => tier.id === selectedTier);

  return (
    <>
      {/* Main Subscription Dialog */}
      <Dialog
        open={isOpen}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 },
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <Crown size={24} color="#ff9800" />
            <Box>
              <Typography variant="h6">
                {isSubscribed ? 'Manage Subscription' : 'Subscribe to'} {streamerName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Support your favorite creator and unlock exclusive benefits
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          {isLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : isSubscribed ? (
            // Current subscription info
            <Box>
              <Alert severity="success" sx={{ mb: 3 }}>
                You are currently subscribed to {streamerName}!
              </Alert>
              
              {currentSubscription && (
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Current Plan: {subscriptionTiers.find(t => t.id === currentSubscription.tier)?.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Next billing: {new Date(currentSubscription.nextBillingDate).toLocaleDateString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ${currentSubscription.price}/month
                    </Typography>
                  </CardContent>
                </Card>
              )}

              <Button
                variant="outlined"
                color="error"
                onClick={handleUnsubscribe}
                disabled={unsubscribeMutation.isPending}
                fullWidth
              >
                {unsubscribeMutation.isPending ? 'Unsubscribing...' : 'Unsubscribe'}
              </Button>
            </Box>
          ) : (
            // Subscription tiers
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Choose a subscription tier to support {streamerName} and unlock exclusive benefits:
              </Typography>

              <RadioGroup
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
              >
                {subscriptionTiers.map((tier) => {
                  const IconComponent = tier.icon;
                  return (
                    <Card
                      key={tier.id}
                      sx={{
                        mb: 2,
                        border: selectedTier === tier.id ? `2px solid ${tier.color}` : '1px solid #e0e0e0',
                        cursor: 'pointer',
                      }}
                      onClick={() => setSelectedTier(tier.id)}
                    >
                      <CardContent>
                        <Box display="flex" alignItems="center" gap={2} mb={2}>
                          <FormControlLabel
                            value={tier.id}
                            control={<Radio sx={{ color: tier.color }} />}
                            label=""
                            sx={{ m: 0 }}
                          />
                          <IconComponent size={24} color={tier.color} />
                          <Box flex={1}>
                            <Typography variant="h6">{tier.name}</Typography>
                            <Typography variant="h5" color={tier.color} fontWeight="bold">
                              ${tier.price}/month
                            </Typography>
                          </Box>
                        </Box>

                        <List dense>
                          {tier.benefits.map((benefit, index) => (
                            <ListItem key={index} sx={{ py: 0.5 }}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <Check size={16} color={tier.color} />
                              </ListItemIcon>
                              <ListItemText
                                primary={benefit}
                                primaryTypographyProps={{ variant: 'body2' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  );
                })}
              </RadioGroup>

              <Alert severity="info" sx={{ mt: 2 }}>
                Subscriptions help creators continue making great content. You can cancel anytime.
              </Alert>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>
            Cancel
          </Button>
          {!isSubscribed && (
            <Button
              variant="contained"
              onClick={() => setShowConfirmation(true)}
              sx={{
                backgroundColor: selectedTierData?.color,
                '&:hover': {
                  backgroundColor: selectedTierData?.color,
                  opacity: 0.8,
                },
              }}
            >
              Subscribe for ${selectedTierData?.price}/month
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        maxWidth="sm"
      >
        <DialogTitle>Confirm Subscription</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            You&#39;re about to subscribe to {streamerName} with the {selectedTierData?.name} plan.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You&#39;ll be charged ${selectedTierData?.price} monthly. You can cancel anytime.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmation(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubscribe}
            disabled={subscribeMutation.isPending}
          >
            {subscribeMutation.isPending ? 'Processing...' : 'Confirm Subscription'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SubscriptionPanel;
