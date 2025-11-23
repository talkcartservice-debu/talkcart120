import React, { useEffect } from 'react';

interface GlobalErrorHandlerProps {
  children: React.ReactNode;
}

const GlobalErrorHandler: React.FC<GlobalErrorHandlerProps> = ({ children }) => {
  useEffect(() => {
    // Override console.error to catch React children errors
    const originalConsoleError = console.error;
    
    console.error = (...args: any[]) => {
      const errorMessage = args.join(' ');
      
      if (errorMessage.includes('Objects are not valid as a React child')) {
        console.log('🔥 CAUGHT REACT CHILDREN ERROR!');
        console.log('Error args:', args);
        console.log('Stack trace:', new Error().stack);
        
        // Try to get more information about the error
        if (errorMessage.includes('user, _id, createdAt')) {
          console.log('🎯 This is the specific error we are looking for!');
          console.log('The problematic object likely came from a likes/shares/bookmarks array');
          
          // Check current React Fiber for more context
          try {
            console.log('Current component stack:', new Error().stack);
          } catch (e) {
            console.log('Could not get component stack');
          }
        }
      }
      
      // Call original console.error
      originalConsoleError.apply(console, args);
    };

    // Listen for unhandled errors
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('Objects are not valid as a React child')) {
        console.log('🔥 UNHANDLED REACT CHILDREN ERROR CAUGHT!');
        console.log('Error:', event.error);
        console.log('Filename:', event.filename);
        console.log('Line:', event.lineno);
        console.log('Column:', event.colno);
        console.log('Stack:', event.error?.stack);
      }
    };

    window.addEventListener('error', handleError);

    // Listen for unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('Objects are not valid as a React child')) {
        console.log('🔥 PROMISE REJECTION WITH REACT CHILDREN ERROR!');
        console.log('Reason:', event.reason);
      }
    };

    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      console.error = originalConsoleError;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return <>{children}</>;
};

export default GlobalErrorHandler;