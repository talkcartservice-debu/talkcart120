import React from 'react';
import { Chip } from '@mui/material';
import { Radio } from 'lucide-react';

interface LiveBadgeProps {
  isLive?: boolean;
  size?: 'small' | 'medium';
  labelWhenLive?: string;
}

export default function LiveBadge({ isLive = false, size = 'small', labelWhenLive = 'LIVE' }: LiveBadgeProps) {
  if (!isLive) return null;
  return (
    <Chip
      icon={<Radio size={12} />}
      label={labelWhenLive}
      size={size}
      color="error"
      sx={{
        fontWeight: 700,
        fontSize: size === 'small' ? '0.75rem' : '0.8125rem',
        height: size === 'small' ? 20 : 24,
        letterSpacing: 0.25,
        '& .MuiChip-icon': { fontSize: 12 },
      }}
    />
  );
}

