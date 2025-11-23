import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Stack,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { AdminApi } from '../src/services/api';

interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
}

interface BulkEmailDialogProps {
  open: boolean;
  onClose: () => void;
  selectedUsers: User[];
}

const EMAIL_TEMPLATES = [
  { value: 'admin-notification', label: 'Admin Notification' },
  { value: 'welcome', label: 'Welcome Message' },
  { value: 'verification', label: 'Account Verification' },
  { value: 'suspension', label: 'Account Suspension' },
  { value: 'promotion', label: 'Promotional' },
  { value: 'custom', label: 'Custom Message' }
];

const TEMPLATE_SUBJECTS = {
  'admin-notification': 'Important Notice from TalkCart Admin',
  'welcome': 'Welcome to TalkCart!',
  'verification': 'Account Verification Required',
  'suspension': 'Account Status Update',
  'promotion': 'Special Offer from TalkCart',
  'custom': ''
};

const TEMPLATE_MESSAGES = {
  'admin-notification': 'We are reaching out to inform you about an important update regarding your TalkCart account.',
  'welcome': 'Welcome to TalkCart! We\'re excited to have you as part of our community.',
  'verification': 'Please verify your account to continue using TalkCart services.',
  'suspension': 'We are writing to inform you about a change in your account status.',
  'promotion': 'Don\'t miss out on our latest offers and promotions!',
  'custom': ''
};

export default function BulkEmailDialog({ open, onClose, selectedUsers }: BulkEmailDialogProps) {
  const [emailData, setEmailData] = useState({
    subject: '',
    message: '',
    template: 'custom'
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTemplateChange = (template: string) => {
    setEmailData({
      template,
      subject: TEMPLATE_SUBJECTS[template as keyof typeof TEMPLATE_SUBJECTS] || '',
      message: TEMPLATE_MESSAGES[template as keyof typeof TEMPLATE_MESSAGES] || ''
    });
  };

  const handleSendBulkEmail = async () => {
    if (!emailData.subject || !emailData.message || selectedUsers.length === 0) {
      return;
    }

    try {
      setSending(true);
      setResult(null);

      const userIds = selectedUsers.map(user => user._id);
      const res = await AdminApi.sendBulkEmail(userIds, {
        subject: emailData.subject,
        message: emailData.message,
        template: emailData.template
      });

      if (res?.success) {
        setResult(res.data);
      } else {
        setResult({ error: res?.message || 'Failed to send emails' });
      }
    } catch (error) {
      console.error('Failed to send bulk email:', error);
      setResult({ error: 'Failed to send emails' });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setEmailData({ subject: '', message: '', template: 'custom' });
    setResult(null);
    setSending(false);
    onClose();
  };

  const isFormValid = emailData.subject.trim() && emailData.message.trim() && selectedUsers.length > 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Send Bulk Email</Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          {/* Recipients */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Recipients ({selectedUsers.length})
            </Typography>
            <Box sx={{ maxHeight: 200, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <List dense>
                {selectedUsers.map((user) => (
                  <ListItem key={user._id}>
                    <ListItemAvatar>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        <PersonIcon fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={user.username}
                      secondary={user.email}
                    />
                    <Chip label={user.role} size="small" />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Box>

          {/* Email Template */}
          <FormControl fullWidth>
            <InputLabel>Email Template</InputLabel>
            <Select
              value={emailData.template}
              label="Email Template"
              onChange={(e) => handleTemplateChange(e.target.value)}
            >
              {EMAIL_TEMPLATES.map((template) => (
                <MenuItem key={template.value} value={template.value}>
                  {template.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Subject */}
          <TextField
            label="Subject"
            value={emailData.subject}
            onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
            fullWidth
            required
          />

          {/* Message */}
          <TextField
            label="Message"
            value={emailData.message}
            onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
            multiline
            rows={8}
            fullWidth
            required
            placeholder="Enter your email message here..."
          />

          {/* Result */}
          {result && (
            <Box>
              {result.error ? (
                <Alert severity="error">
                  {result.error}
                </Alert>
              ) : (
                <Alert severity="success">
                  <Typography variant="body2">
                    <strong>Email sent successfully!</strong>
                  </Typography>
                  <Typography variant="body2">
                    • Total recipients: {result.total}
                  </Typography>
                  <Typography variant="body2">
                    • Successfully sent: {result.sent}
                  </Typography>
                  {result.failed > 0 && (
                    <Typography variant="body2" color="error">
                      • Failed: {result.failed}
                    </Typography>
                  )}
                </Alert>
              )}
            </Box>
          )}

          {/* Preview */}
          {emailData.subject && emailData.message && (
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Email Preview:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Subject: {emailData.subject}
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {emailData.message}
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={sending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSendBulkEmail}
          disabled={!isFormValid || sending}
          startIcon={sending ? <CircularProgress size={20} /> : <SendIcon />}
        >
          {sending ? 'Sending...' : `Send to ${selectedUsers.length} Users`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
