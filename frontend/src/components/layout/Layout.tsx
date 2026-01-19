import React from 'react';
import { AppLayout } from './AppLayout';

interface LayoutProps {
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  disableGutters?: boolean;
  requireAuth?: boolean;
  showNavigation?: boolean;
  showSidebar?: boolean;
  sidebarOpen?: boolean;
  onSidebarToggle?: () => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  maxWidth = 'lg',
  disableGutters = false,
  requireAuth = false,
  showNavigation = true,
  showSidebar = true,
  sidebarOpen = false,
  onSidebarToggle,
}) => {
  return (
    <AppLayout
      maxWidth={maxWidth}
      disableGutters={disableGutters}
      requireAuth={requireAuth}
      showNavigation={showNavigation}
      showSidebar={showSidebar}
      sidebarOpen={sidebarOpen}
      onSidebarToggle={onSidebarToggle}
    >
      {children}
    </AppLayout>
  );
};

export default Layout;