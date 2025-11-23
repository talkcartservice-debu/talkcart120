import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: 8,
        px: 4,
      }}
    >
      {icon && (
        <Box sx={{ mb: 3, opacity: 0.6 }}>
          {icon}
        </Box>
      )}
      
      <Typography variant="h5" fontWeight={600} gutterBottom>
        {title}
      </Typography>
      
      <Typography 
        variant="body1" 
        color="text.secondary" 
        sx={{ mb: 4, maxWidth: 500 }}
      >
        {description}
      </Typography>
      
      {action && (
        <Button
          variant="contained"
          onClick={action.onClick}
          size="large"
        >
          {action.label}
        </Button>
      )}
    </Box>
  );
};