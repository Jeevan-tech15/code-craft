import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: 'h-4 w-4 border-2',
    md: 'h-7 w-7 border-2',
    lg: 'h-10 w-10 border-3',
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <div
        className={`${sizeMap[size]} rounded-full border-gray-200 border-t-forest-700 animate-spin`}
      />
    </div>
  );
};

interface LoadingSkeletonProps {
  count?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ count = 3, className = '' }) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-16 rounded-md bg-gray-100/80 border border-gray-200 animate-pulse"
        />
      ))}
    </div>
  );
};

interface LoadingStateProps {
  message?: string;
  rows?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading telemetry from campus sensors...',
  rows = 3,
}) => {
  return (
    <div className="card-clean flex flex-col items-center justify-center py-12 px-4">
      <div className="relative flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-gray-200 border-t-forest-700 animate-spin" />
      </div>
      <p className="mt-4 text-xs font-medium text-charcoal-600">{message}</p>
      <div className="w-full max-w-md mt-5 space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-3 bg-gray-100 rounded animate-pulse"
            style={{ width: `${85 - i * 15}%`, margin: '0 auto' }}
          />
        ))}
      </div>
    </div>
  );
};
