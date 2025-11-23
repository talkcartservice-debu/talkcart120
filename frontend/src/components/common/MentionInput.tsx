import React, { useState, useRef, useEffect } from 'react';
import {
  TextField,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Box,
  Chip,
  Alert,
} from '@mui/material';
import { AtSign, AlertCircle } from 'lucide-react';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import UserAvatar from './UserAvatar';

interface MentionInputProps {
  value: string;
  onChange: (value: string, mentions: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  multiline?: boolean;
  rows?: number;
  label?: string;
  error?: string;
  helperText?: string;
}

interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  isVerified?: boolean;
  settings?: {
    privacy?: {
      allowMentions?: boolean;
    };
  };
}

export const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  placeholder = 'What\'s on your mind?',
  disabled = false,
  maxLength = 2000,
  multiline = true,
  rows = 4,
  label,
  error,
  helperText
}) => {
  const { privacySettings } = usePrivacy();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [extractedMentions, setExtractedMentions] = useState<string[]>([]);
  const [blockedMentions, setBlockedMentions] = useState<string[]>([]);
  const textFieldRef = useRef<HTMLInputElement>(null);

  // Search users for mentions
  const { data: searchResults } = useQuery({
    queryKey: ['users', 'search', mentionQuery],
    queryFn: async () => {
      if (!mentionQuery || mentionQuery.length < 2) return [];
      const response: any = await api.search.users(mentionQuery, 10);
      // Handle different response formats
      if (response?.success) {
        return response.data || [];
      }
      return response || [];
    },
    enabled: mentionQuery.length >= 2,
  });

  // Extract mentions from text
  useEffect(() => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    const blocked: string[] = [];
    let match;

    while ((match = mentionRegex.exec(value)) !== null) {
      const username = match[1];
      if (username) {
        mentions.push(username);
      }
      
      // Check if this user has disabled mentions (simulated check)
      // In a real app, you'd check the user's privacy settings
      if (searchResults) {
        const user = searchResults.find((u: User) => u.username === username);
        if (user && !user.settings?.privacy?.allowMentions) {
          if (username) {
            blocked.push(username);
          }
        }
      }
    }

    setExtractedMentions(mentions);
    setBlockedMentions(blocked);
    onChange(value, mentions);
  }, [value, searchResults, onChange]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    const cursorPos = event.target.selectionStart || 0;
    setCursorPosition(cursorPos);

    // Check if we're typing a mention
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1] || '');
      setShowSuggestions(true);
    } else {
      setMentionQuery('');
      setShowSuggestions(false);
    }

    onChange(newValue, extractedMentions);
  };

  const handleMentionSelect = (user: User) => {
    if (!user.settings?.privacy?.allowMentions) {
      // Don't allow mentioning users who have disabled mentions
      return;
    }

    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.substring(0, mentionMatch.index);
      const newValue = `${beforeMention}@${user.username} ${textAfterCursor}`;
      onChange(newValue, [...extractedMentions, user.username]);
      setShowSuggestions(false);
      setMentionQuery('');
      
      // Focus back to input
      setTimeout(() => {
        if (textFieldRef.current) {
          const newCursorPos = beforeMention.length + user.username.length + 2;
          textFieldRef.current.setSelectionRange(newCursorPos, newCursorPos);
          textFieldRef.current.focus();
        }
      }, 0);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setShowSuggestions(false);
      setMentionQuery('');
    }
  };

  const filteredSuggestions = searchResults?.filter((user: User) => 
    (user.username || '').toLowerCase().includes(mentionQuery.toLowerCase()) &&
    user.settings?.privacy?.allowMentions !== false
  ) || [];

  return (
    <Box position="relative">
      <TextField
        ref={textFieldRef}
        fullWidth
        multiline={multiline}
        rows={multiline ? rows : undefined}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        label={label}
        error={!!error}
        helperText={error || helperText}
        inputProps={{ maxLength }}
        sx={{
          '& .MuiInputBase-input': {
            fontSize: '16px',
            lineHeight: 1.5,
          }
        }}
      />

      {/* Character count */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        <Box>
          {/* Show extracted mentions */}
          {extractedMentions.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              <Typography variant="caption" color="text.secondary">
                Mentions:
              </Typography>
              {extractedMentions.map((mention, index) => (
                <Chip
                  key={index}
                  label={`@${mention}`}
                  size="small"
                  color={blockedMentions.includes(mention) ? 'error' : 'primary'}
                  icon={<AtSign size={12} />}
                />
              ))}
            </Box>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">
          {value.length}/{maxLength}
        </Typography>
      </Box>

      {/* Blocked mentions warning */}
      {blockedMentions.length > 0 && (
        <Alert severity="warning" sx={{ mt: 1 }} icon={<AlertCircle size={16} />}>
          <Typography variant="body2">
            The following users have disabled mentions: {blockedMentions.map(m => `@${m}`).join(', ')}
          </Typography>
        </Alert>
      )}

      {/* Privacy warning */}
      {!privacySettings.allowMentions && (
        <Alert severity="info" sx={{ mt: 1 }} icon={<AtSign size={16} />}>
          <Typography variant="body2">
            You have disabled mentions in your privacy settings. Others cannot mention you in posts.
          </Typography>
        </Alert>
      )}

      {/* Mention suggestions */}
      {showSuggestions && mentionQuery && filteredSuggestions.length > 0 && (
        <Paper
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            maxHeight: 200,
            overflow: 'auto',
            mt: 1,
          }}
        >
          <List dense>
            {filteredSuggestions.slice(0, 5).map((user: User) => (
              <ListItem
                key={user.id}
                component="button"
                onClick={() => handleMentionSelect(user)}
                disabled={!user.settings?.privacy?.allowMentions}
                sx={{ cursor: 'pointer' }}
              >
                <ListItemAvatar>
                  <UserAvatar
                    src={user.avatar}
                    alt={user.displayName}
                    size={32}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" fontWeight={500}>
                        @{user.username}
                      </Typography>
                      {!user.settings?.privacy?.allowMentions && (
                        <Chip label="Mentions disabled" size="small" color="error" />
                      )}
                    </Box>
                  }
                  secondary={user.displayName}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default MentionInput;
