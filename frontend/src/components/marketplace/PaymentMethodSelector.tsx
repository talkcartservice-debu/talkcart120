import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  useTheme,
} from '@mui/material';
import {
  Phone,
  AccountBalance,
  Payment,
  CreditCard,
  CheckCircle,
} from '@mui/icons-material';

interface PaymentMethodSelectorProps {
  preferences: any;
  onPreferenceChange: (section: string, field: string, value: any) => void;
  onToggleChange: (section: string, field: string, checked: boolean) => void;
  onDefaultMethodChange: (method: string) => void;
}

const MOBILE_MONEY_PROVIDERS = [
  { value: 'mtn', label: 'MTN Mobile Money' },
  { value: 'airtel', label: 'Airtel Money' },
  { value: 'vodacom', label: 'Vodacom M-Pesa' },
  { value: 'tigo', label: 'Tigo Pesa' },
  { value: 'orange', label: 'Orange Money' },
  { value: 'ecocash', label: 'Ecocash' },
  { value: 'other', label: 'Other' },
];

const CRYPTO_NETWORKS = [
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'bitcoin', label: 'Bitcoin' },
  { value: 'polygon', label: 'Polygon' },
  { value: 'bsc', label: 'Binance Smart Chain' },
  { value: 'solana', label: 'Solana' },
  { value: 'other', label: 'Other' },
];

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  preferences,
  onPreferenceChange,
  onToggleChange,
  onDefaultMethodChange,
}) => {
  const theme = useTheme();

  return (
    <Box>
      {/* Mobile Money */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Phone color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">Mobile Money</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.mobileMoney.enabled}
                onChange={(e) => onToggleChange('mobileMoney', 'enabled', e.target.checked)}
              />
            }
            label={preferences.mobileMoney.enabled ? "Enabled" : "Disabled"}
            sx={{ ml: 'auto' }}
          />
        </Box>
        
        {preferences.mobileMoney.enabled && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Provider</InputLabel>
                <Select
                  value={preferences.mobileMoney.provider}
                  onChange={(e) => onPreferenceChange('mobileMoney', 'provider', e.target.value)}
                  label="Provider"
                >
                  {MOBILE_MONEY_PROVIDERS.map(provider => (
                    <MenuItem key={provider.value} value={provider.value}>
                      {provider.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone Number"
                value={preferences.mobileMoney.phoneNumber}
                onChange={(e) => onPreferenceChange('mobileMoney', 'phoneNumber', e.target.value)}
                placeholder="+1234567890"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Country"
                value={preferences.mobileMoney.country}
                onChange={(e) => onPreferenceChange('mobileMoney', 'country', e.target.value)}
                placeholder="Country"
              />
            </Grid>
          </Grid>
        )}
      </Box>

      <Box sx={{ my: 2 }}>
        <hr />
      </Box>

      {/* Bank Account */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AccountBalance color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">Bank Account</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.bankAccount.enabled}
                onChange={(e) => onToggleChange('bankAccount', 'enabled', e.target.checked)}
              />
            }
            label={preferences.bankAccount.enabled ? "Enabled" : "Disabled"}
            sx={{ ml: 'auto' }}
          />
        </Box>
        
        {preferences.bankAccount.enabled && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Account Holder Name"
                value={preferences.bankAccount.accountHolderName}
                onChange={(e) => onPreferenceChange('bankAccount', 'accountHolderName', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Bank Name"
                value={preferences.bankAccount.bankName}
                onChange={(e) => onPreferenceChange('bankAccount', 'bankName', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Account Number"
                value={preferences.bankAccount.accountNumber}
                onChange={(e) => onPreferenceChange('bankAccount', 'accountNumber', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Routing Number"
                value={preferences.bankAccount.routingNumber}
                onChange={(e) => onPreferenceChange('bankAccount', 'routingNumber', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="SWIFT/BIC Code"
                value={preferences.bankAccount.swiftCode}
                onChange={(e) => onPreferenceChange('bankAccount', 'swiftCode', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="IBAN (if applicable)"
                value={preferences.bankAccount.iban}
                onChange={(e) => onPreferenceChange('bankAccount', 'iban', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Country"
                value={preferences.bankAccount.country}
                onChange={(e) => onPreferenceChange('bankAccount', 'country', e.target.value)}
                placeholder="Country"
              />
            </Grid>
          </Grid>
        )}
      </Box>

      <Box sx={{ my: 2 }}>
        <hr />
      </Box>

      {/* PayPal */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Payment color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">PayPal</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.paypal.enabled}
                onChange={(e) => onToggleChange('paypal', 'enabled', e.target.checked)}
              />
            }
            label={preferences.paypal.enabled ? "Enabled" : "Disabled"}
            sx={{ ml: 'auto' }}
          />
        </Box>
        
        {preferences.paypal.enabled && (
          <TextField
            fullWidth
            label="PayPal Email"
            type="email"
            value={preferences.paypal.email}
            onChange={(e) => onPreferenceChange('paypal', 'email', e.target.value)}
            placeholder="your-paypal@email.com"
          />
        )}
      </Box>

      <Box sx={{ my: 2 }}>
        <hr />
      </Box>

      {/* Crypto Wallet */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CreditCard color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">Crypto Wallet</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.cryptoWallet.enabled}
                onChange={(e) => onToggleChange('cryptoWallet', 'enabled', e.target.checked)}
              />
            }
            label={preferences.cryptoWallet.enabled ? "Enabled" : "Disabled"}
            sx={{ ml: 'auto' }}
          />
        </Box>
        
        {preferences.cryptoWallet.enabled && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Network</InputLabel>
                <Select
                  value={preferences.cryptoWallet.network}
                  onChange={(e) => onPreferenceChange('cryptoWallet', 'network', e.target.value)}
                  label="Network"
                >
                  {CRYPTO_NETWORKS.map(network => (
                    <MenuItem key={network.value} value={network.value}>
                      {network.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Wallet Address"
                value={preferences.cryptoWallet.walletAddress}
                onChange={(e) => onPreferenceChange('cryptoWallet', 'walletAddress', e.target.value)}
                placeholder="0x..."
              />
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Default Payment Method */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Default Payment Method</Typography>
        <Grid container spacing={2}>
          {Object.entries(preferences).map(([key, method]) => {
            if (typeof method === 'object' && method !== null && 'enabled' in method && method.enabled) {
              return (
                <Grid item xs={12} sm={6} md={3} key={key}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      cursor: 'pointer',
                      borderColor: preferences.defaultPaymentMethod === key ? theme.palette.primary.main : 'inherit',
                      borderWidth: preferences.defaultPaymentMethod === key ? 2 : 1,
                      '&:hover': {
                        borderColor: theme.palette.primary.main,
                      }
                    }}
                    onClick={() => onDefaultMethodChange(key)}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Box sx={{ mb: 1 }}>
                        {key === 'mobileMoney' && <Phone color="primary" />}
                        {key === 'bankAccount' && <AccountBalance color="primary" />}
                        {key === 'paypal' && <Payment color="primary" />}
                        {key === 'cryptoWallet' && <CreditCard color="primary" />}
                      </Box>
                      <Typography variant="body2" fontWeight={preferences.defaultPaymentMethod === key ? 600 : 400}>
                        {key === 'mobileMoney' ? 'Mobile Money' : 
                         key === 'bankAccount' ? 'Bank Account' : 
                         key === 'paypal' ? 'PayPal' : 'Crypto Wallet'}
                      </Typography>
                      {preferences.defaultPaymentMethod === key && (
                        <Chip 
                          icon={<CheckCircle />} 
                          label="Default" 
                          size="small" 
                          color="primary" 
                          sx={{ mt: 1 }} 
                        />
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            }
            return null;
          })}
        </Grid>
      </Box>
    </Box>
  );
};

export default PaymentMethodSelector;