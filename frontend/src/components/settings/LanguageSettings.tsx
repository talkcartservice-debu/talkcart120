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
  useMediaQuery,
} from '@mui/material';
import {
  Languages,
  Globe,
  AlignLeft,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@mui/material/styles';

export const LanguageSettings: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
      <Typography 
        variant="h6" 
        fontWeight={600} 
        gutterBottom
        sx={{
          fontSize: { xs: '1.25rem', sm: '1.5rem' }
        }}
      >
        Language & Region
      </Typography>
      <Typography 
        variant="body2" 
        color="text.secondary" 
        paragraph
        sx={{
          fontSize: { xs: '0.875rem', sm: '1rem' }
        }}
      >
        Customize the language and regional settings for your experience.
      </Typography>

      {/* Language Overview */}
      <Card sx={{ mb: 3, bgcolor: 'action.hover' }}>
        <CardContent>
          <Typography 
            variant="subtitle2" 
            fontWeight={600} 
            gutterBottom
            sx={{
              fontSize: { xs: '1rem', sm: '1.125rem' }
            }}
          >
            <Languages size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Current Settings
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              label={`Language: ${language}`}
              icon={<Languages size={14} />}
              size="small"
              sx={{
                fontSize: { xs: '0.7rem', sm: '0.75rem' }
              }}
            />
            <Chip 
              label="Region: Default"
              icon={<Globe size={14} />}
              size="small"
              sx={{
                fontSize: { xs: '0.7rem', sm: '0.75rem' }
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Language Selection */}
      <Typography 
        variant="subtitle1" 
        fontWeight={600} 
        gutterBottom
        sx={{
          fontSize: { xs: '1.1rem', sm: '1.25rem' }
        }}
      >
        <Languages size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Language
      </Typography>

      <List>
        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemText
            primary="Application Language"
            secondary="Select the language for the user interface"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <FormControl size="small" sx={{ minWidth: 150, alignSelf: { xs: 'flex-end', sm: 'auto' } }}>
            <Select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as string)}
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            >
              {languages.map((lang) => (
                <MenuItem key={lang.code} value={lang.code} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  {lang.native} ({lang.name})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <AlignLeft size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Text Direction"
            secondary="Automatic based on selected language"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Typography 
            variant="body2"
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' },
              alignSelf: { xs: 'flex-end', sm: 'auto' }
            }}
          >
            {language === 'ar' ? 'Right-to-Left' : 'Left-to-Right'}
          </Typography>
        </ListItem>
      </List>

      <Divider sx={{ my: 3 }} />

      {/* Regional Settings */}
      <Typography 
        variant="subtitle1" 
        fontWeight={600} 
        gutterBottom
        sx={{
          fontSize: { xs: '1.1rem', sm: '1.25rem' }
        }}
      >
        <Globe size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Regional Settings
      </Typography>

      <List>
        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemText
            primary="Time Format"
            secondary="Display times in 12-hour or 24-hour format"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <FormControl size="small" sx={{ minWidth: 120, alignSelf: { xs: 'flex-end', sm: 'auto' } }}>
            <Select
              value="12"
              // onChange={(e) => handleTimeFormatChange(e.target.value as string)}
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            >
              <MenuItem value="12" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>12-hour</MenuItem>
              <MenuItem value="24" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>24-hour</MenuItem>
            </Select>
          </FormControl>
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemText
            primary="Date Format"
            secondary="Choose your preferred date format"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <FormControl size="small" sx={{ minWidth: 150, alignSelf: { xs: 'flex-end', sm: 'auto' } }}>
            <Select
              value="mm/dd/yyyy"
              // onChange={(e) => handleDateFormatChange(e.target.value as string)}
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            >
              <MenuItem value="mm/dd/yyyy" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>MM/DD/YYYY</MenuItem>
              <MenuItem value="dd/mm/yyyy" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>DD/MM/YYYY</MenuItem>
              <MenuItem value="yyyy-mm-dd" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>YYYY-MM-DD</MenuItem>
            </Select>
          </FormControl>
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemText
            primary="Number Format"
            secondary="Choose your preferred number format"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <FormControl size="small" sx={{ minWidth: 120, alignSelf: { xs: 'flex-end', sm: 'auto' } }}>
            <Select
              value="1,000.00"
              // onChange={(e) => handleNumberFormatChange(e.target.value as string)}
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            >
              <MenuItem value="1,000.00" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>1,000.00</MenuItem>
              <MenuItem value="1.000,00" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>1.000,00</MenuItem>
              <MenuItem value="1 000,00" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>1 000,00</MenuItem>
            </Select>
          </FormControl>
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemText
            primary="Currency"
            secondary="Select your preferred currency for display"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <FormControl size="small" sx={{ minWidth: 120, alignSelf: { xs: 'flex-end', sm: 'auto' } }}>
            <Select
              value="USD"
              // onChange={(e) => handleCurrencyChange(e.target.value as string)}
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            >
              <MenuItem value="USD" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>USD ($)</MenuItem>
              <MenuItem value="EUR" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>EUR (€)</MenuItem>
              <MenuItem value="GBP" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>GBP (£)</MenuItem>
              <MenuItem value="JPY" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>JPY (¥)</MenuItem>
              <MenuItem value="CNY" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>CNY (¥)</MenuItem>
            </Select>
          </FormControl>
        </ListItem>
      </List>

      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography 
          variant="body2"
          sx={{
            fontSize: { xs: '0.875rem', sm: '1rem' }
          }}
        >
          Some language translations may be incomplete. Help improve translations by contributing to our community.
        </Typography>
      </Alert>
    </Box>
  );
};