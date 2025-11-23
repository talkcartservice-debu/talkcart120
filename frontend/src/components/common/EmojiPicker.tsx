import React from 'react';
import {
  Popover,
  Grid,
  IconButton,
  Typography,
  Box,
} from '@mui/material';

interface EmojiPickerProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

const commonEmojis = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
  '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
  '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
  '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
  '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
  '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨',
  '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥',
  '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧',
  '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
  '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑',
  '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻',
  '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸',
  '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '❤️',
  '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎',
  '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
  '💝', '💟', '👍', '👎', '👌', '🤌', '🤏', '✌️',
  '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕',
  '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏',
  '🙌', '🤝', '👐', '🤲', '🙏', '✍️', '💅', '🤳'
];

const EmojiPicker: React.FC<EmojiPickerProps> = ({
  open,
  anchorEl,
  onClose,
  onSelect,
}) => {
  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
    >
      <Box sx={{ p: 2, maxWidth: 320 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Choose an emoji
        </Typography>
        <Grid container spacing={0.5}>
          {commonEmojis.map((emoji, index) => (
            <Grid item key={index}>
              <IconButton
                size="small"
                onClick={() => {
                  onSelect(emoji);
                  onClose();
                }}
                sx={{ fontSize: '1.2rem' }}
              >
                {emoji}
              </IconButton>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Popover>
  );
};

export default EmojiPicker;