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
  Alert,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import {
  Eye,
  EyeOff,
  Users,
  Lock,
  Globe,
  Shield,
  UserCheck,
  MessageCircle,
  Search,
  BarChart3,
  MapPin,
  Download,
  Share,
  Database,
  Mail,
  Phone,
  FileText,
} from 'lucide-react';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { useLanguage } from '@/contexts/LanguageContext';

export const PrivacySettings: React.FC = () => {
  const { privacySettings, updatePrivacySetting } = usePrivacy();
  const { t } = useLanguage();

  const handleVisibilityChange = (
    setting: 'profileVisibility' | 'activityVisibility',
    value: 'public' | 'followers' | 'private'
  ) => {
    updatePrivacySetting(setting, value);
  };

  const handleDataSharingChange = (value: 'minimal' | 'standard' | 'enhanced') => {
    updatePrivacySetting('dataSharing', value);
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public': return <Globe size={16} />;
      case 'followers': return <Users size={16} />;
      case 'private': return <Lock size={16} />;
      default: return <Eye size={16} />;
    }
  };

  const getDataSharingColor = (level: string) => {
    switch (level) {
      case 'minimal': return 'success';
      case 'standard': return 'warning';
      case 'enhanced': return 'error';
      default: return 'default';
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
        Privacy Settings
      </Typography>
      <Typography 
        variant="body2" 
        color="text.secondary" 
        paragraph
        sx={{
          fontSize: { xs: '0.875rem', sm: '1rem' }
        }}
      >
        Control who can see your content and how your information is used.
      </Typography>

      {/* Privacy Overview */}
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
            <Shield size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Privacy Level
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              label={`Profile: ${privacySettings.profileVisibility}`}
              icon={getVisibilityIcon(privacySettings.profileVisibility)}
              size="small"
              sx={{
                fontSize: { xs: '0.7rem', sm: '0.75rem' }
              }}
            />
            <Chip 
              label={`Activity: ${privacySettings.activityVisibility}`}
              icon={getVisibilityIcon(privacySettings.activityVisibility)}
              size="small"
              sx={{
                fontSize: { xs: '0.7rem', sm: '0.75rem' }
              }}
            />
            <Chip 
              label={`Data: ${privacySettings.dataSharing}`}
              color={getDataSharingColor(privacySettings.dataSharing) as any}
              size="small"
              sx={{
                fontSize: { xs: '0.7rem', sm: '0.75rem' }
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Profile Privacy */}
      <Typography 
        variant="subtitle1" 
        fontWeight={600} 
        gutterBottom
        sx={{
          fontSize: { xs: '1.1rem', sm: '1.25rem' }
        }}
      >
        <Eye size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Profile Privacy
      </Typography>

      <List>
        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemText
            primary="Profile Visibility"
            secondary="Who can see your profile information"
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
              variant={privacySettings.profileVisibility === 'public' ? 'contained' : 'outlined'}
              onClick={() => handleVisibilityChange('profileVisibility', 'public')}
              startIcon={<Globe size={14} />}
            >
              Public
            </Button>
            <Button
              variant={privacySettings.profileVisibility === 'followers' ? 'contained' : 'outlined'}
              onClick={() => handleVisibilityChange('profileVisibility', 'followers')}
              startIcon={<Users size={14} />}
            >
              Followers
            </Button>
            <Button
              variant={privacySettings.profileVisibility === 'private' ? 'contained' : 'outlined'}
              onClick={() => handleVisibilityChange('profileVisibility', 'private')}
              startIcon={<Lock size={14} />}
            >
              Private
            </Button>
          </ButtonGroup>
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemText
            primary="Activity Visibility"
            secondary="Who can see your activity and interactions"
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
              variant={privacySettings.activityVisibility === 'public' ? 'contained' : 'outlined'}
              onClick={() => handleVisibilityChange('activityVisibility', 'public')}
              startIcon={<Globe size={14} />}
            >
              Public
            </Button>
            <Button
              variant={privacySettings.activityVisibility === 'followers' ? 'contained' : 'outlined'}
              onClick={() => handleVisibilityChange('activityVisibility', 'followers')}
              startIcon={<Users size={14} />}
            >
              Followers
            </Button>
            <Button
              variant={privacySettings.activityVisibility === 'private' ? 'contained' : 'outlined'}
              onClick={() => handleVisibilityChange('activityVisibility', 'private')}
              startIcon={<Lock size={14} />}
            >
              Private
            </Button>
          </ButtonGroup>
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <EyeOff size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Show Wallet Address"
            secondary="Display your wallet address on your profile"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={privacySettings.showWallet}
            onChange={(e) => updatePrivacySetting('showWallet', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <BarChart3 size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Show Activity"
            secondary="Let others see your recent activity"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={privacySettings.showActivity}
            onChange={(e) => updatePrivacySetting('showActivity', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <UserCheck size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Show Online Status"
            secondary="Show when you&apos;re active on the platform"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={privacySettings.showOnlineStatus}
            onChange={(e) => updatePrivacySetting('showOnlineStatus', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <UserCheck size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Show Last Seen"
            secondary="Show when you were last active"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={privacySettings.showLastSeen}
            onChange={(e) => updatePrivacySetting('showLastSeen', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>
      </List>

      <Divider sx={{ my: 3 }} />

      {/* Communication Privacy */}
      <Typography 
        variant="subtitle1" 
        fontWeight={600} 
        gutterBottom
        sx={{
          fontSize: { xs: '1.1rem', sm: '1.25rem' }
        }}
      >
        <MessageCircle size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Communication Privacy
      </Typography>

      <List>
        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <MessageCircle size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Allow Direct Messages"
            secondary="Let others send you direct messages"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={privacySettings.allowDirectMessages}
            onChange={(e) => updatePrivacySetting('allowDirectMessages', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Users size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Allow Group Invites"
            secondary="Let others invite you to groups"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={privacySettings.allowGroupInvites}
            onChange={(e) => updatePrivacySetting('allowGroupInvites', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Share size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Allow Tagging"
            secondary="Allow others to tag you in posts and comments"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={privacySettings.allowTagging}
            onChange={(e) => updatePrivacySetting('allowTagging', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <MessageCircle size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Allow Mentions"
            secondary="Allow others to mention you in posts"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={privacySettings.allowMentions}
            onChange={(e) => updatePrivacySetting('allowMentions', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>
      </List>

      <Divider sx={{ my: 3 }} />

      {/* Data Privacy */}
      <Typography 
        variant="subtitle1" 
        fontWeight={600} 
        gutterBottom
        sx={{
          fontSize: { xs: '1.1rem', sm: '1.25rem' }
        }}
      >
        <Database size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Data Privacy
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          These settings control how your data is used for analytics and personalization.
        </Typography>
      </Alert>

      <List>
        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemText
            primary="Data Sharing Level"
            secondary="Control how much data is shared for platform improvement"
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
              variant={privacySettings.dataSharing === 'minimal' ? 'contained' : 'outlined'}
              onClick={() => handleDataSharingChange('minimal')}
              color="success"
            >
              Minimal
            </Button>
            <Button
              variant={privacySettings.dataSharing === 'standard' ? 'contained' : 'outlined'}
              onClick={() => handleDataSharingChange('standard')}
              color="warning"
            >
              Standard
            </Button>
            <Button
              variant={privacySettings.dataSharing === 'enhanced' ? 'contained' : 'outlined'}
              onClick={() => handleDataSharingChange('enhanced')}
              color="error"
            >
              Enhanced
            </Button>
          </ButtonGroup>
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <BarChart3 size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Analytics Opt-out"
            secondary="Opt out of usage analytics and tracking"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={privacySettings.analyticsOptOut}
            onChange={(e) => updatePrivacySetting('analyticsOptOut', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <MapPin size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Location Tracking"
            secondary="Allow location-based features and content"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={privacySettings.locationTracking}
            onChange={(e) => updatePrivacySetting('locationTracking', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <BarChart3 size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Activity Tracking"
            secondary="Allow tracking of your platform activity for analytics"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={privacySettings.activityTracking}
            onChange={(e) => updatePrivacySetting('activityTracking', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Eye size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Personalized Ads"
            secondary="Show personalized advertisements based on your activity"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={privacySettings.personalizedAds}
            onChange={(e) => updatePrivacySetting('personalizedAds', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>
      </List>

      <Divider sx={{ my: 3 }} />

      {/* Search & Discovery Privacy */}
      <Typography 
        variant="subtitle1" 
        fontWeight={600} 
        gutterBottom
        sx={{
          fontSize: { xs: '1.1rem', sm: '1.25rem' }
        }}
      >
        <Search size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Search & Discovery
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          Control how others can find and discover your profile.
        </Typography>
      </Alert>

      <List>
        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Mail size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Searchable by Email"
            secondary="Allow others to find you using your email address"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={privacySettings.searchableByEmail}
            onChange={(e) => updatePrivacySetting('searchableByEmail', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Phone size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Searchable by Phone"
            secondary="Allow others to find you using your phone number"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={privacySettings.searchableByPhone}
            onChange={(e) => updatePrivacySetting('searchableByPhone', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Users size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Suggest to Contacts"
            secondary="Suggest your profile to people in your contacts"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={privacySettings.suggestToContacts}
            onChange={(e) => updatePrivacySetting('suggestToContacts', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Globe size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Show in Directory"
            secondary="Include your profile in public user directories"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={privacySettings.showInDirectory}
            onChange={(e) => updatePrivacySetting('showInDirectory', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>
      </List>

      <Divider sx={{ my: 3 }} />

      {/* Content Privacy */}
      <Typography 
        variant="subtitle1" 
        fontWeight={600} 
        gutterBottom
        sx={{
          fontSize: { xs: '1.1rem', sm: '1.25rem' }
        }}
      >
        <FileText size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Content Privacy
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          Control how your content can be used and shared.
        </Typography>
      </Alert>

      <List>
        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Download size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Downloadable Content"
            secondary="Allow others to download your shared content"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={privacySettings.downloadableContent}
            onChange={(e) => updatePrivacySetting('downloadableContent', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Search size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Content Indexing"
            secondary="Allow search engines to index your public content"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={privacySettings.contentIndexing}
            onChange={(e) => updatePrivacySetting('contentIndexing', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <BarChart3 size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Share Analytics"
            secondary="Share content performance analytics with you"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={privacySettings.shareAnalytics}
            onChange={(e) => updatePrivacySetting('shareAnalytics', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>
      </List>
    </Box>
  );
};
