import React from 'react';

interface LucideIconProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Simple wrapper component for Lucide React icons to prevent conflicts with MUI's styling system.
 * This creates a non-MUI wrapper that doesn't interfere with MUI's sx system.
 */
export default function LucideIcon({ 
  children, 
  className,
  style,
}: LucideIconProps) {
  return (
    <span 
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {children}
    </span>
  );
}