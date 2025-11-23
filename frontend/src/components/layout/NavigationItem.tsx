import React, { memo, useCallback } from 'react';
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  useTheme,
  alpha,
  Tooltip,
  Box,
  Stack,
} from '@mui/material';
import { useRouter } from 'next/router';
import { Crown, Sparkles } from 'lucide-react';

interface NavigationItemProps {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
  comingSoon?: boolean;
  disabled?: boolean;
  tooltip?: string;
  onClick?: () => void;
  premium?: boolean;
  new?: boolean;
}

const NavigationItemComponent: React.FC<NavigationItemProps> = ({
  label,
  path,
  icon,
  badge,
  comingSoon = false,
  disabled = false,
  tooltip,
  onClick,
  premium = false,
  new: isNew = false,
}) => {
  const router = useRouter();
  const theme = useTheme();

  const isActive = useCallback((path: string) => {
    // Simply check if the current path starts with the navigation item path
    return router.pathname.startsWith(path);
  }, [router.pathname]);

  const handleClick = useCallback(() => {
    if (disabled || comingSoon) return;
    
    if (onClick) {
      onClick();
    } else {
      router.push(path);
    }
  }, [disabled, comingSoon, onClick, path, router]);

  const listItemButton = (
    <ListItemButton
      onClick={handleClick}
      selected={isActive(path)}
      disabled={disabled}
      sx={{
        borderRadius: 2,
        py: 1.5,
        mb: 0.5,
        opacity: comingSoon ? 0.6 : 1,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        '&.Mui-selected': {
          bgcolor: alpha(theme.palette.primary.main, 0.12),
          color: theme.palette.primary.main,
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.18),
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            bgcolor: theme.palette.primary.main,
            borderRadius: '0 2px 2px 0',
          }
        },
        '&:hover': {
          bgcolor: alpha(theme.palette.action.hover, 0.8),
          transform: 'translateX(4px)',
        },
        '&.Mui-disabled': {
          opacity: 0.4,
        },
      }}
    >
      <ListItemIcon
        sx={{
          color: isActive(path) ? theme.palette.primary.main : 'inherit',
          minWidth: 40,
          transition: 'all 0.2s ease',
        }}
      >
        {icon}
      </ListItemIcon>
      
      <ListItemText
        primary={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box component="span">
              {label}
            </Box>
            {premium && (
              <Crown 
                size={14} 
                color={theme.palette.warning.main}
                style={{ flexShrink: 0 }}
              />
            )}
          </Stack>
        }
        primaryTypographyProps={{
          fontWeight: isActive(path) ? 700 : 500,
          fontSize: '0.95rem',
        }}
      />
      
      <Stack direction="row" spacing={0.5} alignItems="center">
        {isNew && (
          <Chip
            label="New"
            size="small"
            icon={<Sparkles size={10} />}
            sx={{
              height: 20,
              fontSize: '0.7rem',
              fontWeight: 600,
              bgcolor: alpha(theme.palette.success.main, 0.1),
              color: theme.palette.success.main,
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              '& .MuiChip-icon': {
                marginLeft: '4px',
              }
            }}
          />
        )}
        
        {comingSoon && (
          <Chip
            label="Soon"
            size="small"
            sx={{
              height: 20,
              fontSize: '0.7rem',
              fontWeight: 600,
              bgcolor: alpha(theme.palette.secondary.main, 0.1),
              color: theme.palette.secondary.main,
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
            }}
          />
        )}
        
        {badge && !comingSoon && !isNew && (
          <Chip
            label={badge}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.7rem',
              fontWeight: 600,
              bgcolor: badge === 'Hot' 
                ? alpha(theme.palette.error.main, 0.1)
                : badge === 'Live'
                ? alpha(theme.palette.error.main, 0.1)
                : badge === 'New'
                ? alpha(theme.palette.success.main, 0.1)
                : alpha(theme.palette.primary.main, 0.1),
              color: badge === 'Hot' 
                ? theme.palette.error.main 
                : badge === 'Live'
                ? theme.palette.error.main
                : badge === 'New'
                ? theme.palette.success.main
                : theme.palette.primary.main,
              border: `1px solid ${alpha(
                badge === 'Hot' || badge === 'Live' 
                  ? theme.palette.error.main 
                  : badge === 'New'
                  ? theme.palette.success.main
                  : theme.palette.primary.main, 
                0.2
              )}`,
              minWidth: badge.length === 1 ? 20 : 'auto',
            }}
          />
        )}
      </Stack>
    </ListItemButton>
  );

  if (tooltip) {
    return (
      <ListItem disablePadding>
        <Tooltip 
          title={tooltip} 
          placement="right"
          arrow
          enterDelay={500}
          sx={{
            '& .MuiTooltip-tooltip': {
              bgcolor: theme.palette.grey[900],
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: 500,
            },
            '& .MuiTooltip-arrow': {
              color: theme.palette.grey[900],
            }
          }}
        >
          {listItemButton}
        </Tooltip>
      </ListItem>
    );
  }

  return (
    <ListItem disablePadding>
      {listItemButton}
    </ListItem>
  );
};

const NavigationItem = memo(NavigationItemComponent);

export default NavigationItem;