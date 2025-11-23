import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Card,
  CardContent,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import {
  Languages,
  Globe,
  AlignLeft,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export const LanguageSettings: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
  };

  // Available languages with their names in native language
  const languages = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'es', name: 'Spanish', native: 'Español' },
    { code: 'fr', name: 'French', native: 'Français' },
    { code: 'de', name: 'German', native: 'Deutsch' },
    { code: 'it', name: 'Italian', native: 'Italiano' },
    { code: 'pt', name: 'Portuguese', native: 'Português' },
    { code: 'zh', name: 'Chinese', native: '中文' },
    { code: 'ja', name: 'Japanese', native: '日本語' },
    { code: 'ko', name: 'Korean', native: '한국어' },
    { code: 'ar', name: 'Arabic', native: 'العربية' },
  ];

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Language & Region
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Customize the language and regional settings for your experience.
      </Typography>

      {/* Language Overview */}
      <Card sx={{ mb: 3, bgcolor: 'action.hover' }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            <Languages size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Current Settings
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              label={`Language: ${language}`}
              icon={<Languages size={14} />}
              size="small"
            />
            <Chip 
              label="Region: Default"
              icon={<Globe size={14} />}
              size="small"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Language Selection */}
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        <Languages size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Language
      </Typography>

      <List>
        <ListItem>
          <ListItemText
            primary="Application Language"
            secondary="Select the language for the user interface"
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as string)}
            >
              {languages.map((lang) => (
                <MenuItem key={lang.code} value={lang.code}>
                  {lang.native} ({lang.name})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </ListItem>

        <ListItem>
          <ListItemIcon>
            <AlignLeft size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Text Direction"
            secondary="Automatic based on selected language"
          />
          <Typography variant="body2">
            {language === 'ar' ? 'Right-to-Left' : 'Left-to-Right'}
          </Typography>
        </ListItem>
      </List>

      <Divider sx={{ my: 3 }} />

      {/* Regional Settings */}
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        <Globe size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Regional Settings
      </Typography>

      <List>
        <ListItem>
          <ListItemText
            primary="Time Format"
            secondary="Display times in 12-hour or 24-hour format"
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value="12"
              // onChange={(e) => handleTimeFormatChange(e.target.value as string)}
            >
              <MenuItem value="12">12-hour</MenuItem>
              <MenuItem value="24">24-hour</MenuItem>
            </Select>
          </FormControl>
        </ListItem>

        <ListItem>
          <ListItemText
            primary="Date Format"
            secondary="Choose your preferred date format"
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value="mm/dd/yyyy"
              // onChange={(e) => handleDateFormatChange(e.target.value as string)}
            >
              <MenuItem value="mm/dd/yyyy">MM/DD/YYYY</MenuItem>
              <MenuItem value="dd/mm/yyyy">DD/MM/YYYY</MenuItem>
              <MenuItem value="yyyy-mm-dd">YYYY-MM-DD</MenuItem>
            </Select>
          </FormControl>
        </ListItem>

        <ListItem>
          <ListItemText
            primary="Number Format"
            secondary="Choose your preferred number format"
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value="1,000.00"
              // onChange={(e) => handleNumberFormatChange(e.target.value as string)}
            >
              <MenuItem value="1,000.00">1,000.00</MenuItem>
              <MenuItem value="1.000,00">1.000,00</MenuItem>
              <MenuItem value="1 000,00">1 000,00</MenuItem>
            </Select>
          </FormControl>
        </ListItem>

        <ListItem>
          <ListItemText
            primary="Currency"
            secondary="Select your preferred currency for display"
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value="USD"
              // onChange={(e) => handleCurrencyChange(e.target.value as string)}
            >
              <MenuItem value="USD">USD ($)</MenuItem>
              <MenuItem value="EUR">EUR (€)</MenuItem>
              <MenuItem value="GBP">GBP (£)</MenuItem>
              <MenuItem value="JPY">JPY (¥)</MenuItem>
              <MenuItem value="CNY">CNY (¥)</MenuItem>
            </Select>
          </FormControl>
        </ListItem>
      </List>

      <Alert severity="info" sx={{ mt: 3 }}>
        Some language translations may be incomplete. Help improve translations by contributing to our community.
      </Alert>
    </Box>
  );
};