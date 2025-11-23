import React from 'react';
import { Box, Chip, Typography } from '@mui/material';

export interface HostListItem {
  socketId: string;
  displayName?: string;
}

const HostList: React.FC<{ hosts: HostListItem[] }> = ({ hosts }) => {
  if (!hosts || hosts.length === 0) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <Typography variant="caption" sx={{ opacity: 0.8 }}>Hosts:</Typography>
      {hosts.map((h) => (
        <Chip
          key={h.socketId}
          size="small"
          color="primary"
          variant="outlined"
          label={h.displayName || h.socketId.slice(-4)}
        />
      ))}
    </Box>
  );
};

export default HostList;