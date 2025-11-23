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
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Privacy Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Control who can see your content and how your information is used.
      </Typography>

      {/* Privacy Overview */}
      <Card sx={{ mb: 3, bgcolor: 'action.hover' }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            <Shield size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Privacy Level
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              label={`Profile: ${privacySettings.profileVisibility}`}
              icon={getVisibilityIcon(privacySettings.profileVisibility)}
              size="small"
            />
            <Chip 
              label={`Activity: ${privacySettings.activityVisibility}`}
              icon={getVisibilityIcon(privacySettings.activityVisibility)}
              size="small"
            />
            <Chip 
              label={`Data: ${privacySettings.dataSharing}`}
              color={getDataSharingColor(privacySettings.dataSharing) as any}
              size="small"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Profile Privacy */}
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        <Eye size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Profile Privacy
      </Typography>

      <List>
        <ListItem>
          <ListItemText
            primary="Profile Visibility"
            secondary="Who can see your profile information"
          />
          <ButtonGroup size="small">
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

        <ListItem>
          <ListItemText
            primary="Activity Visibility"
            secondary="Who can see your activity and interactions"
          />
          <ButtonGroup size="small">
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

        <ListItem>
          <ListItemIcon>
            <EyeOff size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Show Wallet Address"
            secondary="Display your wallet address on your profile"
          />
          <Switch
            checked={privacySettings.showWallet}
            onChange={(e) => updatePrivacySetting('showWallet', e.target.checked)}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon>
            <BarChart3 size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Show Activity"
            secondary="Let others see your recent activity"
          />
          <Switch
            checked={privacySettings.showActivity}
            onChange={(e) => updatePrivacySetting('showActivity', e.target.checked)}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon>
            <UserCheck size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Show Online Status"
            secondary="Show when you're active on the platform"
          />
          <Switch
            checked={privacySettings.showOnlineStatus}
            onChange={(e) => updatePrivacySetting('showOnlineStatus', e.target.checked)}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon>
            <UserCheck size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Show Last Seen"
            secondary="Show when you were last active"
          />
          <Switch
            checked={privacySettings.showLastSeen}
            onChange={(e) => updatePrivacySetting('showLastSeen', e.target.checked)}
          />
        </ListItem>
      </List>

      <Divider sx={{ my: 3 }} />

      {/* Communication Privacy */}
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        <MessageCircle size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Communication Privacy
      </Typography>

      <List>
        <ListItem>
          <ListItemIcon>
            <MessageCircle size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Allow Direct Messages"
            secondary="Let others send you direct messages"
          />
          <Switch
            checked={privacySettings.allowDirectMessages}
            onChange={(e) => updatePrivacySetting('allowDirectMessages', e.target.checked)}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon>
            <Users size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Allow Group Invites"
            secondary="Let others invite you to groups"
          />
          <Switch
            checked={privacySettings.allowGroupInvites}
            onChange={(e) => updatePrivacySetting('allowGroupInvites', e.target.checked)}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon>
            <Share size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Allow Tagging"
            secondary="Allow others to tag you in posts and comments"
          />
          <Switch
            checked={privacySettings.allowTagging}
            onChange={(e) => updatePrivacySetting('allowTagging', e.target.checked)}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon>
            <MessageCircle size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Allow Mentions"
            secondary="Allow others to mention you in posts"
          />
          <Switch
            checked={privacySettings.allowMentions}
            onChange={(e) => updatePrivacySetting('allowMentions', e.target.checked)}
          />
        </ListItem>
      </List>

      <Divider sx={{ my: 3 }} />

      {/* Data Privacy */}
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        <Database size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Data Privacy
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        These settings control how your data is used for analytics and personalization.
      </Alert>

      <List>
        <ListItem>
          <ListItemText
            primary="Data Sharing Level"
            secondary="Control how much data is shared for platform improvement"
          />
          <ButtonGroup size="small">
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

        <ListItem>
          <ListItemIcon>
            <BarChart3 size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Analytics Opt-out"
            secondary="Opt out of usage analytics and tracking"
          />
          <Switch
            checked={privacySettings.analyticsOptOut}
            onChange={(e) => updatePrivacySetting('analyticsOptOut', e.target.checked)}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon>
            <MapPin size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Location Tracking"
            secondary="Allow location-based features and content"
          />
          <Switch
            checked={privacySettings.locationTracking}
            onChange={(e) => updatePrivacySetting('locationTracking', e.target.checked)}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon>
            <BarChart3 size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Activity Tracking"
            secondary="Allow tracking of your platform activity for analytics"
          />
          <Switch
            checked={privacySettings.activityTracking}
            onChange={(e) => updatePrivacySetting('activityTracking', e.target.checked)}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon>
            <Eye size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Personalized Ads"
            secondary="Show personalized advertisements based on your activity"
          />
          <Switch
            checked={privacySettings.personalizedAds}
            onChange={(e) => updatePrivacySetting('personalizedAds', e.target.checked)}
          />
        </ListItem>
      </List>

      <Divider sx={{ my: 3 }} />

      {/* Search & Discovery Privacy */}
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        <Search size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Search & Discovery
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        Control how others can find and discover your profile.
      </Alert>

      <List>
        <ListItem>
          <ListItemIcon>
            <Mail size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Searchable by Email"
            secondary="Allow others to find you using your email address"
          />
          <Switch
            checked={privacySettings.searchableByEmail}
            onChange={(e) => updatePrivacySetting('searchableByEmail', e.target.checked)}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon>
            <Phone size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Searchable by Phone"
            secondary="Allow others to find you using your phone number"
          />
          <Switch
            checked={privacySettings.searchableByPhone}
            onChange={(e) => updatePrivacySetting('searchableByPhone', e.target.checked)}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon>
            <Users size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Suggest to Contacts"
            secondary="Suggest your profile to people in your contacts"
          />
          <Switch
            checked={privacySettings.suggestToContacts}
            onChange={(e) => updatePrivacySetting('suggestToContacts', e.target.checked)}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon>
            <Globe size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Show in Directory"
            secondary="Include your profile in public user directories"
          />
          <Switch
            checked={privacySettings.showInDirectory}
            onChange={(e) => updatePrivacySetting('showInDirectory', e.target.checked)}
          />
        </ListItem>
      </List>

      <Divider sx={{ my: 3 }} />

      {/* Content Privacy */}
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        <FileText size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Content Privacy
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        Control how your content can be used and shared.
      </Alert>

      <List>
        <ListItem>
          <ListItemIcon>
            <Download size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Downloadable Content"
            secondary="Allow others to download your shared content"
          />
          <Switch
            checked={privacySettings.downloadableContent}
            onChange={(e) => updatePrivacySetting('downloadableContent', e.target.checked)}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon>
            <Search size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Content Indexing"
            secondary="Allow search engines to index your public content"
          />
          <Switch
            checked={privacySettings.contentIndexing}
            onChange={(e) => updatePrivacySetting('contentIndexing', e.target.checked)}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon>
            <BarChart3 size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Share Analytics"
            secondary="Share content performance analytics with you"
          />
          <Switch
            checked={privacySettings.shareAnalytics}
            onChange={(e) => updatePrivacySetting('shareAnalytics', e.target.checked)}
          />
        </ListItem>
      </List>
    </Box>
  );
};
