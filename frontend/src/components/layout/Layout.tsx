import React from 'react';
import { AppLayout } from './AppLayout';

interface LayoutProps {
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  disableGutters?: boolean;
  requireAuth?: boolean;
  showNavigation?: boolean;
  showSidebar?: boolean;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  maxWidth = 'lg',
  disableGutters = false,
  requireAuth = false,
  showNavigation = true,
  showSidebar = true,
}) => {
  return (
    <AppLayout
      maxWidth={maxWidth}
      disableGutters={disableGutters}
      requireAuth={requireAuth}
      showNavigation={showNavigation}
      showSidebar={showSidebar}
    >
      {children}
    </AppLayout>
  );
};

export default Layout;