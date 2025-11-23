import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Phone,
  AccountBalance,
  Payment,
  CreditCard,
  Info,
} from '@mui/icons-material';
import { api } from '@/lib/api';

interface VendorPaymentInfoProps {
  vendorId: string;
  vendorName: string;
}

interface PaymentPreferences {
  mobileMoney: {
    enabled: boolean;
    provider: string;
    country: string;
  };
  bankAccount: {
    enabled: boolean;
    bankName: string;
    country: string;
  };
  paypal: {
    enabled: boolean;
  };
  cryptoWallet: {
    enabled: boolean;
    network: string;
  };
  defaultPaymentMethod: string;
}

// Simple ObjectId validation function
const isValidObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

const VendorPaymentInfo: React.FC<VendorPaymentInfoProps> = ({ vendorId, vendorName }) => {
  const [preferences, setPreferences] = useState<PaymentPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchPaymentPreferences();
  }, [vendorId]);

  const fetchPaymentPreferences = async () => {
    // Validate vendorId before making API call
    if (!vendorId || !isValidObjectId(vendorId)) {
      console.warn('Invalid vendor ID detected:', vendorId);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const response: any = await api.marketplace.getVendorPaymentPreferences(vendorId);
      if (response.success) {
        setPreferences(response.data);
      }
    } catch (error) {
      console.error('Error fetching payment preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  if (loading || !preferences) {
    return null;
  }

  // Count enabled payment methods
  const enabledMethods = [
    preferences.mobileMoney.enabled,
    preferences.bankAccount.enabled,
    preferences.paypal.enabled,
    preferences.cryptoWallet.enabled
  ].filter(Boolean).length;

  return (
    <>
      <Tooltip title="View vendor's payment methods">
        <IconButton size="small" onClick={handleOpen}>
          <Info fontSize="small" />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          Payment Methods - {vendorName}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This vendor accepts payments through the following methods:
          </Typography>

          <List>
            {preferences.mobileMoney.enabled && (
              <>
                <ListItem>
                  <ListItemIcon>
                    <Phone color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Mobile Money" 
                    secondary={`${preferences.mobileMoney.provider.toUpperCase()}${preferences.mobileMoney.country ? ` (${preferences.mobileMoney.country})` : ''}`}
                  />
                  {preferences.defaultPaymentMethod === 'mobileMoney' && (
                    <Chip label="Default" color="primary" size="small" />
                  )}
                </ListItem>
                <Divider component="li" />
              </>
            )}

            {preferences.bankAccount.enabled && (
              <>
                <ListItem>
                  <ListItemIcon>
                    <AccountBalance color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Bank Transfer" 
                    secondary={`${preferences.bankAccount.bankName}${preferences.bankAccount.country ? ` (${preferences.bankAccount.country})` : ''}`}
                  />
                  {preferences.defaultPaymentMethod === 'bankAccount' && (
                    <Chip label="Default" color="primary" size="small" />
                  )}
                </ListItem>
                <Divider component="li" />
              </>
            )}

            {preferences.paypal.enabled && (
              <>
                <ListItem>
                  <ListItemIcon>
                    <Payment color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="PayPal" 
                    secondary="PayPal payment processing"
                  />
                  {preferences.defaultPaymentMethod === 'paypal' && (
                    <Chip label="Default" color="primary" size="small" />
                  )}
                </ListItem>
                <Divider component="li" />
              </>
            )}

            {preferences.cryptoWallet.enabled && (
              <>
                <ListItem>
                  <ListItemIcon>
                    <CreditCard color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Cryptocurrency" 
                    secondary={`${preferences.cryptoWallet.network.toUpperCase()} network`}
                  />
                  {preferences.defaultPaymentMethod === 'cryptoWallet' && (
                    <Chip label="Default" color="primary" size="small" />
                  )}
                </ListItem>
                <Divider component="li" />
              </>
            )}
          </List>

          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
              Payment Information
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • {enabledMethods} payment method{enabledMethods !== 1 ? 's' : ''} available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Default payment method is highlighted
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Actual payment details are securely handled during checkout
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default VendorPaymentInfo;