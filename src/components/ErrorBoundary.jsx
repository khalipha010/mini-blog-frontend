import { useState } from 'react';

function ErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false);

  const componentDidCatch = (error) => {
    console.error('ErrorBoundary caught:', error);
    setHasError(true);
  };

  if (hasError) {
    return (
      <div className="max-w-2xl mx-auto mt-8 text-center">
        <h2 className="text-2xl font-bold text-red-600">Something went wrong.</h2>
        <p className="mt-2">Please refresh the page or try again later.</p>
      </div>
    );
  }

  return children;
}

export default ErrorBoundary;