import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  Chip,
  useTheme,
  alpha,
  Skeleton,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { gradients } from '../../theme';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  loading?: boolean;
  subtitle?: string;
  gradient?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  color = 'primary',
  loading = false,
  subtitle,
  gradient,
}) => {
  const theme = useTheme();

  const getColorConfig = (color: string) => {
    const configs = {
      primary: {
        main: theme.palette.primary.main,
        light: theme.palette.primary.light,
        gradient: gradients.primary,
      },
      secondary: {
        main: theme.palette.secondary.main,
        light: theme.palette.secondary.light,
        gradient: gradients.secondary,
      },
      success: {
        main: theme.palette.success.main,
        light: theme.palette.success.light,
        gradient: gradients.success,
      },
      warning: {
        main: theme.palette.warning.main,
        light: theme.palette.warning.light,
        gradient: gradients.warning,
      },
      error: {
        main: theme.palette.error.main,
        light: theme.palette.error.light,
        gradient: gradients.error,
      },
      info: {
        main: theme.palette.info.main,
        light: theme.palette.info.light,
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      },
    };
    return configs[color as keyof typeof configs] || configs.primary;
  };

  const colorConfig = getColorConfig(color);
  const isPositiveChange = change !== undefined && change >= 0;

  if (loading) {
    return (
      <Card
        sx={{
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="40%" height={20} sx={{ mt: 0.5 }} />
            </Box>
            <Skeleton variant="circular" width={48} height={48} />
          </Box>
          <Skeleton variant="text" width="80%" height={40} />
          <Skeleton variant="rectangular" width="50%" height={24} sx={{ mt: 1, borderRadius: 1 }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: gradient || 'white',
        color: gradient ? 'white' : 'inherit',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 12px 40px ${alpha(colorConfig.main, 0.2)}`,
        },
        transition: 'all 0.3s ease-in-out',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: gradient || colorConfig.gradient,
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="body2"
              sx={{
                color: gradient ? 'rgba(255, 255, 255, 0.9)' : 'text.secondary',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontSize: '0.75rem',
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="caption"
                sx={{
                  color: gradient ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary',
                  display: 'block',
                  mt: 0.5,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          {icon && (
            <Avatar
              sx={{
                width: 48,
                height: 48,
                background: gradient
                  ? 'rgba(255, 255, 255, 0.2)'
                  : alpha(colorConfig.main, 0.1),
                color: gradient ? 'white' : colorConfig.main,
                '& .MuiSvgIcon-root': {
                  fontSize: '1.5rem',
                },
              }}
            >
              {icon}
            </Avatar>
          )}
        </Box>

        {/* Value */}
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            color: gradient ? 'white' : 'text.primary',
            mb: 1,
            lineHeight: 1.2,
          }}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Typography>

        {/* Change indicator */}
        {change !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={isPositiveChange ? <TrendingUpIcon /> : <TrendingDownIcon />}
              label={`${isPositiveChange ? '+' : ''}${change}%`}
              size="small"
              sx={{
                backgroundColor: gradient
                  ? isPositiveChange
                    ? 'rgba(76, 175, 80, 0.2)'
                    : 'rgba(244, 67, 54, 0.2)'
                  : isPositiveChange
                  ? alpha(theme.palette.success.main, 0.1)
                  : alpha(theme.palette.error.main, 0.1),
                color: gradient
                  ? 'white'
                  : isPositiveChange
                  ? theme.palette.success.main
                  : theme.palette.error.main,
                border: gradient
                  ? `1px solid ${isPositiveChange ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)'}`
                  : `1px solid ${isPositiveChange ? theme.palette.success.main : theme.palette.error.main}`,
                fontWeight: 600,
                '& .MuiChip-icon': {
                  color: 'inherit',
                },
              }}
            />
            {changeLabel && (
              <Typography
                variant="caption"
                sx={{
                  color: gradient ? 'rgba(255, 255, 255, 0.8)' : 'text.secondary',
                  fontWeight: 500,
                }}
              >
                {changeLabel}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>

      {/* Decorative elements */}
      <Box
        sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: gradient
            ? 'rgba(255, 255, 255, 0.05)'
            : alpha(colorConfig.main, 0.05),
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -30,
          left: -30,
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: gradient
            ? 'rgba(255, 255, 255, 0.03)'
            : alpha(colorConfig.main, 0.03),
          zIndex: 0,
        }}
      />
    </Card>
  );
};

export default StatsCard;
