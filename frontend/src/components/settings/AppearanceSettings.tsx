import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  Button,
  ButtonGroup,
  Divider,
  Card,
  CardContent,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useMediaQuery,
} from '@mui/material';
import {
  Sun,
  Moon,
  Monitor,
  Type,
  Accessibility,
  Contrast,
  Languages,
} from 'lucide-react';
import { useCustomTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@mui/material/styles';

export const AppearanceSettings: React.FC = () => {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const { 
    themeMode, 
    fontSize, 
    reducedMotion, 
    highContrast, 
    setThemeMode, 
    setFontSize, 
    setReducedMotion, 
    setHighContrast 
  } = useCustomTheme();
  
  const { language, setLanguage } = useLanguage();

  const handleThemeChange = (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode);
  };

  const handleFontSizeChange = (size: 'small' | 'medium' | 'large') => {
    setFontSize(size);
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
  };

  const getThemeIcon = (mode: string) => {
    switch (mode) {
      case 'light': return <Sun size={16} />;
      case 'dark': return <Moon size={16} />;
      case 'system': return <Monitor size={16} />;
      default: return <Monitor size={16} />;
    }
  };

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
        Appearance Settings
      </Typography>
      <Typography 
        variant="body2" 
        color="text.secondary" 
        paragraph
        sx={{
          fontSize: { xs: '0.875rem', sm: '1rem' }
        }}
      >
        Customize the look and feel of the platform to suit your preferences.
      </Typography>

      {/* Appearance Overview */}
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
            <Monitor size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Current Settings
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              label={`Theme: ${themeMode}`}
              icon={getThemeIcon(themeMode)}
              size="small"
              sx={{
                fontSize: { xs: '0.7rem', sm: '0.75rem' }
              }}
            />
            <Chip 
              label={`Font: ${fontSize}`}
              icon={<Type size={14} />}
              size="small"
              sx={{
                fontSize: { xs: '0.7rem', sm: '0.75rem' }
              }}
            />
            <Chip 
              label={`Language: ${language}`}
              icon={<Languages size={14} />}
              size="small"
              sx={{
                fontSize: { xs: '0.7rem', sm: '0.75rem' }
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Typography 
        variant="subtitle1" 
        fontWeight={600} 
        gutterBottom
        sx={{
          fontSize: { xs: '1.1rem', sm: '1.25rem' }
        }}
      >
        <Monitor size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Theme
      </Typography>

      <List>
        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemText
            primary="Theme Mode"
            secondary="Select your preferred theme"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <ButtonGroup 
            size="small" 
            sx={{ 
              flexWrap: 'wrap',
              gap: { xs: 0.5, sm: 0 },
              '& .MuiButton-root': {
                fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                minWidth: { xs: 60, sm: 'auto' },
                px: { xs: 0.75, sm: 1 }
              }
            }}
          >
            <Button
              variant={themeMode === 'light' ? 'contained' : 'outlined'}
              onClick={() => handleThemeChange('light')}
              startIcon={<Sun size={14} />}
            >
              Light
            </Button>
            <Button
              variant={themeMode === 'dark' ? 'contained' : 'outlined'}
              onClick={() => handleThemeChange('dark')}
              startIcon={<Moon size={14} />}
            >
              Dark
            </Button>
            <Button
              variant={themeMode === 'system' ? 'contained' : 'outlined'}
              onClick={() => handleThemeChange('system')}
              startIcon={<Monitor size={14} />}
            >
              System
            </Button>
          </ButtonGroup>
        </ListItem>
      </List>

      <Divider sx={{ my: 3 }} />

      {/* Display Settings */}
      <Typography 
        variant="subtitle1" 
        fontWeight={600} 
        gutterBottom
        sx={{
          fontSize: { xs: '1.1rem', sm: '1.25rem' }
        }}
      >
        <Type size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Display
      </Typography>

      <List>
        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemText
            primary="Font Size"
            secondary="Adjust the text size across the platform"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <ButtonGroup 
            size="small" 
            sx={{ 
              flexWrap: 'wrap',
              gap: { xs: 0.5, sm: 0 },
              '& .MuiButton-root': {
                fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                minWidth: { xs: 60, sm: 'auto' },
                px: { xs: 0.75, sm: 1 }
              }
            }}
          >
            <Button
              variant={fontSize === 'small' ? 'contained' : 'outlined'}
              onClick={() => handleFontSizeChange('small')}
            >
              Small
            </Button>
            <Button
              variant={fontSize === 'medium' ? 'contained' : 'outlined'}
              onClick={() => handleFontSizeChange('medium')}
            >
              Medium
            </Button>
            <Button
              variant={fontSize === 'large' ? 'contained' : 'outlined'}
              onClick={() => handleFontSizeChange('large')}
            >
              Large
            </Button>
          </ButtonGroup>
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Accessibility size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Reduced Motion"
            secondary="Minimize animations and transitions"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={reducedMotion}
            onChange={(e) => setReducedMotion(e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Contrast size={24} />
          </ListItemIcon>
          <ListItemText
            primary="High Contrast"
            secondary="Increase color contrast for better visibility"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={highContrast}
            onChange={(e) => setHighContrast(e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>
      </List>

      <Divider sx={{ my: 3 }} />

      {/* Language Settings */}
      <Typography 
        variant="subtitle1" 
        fontWeight={600} 
        gutterBottom
        sx={{
          fontSize: { xs: '1.1rem', sm: '1.25rem' }
        }}
      >
        <Languages size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Language & Region
      </Typography>

      <List>
        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemText
            primary="Language"
            secondary="Select your preferred language"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <FormControl size="small" sx={{ minWidth: 120, alignSelf: { xs: 'flex-end', sm: 'auto' } }}>
            <Select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as string)}
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            >
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="es">Español</MenuItem>
              <MenuItem value="fr">Français</MenuItem>
              <MenuItem value="de">Deutsch</MenuItem>
              <MenuItem value="it">Italiano</MenuItem>
              <MenuItem value="pt">Português</MenuItem>
              <MenuItem value="zh">中文</MenuItem>
              <MenuItem value="ja">日本語</MenuItem>
              <MenuItem value="ko">한국어</MenuItem>
              <MenuItem value="ar">العربية</MenuItem>
            </Select>
          </FormControl>
        </ListItem>
      </List>
    </Box>
  );
};