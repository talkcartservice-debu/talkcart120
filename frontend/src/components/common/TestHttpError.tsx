import React, { useEffect, useState } from 'react';
import { HttpError } from '@/lib/api';

interface TestHttpErrorProps {
  statusCode: number;
  message: string;
}

const TestHttpError: React.FC<TestHttpErrorProps> = ({ statusCode, message }) => {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      // Create an HttpError to test
      const testError = new HttpError(statusCode, message, { message });
      setError(testError);
      // Throw it to trigger the ErrorBoundary
      throw testError;
    } catch (e) {
      // This will be caught by the ErrorBoundary
      console.log('Test error created:', e);
    }
  }, [statusCode, message]);

  // This component will never render because it always throws an error
  return (
    <div>
      <h1>Test Component</h1>
      {error && (
        <div>
          <p>Error Name: {error.name}</p>
          <p>Error Message: {error.message}</p>
          {error.name === 'HttpError' && (
            <p>HTTP Status: {(error as any).status}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default TestHttpError;