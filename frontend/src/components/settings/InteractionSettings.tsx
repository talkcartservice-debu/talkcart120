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
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Chip,
  Alert,
} from '@mui/material';
import {
  Bell,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Keyboard,
  Monitor,
  Smartphone,
  Wifi,
  WifiOff,
  Clock,
  Zap,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { useInteraction } from '@/contexts/InteractionContext';
import { useLanguage } from '@/contexts/LanguageContext';

export const InteractionSettings: React.FC = () => {
  const { interactionSettings, updateNotificationSetting, updateMediaSetting, updateSoundSetting, updateUISetting } = useInteraction();
  const { t } = useLanguage();

  const getVolumeIcon = (volume: string) => {
    switch (volume) {
      case 'muted': return <VolumeX size={16} />;
      case 'low': return <Volume2 size={16} />;
      case 'medium': return <Volume2 size={16} />;
      case 'high': return <Volume2 size={16} />;
      default: return <Volume2 size={16} />;
    }
  };

  const getAutoPlayIcon = (mode: string) => {
    switch (mode) {
      case 'always': return <Play size={16} />;
      case 'wifi-only': return <Wifi size={16} />;
      case 'never': return <Pause size={16} />;
      default: return <Play size={16} />;
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
        Interaction Settings
      </Typography>
      <Typography 
        variant="body2" 
        color="text.secondary" 
        paragraph
        sx={{
          fontSize: { xs: '0.875rem', sm: '1rem' }
        }}
      >
        Customize how you interact with the platform and receive notifications.
      </Typography>

      {/* Settings Overview */}
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
            <Zap size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Quick Settings
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              label={`Notifications: ${interactionSettings.notifications.frequency}`}
              icon={<Bell size={14} />}
              size="small"
              sx={{
                fontSize: { xs: '0.7rem', sm: '0.75rem' }
              }}
            />
            <Chip 
              label={`Auto-play: ${interactionSettings.media.autoPlayVideos}`}
              icon={getAutoPlayIcon(interactionSettings.media.autoPlayVideos)}
              size="small"
              sx={{
                fontSize: { xs: '0.7rem', sm: '0.75rem' }
              }}
            />
            <Chip 
              label={`Volume: ${interactionSettings.sound.masterVolume}`}
              icon={getVolumeIcon(interactionSettings.sound.masterVolume)}
              size="small"
              sx={{
                fontSize: { xs: '0.7rem', sm: '0.75rem' }
              }}
            />
            <Chip 
              label={`UI: ${interactionSettings.ui.compactMode ? 'Compact' : 'Standard'}`}
              icon={<Monitor size={14} />}
              size="small"
              sx={{
                fontSize: { xs: '0.7rem', sm: '0.75rem' }
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Typography 
        variant="subtitle1" 
        fontWeight={600} 
        gutterBottom
        sx={{
          fontSize: { xs: '1.1rem', sm: '1.25rem' }
        }}
      >
        <Bell size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Notification Settings
      </Typography>

      <List>
        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemText
            primary="Notification Frequency"
            secondary="How often you receive notifications"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <FormControl size="small" sx={{ minWidth: 120, alignSelf: { xs: 'flex-end', sm: 'auto' } }}>
            <Select
              value={interactionSettings.notifications.frequency}
              onChange={(e) => updateNotificationSetting('frequency', e.target.value as any)}
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            >
              <MenuItem value="immediate">Immediate</MenuItem>
              <MenuItem value="hourly">Hourly</MenuItem>
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="never">Never</MenuItem>
            </Select>
          </FormControl>
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Bell size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Push Notifications"
            secondary="Receive notifications on your device"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={interactionSettings.notifications.push}
            onChange={(e) => updateNotificationSetting('push', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Smartphone size={24} />
          </ListItemIcon>
          <ListItemText
            primary="In-App Notifications"
            secondary="Show notifications while using the app"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={interactionSettings.notifications.inApp}
            onChange={(e) => updateNotificationSetting('inApp', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Clock size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Quiet Hours"
            secondary="Disable notifications during specified hours"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={interactionSettings.notifications.quietHours}
            onChange={(e) => updateNotificationSetting('quietHours', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>
      </List>

      <Divider sx={{ my: 3 }} />

      {/* Media Settings */}
      <Typography 
        variant="subtitle1" 
        fontWeight={600} 
        gutterBottom
        sx={{
          fontSize: { xs: '1.1rem', sm: '1.25rem' }
        }}
      >
        <Play size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Media Settings
      </Typography>

      <List>
        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemText
            primary="Auto-play Videos"
            secondary="When videos should play automatically"
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
              variant={interactionSettings.media.autoPlayVideos === 'always' ? 'contained' : 'outlined'}
              onClick={() => updateMediaSetting('autoPlayVideos', 'always')}
              startIcon={<Play size={14} />}
            >
              Always
            </Button>
            <Button
              variant={interactionSettings.media.autoPlayVideos === 'wifi-only' ? 'contained' : 'outlined'}
              onClick={() => updateMediaSetting('autoPlayVideos', 'wifi-only')}
              startIcon={<Wifi size={14} />}
            >
              WiFi Only
            </Button>
            <Button
              variant={interactionSettings.media.autoPlayVideos === 'never' ? 'contained' : 'outlined'}
              onClick={() => updateMediaSetting('autoPlayVideos', 'never')}
              startIcon={<Pause size={14} />}
            >
              Never
            </Button>
          </ButtonGroup>
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Play size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Auto-play GIFs"
            secondary="Automatically play animated GIFs"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={interactionSettings.media.autoPlayGifs}
            onChange={(e) => updateMediaSetting('autoPlayGifs', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Eye size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Auto-load Images"
            secondary="Automatically load images in posts"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={interactionSettings.media.autoLoadImages}
            onChange={(e) => updateMediaSetting('autoLoadImages', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Monitor size={24} />
          </ListItemIcon>
          <ListItemText
            primary="High Quality Uploads"
            secondary="Upload images and videos in high quality"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={interactionSettings.media.highQualityUploads}
            onChange={(e) => updateMediaSetting('highQualityUploads', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>
      </List>

      <Divider sx={{ my: 3 }} />

      {/* Sound Settings */}
      <Typography 
        variant="subtitle1" 
        fontWeight={600} 
        gutterBottom
        sx={{
          fontSize: { xs: '1.1rem', sm: '1.25rem' }
        }}
      >
        <Volume2 size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Sound Settings
      </Typography>

      <List>
        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemText
            primary="Master Volume"
            secondary="Overall volume level for all sounds"
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
              variant={interactionSettings.sound.masterVolume === 'muted' ? 'contained' : 'outlined'}
              onClick={() => updateSoundSetting('masterVolume', 'muted')}
              startIcon={<VolumeX size={14} />}
            >
              Muted
            </Button>
            <Button
              variant={interactionSettings.sound.masterVolume === 'low' ? 'contained' : 'outlined'}
              onClick={() => updateSoundSetting('masterVolume', 'low')}
            >
              Low
            </Button>
            <Button
              variant={interactionSettings.sound.masterVolume === 'medium' ? 'contained' : 'outlined'}
              onClick={() => updateSoundSetting('masterVolume', 'medium')}
            >
              Medium
            </Button>
            <Button
              variant={interactionSettings.sound.masterVolume === 'high' ? 'contained' : 'outlined'}
              onClick={() => updateSoundSetting('masterVolume', 'high')}
            >
              High
            </Button>
          </ButtonGroup>
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Bell size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Notification Sounds"
            secondary="Play sounds for notifications"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={interactionSettings.sound.notificationSounds}
            onChange={(e) => updateSoundSetting('notificationSounds', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Volume2 size={24} />
          </ListItemIcon>
          <ListItemText
            primary="UI Sounds"
            secondary="Play sounds for interface interactions"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={interactionSettings.sound.uiSounds}
            onChange={(e) => updateSoundSetting('uiSounds', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Keyboard size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Keyboard Sounds"
            secondary="Play sounds when typing"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={interactionSettings.sound.keyboardSounds}
            onChange={(e) => updateSoundSetting('keyboardSounds', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>
      </List>

      <Divider sx={{ my: 3 }} />

      {/* UI Settings */}
      <Typography 
        variant="subtitle1" 
        fontWeight={600} 
        gutterBottom
        sx={{
          fontSize: { xs: '1.1rem', sm: '1.25rem' }
        }}
      >
        <Monitor size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Interface Settings
      </Typography>

      <List>
        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Monitor size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Compact Mode"
            secondary="Use a more compact interface layout"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={interactionSettings.ui.compactMode}
            onChange={(e) => updateUISetting('compactMode', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Eye size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Show Avatars"
            secondary="Display user avatars in posts and comments"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={interactionSettings.ui.showAvatars}
            onChange={(e) => updateUISetting('showAvatars', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Clock size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Show Timestamps"
            secondary="Display timestamps on posts and messages"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={interactionSettings.ui.showTimestamps}
            onChange={(e) => updateUISetting('showTimestamps', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <RefreshCw size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Auto Refresh"
            secondary="Automatically refresh content"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={interactionSettings.ui.autoRefresh}
            onChange={(e) => updateUISetting('autoRefresh', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Zap size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Infinite Scroll"
            secondary="Load more content as you scroll"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={interactionSettings.ui.infiniteScroll}
            onChange={(e) => updateUISetting('infiniteScroll', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>
      </List>

      {interactionSettings.ui.autoRefresh && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            Auto refresh is enabled. Content will refresh every {interactionSettings.ui.refreshInterval} seconds.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};
